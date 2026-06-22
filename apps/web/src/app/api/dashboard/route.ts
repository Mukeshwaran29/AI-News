import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CompanyAgg, CategoryBreakdown, FeedCategory, SentimentLabel } from '@nse-sentiment/types'

export const dynamic = 'force-dynamic'

function isMarketOpen(): boolean {
  // Get current date in IST timezone
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
  })
  
  const formatted = formatter.formatToParts(new Date())
  const partMap = Object.fromEntries(formatted.map(p => [p.type, p.value]))
  
  const weekday = partMap.weekday // 'Mon', 'Tue', etc.
  const hour = parseInt(partMap.hour, 10)
  const minute = parseInt(partMap.minute, 10)

  if (weekday === 'Sat' || weekday === 'Sun') {
    return false
  }

  const timeVal = hour * 100 + minute
  return timeVal >= 915 && timeVal <= 1530
}

export async function GET() {
  try {
    const supabase = createClient()
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const [topPosRes, topNegRes, recentEventsRes] = await Promise.all([
      supabase
        .from('company_agg')
        .select('*')
        .order('avg_score', { ascending: false })
        .limit(10),
      supabase
        .from('company_agg')
        .select('*')
        .order('avg_score', { ascending: true })
        .limit(10),
      supabase
        .from('analyzed_events')
        .select('category, sentiment, score')
        .gte('pub_date', twentyFourHoursAgo)
    ])

    if (topPosRes.error) throw topPosRes.error
    if (topNegRes.error) throw topNegRes.error
    if (recentEventsRes.error) throw recentEventsRes.error

    const events = recentEventsRes.data || []
    
    // Group events to compute category breakdowns in Javascript
    const categoriesMap: Record<string, { category: FeedCategory; positive: number; neutral: number; negative: number; sumScore: number; count: number }> = {}

    for (const event of events) {
      const cat = event.category
      if (!categoriesMap[cat]) {
        categoriesMap[cat] = {
          category: cat,
          positive: 0,
          neutral: 0,
          negative: 0,
          sumScore: 0,
          count: 0
        }
      }

      const record = categoriesMap[cat]
      record.count += 1
      record.sumScore += event.score
      
      if (event.sentiment === 'positive') record.positive += 1
      else if (event.sentiment === 'neutral') record.neutral += 1
      else if (event.sentiment === 'negative') record.negative += 1
    }

    const category_breakdown: CategoryBreakdown[] = Object.values(categoriesMap).map(c => ({
      category: c.category,
      positive: c.positive,
      neutral: c.neutral,
      negative: c.negative,
      avg_score: c.count > 0 ? parseFloat((c.sumScore / c.count).toFixed(2)) : 0
    }))

    const total_today = events.length
    const avg_score_today = total_today > 0 
      ? parseFloat((events.reduce((acc, e) => acc + e.score, 0) / total_today).toFixed(2))
      : 50.0

    return NextResponse.json({
      top_positive: topPosRes.data || [],
      top_negative: topNegRes.data || [],
      category_breakdown,
      total_today,
      avg_score_today,
      market_open: isMarketOpen(),
    }, {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=120'
      }
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
