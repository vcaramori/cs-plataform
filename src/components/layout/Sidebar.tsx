'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  LayoutDashboard,
  Building2,
  Clock,
  TicketCheck,
  MessageSquareText,
  LogOut,
  ChevronRight,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Layers
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/accounts',  label: 'Logos',         icon: Building2 },
  { href: '/esforco',   label: 'Esforço',        icon: Clock },
  { href: '/suporte',   label: 'Suporte',        icon: TicketCheck },
  { href: '/perguntar', label: 'Perguntar',      icon: MessageSquareText },
]

const settingsItems = [
  { href: '/users',             label: 'Equipe (CSMs)',  icon: Users },
  { href: '/settings/features', label: 'Funcionalidades', icon: Sparkles },
  { href: '/settings/plans',    label: 'Planos',         icon: Layers },
]

interface SidebarProps {
  user: User
  /** Callback para fechar o drawer mobile ao navegar */
  onMobileClose?: () => void
}

export function Sidebar({ user, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'CS'

  const NavLink = ({ href, label, icon: Icon }: any) => {
    const active =
      pathname === href ||
      (href !== '/dashboard' && pathname.startsWith(href))

    return (
      <Link
        key={href}
        href={href}
        onClick={onMobileClose}
      >
        <div className={cn(
          "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all relative",
          active
            ? "text-white bg-plannera-sop/10 border border-plannera-sop/20"
            : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
        )}>
          <Icon className={cn(
            "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
            active
              ? "text-plannera-orange"
              : "text-slate-500 group-hover:text-plannera-orange/60"
          )} />

          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 whitespace-nowrap"
            >
              {label}
            </motion.span>
          )}

          {active && (
            <motion.div
              layoutId="active-pill"
              className="absolute inset-0 bg-plannera-orange/5 rounded-xl -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}

          {active && !isCollapsed && (
            <ChevronRight className="w-3 h-3 text-plannera-orange/50" />
          )}

          {/* Barra lateral do item ativo */}
          {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-plannera-orange rounded-full blur-sm" />
          )}
        </div>
      </Link>
    )
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      className={cn(
        "h-screen flex-shrink-0 bg-slate-950/50 backdrop-blur-2xl",
        "border-r border-white/5 flex flex-col relative z-50",
        "shadow-[10px_0_30px_rgba(0,0,0,0.5)]"
      )}
    >
      {/*
        Botão de colapso — visível apenas em desktop (md+).
        No mobile a sidebar abre como drawer via ClientDashboardLayout,
        então o botão de posição absoluta causaria overflow fora do drawer.
      */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-12 w-6 h-6 rounded-full bg-plannera-orange hover:bg-plannera-orange/90 border-none text-white z-50 shadow-lg hidden md:flex items-center justify-center"
        aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {isCollapsed
          ? <PanelLeftOpen  className="w-3 h-3" />
          : <PanelLeftClose className="w-3 h-3" />
        }
      </Button>

      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="p-5 border-b border-white/5">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-plannera-primary to-plannera-sop flex items-center justify-center flex-shrink-0 shadow-[0_0_15px_rgba(45,53,88,0.4)]">
            <Sparkles className="w-4 h-4 text-plannera-orange" />
          </div>

          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col whitespace-nowrap"
            >
              <p className="text-white font-bold text-sm tracking-tight uppercase leading-tight">
                CS-Continuum
              </p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wide leading-none mt-0.5">
                Control Tower
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Navegação ────────────────────────────────────── */}
      <nav className="flex-1 p-3 space-y-8 mt-2 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* Main Section */}
        <div className="space-y-1">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        {/* Settings Section */}
        <div className="space-y-3">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="px-4"
            >
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">Configurações</p>
            </motion.div>
          )}
          
          <div className={cn("space-y-1", isCollapsed && "pt-4 border-t border-white/5")}>
            {settingsItems.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>
        </div>
      </nav>

      {/* ── Notificações e Alertas ──────────────────────── */}
      <div className="px-3 py-2 border-t border-white/5 bg-black/10">
        <NotificationCenter isCollapsed={isCollapsed} />
      </div>

      {/* ── Rodapé do usuário ─────────────────────────────── */}
      <div className="p-3 border-t border-white/5 bg-black/20">
        <div className={cn(
          "flex items-center gap-3 p-2 rounded-xl transition-all",
          !isCollapsed ? "hover:bg-white/5" : "justify-center"
        )}>
          <Avatar className="w-8 h-8 border-2 border-white/5 flex-shrink-0">
            <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
            <AvatarFallback className="bg-plannera-sop text-white text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              {/* text-xs = 12px mínimo legível */}
              <p className="text-white text-xs font-bold uppercase truncate leading-tight">
                {user.email?.split('@')[0]}
              </p>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wide leading-tight mt-0.5">
                CSM Representative
              </p>
            </motion.div>
          )}

          {!isCollapsed && (
            <button
              onClick={handleSignOut}
              className="text-slate-500 hover:text-red-400 transition-colors p-1 flex-shrink-0"
              aria-label="Sair da conta"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  )
}
