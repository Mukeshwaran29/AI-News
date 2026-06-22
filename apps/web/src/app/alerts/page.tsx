'use client'

import { useEffect, useState } from 'react'
import { Watchlist } from '@nse-sentiment/types'
import { Bell, Trash2, Plus, AlertTriangle, ShieldCheck } from 'lucide-react'

export default function WatchlistPage() {
  const [watchlists, setWatchlists] = useState<Watchlist[]>([])
  const [loading, setLoading] = useState(true)
  const [ticker, setTicker] = useState('')
  const [alertAbove, setAlertAbove] = useState<number>(70)
  const [alertBelow, setAlertBelow] = useState<number>(30)
  const [error, setError] = useState<string | null>(null)

  const fetchWatchlist = async () => {
    try {
      const res = await fetch('/api/watchlist')
      if (res.status === 401) {
        // Mock auth active for demonstration
        setLoading(false)
        return
      }
      const data = await res.json()
      if (data.watchlists) {
        setWatchlists(data.watchlists)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchWatchlist()
  }, [])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!ticker) return

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker: ticker.toUpperCase(),
          alert_above: alertAbove,
          alert_below: alertBelow,
        })
      })

      const data = await res.json()
      if (res.ok) {
        setTicker('')
        fetchWatchlist()
      } else {
        setError(data.error || 'Failed to add ticker to watchlist')
      }
    } catch (err) {
      setError('Connection failure')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/watchlist/${id}`, {
        method: 'DELETE'
      })
      if (res.ok) {
        fetchWatchlist()
      }
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl glass p-8 border border-white/5 bg-gradient-to-br from-violet-950/20 to-slate-950">
        <div className="relative z-10 max-w-2xl flex items-center gap-4">
          <div className="p-4 bg-violet-500/10 rounded-xl text-violet-400">
            <Bell className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100 font-outfit">Watchlist & Real-Time Alerts</h1>
            <p className="text-xs text-slate-300 mt-1">
              Configure alert thresholds for specific NSE stock tickers. We will trigger email alerts via Resend when AI-sentiment scores cross thresholds.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Watchlist Setup Form */}
        <div className="glass rounded-xl p-5 border border-white/5 h-fit space-y-4">
          <h2 className="text-sm font-bold text-slate-200 border-b border-slate-900 pb-2">Add Stock Watchlist</h2>
          
          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-semibold">Ticker Symbol (e.g. INFY, RELIANCE)</label>
              <input
                type="text"
                placeholder="RELIANCE"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500 uppercase"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">Alert Above Score</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={alertAbove}
                  onChange={(e) => setAlertAbove(parseInt(e.target.value))}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-semibold">Alert Below Score</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={alertBelow}
                  onChange={(e) => setAlertBelow(parseInt(e.target.value))}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs py-2.5 rounded-lg border border-violet-500/30 transition shadow-lg shadow-violet-500/10 flex items-center justify-center gap-2"
            >
              <Plus className="h-4 w-4" /> Add to Watchlist
            </button>
          </form>
        </div>

        {/* Watchlist Active List */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-slate-200">Active Watchlists</h2>

          {loading ? (
            <div className="glass rounded-xl p-5 animate-pulse h-20"></div>
          ) : watchlists.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center border border-white/5 space-y-2">
              <p className="text-xs text-muted-foreground">You are not watching any stock tickers yet.</p>
              <p className="text-[10px] text-violet-400">Configure alert rules on the left to start receiving notifications.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {watchlists.map(item => (
                <div key={item.id} className="glass rounded-xl p-4 flex items-center justify-between border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-violet-500/10 rounded-lg text-violet-400 font-bold text-sm tracking-wider">
                      {item.ticker}
                    </div>
                    <div className="space-y-0.5">
                      <div className="text-xs text-slate-300">
                        Alert Above: <span className="text-emerald-400 font-bold">{item.alert_above ?? 'None'}</span>
                      </div>
                      <div className="text-xs text-slate-300">
                        Alert Below: <span className="text-rose-400 font-bold">{item.alert_below ?? 'None'}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg hover:bg-rose-500/20 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
