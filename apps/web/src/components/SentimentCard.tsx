'use client'
import { useState } from 'react'
import { AnalyzedEvent, CATEGORY_LABELS, scoreToColor, scoreToLabel } from '@nse-sentiment/types'
import Link from 'next/link'

interface SentimentCardProps {
  event: AnalyzedEvent
}

export function SentimentCard({ event }: SentimentCardProps) {
  const color = scoreToColor(event.score)
  const label = scoreToLabel(event.score)
  const [expanded, setExpanded] = useState(false)

  const formattedDate = new Date(event.pub_date).toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  const hasHighlights = event.highlights && Object.keys(event.highlights).length > 0
  const hasPdfSummary = !!event.pdf_summary
  const hasRichData    = hasHighlights || hasPdfSummary

  return (
    <div className="glass glass-hover rounded-xl p-5 flex flex-col md:flex-row gap-5 items-start md:items-center">
      {/* Sentiment Gauge */}
      <div
        className="flex flex-col items-center justify-center shrink-0 w-24 h-24 rounded-full border-4 relative"
        style={{ borderColor: color }}
      >
        <span className="text-2xl font-black" style={{ color }}>{event.score}</span>
        <span className="text-[10px] uppercase font-bold tracking-wider opacity-80" style={{ color }}>
          {event.sentiment}
        </span>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-2">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/company/${event.ticker}`}
            className="text-sm font-black tracking-wider bg-violet-950/50 hover:bg-violet-900/50 border border-violet-500/30 text-violet-300 px-2 py-0.5 rounded transition"
          >
            {event.ticker}
          </Link>
          <span className="text-xs text-muted-foreground">{event.company_name}</span>
          <span className="text-xs bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium ml-auto">
            {CATEGORY_LABELS[event.category] || event.category}
          </span>
        </div>

        {/* Headline */}
        <h3 className="text-base font-bold leading-snug text-slate-100 hover:text-violet-400 transition">
          {event.pdf_url ? (
            <a href={event.pdf_url} target="_blank" rel="noreferrer">
              {event.headline}
            </a>
          ) : (
            <a
              href="https://www.nseindia.com/companies-listing/corporate-filings-announcements"
              target="_blank"
              rel="noreferrer"
            >
              {event.headline}
            </a>
          )}
        </h3>

        {/* AI Rationale */}
        <p className="text-xs text-slate-300 bg-slate-950/60 p-2.5 rounded border border-slate-900 leading-relaxed">
          <span className="font-semibold text-violet-400">Analysis: </span>
          {event.rationale}
        </p>

        {/* Rich PDF data — collapsible */}
        {hasRichData && (
          <>
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1.5 text-[11px] text-violet-400 hover:text-violet-300 transition font-medium"
            >
              <span>{expanded ? '▴ Show less' : '▾ Show filing details'}</span>
              {hasHighlights && !expanded && (
                <span className="bg-violet-900/40 border border-violet-700/40 text-violet-300 px-1.5 py-0.5 rounded text-[10px]">
                  {Object.keys(event.highlights!).length} metrics
                </span>
              )}
            </button>

            {expanded && (
              <div className="space-y-3 mt-1">
                {/* Financial Highlights Table */}
                {hasHighlights && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800">
                          {Object.keys(event.highlights!).map(key => (
                            <th
                              key={key}
                              className="text-left text-[10px] uppercase tracking-wider text-slate-500 pb-1.5 pr-4 font-semibold"
                            >
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          {Object.values(event.highlights!).map((val, i) => (
                            <td
                              key={i}
                              className="pt-1.5 pr-4 text-slate-200 font-medium whitespace-nowrap"
                            >
                              {val}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* PDF Summary */}
                {hasPdfSummary && (
                  <div className="bg-slate-950/70 border border-violet-900/30 rounded p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-wider text-violet-500 font-semibold">
                        📄 Filing Summary
                      </span>
                      {event.pdf_url && (
                        <a
                          href={event.pdf_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[10px] text-violet-400 hover:text-violet-300 underline underline-offset-2 transition"
                        >
                          View source PDF ↗
                        </a>
                      )}
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{event.pdf_summary}</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Keywords & Metadata */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap gap-1.5">
            {event.keywords.map((kw, i) => (
              <span
                key={i}
                className="text-[10px] bg-slate-900/60 text-slate-400 border border-slate-800/80 px-2 py-0.5 rounded"
              >
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
