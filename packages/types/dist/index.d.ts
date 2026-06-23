export type FeedCategory = 'announcements' | 'annual_report' | 'board_meeting' | 'corporate_action' | 'buyback' | 'financial_results' | 'insider_trading' | 'investor_complaints' | 'shareholding_pattern' | 'corporate_governance';
export type SentimentLabel = 'positive' | 'neutral' | 'negative';
export interface AnalyzedEvent {
    id: string;
    raw_feed_id: string;
    ticker: string;
    company_name: string;
    category: FeedCategory;
    headline: string;
    sentiment: SentimentLabel;
    score: number;
    rationale: string;
    keywords: string[];
    pub_date: string;
    analyzed_at: string;
    model_version: string;
}
export interface CompanyAgg {
    ticker: string;
    company_name: string;
    avg_score: number;
    positive_count: number;
    neutral_count: number;
    negative_count: number;
    total_count: number;
    last_sentiment: SentimentLabel | null;
    last_score: number | null;
    last_event_at: string | null;
    score_7d_avg: number | null;
    updated_at: string;
}
export interface Watchlist {
    id: string;
    user_id: string;
    ticker: string;
    alert_above: number | null;
    alert_below: number | null;
    created_at: string;
}
export interface PaginatedEvents {
    events: AnalyzedEvent[];
    cursor: string | null;
    total: number;
}
export interface DashboardSummary {
    top_positive: CompanyAgg[];
    top_negative: CompanyAgg[];
    category_breakdown: CategoryBreakdown[];
    total_today: number;
    avg_score_today: number;
    market_open: boolean;
}
export interface CategoryBreakdown {
    category: FeedCategory;
    positive: number;
    neutral: number;
    negative: number;
    avg_score: number;
}
export interface CompanyProfile {
    agg: CompanyAgg;
    recent_events: AnalyzedEvent[];
    cursor: string | null;
}
export declare const CATEGORY_LABELS: Record<FeedCategory, string>;
export declare function scoreToLabel(score: number): string;
export declare function scoreToColor(score: number): string;
