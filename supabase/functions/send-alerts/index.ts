import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8"
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts"

const AlertPayloadSchema = z.object({
  event_id: z.string().uuid(),
  ticker: z.string().regex(/^[A-Z0-9&-]{2,20}$/),
  score: z.number().int().min(0).max(100),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  headline: z.string(),
  rationale: z.string(),
})

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('Authorization')
  const expectedKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!authHeader || authHeader !== `Bearer ${expectedKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const body = await req.json()
    const parseResult = AlertPayloadSchema.safeParse(body)
    if (!parseResult.success) {
      return new Response(JSON.stringify({ error: 'Bad Request', details: parseResult.error.format() }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const payload = parseResult.data
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabase = createClient(supabaseUrl, expectedKey!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Fetch watchlists matching ticker
    const { data: watchlists, error: wlError } = await supabase
      .from('watchlists')
      .select('*')
      .eq('ticker', payload.ticker)

    if (wlError) {
      console.error(`Error querying watchlists: ${wlError.message}`)
      return new Response(JSON.stringify({ sent: 0, skipped: 0, error: wlError.message }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    let sent = 0
    let skipped = 0

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    const fromEmail = Deno.env.get('ALERT_FROM_EMAIL') || 'alerts@your-domain.com'

    for (const watchlist of (watchlists || [])) {
      const matchAbove = watchlist.alert_above !== null && payload.score >= watchlist.alert_above
      const matchBelow = watchlist.alert_below !== null && payload.score <= watchlist.alert_below

      if (matchAbove || matchBelow) {
        // Retrieve user email via Auth Admin API
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(watchlist.user_id)

        if (userError || !userData?.user?.email) {
          console.warn(`Warning: Could not fetch email for user ${watchlist.user_id}: ${userError?.message || 'No email found'}`)
          skipped++
          continue
        }

        const email = userData.user.email
        const scoreLabel = payload.score >= 75 ? 'Strong positive'
          : payload.score >= 55 ? 'Mildly positive'
          : payload.score >= 45 ? 'Neutral'
          : payload.score >= 25 ? 'Mildly negative'
          : 'Strong negative'

        const subject = `[NSE Alert] ${payload.ticker}: Score ${payload.score}/100 — ${payload.sentiment.toUpperCase()}`
        const htmlBody = `
          <h2>NSE Sentiment Alert</h2>
          <p><strong>Company:</strong> ${payload.ticker}</p>
          <p><strong>Score:</strong> ${payload.score}/100 (${scoreLabel})</p>
          <p><strong>Sentiment:</strong> ${payload.sentiment}</p>
          <p><strong>Headline:</strong> ${payload.headline}</p>
          <p><strong>Why:</strong> ${payload.rationale}</p>
          <br/>
          <p><a href="https://your-domain.vercel.app/company/${payload.ticker}">View full analysis</a></p>
          <hr/>
          <p><small><a href="https://your-domain.vercel.app/alerts">Manage alerts</a></small></p>
        `

        // Send email via Resend API
        if (resendApiKey) {
          try {
            const res = await fetch('https://api.resend.com/emails', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                from: fromEmail,
                to: email,
                subject: subject,
                html: htmlBody,
              }),
            })

            if (!res.ok) {
              const errText = await res.text()
              console.error(`Failed to send email via Resend: ${res.status} ${errText}`)
              skipped++
            } else {
              sent++
            }
          } catch (e: any) {
            console.error(`Error sending email to ${email}: ${e.message}`)
            skipped++
          }
        } else {
          console.log(`[Mock Email Alert] To: ${email} | Subject: ${subject}`)
          sent++
        }
      } else {
        skipped++
      }
    }

    return new Response(JSON.stringify({ sent, skipped }), {
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (e: any) {
    console.error(`Error processing alert payload: ${e.message}`)
    return new Response(JSON.stringify({ sent: 0, skipped: 0, error: e.message }), {
      status: 200, // Spec: never throw, always return response
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
