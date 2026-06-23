"""
pdf_extractor.py
================
Downloads an NSE filing PDF and extracts clean text from the first N pages.

Returns None on any failure so the caller can degrade gracefully —
PDF failures must never block the core sentiment pipeline.
"""

import asyncio
import io
import httpx

# Only extract first 5 pages to keep tokens manageable (covers financials in most filings)
MAX_PAGES = 5
# Hard cap on extracted text length to stay within Gemini Flash context window
MAX_CHARS  = 8_000

# NSE occasionally blocks vanilla Python user agents — spoof a browser
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "application/pdf,application/octet-stream,*/*",
    "Referer": "https://www.nseindia.com/",
}


async def extract_pdf_text(url: str) -> str | None:
    """
    Downloads the PDF at `url` and returns plain text from the first MAX_PAGES pages.

    Returns:
        str  — extracted text (≤ MAX_CHARS chars), or
        None — if download fails, URL is empty/invalid, or PDF parsing fails
    """
    if not url or not url.strip().lower().startswith("http"):
        return None

    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            resp = await client.get(url, headers=_HEADERS)
            if resp.status_code != 200:
                print(f"[pdf] HTTP {resp.status_code} for {url}")
                return None
            content_type = resp.headers.get("content-type", "")
            # Accept PDF or generic binary; reject HTML error pages
            if "html" in content_type.lower():
                print(f"[pdf] Received HTML instead of PDF for {url}")
                return None
            raw_bytes = resp.content
    except Exception as exc:
        print(f"[pdf] Download error for {url}: {exc}")
        return None

    return await asyncio.to_thread(_parse_pdf_bytes, raw_bytes, url)


def _parse_pdf_bytes(raw_bytes: bytes, url: str) -> str | None:
    """Runs synchronous pdfplumber extraction in a thread pool."""
    try:
        import pdfplumber
    except ImportError:
        print("[pdf] pdfplumber not installed — skipping PDF extraction")
        return None

    try:
        with pdfplumber.open(io.BytesIO(raw_bytes)) as pdf:
            pages = pdf.pages[:MAX_PAGES]
            texts = []
            for page in pages:
                text = page.extract_text()
                if text:
                    texts.append(text.strip())
            combined = "\n\n".join(texts)
            if not combined.strip():
                print(f"[pdf] No extractable text in {url}")
                return None
            return combined[:MAX_CHARS]
    except Exception as exc:
        print(f"[pdf] Parse error for {url}: {exc}")
        return None
