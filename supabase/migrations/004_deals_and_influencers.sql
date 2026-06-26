-- Migration 004: NSE Bulk/Block Deals & Influencer Sentiments
-- Adds support for tracking institutional flow and media/influencer sentiment.

CREATE TABLE IF NOT EXISTS nse_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  deal_date DATE NOT NULL,
  client_name TEXT NOT NULL,
  deal_type TEXT NOT NULL CHECK (deal_type IN ('BUY', 'SELL')),
  quantity BIGINT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  value_crores NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS influencer_sentiments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  channel_name TEXT NOT NULL,
  video_title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  video_timestamp TEXT NOT NULL,
  ticker TEXT NOT NULL,
  company_name TEXT NOT NULL,
  sentiment sentiment_label NOT NULL,
  score SMALLINT NOT NULL CHECK (score >= 0 AND score <= 100),
  transcript_chunk TEXT NOT NULL,
  published_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE nse_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE influencer_sentiments ENABLE ROW LEVEL SECURITY;

-- Select policies
CREATE POLICY public_read_nse_deals ON nse_deals FOR SELECT TO public USING (true);
CREATE POLICY public_read_influencer_sentiments ON influencer_sentiments FOR SELECT TO public USING (true);

-- Service role write policies
CREATE POLICY service_write_nse_deals ON nse_deals FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY service_write_influencer_sentiments ON influencer_sentiments FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_nse_deals_ticker ON nse_deals (ticker);
CREATE INDEX IF NOT EXISTS idx_nse_deals_date ON nse_deals (deal_date DESC);
CREATE INDEX IF NOT EXISTS idx_influencer_sentiments_ticker ON influencer_sentiments (ticker);
CREATE INDEX IF NOT EXISTS idx_influencer_sentiments_date ON influencer_sentiments (published_at DESC);
