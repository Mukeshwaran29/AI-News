import modal
import asyncio
import os

# Categories that typically contain PDFs with financial data
PDF_CATEGORIES = {
    "financial_results",
    "annual_report",
    "corporate_governance",
    "shareholding_pattern",
    "board_meeting",
}



app = modal.App("nse-sentiment-worker")

def download_models():
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    from sentence_transformers import SentenceTransformer
    import pdfplumber  # noqa: F401 — ensure package is available in image
    
    MODEL_ID = "ProsusAI/finbert"
    AutoTokenizer.from_pretrained(MODEL_ID)
    AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
    SentenceTransformer("all-MiniLM-L6-v2")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install_from_requirements("requirements.txt")
    .pip_install("https://github.com/explosion/spacy-models/releases/download/en_core_web_sm-3.7.1/en_core_web_sm-3.7.1.tar.gz")
    .run_function(download_models)
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
    from pdf_extractor import extract_pdf_text
    from llm_analysis import analyze_filing
    
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

        # 4. Async PDF download + LLM analysis (only for PDF-bearing categories)
        async def _noop_none(): return None
        async def _noop_dict(): return {}

        print(f"[worker] Starting async PDF enrichment step...")
        pdf_tasks = []
        for raw in valid_raw_feeds:
            if raw.get('category') in PDF_CATEGORIES and raw.get('link'):
                pdf_tasks.append(extract_pdf_text(raw['link']))
            else:
                pdf_tasks.append(_noop_none())

        # Run all PDF downloads concurrently (returns None for non-PDF items)
        pdf_texts_raw = await asyncio.gather(*pdf_tasks, return_exceptions=True)

        # LLM analysis — only for items that produced valid text
        llm_tasks = []
        for raw, pdf_text in zip(valid_raw_feeds, pdf_texts_raw):
            if isinstance(pdf_text, str) and pdf_text.strip():
                llm_tasks.append(analyze_filing(pdf_text, raw.get('category', ''), raw.get('title', '')))
            else:
                llm_tasks.append(_noop_dict())

        llm_results = await asyncio.gather(*llm_tasks, return_exceptions=True)
        print(f"[worker] PDF enrichment done. "
              f"{sum(1 for r in llm_results if isinstance(r, dict) and r)} items enriched.")

        # 5. Generate rationales and prepare writing tasks
        write_tasks = []
        processed_metadata = []
        
        for idx, (job, raw, inference, entities, keywords) in enumerate(
            zip(valid_jobs, valid_raw_feeds, inferences, entities_list, keywords_list)
        ):
            ticker_val = entities.get('ticker') or raw.get('ticker') or 'UNKNOWN'
            company_val = entities.get('company') or 'Unknown Company'

            # Merge LLM result
            llm_result = llm_results[idx] if not isinstance(llm_results[idx], Exception) else {}
            pdf_text_for_item = pdf_texts_raw[idx] if not isinstance(pdf_texts_raw[idx], Exception) else None

            # Use LLM-generated sentiment_reason to augment rationale if available
            base_rationale = generate_rationale(
                raw['category'], inference['label'],
                company_val, ticker_val, keywords,
            )
            if isinstance(llm_result, dict) and llm_result.get('sentiment_reason'):
                rationale = llm_result['sentiment_reason']
            else:
                rationale = base_rationale

            enrichment = {
                'ticker':      ticker_val,
                'company':     company_val,
                'keywords':    keywords,
                'pdf_url':     raw.get('link') if (isinstance(llm_result, dict) and llm_result) else None,
                'pdf_summary': llm_result.get('summary')     if isinstance(llm_result, dict) else None,
                'highlights':  llm_result.get('highlights')  if isinstance(llm_result, dict) else None,
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


