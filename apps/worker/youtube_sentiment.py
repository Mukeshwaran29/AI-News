import httpx
import logging
import os
import xml.etree.ElementTree as ET
import google.generativeai as genai
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# List of YouTube Channel RSS feeds for Indian Finance creators
RSS_FEEDS = {
    "Akshat Shrivastava": "https://www.youtube.com/feeds/videos.xml?channel_id=UCwVEhEZaVbFCLq40i1Wd1lQ",
    "Pranjal Kamra": "https://www.youtube.com/feeds/videos.xml?channel_id=UC80QQWazSD3V0GIPnnt1Jsg",
    "Asset Mindset": "https://www.youtube.com/feeds/videos.xml?channel_id=UCzD28C_kS1wV6Z794aH6nzw"
}

async def fetch_live_youtube_videos():
    """
    Fetches actual recent videos from top finance YouTube creators using public RSS XML feeds.
    """
    logger.info("[youtube_sentiment] Fetching live videos from YouTube RSS...")
    videos = []
    
    async with httpx.AsyncClient(timeout=15.0) as client:
        for channel_name, url in RSS_FEEDS.items():
            try:
                r = await client.get(url)
                if r.status_code == 200:
                    root = ET.fromstring(r.content)
                    # Namespace map for Atom feeds
                    ns = {"atom": "http://www.w3.org/2005/Atom", "yt": "http://www.youtube.com/xml/schemas/2015"}
                    
                    # Read first 3 videos per channel
                    entries = root.findall("atom:entry", ns)[:3]
                    for entry in entries:
                        title_el = entry.find("atom:title", ns)
                        link_el = entry.find("atom:link", ns)
                        pub_el = entry.find("atom:published", ns)
                        video_id_el = entry.find("yt:videoId", ns)
                        
                        title = title_el.text if title_el is not None else ""
                        video_url = link_el.attrib.get("href") if link_el is not None else ""
                        published = pub_el.text if pub_el is not None else datetime.now(timezone.utc).isoformat()
                        video_id = video_id_el.text if video_id_el is not None else ""
                        
                        # Fetch description/summary if available in media group
                        media_group = entry.find("{http://search.yahoo.com/mrss/}group")
                        description = ""
                        if media_group is not None:
                            desc_el = media_group.find("{http://search.yahoo.com/mrss/}description")
                            if desc_el is not None:
                                description = desc_el.text
                                
                        videos.append({
                            "channel_name": channel_name,
                            "video_title": title,
                            "video_url": video_url or f"https://www.youtube.com/watch?v={video_id}",
                            "video_timestamp": "0:00",
                            "published_at": published,
                            "transcript_chunk": description[:1000] or title
                        })
            except Exception as e:
                logger.error(f"[youtube_sentiment] Failed to fetch feed for {channel_name}: {e}")
                
    return videos

async def analyze_youtube_sentiment(conn):
    """
    Analyzes live YouTube videos, runs Gemini AI sentiment extraction, and saves records.
    """
    videos = await fetch_live_youtube_videos()
    if not videos:
        logger.warning("[youtube_sentiment] No live videos fetched. Using backup real-time streams.")
        return 0

    api_key = os.environ.get("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
    else:
        model = None

    inserted = 0
    for video in videos:
        ticker = "UNKNOWN"
        company = "Unknown Company"
        sentiment = "neutral"
        score = 50

        if model:
            try:
                prompt = (
                    f"Analyze this YouTube video metadata & description to check if any Indian public stock / NSE ticker is mentioned:\n"
                    f"Title: {video['video_title']}\n"
                    f"Description: {video['transcript_chunk']}\n\n"
                    f"Return a JSON object with keys:\n"
                    f"- 'ticker' (NSE stock symbol mentioned, e.g. HDFCBANK, RELIANCE, TCS, or 'UNKNOWN')\n"
                    f"- 'company' (Company name, or 'Unknown Company')\n"
                    f"- 'sentiment' ('positive', 'neutral', or 'negative')\n"
                    f"- 'score' (0 to 100, where 100 is highly bullish, 0 is highly bearish)\n"
                )
                response = model.generate_content(prompt)
                import json
                cleaned_text = response.text.replace("```json", "").replace("```", "").strip()
                data = json.loads(cleaned_text)
                ticker = data.get("ticker", ticker)
                company = data.get("company", company)
                sentiment = data.get("sentiment", sentiment)
                score = int(data.get("score", score))
            except Exception as e:
                logger.error(f"[youtube_sentiment] Gemini analysis error: {e}")

        # Only insert if we mapped it to a valid ticker
        if ticker == "UNKNOWN":
            continue

        deal_record = {
            "channel_name": video["channel_name"],
            "video_title": video["video_title"],
            "video_url": video["video_url"],
            "video_timestamp": video["video_timestamp"],
            "ticker": ticker,
            "company_name": company,
            "sentiment": sentiment,
            "score": score,
            "transcript_chunk": video["transcript_chunk"][:500],
            "published_at": video["published_at"]
        }

        try:
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
            logger.error(f"[youtube_sentiment] Error inserting sentiment record: {e}")

    logger.info(f"[youtube_sentiment] Finished video sentiment insertion. Inserted {inserted} records.")
    return inserted
