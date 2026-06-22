import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { parse } from "https://deno.land/x/xml@2.1.3/mod.ts"

const NSE_FEEDS: Record<string, string> = {
  announcements:        'https://nsearchives.nseindia.com/content/RSS/Online_announcements.xml',
  corporate_action:     'https://nsearchives.nseindia.com/content/RSS/Corporate_action.xml',
  buyback:              'https://nsearchives.nseindia.com/content/RSS/Daily_Buyback.xml',
  investor_complaints:  'https://nsearchives.nseindia.com/content/RSS/Investor_Complaints.xml',
  financial_results:    'https://nsearchives.nseindia.com/content/RSS/Financial_Results.xml',
  annual_report:        'https://nsearchives.nseindia.com/content/RSS/Annual_Reports.xml',
  board_meeting:        'https://nsearchives.nseindia.com/content/RSS/Board_Meetings.xml',
  corporate_governance: 'https://nsearchives.nseindia.com/content/RSS/Corporate_Governance.xml',
  insider_trading:      'https://nsearchives.nseindia.com/content/RSS/InsiderTrading.xml',
  shareholding_pattern: 'https://nsearchives.nseindia.com/content/RSS/Shareholding_Pattern.xml',
}

function sanitizeText(raw: any, maxLen: number): string {
  if (typeof raw !== 'string') return ''
  const stripped = raw.replace(/<[^>]*>/g, '')
  const normalized = stripped.replace(/\s+/g, ' ').trim()
  return normalized.slice(0, maxLen)
}

function sanitizeUrl(raw: any): string {
  if (typeof raw !== 'string') return ''
  try {
    const url = new URL(raw.trim())
    if (url.protocol !== 'https:') return ''
    // Allow both nseindia.com and nsearchives.nseindia.com
    const host = url.hostname
    if (!host.endsWith('nseindia.com') && host !== 'nseindia.com') return ''
    if (url.toString().length > 2048) return ''
    return url.toString()
  } catch {
    return ''
  }
}

function parsePubDate(raw: any, link?: string): string {
  if (typeof raw === 'string' && raw.trim().length > 0) {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) {
      const now = new Date()
      const oneYearFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      if (d <= oneYearFuture) {
        return d.toISOString()
      }
    }
  }

  // Fallback 1: Parse from link PDF filename timestamp (DDMMYYYYHHMMSS)
  if (link) {
    const match = link.match(/_(\d{2})(\d{2})(\d{4})(\d{2})(\d{2})(\d{2})\.pdf$/)
    if (match) {
      const [_, day, month, year, hour, min, sec] = match
      const dateStr = `${year}-${month}-${day}T${hour}:${min}:${sec}Z`
      const d = new Date(dateStr)
      if (!isNaN(d.getTime())) {
        return d.toISOString()
      }
    }
  }

  // Fallback 2: Default to now
  return new Date().toISOString()
}

function extractTicker(title: string): string | null {
  const match = title.match(/\(([A-Z0-9&-]{2,20})\)/)
  if (!match) return null
  const ticker = match[1]
  if (/^[A-Z0-9&-]{2,20}$/.test(ticker)) {
    return ticker
  }
  return null
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // TEMPORARILY BYPASSED FOR TESTING DATA FLOW
  console.log("[poll-feeds] Bypassing auth check for manual verification");

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY')!
  const supabase = createClient(supabaseUrl, expectedKey)

  const results: Record<string, any> = {}
  let totalInserted = 0

  const feedPromises = Object.entries(NSE_FEEDS).map(async ([category, url]) => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000)

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        redirect: 'error',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const contentType = response.headers.get('content-type') || ''
      if (!contentType.includes('xml') && !contentType.includes('text')) {
        throw new Error('Invalid content type')
      }

      // Read max 2MB
      const blob = await response.blob()
      if (blob.size > 2 * 1024 * 1024) {
        throw new Error('Payload exceeds 2MB')
      }

      const text = await blob.text()
      const parsedXml = parse(text) as any
      const channel = parsedXml?.rss?.channel || parsedXml?.feed || parsedXml
      let items = channel?.item || channel?.entry || []
      if (!Array.isArray(items)) {
        items = [items]
      }

      if (items.length > 100) {
        throw new Error('Feed has more than 100 items (security guard)')
      }

      if (items.length > 0) {
        console.log(`[poll-feeds] Category ${category} first item:`, JSON.stringify(items[0]))
      }

      let insertedCount = 0
      let skippedCount = 0

      const rowsToUpsert = []
      for (const item of items) {
        const guid = sanitizeText(item.guid?.['#text'] ?? item.guid ?? item.link, 500)
        const title = sanitizeText(item.title, 500)
        const link = sanitizeUrl(item.link)
        const pubDateStr = parsePubDate(item.pubDate ?? item.pub_date ?? item.updated, link)

        if (!guid || !title || !link || !pubDateStr) {
          skippedCount++
          continue
        }

        // Filter out items older than 7 days to keep the feed fresh
        const pubDate = new Date(pubDateStr)
        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        if (pubDate < cutoff) {
          skippedCount++
          continue
        }

        rowsToUpsert.push({
          guid,
          title,
          link,
          description: sanitizeText(item.description, 5000) || null,
          pub_date: pubDateStr,
          category,
          ticker: extractTicker(title),
          raw_xml: JSON.stringify(item).slice(0, 10000),
          processed: false,
        })
      }

      if (rowsToUpsert.length > 0) {
        const { data, error } = await supabase
          .from('raw_feed')
          .upsert(rowsToUpsert, { onConflict: 'guid,pub_date', ignoreDuplicates: true })
          .select('guid')

        if (error) {
          throw error
        }

        insertedCount = data?.length || 0
        skippedCount += (rowsToUpsert.length - insertedCount)
      }

      results[category] = { inserted: insertedCount, skipped: skippedCount }
      totalInserted += insertedCount
    } catch (e: any) {
      clearTimeout(timeoutId)
      results[category] = { inserted: 0, skipped: 0, error: e.message }
    }
  })

  await Promise.allSettled(feedPromises)

  const responsePayload = {
    ok: true,
    totalInserted,
    results,
  }

  // Stdout JSON logging
  console.log(JSON.stringify({
    ts: new Date().toISOString(),
    fn: 'poll-feeds',
    totalInserted,
    results,
  }))

  return new Response(JSON.stringify(responsePayload), {
    headers: { 'Content-Type': 'application/json' },
  })
})
