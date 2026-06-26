'use client'

import { useEffect, useState } from 'react'
import { AnalyzedEvent, CATEGORY_LABELS } from '@/lib/types'
import { SentimentCard } from '@/components/SentimentCard'
import { SentimentStream } from '@/components/SentimentStream'
import { Search, SlidersHorizontal, RefreshCw } from 'lucide-react'

export default function LiveFeedPage() {
  const [events, setEvents] = useState<AnalyzedEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [cursor, setCursor] = useState<string | null>(null)
  
  // Filters
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<string>('')
  const [refreshing, setRefreshing] = useState(false);
  const [sortOption, setSortOption] = useState<'date' | 'score'>('date')

  const fetchEvents = async (nextCursor: string | null = null, append = false) => {
    try {
      if (!append) setLoading(true)
      else setLoadingMore(true)

      let url = `/api/feed?limit=25`
      if (category) url += `&category=${category}`
      if (nextCursor) url += `&cursor=${encodeURIComponent(nextCursor)}`

      const res = await fetch(url)
      const data = await res.json()

      if (data.events) {
        if (append) {
          setEvents(prev => [...prev, ...data.events])
        } else {
          setEvents(data.events)
        }
        setCursor(data.cursor)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      setLoadingMore(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [category])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchEvents(null, false)
  }

  // Filter events by ticker search
  const filteredEvents = events.filter(e => 
    e.ticker.toLowerCase().includes(search.toLowerCase()) ||
    e.company_name.toLowerCase().includes(search.toLowerCase()) ||
    e.headline.toLowerCase().includes(search.toLowerCase())
  )

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    if (sortOption === 'date') {
      return new Date(b.pub_date).getTime() - new Date(a.pub_date).getTime()
    }
    if (sortOption === 'score') {
      return b.score - a.score
    }
    return 0
  })

  return (
    <div className="space-y-6">
      {/* Hero section */}
      <div className="relative overflow-hidden rounded-2xl glass p-8 border border-white/5 bg-gradient-to-br from-violet-950/20 via-slate-950 to-emerald-950/10">
        <div className="relative z-10 max-w-2xl">
          <span className="text-xs font-extrabold uppercase tracking-widest text-violet-400 bg-violet-400/10 px-3 py-1 rounded-full border border-violet-400/20">
            Live Platform
          </span>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-3 text-slate-100 font-outfit">
            FlashNewsAI
          </h1>
          <p className="text-sm text-slate-300 mt-2 leading-relaxed">
            Unified market intelligence tracking corporate announcements, institutional bulk/block deals, and financial YouTube creator sentiments.
          </p>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between p-4 glass rounded-xl border border-white/5">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search company or ticker..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-300 w-full sm:w-auto">
            <SlidersHorizontal className="h-3.5 w-3.5 text-violet-400" />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-transparent focus:outline-none text-slate-200 cursor-pointer w-full"
            >
              <option value="">All Categories</option>
              {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                <option key={key} value={key} className="bg-slate-950">{label}</option>
              ))}
            </select>
            {/* Sort selector */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as 'date' | 'score')}
              className="bg-transparent focus:outline-none text-slate-200 cursor-pointer ml-2"
            >
              <option value="date" className="bg-slate-950">Newest First</option>
              <option value="score" className="bg-slate-950">Highest Score</option>
            </select>
            
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-xs font-bold text-slate-300 px-4 py-2.5 rounded-lg transition disabled:opacity-50 ml-auto sm:ml-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Unified Sentiment Stream */}
      <SentimentStream initialEvents={sortedEvents} />
    </div>
  )
}
