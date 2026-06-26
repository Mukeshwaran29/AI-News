import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: events, error } = await supabase
      .from('analyzed_events')
      .select('ticker, company_name, score, sentiment')
      .gte('pub_date', twentyFourHoursAgo)

    if (error) throw error

    if (!events || events.length === 0) {
      return NextResponse.json({
        pulse_score: 50,
        pulse_label: 'Neutral',
        top_positive: [],
        top_negative: []
      })
    }

    let totalScore = 0
    const tickerStats: Record<string, { company_name: string; totalScore: number; count: number }> = {}

    for (const event of events) {
      totalScore += event.score
      if (!tickerStats[event.ticker]) {
        tickerStats[event.ticker] = { company_name: event.company_name, totalScore: 0, count: 0 }
      }
      tickerStats[event.ticker].totalScore += event.score
      tickerStats[event.ticker].count += 1
    }

    const pulseScore = Math.round(totalScore / events.length)
    let pulseLabel = 'Neutral'
    if (pulseScore >= 60) pulseLabel = 'Bullish'
    else if (pulseScore <= 40) pulseLabel = 'Bearish'

    const aggregatedTickers = Object.entries(tickerStats).map(([ticker, stats]) => ({
      ticker,
      company_name: stats.company_name,
      avg_score: Math.round(stats.totalScore / stats.count),
      volume: stats.count
    }))

    // Filter out low volume noise for trending (must have at least 1 event, ideally more, but we'll allow 1 for now)
    const sortedTickers = aggregatedTickers.sort((a, b) => b.avg_score - a.avg_score)

    const topPositive = sortedTickers.filter(t => t.avg_score >= 55).slice(0, 3)
    const topNegative = [...sortedTickers].sort((a, b) => a.avg_score - b.avg_score).filter(t => t.avg_score <= 45).slice(0, 3)

    return NextResponse.json({
      pulse_score: pulseScore,
      pulse_label: pulseLabel,
      top_positive: topPositive,
      top_negative: topNegative,
      total_events: events.length
    }, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60'
      }
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
