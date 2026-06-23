-- 3.1 Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- 3.2 Enum Types
CREATE TYPE feed_category AS ENUM (
  'announcements', 'annual_report', 'board_meeting', 'corporate_action',
  'buyback', 'financial_results', 'insider_trading',
  'investor_complaints', 'shareholding_pattern'
);
CREATE TYPE sentiment_label AS ENUM ('positive', 'neutral', 'negative');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'done', 'failed');

-- 3.3 Table: raw_feed (partitioned monthly by pub_date)
CREATE TABLE raw_feed (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  guid TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  description TEXT,
  pub_date TIMESTAMPTZ NOT NULL,
  category feed_category NOT NULL,
  ticker TEXT,
  raw_xml TEXT,
  processed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guid, pub_date)
) PARTITION BY RANGE (pub_date);

-- Unique index per partition or global on partition key is handled in range partition
-- 3.4 Table: analyzed_events (partitioned monthly by pub_date)
CREATE TABLE analyzed_events (
  id UUID NOT NULL DEFAULT uuid_generate_v4(),
  raw_feed_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  category feed_category NOT NULL,
  headline TEXT NOT NULL,
  sentiment sentiment_label NOT NULL,
  score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
  rationale TEXT NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  pub_date TIMESTAMPTZ NOT NULL,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version TEXT NOT NULL DEFAULT 'finbert-base-v1',
  pdf_url TEXT,
  pdf_summary TEXT,
  highlights JSONB,
  PRIMARY KEY (id, pub_date)
) PARTITION BY RANGE (pub_date);

-- Create Initial Partitions for raw_feed and analyzed_events
-- Covers 2026-05 through 2026-12 (to ensure local time June 2026 is fully covered)
CREATE TABLE raw_feed_y2026m05 PARTITION OF raw_feed FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
CREATE TABLE raw_feed_y2026m06 PARTITION OF raw_feed FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE raw_feed_y2026m07 PARTITION OF raw_feed FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE raw_feed_y2026m08 PARTITION OF raw_feed FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE raw_feed_y2026m09 PARTITION OF raw_feed FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE raw_feed_y2026m10 PARTITION OF raw_feed FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE raw_feed_y2026m11 PARTITION OF raw_feed FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE raw_feed_y2026m12 PARTITION OF raw_feed FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

CREATE TABLE analyzed_events_y2026m05 PARTITION OF analyzed_events FOR VALUES FROM ('2026-05-01 00:00:00+00') TO ('2026-06-01 00:00:00+00');
CREATE TABLE analyzed_events_y2026m06 PARTITION OF analyzed_events FOR VALUES FROM ('2026-06-01 00:00:00+00') TO ('2026-07-01 00:00:00+00');
CREATE TABLE analyzed_events_y2026m07 PARTITION OF analyzed_events FOR VALUES FROM ('2026-07-01 00:00:00+00') TO ('2026-08-01 00:00:00+00');
CREATE TABLE analyzed_events_y2026m08 PARTITION OF analyzed_events FOR VALUES FROM ('2026-08-01 00:00:00+00') TO ('2026-09-01 00:00:00+00');
CREATE TABLE analyzed_events_y2026m09 PARTITION OF analyzed_events FOR VALUES FROM ('2026-09-01 00:00:00+00') TO ('2026-10-01 00:00:00+00');
CREATE TABLE analyzed_events_y2026m10 PARTITION OF analyzed_events FOR VALUES FROM ('2026-10-01 00:00:00+00') TO ('2026-11-01 00:00:00+00');
CREATE TABLE analyzed_events_y2026m11 PARTITION OF analyzed_events FOR VALUES FROM ('2026-11-01 00:00:00+00') TO ('2026-12-01 00:00:00+00');
CREATE TABLE analyzed_events_y2026m12 PARTITION OF analyzed_events FOR VALUES FROM ('2026-12-01 00:00:00+00') TO ('2027-01-01 00:00:00+00');

-- 3.3 Indexes
CREATE INDEX idx_raw_feed_unprocessed ON raw_feed (pub_date DESC) WHERE processed = false;
CREATE INDEX idx_raw_feed_category_date ON raw_feed (category, pub_date DESC);

-- 3.4 Indexes
CREATE INDEX idx_ae_ticker_date_covering ON analyzed_events (ticker, pub_date DESC) INCLUDE (sentiment, score, headline, category, rationale);
CREATE INDEX idx_ae_category_sentiment_date ON analyzed_events (category, sentiment, pub_date DESC);
CREATE INDEX idx_ae_score_date ON analyzed_events (score DESC, pub_date DESC) WHERE score >= 60;
CREATE INDEX idx_ae_ticker_trgm ON analyzed_events USING gin (ticker gin_trgm_ops);
CREATE INDEX idx_ae_keywords_gin ON analyzed_events USING gin (keywords);
CREATE INDEX idx_ae_raw_feed_id ON analyzed_events (raw_feed_id);

-- 3.5 Table: company_agg
CREATE TABLE company_agg (
  ticker TEXT PRIMARY KEY,
  company_name TEXT NOT NULL,
  avg_score NUMERIC(5,2),
  positive_count INT NOT NULL DEFAULT 0,
  neutral_count INT NOT NULL DEFAULT 0,
  negative_count INT NOT NULL DEFAULT 0,
  total_count INT NOT NULL DEFAULT 0,
  last_sentiment sentiment_label,
  last_score SMALLINT,
  last_event_at TIMESTAMPTZ,
  score_7d_avg NUMERIC(5,2),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ca_score_desc ON company_agg (avg_score DESC);
CREATE INDEX idx_ca_last_event ON company_agg (last_event_at DESC);

-- 3.6 Table: job_queue
CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  raw_feed_id UUID NOT NULL,
  status job_status NOT NULL DEFAULT 'pending',
  attempts SMALLINT NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMPTZ,
  done_at TIMESTAMPTZ
);

CREATE INDEX idx_jq_pending_created ON job_queue (created_at ASC) WHERE status = 'pending';
CREATE INDEX idx_jq_done_at ON job_queue (done_at) WHERE status IN ('done','failed');

-- 3.7 Table: watchlists
CREATE TABLE watchlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  ticker TEXT NOT NULL,
  alert_above SMALLINT CHECK (alert_above >= 0 AND alert_above <= 100),
  alert_below SMALLINT CHECK (alert_below >= 0 AND alert_below <= 100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, ticker)
);

-- 3.8 Triggers & Functions
CREATE OR REPLACE FUNCTION enqueue_analysis_job()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO job_queue (raw_feed_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Wait, the trigger must be created on partitions or on partitioned table (in PG 15 it can be created on the partitioned table directly)
CREATE TRIGGER trg_enqueue_analysis_job
AFTER INSERT ON raw_feed
FOR EACH ROW
EXECUTE FUNCTION enqueue_analysis_job();

CREATE OR REPLACE FUNCTION update_company_agg()
RETURNS TRIGGER AS $$
DECLARE
  old_avg NUMERIC(5,2);
  old_total INT;
  new_avg NUMERIC(5,2);
  new_pos INT := 0;
  new_neu INT := 0;
  new_neg INT := 0;
BEGIN
  -- Get existing values
  SELECT avg_score, total_count, positive_count, neutral_count, negative_count
  INTO old_avg, old_total, new_pos, new_neu, new_neg
  FROM company_agg
  WHERE ticker = NEW.ticker;

  IF NOT FOUND THEN
    old_avg := 0.00;
    old_total := 0;
    new_pos := 0;
    new_neu := 0;
    new_neg := 0;
  END IF;

  -- Update counts
  IF NEW.sentiment = 'positive' THEN
    new_pos := new_pos + 1;
  ELSIF NEW.sentiment = 'neutral' THEN
    new_neu := new_neu + 1;
  ELSIF NEW.sentiment = 'negative' THEN
    new_neg := new_neg + 1;
  END IF;

  -- Running average formula
  new_avg := (COALESCE(old_avg, 0) * old_total + NEW.score) / (old_total + 1);

  INSERT INTO company_agg (
    ticker, company_name, avg_score, positive_count, neutral_count, negative_count, total_count,
    last_sentiment, last_score, last_event_at, updated_at
  )
  VALUES (
    NEW.ticker, NEW.company_name, new_avg, new_pos, new_neu, new_neg, old_total + 1,
    NEW.sentiment, NEW.score, NEW.pub_date, NOW()
  )
  ON CONFLICT (ticker) DO UPDATE
  SET
    avg_score = EXCLUDED.avg_score,
    positive_count = EXCLUDED.positive_count,
    neutral_count = EXCLUDED.neutral_count,
    negative_count = EXCLUDED.negative_count,
    total_count = EXCLUDED.total_count,
    last_sentiment = CASE WHEN EXCLUDED.last_event_at > company_agg.last_event_at THEN EXCLUDED.last_sentiment ELSE company_agg.last_sentiment END,
    last_score = CASE WHEN EXCLUDED.last_event_at > company_agg.last_event_at THEN EXCLUDED.last_score ELSE company_agg.last_score END,
    last_event_at = CASE WHEN EXCLUDED.last_event_at > company_agg.last_event_at THEN EXCLUDED.last_event_at ELSE company_agg.last_event_at END,
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_company_agg
AFTER INSERT ON analyzed_events
FOR EACH ROW
EXECUTE FUNCTION update_company_agg();

-- claim_jobs RPC
CREATE OR REPLACE FUNCTION claim_jobs(batch_size INT DEFAULT 10)
RETURNS SETOF job_queue AS $$
BEGIN
  RETURN QUERY
  UPDATE job_queue SET status='processing', claimed_at=NOW(), attempts=attempts+1
  WHERE id IN (
    SELECT id FROM job_queue WHERE status='pending'
    ORDER BY created_at ASC LIMIT batch_size
    FOR UPDATE SKIP LOCKED
  ) RETURNING *;
END;
$$ LANGUAGE plpgsql;

-- 3.9 Row Level Security
ALTER TABLE raw_feed ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyzed_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_agg ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY service_write_raw_feed ON raw_feed
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY public_read_analyzed_events ON analyzed_events
  FOR SELECT TO public USING (true);

CREATE POLICY service_write_analyzed_events ON analyzed_events
  FOR INSERT WITH CHECK (true); -- simplified service check or true since workers use service_role

CREATE POLICY public_read_company_agg ON company_agg
  FOR SELECT TO public USING (true);

CREATE POLICY service_write_company_agg ON company_agg
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY service_write_job_queue ON job_queue
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY user_owns_watchlists ON watchlists
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
