export type FeedCategory =
  | 'announcements' | 'annual_report' | 'board_meeting'
  | 'corporate_action' | 'buyback' | 'financial_results'
  | 'insider_trading' | 'investor_complaints' | 'shareholding_pattern'
  | 'corporate_governance'

export type SentimentLabel = 'positive' | 'neutral' | 'negative'

export interface AnalyzedEvent {
  id: string
  raw_feed_id: string
  ticker: string
  company_name: string
  category: FeedCategory
  headline: string
  sentiment: SentimentLabel
  score: number            // 0–100 integer
  rationale: string
  keywords: string[]
  pub_date: string         // ISO 8601
  analyzed_at: string
  model_version: string
}

export interface CompanyAgg {
  ticker: string
  company_name: string
  avg_score: number
  positive_count: number
  neutral_count: number
  negative_count: number
  total_count: number
  last_sentiment: SentimentLabel | null
  last_score: number | null
  last_event_at: string | null
  score_7d_avg: number | null
  updated_at: string
}

export interface Watchlist {
  id: string
  user_id: string
  ticker: string
  alert_above: number | null
  alert_below: number | null
  created_at: string
}

// API response envelopes
export interface PaginatedEvents {
  events: AnalyzedEvent[]
  cursor: string | null        // ISO timestamp — pass as ?cursor= for next page
  total: number
}

export interface DashboardSummary {
  top_positive: CompanyAgg[]  // top 10 by avg_score DESC
  top_negative: CompanyAgg[]  // top 10 by avg_score ASC
  category_breakdown: CategoryBreakdown[]
  total_today: number
  avg_score_today: number
  market_open: boolean
}

export interface CategoryBreakdown {
  category: FeedCategory
  positive: number
  neutral: number
  negative: number
  avg_score: number
}

export interface CompanyProfile {
  agg: CompanyAgg
  recent_events: AnalyzedEvent[]   // last 50
  cursor: string | null
}

// UI display helpers
export const CATEGORY_LABELS: Record<FeedCategory, string> = {
  announcements: 'Announcement',
  annual_report: 'Annual Report',
  board_meeting: 'Board Meeting',
  corporate_action: 'Corp. Action',
  buyback: 'Buyback',
  financial_results: 'Financials',
  insider_trading: 'Insider Trade',
  investor_complaints: 'Inv. Complaints',
  shareholding_pattern: 'Shareholding',
  corporate_governance: 'Corp. Governance',
}

export function scoreToLabel(score: number): string {
  if (score >= 75) return 'Strong positive'
  if (score >= 55) return 'Mildly positive'
  if (score >= 45) return 'Neutral'
  if (score >= 25) return 'Mildly negative'
  return 'Strong negative'
}

export function scoreToColor(score: number): string {
  if (score >= 75) return '#16a34a'   // green-600
  if (score >= 55) return '#65a30d'   // lime-600
  if (score >= 45) return '#ca8a04'   // yellow-600
  if (score >= 25) return '#ea580c'   // orange-600
  return '#dc2626'                     // red-600
}
