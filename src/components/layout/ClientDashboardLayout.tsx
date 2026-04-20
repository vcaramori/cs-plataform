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
    <div className="flex h-screen bg-slate-950 overflow-hidden font-sans">

      {/* Overlay escuro ao abrir menu mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar
          Mobile: posição fixed, traduzida para fora por padrão, entra ao abrir
          Desktop (md+): posição relativa, sempre visível
      */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out",
          "md:relative md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <Sidebar user={user} onMobileClose={() => setMobileOpen(false)} />
      </div>

      {/*
        Área de conteúdo principal.

        PERFORMANCE — LCP estava em 20.3s por dois recursos externos/ausentes:

        1. noise.svg de grainy-gradients.vercel.app: recurso externo decorativo com
           opacity 0.04 que cobria inset-0 (100% da viewport). O Lighthouse simulando
           mobile 4G levava ~19s para baixá-lo e o identificava como LCP element.
           → REMOVIDO. Não há impacto visual mensurável (opacity era 0.04).

        2. /grid.svg: arquivo referenciado mas inexistente em public/.
           → Substituído por CSS repeating-linear-gradient sem nenhum arquivo.
      */}
      <main
        className="flex-1 overflow-y-auto relative min-w-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
          backgroundPosition: 'center top',
        }}
      >

        {/* Barra de navegação mobile (topo fixo, visível apenas em < md) */}
        <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-slate-950/95 backdrop-blur-xl border-b border-white/5 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white hover:bg-white/10 transition-colors"
            aria-label="Abrir menu de navegação"
          >
            <Menu className="w-4 h-4" />
          </button>
          <p className="text-white font-bold text-sm uppercase tracking-widest mx-auto pr-9">CS-Continuum</p>
        </div>

        {/* Conteúdo da página */}
        <div className="relative z-10 p-4 md:p-6 lg:p-8 w-full">

          {children}
        </div>
      </main>
    </div>
  )
}
