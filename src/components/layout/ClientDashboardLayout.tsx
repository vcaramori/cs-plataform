'use client'

import { useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { Sidebar } from './Sidebar'
import { Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationCenter } from '../notifications/NotificationCenter'

interface Props {
  user: User
  children: React.ReactNode
}

export function ClientDashboardLayout({ user, children }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans transition-colors duration-500">

      {/* Overlay escuro ao abrir menu mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden backdrop-blur-md"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
          "md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar user={user} onMobileClose={() => setMobileOpen(false)} />
      </div>

      <main className="flex-1 overflow-y-auto relative min-w-0">
        {/* Barra de navegação mobile (topo fixo, visível apenas em < md) */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-background/80 backdrop-blur-xl border-b border-border shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-accent border border-border text-foreground hover:bg-accent/80 transition-colors"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="w-4 h-4" />
          </button>
          <p className="text-foreground font-bold text-sm uppercase tracking-widest mx-auto pr-9">CS-Continuum</p>
        </div>

        {/* Conteúdo da página */}
        <div className="relative z-10 w-full h-full flex flex-col">
          {children}
        </div>
      </main>
    </div>
  )
}
