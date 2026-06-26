"""
llm_analysis.py
================
Sends extracted text/metadata to Gemini 1.5 Flash and returns:
  - summary:          2-3 sentence plain-English insight with real numbers formatted as per category guidelines
  - highlights:       dict of category-specific fields (e.g. FY, metrics, ratios, promoter percentages)
  - sentiment_reason: single sentence explaining the sentiment direction
"""

import os
import json
import re

CATEGORY_SCHEMAS = {
    "announcements": {
        "Company name": "Full name of the company",
        "Announcement date": "Date of announcement",
        "Summary of event or update": "Concise summary of event/partnership/update",
        "Impact area (financial, operational, regulatory)": "Details on expected impact"
    },
    "annual_report": {
        "Fiscal year": "FY e.g. FY2025-26",
        "Key financial metrics (Revenue, PAT, EPS)": "Revenue, Net Profit, EPS details",
        "Management commentary highlights": "Key quotes or commentary notes",
        "Auditor remarks / governance notes": "Remarks or compliance notes"
    },
    "board_meeting": {
        "Meeting date": "Date of the board meeting",
        "Agenda items": "Items discussed",
        "Decisions taken (dividend, buyback, appointment)": "Decisions taken",
        "Next meeting schedule": "Date of next meeting if mentioned"
    },
    "corporate_action": {
        "Type (split, bonus, merger, rights issue)": "Type of corporate action",
        "Ratio or terms": "Ratios or conversion rates",
        "Record date / ex-date": "Dates",
        "Remarks or purpose": "Purpose of corporate action"
    },
    "buyback": {
        "Buyback size and price": "Buyback size in Cr and price per share",
        "Start and end dates": "Buyback timeline",
        "Mode (open market/tender)": "Tender or open market route",
        "Percentage of equity targeted": "Equity targeted percentage"
    },
    "financial_results": {
        "Quarter/year": "Quarter and Year e.g. Q4 FY26",
        "Revenue, EBITDA, PAT, EPS": "Core metrics value",
        "YoY/ QoQ change": "YoY or QoQ changes",
        "Segment performance": "Breakdown by segment"
    },
    "insider_trading": {
        "Insider name & designation": "Name and designation of insider",
        "Transaction type (buy/sell)": "BUY or SELL",
        "Quantity & price": "Quantity of shares and price per share",
        "Date & reason (if disclosed)": "Transaction date and reason"
    },
    "investor_complaints": {
        "Complaint type": "Details on complaints",
        "Date received & resolved": "Timestamps",
        "Resolution summary": "Resolution details",
        "Pending count": "Number of pending complaints"
    },
    "shareholding_pattern": {
        "Promoter, FII, DII, Public percentages": "Shareholding percentages",
        "Change vs previous quarter": "Increase/decrease details",
        "Major new entrants/exits": "Key new funds or exits"
    },
    "corporate_governance": {
        "Policy updates": "Updates on policies",
        "Director appointments/resignations": "Changes in directors",
        "Audit committee remarks": "Committee observations",
        "Compliance status": "SEBI compliance status"
    }
}

async def analyze_filing(
    text: str,
    category: str,
    headline: str,
) -> dict:
    """
    Sends PDF text or RSS description to Gemini Flash and parses structured data.
    """
    if not text or not text.strip():
        # Fall back to using headline as text if none is provided
        text = headline

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        # Fallback return with manual parsing rules to support zero-API-key mode
        return _local_fallback(text, category, headline)

    schema = CATEGORY_SCHEMAS.get(category, {
        "Company name": "Company name",
        "Summary": "Summary of the update"
    })

    system_prompt = (
        f"You are an expert financial analyst specialising in Indian equity markets.\n"
        f"Your task is to perform a DEEP and DETAILED analysis of the provided text from an NSE filing in the '{category}' category. The provided text is extracted from a PDF document.\n"
        f"1. Extract the following specific fields into the 'highlights' JSON dictionary:\n"
        f"{json.dumps(schema, indent=2)}\n\n"
        f"2. Write a comprehensive, detailed 'summary' of the document's contents. DO NOT just repeat the headline. You MUST read the 'Text' and summarize the actual data, financials, decisions, or rationales discussed inside the document. The summary should be at least 3-4 sentences long and include specific numbers, names, and facts found in the text.\n\n"
        f"Provide the output as valid JSON matching this schema exactly:\n"
        f"{{\n"
        f"  \"summary\": \"<Comprehensive, detailed summary of the document's actual contents, including specific numbers and facts>\",\n"
        f"  \"highlights\": {json.dumps({k: '<extracted value>' for k in schema.keys()}, indent=2)},\n"
        f"  \"sentiment_reason\": \"<One sentence: why this is positive/negative/neutral for investors>\"\n"
        f"}}\n\n"
        f"Rules:\n"
        f"- Always output a valid JSON object. Do not include any explanation or markdown tags.\n"
        f"- Never invent values. If a field is missing from the text, set its value to 'Not mentioned'.\n"
        f"- Use Indian number formatting (₹ Cr / ₹ L)."
    )

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            system_instruction=system_prompt,
        )
        response = await model.generate_content_async(
            f"Filing details:\nHeadline: {headline}\nText: {text[:40000]}",
            generation_config={
                "temperature": 0.1,
                "max_output_tokens": 1500,
                "response_mime_type": "application/json",
            },
        )
        raw = response.text.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)

        parsed = json.loads(raw)
        return {
            "summary": str(parsed.get("summary", "")).strip(),
            "highlights": parsed.get("highlights", {}),
            "sentiment_reason": str(parsed.get("sentiment_reason", "")).strip(),
        }
    except Exception as e:
        print(f"[llm] Gemini analysis error: {e}")
        return _local_fallback(text, category, headline)

def _local_fallback(text: str, category: str, headline: str) -> dict:
    """Fallback generator in case Gemini is not available or errors out."""
    schema = CATEGORY_SCHEMAS.get(category, {})
    highlights = {k: "Not mentioned" for k in schema.keys()}
    
    # Extract simple attributes locally for a professional experience
    words = text.split()
    company = "Unknown Company"
    if len(words) > 0:
        company = headline.split("Board Meeting")[0].split("Announcement")[0].strip()
        
    if "Company name" in highlights:
        highlights["Company name"] = company
    if "Meeting date" in highlights:
        highlights["Meeting date"] = "Today"
    if "Transaction type (buy/sell)" in highlights:
        highlights["Transaction type (buy/sell)"] = "BUY" if "BUY" in text.upper() else "SELL"

    return {
        "summary": f"Event details for {company}: {headline}",
        "highlights": highlights,
        "sentiment_reason": "Filing is informational/neutral in nature for investors."
    }
