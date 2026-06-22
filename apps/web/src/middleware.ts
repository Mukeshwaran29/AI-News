import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// In-memory rate limiting map
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const limitWindow = 60 * 1000 // 1 minute
  const maxRequests = 60

  const userRecord = rateLimitMap.get(ip)

  if (!userRecord || now > userRecord.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + limitWindow })
    return false
  }

  userRecord.count += 1
  if (userRecord.count > maxRequests) {
    return true
  }

  return false
}

export async function middleware(request: NextRequest) {
  let response = await updateSession(request)

  const url = request.nextUrl
  const ip = request.ip || request.headers.get('x-forwarded-for') || '127.0.0.1'

  // Apply rate limiting to public endpoints
  if (
    url.pathname === '/api/feed' ||
    url.pathname === '/api/dashboard' ||
    url.pathname.startsWith('/api/company')
  ) {
    if (isRateLimited(ip)) {
      return new NextResponse(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': '60',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        },
      })
    }
  }

  // Apply API Security headers
  if (url.pathname.startsWith('/api/')) {
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
  }

  return response
}

export const config = {
  matcher: ['/api/:path*', '/alerts', '/watchlist'],
}
