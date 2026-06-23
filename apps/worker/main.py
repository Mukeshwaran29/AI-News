import modal
import asyncio
import os


app = modal.App("nse-sentiment-worker")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
    .pip_install("https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1.tar.gz")
    .add_local_dir(".", remote_path="/root")
)

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("nse-sentiment-secrets")],
    schedule=modal.Period(minutes=1),
    timeout=300,
    retries=0,   # Retry logic is inside the worker itself
)
async def process_jobs():
    from db_queue import claim_jobs, fetch_raw_feed, write_result, mark_failed, get_db_conn
    from inference import score_texts
    from enrichment import extract_entities_batch, extract_keywords_batch
    from rationale import generate_rationale
    
    supabase_url = os.environ["SUPABASE_URL"]
    service_key  = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    conn = await get_db_conn(supabase_url, service_key)
    try:
        jobs = await claim_jobs(conn)
        if not jobs:
            print("[worker] No pending jobs")
            return

        print(f"[worker] Claimed {len(jobs)} jobs")

        # 1. Fetch raw feeds in parallel
        fetch_tasks = [fetch_raw_feed(conn, str(job['raw_feed_id'])) for job in jobs]
        raw_feeds_results = await asyncio.gather(*fetch_tasks, return_exceptions=True)

        valid_jobs = []
        valid_raw_feeds = []
        
        for job, raw in zip(jobs, raw_feeds_results):
            if isinstance(raw, Exception):
                await mark_failed(conn, str(job['id']), job['attempts'], f"Fetch error: {raw}")
                print(f"[worker] Job {job['id']} fetch failed: {raw}")
            elif not raw:
                await mark_failed(conn, str(job['id']), job['attempts'], "raw_feed not found")
                print(f"[worker] Job {job['id']} raw feed not found")
            else:
                valid_jobs.append(job)
                valid_raw_feeds.append(raw)

        if not valid_jobs:
            print("[worker] No valid jobs to process after raw feed fetching")
            return

        # 2. Build texts for batch ML pipeline
        texts = [f"{raw['title']} {raw.get('description', '') or ''}" for raw in valid_raw_feeds]

        # 3. Execute batch ML pipeline
        print(f"[worker] Running batch inference on {len(texts)} texts...")
        inferences = score_texts(texts)
        entities_list = extract_entities_batch(texts)
        keywords_list = extract_keywords_batch(texts)

        # 4. Generate rationales and prepare writing tasks
        write_tasks = []
        processed_metadata = []
        
        for job, raw, inference, entities, keywords in zip(valid_jobs, valid_raw_feeds, inferences, entities_list, keywords_list):
            ticker_val = entities.get('ticker') or raw.get('ticker') or 'UNKNOWN'
            company_val = entities.get('company') or 'Unknown Company'
            
            rationale = generate_rationale(
                raw['category'], inference['label'],
                company_val, ticker_val, keywords,
            )
            
            enrichment = {
                'ticker': ticker_val,
                'company': company_val,
                'keywords': keywords,
            }
            
            task = write_result(conn, str(job['id']), raw, inference, enrichment, rationale)
            write_tasks.append(task)
            processed_metadata.append((job, raw, inference, entities, keywords, rationale))

        # Write results in parallel
        print(f"[worker] Writing {len(write_tasks)} results concurrently to DB...")
        event_ids_results = await asyncio.gather(*write_tasks, return_exceptions=True)

        # 5. Trigger alerts in parallel for notable scores
        alert_tasks = []
        for event_id, metadata in zip(event_ids_results, processed_metadata):
            job, raw, inference, entities, keywords, rationale = metadata
            if isinstance(event_id, Exception):
                await mark_failed(conn, str(job['id']), job['attempts'], f"Write error: {event_id}")
                print(f"[worker] Failed to write result for job {job['id']}: {event_id}")
            else:
                ticker_val = entities.get('ticker') or raw.get('ticker') or 'UNKNOWN'
                print(f"[worker] Processed job {job['id']}: {ticker_val} score={inference['score']} event_id={event_id}")
                
                if inference['score'] >= 70 or inference['score'] <= 30:
                    alert_tasks.append(trigger_alert(supabase_url, service_key, {
                        'event_id':  event_id,
                        'ticker':    ticker_val,
                        'score':     inference['score'],
                        'sentiment': inference['label'],
                        'headline':  raw['title'],
                        'rationale': rationale,
                    }))

        if alert_tasks:
            print(f"[worker] Triggering {len(alert_tasks)} alerts concurrently...")
            await asyncio.gather(*alert_tasks, return_exceptions=True)

    finally:
        await conn.close()

async def trigger_alert(supabase_url: str, service_key: str, payload: dict):
    import httpx
    url = f"{supabase_url}/functions/v1/send-alerts"
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post(
                url,
                json=payload,
                headers={"Authorization": f"Bearer {service_key}"},
                timeout=10,
            )
            if r.status_code != 200:
                print(f"[worker] Alert trigger failed: {r.status_code} {r.text}")
        except Exception as e:
            print(f"[worker] Alert trigger error: {e}")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("nse-sentiment-secrets")],
    schedule=modal.Period(minutes=5),
    timeout=120,
)
async def test_trigger():
    import httpx
    supabase_url = os.environ["SUPABASE_URL"]
    
    # Get base URL (e.g. https://mmkkfpdwyxqoxjsygiwm.supabase.co)
    base_url = supabase_url.split("/rest/v1")[0].rstrip("/")
    anon_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ta2tmcGR3eXhxb3hqc3lnaXdtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDc4NTksImV4cCI6MjA5NzcyMzg1OX0.UnQejaGkEqTf7exj7aaNrxCICTmy2kbpYD_agJlg8ig"
    
    print(f"[test] Triggering poll-feeds at {base_url}/functions/v1/poll-feeds...")
    async with httpx.AsyncClient() as client:
        try:
            r = await client.post(
                f"{base_url}/functions/v1/poll-feeds",
                headers={
                    "Authorization": f"Bearer {anon_key}",
                    "apikey": anon_key,
                },
                timeout=60.0,
            )
            print(f"[test] poll-feeds status: {r.status_code}")
            print(f"[test] poll-feeds response: {r.text}")
        except Exception as e:
            print(f"[test] poll-feeds error: {e}")

@app.function(
    image=image,
    secrets=[modal.Secret.from_name("nse-sentiment-secrets")],
)
async def test_keys():
    import os
    print("[test] Environment variable keys:")
    for k in sorted(os.environ.keys()):
        # Print only keys, do not leak actual secret values
        print(f"[test]   {k}")


