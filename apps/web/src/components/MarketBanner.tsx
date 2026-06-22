'use client'

import { useEffect, useState } from 'react'

function isMarketOpen(): boolean {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour12: false,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
  })
  
  const formatted = formatter.formatToParts(new Date())
  const partMap = Object.fromEntries(formatted.map(p => [p.type, p.value]))
  
  const weekday = partMap.weekday
  const hour = parseInt(partMap.hour, 10)
  const minute = parseInt(partMap.minute, 10)

  if (weekday === 'Sat' || weekday === 'Sun') {
    return false
  }

  const timeVal = hour * 100 + minute
  return timeVal >= 915 && timeVal <= 1530
}

export function MarketBanner() {
  const [isOpen, setIsOpen] = useState<boolean | null>(null)

  useEffect(() => {
    setIsOpen(isMarketOpen())
    const interval = setInterval(() => {
      setIsOpen(isMarketOpen())
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  if (isOpen === null) return null

  return (
    <div className={`w-full text-center py-2 px-4 text-xs font-semibold tracking-wider transition-colors duration-500 ${
      isOpen 
        ? 'bg-emerald-950/40 text-emerald-400 border-b border-emerald-500/20' 
        : 'bg-rose-950/40 text-rose-400 border-b border-rose-500/20'
    }`}>
      {isOpen ? '● NSE MARKET IS OPEN (09:15 - 15:30 IST)' : '○ NSE MARKET IS CLOSED (Trades 09:15 - 15:30 IST Mon-Fri)'}
    </div>
  )
}
