import { AnalyzedEvent, CATEGORY_LABELS, scoreToColor, scoreToLabel } from '@nse-sentiment/types'
import Link from 'next/link'

interface SentimentCardProps {
  event: AnalyzedEvent
}

export function SentimentCard({ event }: SentimentCardProps) {
  const color = scoreToColor(event.score)
  const label = scoreToLabel(event.score)
  const formattedDate = new Date(event.pub_date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="glass glass-hover rounded-xl p-5 flex flex-col md:flex-row gap-5 items-start md:items-center">
      {/* Sentiment Gauge */}
      <div className="flex flex-col items-center justify-center shrink-0 w-24 h-24 rounded-full border-4 relative" style={{ borderColor: color }}>
        <span className="text-2xl font-black" style={{ color: color }}>{event.score}</span>
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80" style={{ color: color }}>{event.sentiment}</span>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Ticker Link */}
          <Link 
            href={`/company/${event.ticker}`}
            className="text-sm font-black tracking-wider bg-violet-950/50 hover:bg-violet-900/50 border border-violet-500/30 text-violet-300 px-2 py-0.5 rounded transition"
          >
            {event.ticker}
          </Link>
          
          <span className="text-xs text-muted-foreground">{event.company_name}</span>

          {/* Category Pill */}
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium ml-auto">
            {CATEGORY_LABELS[event.category] || event.category}
          </span>
        </div>

        <h3 className="text-base font-bold leading-snug text-slate-100 hover:text-violet-400 transition">
          <a href={`https://www.nseindia.com/companies-listing/corporate-filings-announcements`} target="_blank" rel="noreferrer">
            {event.headline}
          </a>
        </h3>

        {/* AI Rationale */}
        <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-900 leading-relaxed">
          <span className="font-semibold text-violet-400">Analysis: </span>
          {event.rationale}
        </p>

        {/* Keywords & Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {event.keywords.map((kw, i) => (
              <span key={i} className="text-[10px] bg-slate-900/60 text-slate-400 border border-slate-800/80 px-2 py-0.5 rounded">
                #{kw}
              </span>
            ))}
          </div>

          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
            {formattedDate} (IST)
          </span>
        </div>
      </div>
    </div>
  )
}
