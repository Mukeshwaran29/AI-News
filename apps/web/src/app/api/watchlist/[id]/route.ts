import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ScoreThresholdSchema } from '@/lib/validation'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

interface RouteParams {
  params: {
    id: string
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const id = params.id
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
  }

  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error, status } = await supabase
    .from('watchlists')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return new NextResponse(null, { status: 204 })
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const id = params.id
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }

    const body = await request.json()
    const alertAboveVal = body.alert_above !== undefined ? ScoreThresholdSchema.optional().safeParse(body.alert_above) : null
    const alertBelowVal = body.alert_below !== undefined ? ScoreThresholdSchema.optional().safeParse(body.alert_below) : null

    if (alertAboveVal && !alertAboveVal.success) {
      return NextResponse.json({ error: 'Invalid alert_above threshold' }, { status: 400 })
    }
    if (alertBelowVal && !alertBelowVal.success) {
      return NextResponse.json({ error: 'Invalid alert_below threshold' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updatePayload: Record<string, any> = {}
    if (body.alert_above !== undefined) updatePayload.alert_above = body.alert_above
    if (body.alert_below !== undefined) updatePayload.alert_below = body.alert_below

    const { data: watchlist, error } = await supabase
      .from('watchlists')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select('*')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(watchlist)

  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
