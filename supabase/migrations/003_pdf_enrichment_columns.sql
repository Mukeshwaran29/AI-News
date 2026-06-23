-- Migration 003: PDF enrichment columns on analyzed_events
-- Adds pdf_url, pdf_summary, and highlights to store data
-- extracted from actual NSE filing PDFs.

ALTER TABLE analyzed_events
  ADD COLUMN IF NOT EXISTS pdf_url     TEXT,
  ADD COLUMN IF NOT EXISTS pdf_summary TEXT,
  ADD COLUMN IF NOT EXISTS highlights  JSONB DEFAULT '{}';

-- Index for fast lookup of events that have been PDF-enriched
CREATE INDEX IF NOT EXISTS idx_analyzed_events_pdf_url
  ON analyzed_events (pdf_url)
  WHERE pdf_url IS NOT NULL;

COMMENT ON COLUMN analyzed_events.pdf_url     IS 'Direct URL to the NSE filing PDF';
COMMENT ON COLUMN analyzed_events.pdf_summary IS '2-3 sentence LLM-generated summary from filing content';
COMMENT ON COLUMN analyzed_events.highlights  IS 'Structured financial metrics e.g. {"Revenue":"₹2,340 Cr +12% YoY"}';
