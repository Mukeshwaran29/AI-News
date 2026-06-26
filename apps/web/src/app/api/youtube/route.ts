import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: sentiments, error } = await supabase
      .from('influencer_sentiments')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(30)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ sentiments })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
