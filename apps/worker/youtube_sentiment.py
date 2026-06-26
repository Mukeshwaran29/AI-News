import httpx
import logging
import os
import google.generativeai as genai
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# Mock list of top financial influencers in India
CREATORS = ["Akshat Shrivastava", "PR Sundar", "Rachana Ranade", "Asset Mindset", "Trading with Luv"]

async def analyze_youtube_sentiment(conn):
    """
    Crawls recent YouTube videos from finance influencers.
    Uses LLM (Gemini) to perform sentiment analysis and extract mentioned stock tickers.
    """
    logger.info("[youtube_sentiment] Polling financial influencer video transcripts...")

    # Simulated recent video uploads and transcripts
    videos = [
        {
            "channel_name": "Akshat Shrivastava",
            "video_title": "Is HDFC Bank Stock Finally Ready to Rally?",
            "video_url": "https://www.youtube.com/watch?v=mock_hdfc",
            "video_timestamp": "04:12",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "transcript_chunk": "HDFC Bank has been consolidated for a long time. But looking at the institutional buying and their loan growth projections, I am highly positive on the stock. HDFCBANK looks like a solid buy here for long term investors."
        },
        {
            "channel_name": "Rachana Ranade",
            "video_title": "IT Sector Analysis - INFY & TCS Review",
            "video_url": "https://www.youtube.com/watch?v=mock_it",
            "video_timestamp": "08:45",
            "published_at": datetime.now(timezone.utc).isoformat(),
            "transcript_chunk": "Infosys (INFY) has reported a slight margin contraction, and the overall IT sector guidance is soft. So I would be cautious. Avoid INFY in the near term as we might see some minor correction."
        }
    ]

    # Initialize Gemini client if key is available
    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
    else:
        logger.warning("[youtube_sentiment] GEMINI_API_KEY not found. Using local fallback rules.")
        model = None

    inserted = 0
    for video in videos:
        ticker = "UNKNOWN"
        company = "Unknown Company"
        sentiment = "neutral"
        score = 50

        # Run LLM analysis if API key is present
        if model:
            try:
                prompt = (
                    f"Analyze this transcript chunk from a financial video:\n"
                    f"\"{video['transcript_chunk']}\"\n\n"
                    f"Return a JSON object with keys:\n"
                    f"- 'ticker' (NSE stock symbol mentioned, e.g. HDFCBANK, INFY)\n"
                    f"- 'company' (Company name)\n"
                    f"- 'sentiment' ('positive', 'neutral', or 'negative')\n"
                    f"- 'score' (0 to 100, where 100 is highly bullish, 0 is highly bearish)\n"
                )
                response = model.generate_content(prompt)
                # Parse JSON response
                import json
                cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
                data = json.loads(cleaned_text)
                ticker = data.get("ticker", ticker)
                company = data.get("company", company)
                sentiment = data.get("sentiment", sentiment)
                score = int(data.get("score", score))
            except Exception as e:
                logger.error(f"[youtube_sentiment] LLM parse error: {e}")
                # Fallback to local parsing
                if "HDFCBANK" in video["transcript_chunk"]:
                    ticker, company, sentiment, score = "HDFCBANK", "HDFC Bank Limited", "positive", 80
                elif "INFY" in video["transcript_chunk"]:
                    ticker, company, sentiment, score = "INFY", "Infosys Limited", "negative", 30
        else:
            # Fallback when Gemini API key is absent
            if "HDFCBANK" in video["transcript_chunk"]:
                ticker, company, sentiment, score = "HDFCBANK", "HDFC Bank Limited", "positive", 80
            elif "INFY" in video["transcript_chunk"]:
                ticker, company, sentiment, score = "INFY", "Infosys Limited", "negative", 30

        deal_record = {
            "channel_name": video["channel_name"],
            "video_title": video["video_title"],
            "video_url": video["video_url"],
            "video_timestamp": video["video_timestamp"],
            "ticker": ticker,
            "company_name": company,
            "sentiment": sentiment,
            "score": score,
            "transcript_chunk": video["transcript_chunk"],
            "published_at": video["published_at"]
        }

        try:
            # Check for existing record
            r_check = await conn.client.get(
                f"{conn.url}/influencer_sentiments",
                params={
                    "channel_name": f"eq.{deal_record['channel_name']}",
                    "video_title": f"eq.{deal_record['video_title']}",
                    "ticker": f"eq.{deal_record['ticker']}"
                }
            )
            if r_check.status_code == 200 and len(r_check.json()) > 0:
                continue

            r = await conn.client.post(f"{conn.url}/influencer_sentiments", json=deal_record)
            r.raise_for_status()
            inserted += 1
        except Exception as e:
            logger.error(f"[youtube_sentiment] Error inserting influencer sentiment: {e}")

    logger.info(f"[youtube_sentiment] Finished video sentiment insertion. Inserted {inserted} records.")
    return inserted
