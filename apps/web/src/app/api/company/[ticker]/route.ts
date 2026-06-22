import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { TickerSchema, CursorSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    ticker: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ticker = params.ticker
    const tickerValResult = TickerSchema.safeParse(ticker)
    if (!tickerValResult.success) {
      return NextResponse.json({ error: 'Invalid ticker format' }, { status: 400 })
    }

    const searchParams = request.nextUrl.searchParams
    const cursorParam = searchParams.get('cursor') || undefined
    const cursorValResult = CursorSchema.safeParse(cursorParam)
    if (!cursorValResult.success) {
      return NextResponse.json({ error: 'Invalid cursor format' }, { status: 400 })
    }

    const cursor = cursorValResult.data
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

    const supabase = createClient()

    // Query aggregates
    const aggPromise = supabase
      .from('company_agg')
      .select('*')
      .eq('ticker', ticker)
      .single()

    // Query events
    let eventsQuery = supabase
      .from('analyzed_events')
      .select('*')
      .eq('ticker', ticker)
      .order('pub_date', { ascending: false })
      .limit(limit + 1)

    if (cursor) {
      eventsQuery = eventsQuery.lt('pub_date', cursor)
    }

    const [aggRes, eventsRes] = await Promise.all([aggPromise, eventsQuery])

    if (aggRes.error || !aggRes.data) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 })
    }

    if (eventsRes.error) {
      return NextResponse.json({ error: eventsRes.error.message }, { status: 500 })
    }

    const events = eventsRes.data || []
    let nextCursor: string | null = null

    if (events.length > limit) {
      events.pop()
      nextCursor = events[events.length - 1].pub_date
    }

    return NextResponse.json({
      agg: aggRes.data,
      recent_events: events,
      cursor: nextCursor
    }, {
      headers: {
        'Cache-Control': 'public, max-age=30, stale-while-revalidate=60'
      }
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
