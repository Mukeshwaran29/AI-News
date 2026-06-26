'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Youtube, Landmark, Newspaper, ExternalLink } from 'lucide-react'
import { AnalyzedEvent } from '@/lib/types'

interface Deal {
  id: string
  ticker: string
  company_name: string
  deal_date: string
  client_name: string
  deal_type: 'BUY' | 'SELL'
  quantity: number
  price: number
  value_crores: number
}

interface InfluencerSentiment {
  id: string
  channel_name: string
  video_title: string
  video_url: string
  video_timestamp: string
  ticker: string
  company_name: string
  sentiment: 'positive' | 'neutral' | 'negative'
  score: number
  transcript_chunk: string
  published_at: string
}

export function SentimentStream({ initialEvents }: { initialEvents: AnalyzedEvent[] }) {
  const [activeTab, setActiveTab] = useState<'news' | 'deals' | 'youtube'>('news')
  const [events, setEvents] = useState<AnalyzedEvent[]>(initialEvents)
  const [deals, setDeals] = useState<Deal[]>([])
  const [influencers, setInfluencers] = useState<InfluencerSentiment[]>([])
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      if (activeTab === 'news') {
        const res = await fetch('/api/feed?limit=20')
        const data = await res.json()
        if (data.events) setEvents(data.events)
      } else if (activeTab === 'deals') {
        const res = await fetch('/api/deals')
        const data = await res.json()
        if (data.deals) setDeals(data.deals)
      } else if (activeTab === 'youtube') {
        const res = await fetch('/api/youtube')
        const data = await res.json()
        if (data.sentiments) setInfluencers(data.sentiments)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeTab])

  return (
    <div className="space-y-6">
      {/* Stream Tabs */}
      <div className="flex border-b border-white/5 gap-2">
        <button
          onClick={() => setActiveTab('news')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition ${
            activeTab === 'news'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Newspaper className="h-4 w-4" />
          NSE Filings (FinBERT)
        </button>

        <button
          onClick={() => setActiveTab('deals')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition ${
            activeTab === 'deals'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Landmark className="h-4 w-4" />
          Bulk/Block Deals
        </button>

        <button
          onClick={() => setActiveTab('youtube')}
          className={`flex items-center gap-2 px-5 py-3 border-b-2 text-sm font-bold transition ${
            activeTab === 'youtube'
              ? 'border-violet-500 text-violet-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Youtube className="h-4 w-4" />
          YouTube Influencers
        </button>

        <button
          onClick={fetchData}
          disabled={loading}
          className="ml-auto p-2 text-slate-400 hover:text-slate-200 transition"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stream Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 glass rounded-xl border border-white/5"></div>
            ))}
          </div>
        ) : activeTab === 'news' ? (
          events.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-12">No recent corporate filings found.</p>
          ) : (
            events.map(event => (
              <div
                key={event.id}
                className="glass rounded-xl p-5 border border-white/5 bg-slate-950/20 hover:bg-slate-950/40 transition relative overflow-hidden group"
              >
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                      event.sentiment === 'positive'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : event.sentiment === 'negative'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {event.sentiment} ({event.score})
                  </span>
                </div>
                <div className="max-w-3xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-violet-400 tracking-wider uppercase">
                      {event.ticker}
                    </span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">
                      {event.company_name}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-violet-400 transition">
                    {event.headline}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {event.rationale}
                  </p>
                  
                  {/* Category highlights */}
                  {event.highlights && Object.keys(event.highlights).length > 0 && (
                    <div className="my-2 flex flex-wrap gap-2">
                      {Object.entries(event.highlights).map(([key, value]) => (
                        <div key={key} className="bg-slate-900/80 border border-slate-800/80 rounded-md px-2.5 py-1 text-[10px] flex gap-1.5 items-center">
                          <span className="text-slate-400 font-medium capitalize">{key}:</span>
                          <span className="text-violet-300 font-extrabold">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {event.pdf_url && (
                    <div className="pt-1 flex items-center gap-2">
                      <a
                        href={event.pdf_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-violet-400 hover:text-violet-300 flex items-center gap-1 transition"
                      >
                        <ExternalLink className="h-3 w-3" /> View Original Filing PDF
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        ) : activeTab === 'deals' ? (
          deals.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-12">No recent bulk or block deals found.</p>
          ) : (
            deals.map(deal => (
              <div
                key={deal.id}
                className="glass rounded-xl p-5 border border-white/5 bg-slate-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-violet-400 tracking-wider">{deal.ticker}</span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-[10px] text-muted-foreground">{deal.company_name}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 mt-1">
                    {deal.client_name}
                  </h3>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    Date: {deal.deal_date} • Price: ₹{deal.price.toFixed(2)} • Qty: {deal.quantity.toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-black text-slate-100">₹{deal.value_crores.toFixed(2)} Cr</div>
                    <div className="text-[9px] text-muted-foreground uppercase font-bold tracking-wider">Transaction Value</div>
                  </div>
                  <span
                    className={`flex items-center gap-1 text-[10px] font-black uppercase px-2.5 py-1 rounded border ${
                      deal.deal_type === 'BUY'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {deal.deal_type === 'BUY' ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {deal.deal_type}
                  </span>
                </div>
              </div>
            ))
          )
        ) : (
          influencers.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-12">No recent influencer video analysis found.</p>
          ) : (
            influencers.map(inf => (
              <div
                key={inf.id}
                className="glass rounded-xl p-5 border border-white/5 bg-slate-950/20 hover:bg-slate-950/40 transition relative overflow-hidden group"
              >
                <div className="absolute right-4 top-4 flex items-center gap-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                      inf.sentiment === 'positive'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : inf.sentiment === 'negative'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {inf.sentiment} ({inf.score})
                  </span>
                </div>
                <div className="max-w-3xl space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-rose-400 flex items-center gap-1">
                      <Youtube className="h-3.5 w-3.5" /> {inf.channel_name}
                    </span>
                    <span className="text-[10px] text-muted-foreground">•</span>
                    <span className="text-xs font-black text-violet-400">{inf.ticker}</span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-100 group-hover:text-rose-400 transition">
                    {inf.video_title}
                  </h3>
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-900 text-xs italic text-slate-300 leading-relaxed">
                    &quot;{inf.transcript_chunk}&quot;
                  </div>
                  <div className="text-[10px] text-muted-foreground flex items-center justify-between">
                    <span>Cited at timestamp: <strong className="text-rose-400">{inf.video_timestamp}</strong></span>
                    <a
                      href={inf.video_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-rose-400 hover:text-rose-300 flex items-center gap-1 transition font-bold"
                    >
                      Watch Video <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  )
}
