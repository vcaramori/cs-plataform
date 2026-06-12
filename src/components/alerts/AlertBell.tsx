'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

/**
 * Sino único da Central de Alertas. Mostra a contagem de alertas NÃO-LIDOS do
 * usuário (escopo-aware via /api/alerts) e leva para a página /alertas. Substitui
 * os dois sininhos antigos (NotificationCenter + AlertCenter) que confundiam.
 */
export function AlertBell({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const res = await fetch('/api/alerts?status=active')
        const data = await res.json()
        if (active) setUnread(data.unread ?? 0)
      } catch { /* silencioso */ }
    }
    load()
    const t = setInterval(load, 60000)
    return () => { active = false; clearInterval(t) }
  }, [])

  return (
    <Link
      href="/alertas"
      className={cn(
        'relative group flex items-center transition-all rounded-xl h-11 w-full border border-transparent',
        'text-content-secondary hover:text-content-primary hover:bg-muted/50',
        isCollapsed ? 'justify-center px-0' : 'justify-start px-3 gap-3'
      )}
    >
      <div className="relative">
        <Bell className={cn('w-5 h-5 transition-transform group-hover:scale-110', unread > 0 ? 'text-accent' : 'text-content-secondary group-hover:text-content-primary')} />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-extrabold text-white ring-2 ring-surface-card animate-pulse">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </div>
      {!isCollapsed && (
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-bold text-sm uppercase tracking-wide">
          Alertas
        </motion.span>
      )}
      {unread > 0 && !isCollapsed && <span className="ml-auto w-2 h-2 rounded-full bg-destructive animate-pulse" />}
    </Link>
  )
}
