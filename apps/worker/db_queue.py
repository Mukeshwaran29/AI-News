import httpx
from datetime import datetime, timezone

MAX_RETRIES = 3
BATCH_SIZE  = 30

class SupabaseRestClient:
    def __init__(self, supabase_url: str, service_key: str):
        # Normalize supabase_url to base URL (without /rest/v1)
        base_url = supabase_url.split("/rest/v1")[0].rstrip("/")
        self.url = f"{base_url}/rest/v1"
        self.headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json"
        }
        self.client = httpx.AsyncClient(headers=self.headers, timeout=30.0)

    async def close(self):
        await self.client.aclose()

async def get_db_conn(supabase_url: str, service_key: str) -> SupabaseRestClient:
    return SupabaseRestClient(supabase_url, service_key)

async def claim_jobs(conn: SupabaseRestClient) -> list[dict]:
    r = await conn.client.post(f"{conn.url}/rpc/claim_jobs", json={"batch_size": BATCH_SIZE})
    r.raise_for_status()
    return r.json()

async def fetch_raw_feed(conn: SupabaseRestClient, raw_feed_id: str) -> dict | None:
    r = await conn.client.get(
        f"{conn.url}/raw_feed",
        params={"id": f"eq.{raw_feed_id}", "select": "id,title,description,category,ticker,link,pub_date"}
    )
    r.raise_for_status()
    data = r.json()
    return data[0] if data else None

async def fetch_raw_feeds_batch(conn: SupabaseRestClient, raw_feed_ids: list[str]) -> list[dict]:
    if not raw_feed_ids:
        return []
    ids_param = ",".join(raw_feed_ids)
    r = await conn.client.get(
        f"{conn.url}/raw_feed",
        params={"id": f"in.({ids_param})", "select": "id,title,description,category,ticker,link,pub_date"}
    )
    r.raise_for_status()
    return r.json()

async def fetch_previous_event(conn: SupabaseRestClient, ticker: str) -> dict | None:
    """Fetches the most recent analyzed event for a given ticker to use as context (Poor Man's RAG)."""
    if not ticker or ticker == 'UNKNOWN':
        return None
    r = await conn.client.get(
        f"{conn.url}/analyzed_events",
        params={"ticker": f"eq.{ticker}", "order": "pub_date.desc", "limit": "1"}
    )
    if r.status_code == 200 and r.json():
        return r.json()[0]
    return None


async def write_result(conn: SupabaseRestClient, job_id: str, raw_feed: dict,
                        inference: dict, enrichment: dict, rationale: str) -> str:
    """
    Inserts row into analyzed_events, marks job done.
    Returns analyzed_events.id
    """
    # 1. Insert into analyzed_events
    event_row = {
        'raw_feed_id':  raw_feed['id'],
        'ticker':       enrichment.get('ticker') or raw_feed.get('ticker') or 'UNKNOWN',
        'company_name': enrichment.get('company') or 'Unknown Company',
        'category':     raw_feed['category'],
        'headline':     raw_feed['title'],
        'sentiment':    inference['label'],
        'score':        inference['score'],
        'rationale':    rationale,
        'keywords':     enrichment['keywords'],
        'pub_date':     raw_feed['pub_date'],
        # PDF enrichment — optional, omit key if not available so Supabase uses column default
        **( {'pdf_url':     enrichment['pdf_url']}     if enrichment.get('pdf_url')     else {} ),
        **( {'pdf_summary': enrichment['pdf_summary']} if enrichment.get('pdf_summary') else {} ),
        **( {'highlights':  enrichment['highlights']}  if enrichment.get('highlights')  else {} ),
    }

    
    r = await conn.client.post(
        f"{conn.url}/analyzed_events",
        json=event_row,
        headers={"Prefer": "return=representation"}
    )
    r.raise_for_status()
    event_id = r.json()[0]['id']

    # 2. Update job_queue status to done
    now_str = datetime.now(timezone.utc).isoformat()
    r = await conn.client.patch(
        f"{conn.url}/job_queue",
        params={"id": f"eq.{job_id}"},
        json={"status": "done", "done_at": now_str}
    )
    r.raise_for_status()

    # 3. Update raw_feed processed flag to true
    r = await conn.client.patch(
        f"{conn.url}/raw_feed",
        params={"id": f"eq.{raw_feed['id']}"},
        json={"processed": True}
    )
    r.raise_for_status()

    return str(event_id)

async def mark_failed(conn: SupabaseRestClient, job_id: str,
                       attempts: int, error: str):
    now_str = datetime.now(timezone.utc).isoformat()
    if attempts >= MAX_RETRIES:
        payload = {"status": "failed", "last_error": error[:1000], "done_at": now_str}
    else:
        payload = {"status": "pending", "last_error": error[:1000]}

    r = await conn.client.patch(
        f"{conn.url}/job_queue",
        params={"id": f"eq.{job_id}"},
        json=payload
    )
    r.raise_for_status()
