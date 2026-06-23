"""
llm_analysis.py
===============
Sends extracted PDF text to Gemini 1.5 Flash and returns:
  - summary:          2-3 sentence plain-English insight with real numbers
  - highlights:       dict of key financial metrics (Revenue, EBITDA, PAT, EPS …)
  - sentiment_reason: single sentence explaining the sentiment direction

Falls back to empty dict on any failure — the core sentiment score is
always preserved regardless of LLM availability.

Requires env var: GEMINI_API_KEY (add to Modal secret `nse-sentiment-secrets`)
"""

import os
import json
import re
import asyncio

# Categories that typically contain PDFs with financial data
PDF_CATEGORIES = {
    "financial_results",
    "annual_report",
    "corporate_governance",
    "shareholding_pattern",
    "board_meeting",
}

_SYSTEM_PROMPT = """You are a financial analyst specialising in Indian equity markets.
You are given raw text extracted from an NSE regulatory filing.
Extract the following as valid JSON and NOTHING ELSE:

{
  "summary": "<2-3 sentence plain-English insight referencing specific numbers from the filing>",
  "highlights": {
    "Revenue": "<value with YoY change if available, e.g. ₹2,340 Cr (+12% YoY), else omit key>",
    "EBITDA": "<value with YoY change if available, else omit key>",
    "PAT": "<value with YoY change if available, else omit key>",
    "EPS": "<value if available, else omit key>",
    "Margin": "<EBITDA or PAT margin % if available, else omit key>",
    "Dividend": "<dividend per share if declared, else omit key>"
  },
  "sentiment_reason": "<one sentence: why this filing is positive/negative/neutral for investors>"
}

Rules:
- Only include a highlights key if its value is explicitly stated in the text.
- Never invent numbers. If the filing has no financials, return empty highlights {}.
- Keep summary factual, concise, and avoid hype.
- Use Indian number formatting (₹ Cr / ₹ L for lakhs).
- Return ONLY the JSON object — no markdown, no explanation."""


async def analyze_filing(
    pdf_text: str,
    category: str,
    headline: str,
) -> dict:
    """
    Sends PDF text to Gemini Flash and parses structured financial data.

    Returns a dict with keys: summary, highlights, sentiment_reason.
    Returns {} on any failure (API unavailable, parse error, etc.).
    """
    if not pdf_text or not pdf_text.strip():
        return {}

    if category not in PDF_CATEGORIES:
        return {}

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("[llm] GEMINI_API_KEY not set — skipping LLM analysis")
        return {}

    user_message = (
        f"Filing headline: {headline}\n\n"
        f"Extracted text:\n{pdf_text[:7000]}"
    )

    try:
        import google.generativeai as genai
    except ImportError:
        print("[llm] google-generativeai not installed — skipping")
        return {}

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=_SYSTEM_PROMPT,
        )
        response = await model.generate_content_async(
            user_message,
            generation_config={
                "temperature": 0.1,       # Low temp = factual, consistent
                "max_output_tokens": 512,
                "response_mime_type": "application/json",
            },
        )
        raw = response.text.strip()

        # Strip accidental markdown fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        parsed = json.loads(raw)

        # Sanitise: ensure expected keys exist
        return {
            "summary": str(parsed.get("summary", "")).strip(),
            "highlights": _clean_highlights(parsed.get("highlights", {})),
            "sentiment_reason": str(parsed.get("sentiment_reason", "")).strip(),
        }

    except json.JSONDecodeError as exc:
        print(f"[llm] JSON parse error: {exc}")
        return {}
    except Exception as exc:
        print(f"[llm] Gemini call failed: {exc}")
        return {}


def _clean_highlights(raw: object) -> dict:
    """Ensures highlights is a flat string→string dict."""
    if not isinstance(raw, dict):
        return {}
    return {
        str(k).strip(): str(v).strip()
        for k, v in raw.items()
        if k and v and str(v).strip()
    }
