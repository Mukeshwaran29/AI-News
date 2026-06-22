'use client'

import { useEffect, useState } from 'react'
import { DashboardSummary, CompanyAgg } from '@nse-sentiment/types'
import { TrendingUp, TrendingDown, Layers, BarChart4 } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-32 glass rounded-2xl"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-96 glass rounded-2xl"></div>
          <div className="h-96 glass rounded-2xl"></div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="glass rounded-xl p-12 text-center border border-white/5">
        <p className="text-sm text-muted-foreground">Failed to load dashboard statistics.</p>
      </div>
    )
  }

  const renderMovers = (companies: CompanyAgg[], type: 'pos' | 'neg') => (
    <div className="space-y-3">
      {companies.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data available.</p>
      ) : (
        companies.map(c => (
          <div key={c.ticker} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-900">
            <div>
              <Link href={`/company/${c.ticker}`} className="text-sm font-black text-slate-100 hover:text-violet-400 transition">
                {c.ticker}
              </Link>
              <div className="text-[10px] text-muted-foreground truncate max-w-[180px]">{c.company_name}</div>
            </div>
            <div className="text-right">
              <div className={`text-sm font-extrabold ${type === 'pos' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {c.avg_score.toFixed(1)}
              </div>
              <div className="text-[9px] text-muted-foreground">Score ({c.total_count} files)</div>
            </div>
          </div>
        ))
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass rounded-xl p-5 border border-white/5 flex items-center gap-4">
          <div className="p-3 bg-violet-500/10 rounded-lg text-violet-400">
            <BarChart4 className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{data.total_today}</div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Filings Processed (24h)</div>
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-white/5 flex items-center gap-4">
          <div className="p-3 bg-fuchsia-500/10 rounded-lg text-fuchsia-400">
            <Layers className="h-6 w-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100">{data.avg_score_today}</div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Market Average Score</div>
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-white/5 flex items-center gap-4">
          <div className={`p-3 rounded-lg ${data.market_open ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${data.market_open ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${data.market_open ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
            </span>
          </div>
          <div>
            <div className="text-lg font-black text-slate-100">{data.market_open ? 'OPEN' : 'CLOSED'}</div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">NSE Market Session</div>
          </div>
        </div>
      </div>

      {/* Movers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass rounded-xl p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-5 w-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-slate-100 font-outfit">Top Positive Movers</h2>
          </div>
          {renderMovers(data.top_positive, 'pos')}
        </div>

        <div className="glass rounded-xl p-6 border border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-5 w-5 text-rose-400" />
            <h2 className="text-lg font-bold text-slate-100 font-outfit">Top Negative Movers</h2>
          </div>
          {renderMovers(data.top_negative, 'neg')}
        </div>
      </div>

      {/* Category Breakdown list */}
      <div className="glass rounded-xl p-6 border border-white/5">
        <h2 className="text-lg font-bold text-slate-100 mb-6 font-outfit">Category Sentiment Profiles (24h)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.category_breakdown.map(c => (
            <div key={c.category} className="p-4 rounded-xl bg-slate-950/60 border border-slate-900 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-200 capitalize">{c.category.replace('_', ' ')}</span>
                <span className="text-xs font-black text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded border border-violet-500/20">
                  Avg Score: {c.avg_score}
                </span>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] text-muted-foreground flex justify-between">
                  <span>Sentiment Balance</span>
                  <span>{c.positive} Pos / {c.neutral} Neu / {c.negative} Neg</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-900 flex overflow-hidden">
                  <div className="bg-emerald-500 h-full" style={{ width: `${c.positive + c.neutral + c.negative > 0 ? (c.positive / (c.positive + c.neutral + c.negative)) * 100 : 0}%` }}></div>
                  <div className="bg-amber-500 h-full" style={{ width: `${c.positive + c.neutral + c.negative > 0 ? (c.neutral / (c.positive + c.neutral + c.negative)) * 100 : 0}%` }}></div>
                  <div className="bg-rose-500 h-full" style={{ width: `${c.positive + c.neutral + c.negative > 0 ? (c.negative / (c.positive + c.neutral + c.negative)) * 100 : 0}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
