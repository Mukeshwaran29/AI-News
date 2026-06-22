import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { FeedQuerySchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const queryParams = {
      ticker: searchParams.get('ticker') || undefined,
      category: searchParams.get('category') || undefined,
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || undefined,
    }

    const parseResult = FeedQuerySchema.safeParse(queryParams)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Bad Request', details: parseResult.error.format() }, { status: 400 })
    }

    const { ticker, category, cursor, limit } = parseResult.data
    const supabase = createClient()

    let query = supabase
      .from('analyzed_events')
      .select('id, raw_feed_id, ticker, company_name, category, headline, sentiment, score, rationale, keywords, pub_date, analyzed_at, model_version')

    if (ticker) {
      query = query.eq('ticker', ticker)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (cursor) {
      query = query.lt('pub_date', cursor)
    }

    query = query
      .order('pub_date', { ascending: false })
      .limit(limit + 1)

    const { data: results, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let nextCursor: string | null = null
    const events = results || []

    if (events.length > limit) {
      events.pop()
      nextCursor = events[events.length - 1].pub_date
    }

    return NextResponse.json({
      events,
      cursor: nextCursor,
      total: events.length
    }, {
      headers: {
        'Cache-Control': 'no-store'
      }
    })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
