'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (loginErr) {
      setError(loginErr.message)
      setLoading(false)
    } else {
      setSuccess('Logged in successfully!')
      setTimeout(() => {
        router.push('/alerts')
        router.refresh()
      }, 1000)
    }
  }

  const handleMagicLink = async () => {
    setError(null)
    setSuccess(null)
    if (!email) {
      setError('Please provide email address first.')
      return
    }

    setLoading(true)
    const { error: magicErr } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })

    if (magicErr) {
      setError(magicErr.message)
    } else {
      setSuccess('Magic link sent to your email!')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto my-12 glass rounded-2xl p-6 md:p-8 border border-white/5 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-black text-slate-100 font-outfit">Sign In</h1>
        <p className="text-xs text-muted-foreground">Sign in to your watchlists and notifications</p>
      </div>

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-semibold">Email Address</label>
          <input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            required
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-slate-400 font-semibold">Password</label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-violet-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs py-2.5 rounded-lg border border-violet-500/30 transition shadow-lg shadow-violet-500/10 disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Sign In with Password'}
        </button>
      </form>

      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-slate-900"></div>
        <span className="flex-shrink mx-4 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">or</span>
        <div className="flex-grow border-t border-slate-900"></div>
      </div>

      <button
        onClick={handleMagicLink}
        disabled={loading}
        className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2.5 rounded-lg border border-slate-800 transition disabled:opacity-50"
      >
        Send Magic Link
      </button>

      <p className="text-center text-xs text-muted-foreground">
        Don't have an account?{' '}
        <Link href="/signup" className="text-violet-400 font-semibold hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  )
}
