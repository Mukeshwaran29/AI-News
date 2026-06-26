'use client'

import { useEffect, useState } from 'react'
import { CompanyProfile } from '@/lib/types'
import { SentimentCard } from '@/components/SentimentCard'
import { ArrowLeft, Landmark, PieChart, ShieldAlert } from 'lucide-react'
import Link from 'next/link'

export default function CompanyProfilePage({ params }: { params: { ticker: string } }) {
  const [profile, setProfile] = useState<CompanyProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchProfile = async (silent = false) => {
      if (!silent) setLoading(true)
      try {
        const res = await fetch(`/api/company/${params.ticker}`)
        if (!res.ok) throw new Error('Company not found')
        const d = await res.json()
        if (isMounted) setProfile(d)
      } catch (err) {
        console.error(err)
      } finally {
        if (isMounted && !silent) setLoading(false)
      }
    }

    fetchProfile()
    const interval = setInterval(() => {
      fetchProfile(true)
    }, 30000)

    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [params.ticker])

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-40 glass rounded-2xl"></div>
        <div className="h-96 glass rounded-2xl"></div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="glass rounded-xl p-12 text-center border border-white/5 space-y-4">
        <p className="text-sm text-muted-foreground">Company profile not found for ticker "{params.ticker}".</p>
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-violet-400 hover:underline">
          <ArrowLeft className="h-3 w-3" /> Back to Feed
        </Link>
      </div>
    )
  }

  const { agg, recent_events } = profile

  return (
    <div className="space-y-6">
      <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-violet-400 hover:underline mb-2">
        <ArrowLeft className="h-3 w-3" /> Back to Feed
      </Link>

      {/* Header Info Banner */}
      <div className="glass rounded-2xl p-6 md:p-8 border border-white/5 bg-gradient-to-br from-violet-950/20 to-slate-950">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-black text-slate-100 font-outfit">{agg.ticker}</h1>
              <span className="text-[10px] px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded font-black">
                ACTIVE
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{agg.company_name}</p>
          </div>

          <div className="flex flex-wrap gap-4 md:self-end">
            <div className="glass px-4 py-2.5 rounded-xl border border-white/5 text-center min-w-[80px]">
              <div className="text-xl font-black text-violet-400">{agg.avg_score.toFixed(1)}</div>
              <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Avg Score</div>
            </div>
            <div className="glass px-4 py-2.5 rounded-xl border border-white/5 text-center min-w-[80px]">
              <div className="text-xl font-black text-emerald-400">{agg.positive_count}</div>
              <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Positive</div>
            </div>
            <div className="glass px-4 py-2.5 rounded-xl border border-white/5 text-center min-w-[80px]">
              <div className="text-xl font-black text-rose-400">{agg.negative_count}</div>
              <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Negative</div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-slate-100 font-outfit">Filing History Timeline</h2>
          <div className="grid gap-4">
            {recent_events.map(event => (
              <SentimentCard key={event.id} event={event} />
            ))}
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <div className="glass rounded-xl p-5 border border-white/5 space-y-4">
            <h3 className="text-sm font-bold text-slate-200 border-b border-slate-900 pb-2">Analysis Breakdown</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total filings analyzed</span>
                <span className="font-bold text-slate-200">{agg.total_count}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Last event date</span>
                <span className="font-bold text-slate-200">
                  {agg.last_event_at ? new Date(agg.last_event_at).toLocaleDateString() : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Last sentiment label</span>
                <span className={`font-bold capitalize ${
                  agg.last_sentiment === 'positive' ? 'text-emerald-400' :
                  agg.last_sentiment === 'negative' ? 'text-rose-400' : 'text-amber-400'
                }`}>{agg.last_sentiment || 'None'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
