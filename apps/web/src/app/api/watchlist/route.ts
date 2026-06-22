import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { WatchlistAddSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: watchlists, error } = await supabase
    .from('watchlists')
    .select('*')
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ watchlists })
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parseResult = WatchlistAddSchema.safeParse(body)
    if (!parseResult.success) {
      return NextResponse.json({ error: 'Bad Request', details: parseResult.error.format() }, { status: 400 })
    }

    const { ticker, alert_above, alert_below } = parseResult.data

    const { data: watchlist, error } = await supabase
      .from('watchlists')
      .insert({
        user_id: user.id,
        ticker,
        alert_above: alert_above ?? null,
        alert_below: alert_below ?? null,
      })
      .select('*')
      .single()

    if (error) {
      if (error.code === '23505') { // Unique constraint violation code in Postgres
        return NextResponse.json({ error: 'Already watching this ticker' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ watchlist }, { status: 201 })

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
