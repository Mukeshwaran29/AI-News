'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Activity, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface TrendingTicker {
  ticker: string
  company_name: string
  avg_score: number
  volume: number
}

interface MarketPulseData {
  pulse_score: number
  pulse_label: string
  top_positive: TrendingTicker[]
  top_negative: TrendingTicker[]
  total_events: number
}

export function MarketPulseWidget() {
  const [data, setData] = useState<MarketPulseData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPulse = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch('/api/market-pulse')
      if (res.ok) {
        const d = await res.json()
        setData(d)
      }
    } catch (e) {
      console.error(e)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    fetchPulse()
    const interval = setInterval(() => {
      fetchPulse(true)
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="w-full h-32 glass rounded-2xl animate-pulse border border-white/5"></div>
    )
  }

  if (!data) return null

  // Calculate position on gauge (0-100)
  const pulsePercent = Math.max(0, Math.min(100, data.pulse_score))
  const isBullish = data.pulse_score >= 55
  const isBearish = data.pulse_score <= 45

  return (
    <div className="w-full glass rounded-2xl border border-white/5 overflow-hidden flex flex-col md:flex-row">
      {/* Pulse Gauge */}
      <div className="p-6 md:p-8 flex-1 border-b md:border-b-0 md:border-r border-white/5 bg-gradient-to-br from-slate-950/50 to-slate-900/50 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="h-4 w-4 text-violet-400" />
          <h2 className="text-sm font-bold text-slate-300 uppercase tracking-widest">Market Pulse (24H)</h2>
        </div>
        
        <div className="flex items-end gap-3 mt-4">
          <span className={`text-5xl font-black font-outfit ${isBullish ? 'text-emerald-400' : isBearish ? 'text-rose-400' : 'text-amber-400'}`}>
            {data.pulse_score}
          </span>
          <span className="text-lg font-bold text-slate-400 pb-1 uppercase">{data.pulse_label}</span>
        </div>

        <div className="mt-6 h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
          <div 
            className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${isBullish ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : isBearish ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]'}`}
            style={{ width: `${pulsePercent}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-1.5">
          <AlertCircle className="h-3 w-3" />
          Aggregated from {data.total_events} events today
        </p>
      </div>

      {/* Trending Tickers */}
      <div className="flex-1 flex flex-col sm:flex-row">
        {/* Top Positive */}
        <div className="flex-1 p-6 border-b sm:border-b-0 sm:border-r border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-300">Top Movers (Bullish)</h3>
          </div>
          <div className="space-y-3">
            {data.top_positive.length === 0 ? (
              <p className="text-xs text-slate-500">No strong bullish movers today.</p>
            ) : (
              data.top_positive.map((t) => (
                <Link href={`/company/${t.ticker}`} key={t.ticker} className="flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-200 group-hover:text-emerald-400 transition">{t.ticker}</span>
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{t.company_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-emerald-400">{t.avg_score}</div>
                    <div className="text-[9px] text-slate-500">{t.volume} updates</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Top Negative */}
        <div className="flex-1 p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingDown className="h-4 w-4 text-rose-400" />
            <h3 className="text-sm font-bold text-slate-300">Top Movers (Bearish)</h3>
          </div>
          <div className="space-y-3">
            {data.top_negative.length === 0 ? (
              <p className="text-xs text-slate-500">No strong bearish movers today.</p>
            ) : (
              data.top_negative.map((t) => (
                <Link href={`/company/${t.ticker}`} key={t.ticker} className="flex items-center justify-between group">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-200 group-hover:text-rose-400 transition">{t.ticker}</span>
                    <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{t.company_name}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-black text-rose-400">{t.avg_score}</div>
                    <div className="text-[9px] text-slate-500">{t.volume} updates</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
