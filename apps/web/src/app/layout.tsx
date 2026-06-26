import './globals.css'
import Link from 'next/link'
import { MarketBanner } from '@/components/MarketBanner'

export const metadata = {
  title: 'FlashNewsAI',
  description: 'Real-time NSE India filings with FinBERT-powered financial sentiment analysis.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;900&family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen flex flex-col selection:bg-violet-500/30">
        <header className="sticky top-0 z-50 w-full glass border-b border-white/5">
          <div className="max-w-6xl mx-auto flex items-center justify-between h-16 px-4">
            <Link href="/" className="flex items-center gap-2 group">
              <span className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-emerald-400">
                FlashNewsAI
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300 font-bold border border-violet-500/30 uppercase tracking-widest">
                AI
              </span>
            </Link>

            <nav className="hidden sm:flex items-center gap-6">
              <Link href="/" className="text-sm font-semibold text-slate-200 hover:text-violet-400 transition">
                Live Feed
              </Link>
              <Link href="/dashboard" className="text-sm font-semibold text-slate-200 hover:text-violet-400 transition">
                Dashboard
              </Link>
              <Link href="/alerts" className="text-sm font-semibold text-slate-200 hover:text-violet-400 transition">
                My Alerts
              </Link>
            </nav>

            <div className="flex items-center gap-4">
              <Link href="/login" className="text-xs font-bold tracking-wider uppercase bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-lg border border-violet-500/30 transition shadow-lg shadow-violet-500/10">
                Sign In
              </Link>
            </div>
          </div>
          <MarketBanner />
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6">
          {children}
        </main>

        <footer className="w-full py-6 mt-12 border-t border-white/5 glass">
          <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} FlashNewsAI. Powered by FinBERT sentiment analysis.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-violet-400 transition">Terms</a>
              <a href="#" className="hover:text-violet-400 transition">Privacy Policy</a>
              <a href="#" className="hover:text-violet-400 transition">Support</a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  )
}
