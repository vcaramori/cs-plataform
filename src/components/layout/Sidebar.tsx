'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  LayoutDashboard,
  Clock,
  TicketCheck,
  MessageSquareText,
  LogOut,
  ChevronRight,
  Users,
  PanelLeftClose,
  PanelLeftOpen,
  Sparkles,
  Layers,
  Star,
  BarChart2,
  ShieldCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { ThemeSelector } from './ThemeSelector'

const navItems = [
  { href: '/dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/esforco',   label: 'Esforço',        icon: Clock },
  { href: '/suporte',           label: 'Suporte',        icon: TicketCheck },
  { href: '/suporte/dashboard', label: 'Dashboard Suporte', icon: BarChart2 },
  { href: '/nps',               label: 'NPS',            icon: Star },
  { href: '/perguntar', label: 'Perguntar',      icon: MessageSquareText },
]

const settingsItems = [
  { href: '/users',                 label: 'Equipe (CSMs)',  icon: Users },
  { href: '/settings/features',     label: 'Funcionalidades', icon: Sparkles },
  { href: '/settings/plans',        label: 'Planos',         icon: Layers },
  { href: '/settings/business-hours', label: 'Horário SLA',  icon: Clock },
  { href: '/settings/sla',           label: 'Política SLA', icon: ShieldCheck },
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
  const [settingsOpen, setSettingsOpen] = useState(
    settingsItems.some(i => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href)))
  )

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
          "group flex items-center gap-4 px-4 py-3 rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all relative border border-transparent",
          active
            ? "text-brand-primary bg-slate-100 border-slate-200 shadow-sm dark:text-white dark:bg-white/10 dark:border-white/20"
            : "text-brand-grey/70 hover:text-brand-primary hover:bg-slate-50 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5"
        )}>
          <Icon className={cn(
            "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
            active
              ? "text-brand-primary dark:text-white"
              : "text-brand-grey/40 dark:text-white/40 group-hover:text-brand-primary dark:group-hover:text-white"
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
              className="absolute inset-0 bg-primary/5 rounded-2xl -z-10"
              transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
            />
          )}

          {active && !isCollapsed && (
            <ChevronRight className="w-4 h-4 text-white/40" />
          )}

          {/* Barra lateral do item ativo */}
          {active && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-accent rounded-full shadow-[0_0_15px_rgba(var(--accent),0.5)]" />
          )}
        </div>
      </Link>
    )
  }

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      className={cn(
        "h-screen flex-shrink-0 bg-white dark:bg-slate-950 dark:backdrop-blur-3xl",
        "border-r border-slate-200 dark:border-white/5 flex flex-col relative z-50",
        "shadow-[10px_0_40px_rgba(0,0,0,0.03)] dark:shadow-[10px_0_40px_rgba(0,0,0,0.15)]"
      )}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-4 top-12 w-8 h-8 rounded-2xl bg-primary hover:bg-primary/90 border-primary/30 text-primary-foreground z-50 shadow-xl hidden md:flex items-center justify-center p-0 transition-all hover:scale-110 active:scale-95"
        aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {isCollapsed
          ? <PanelLeftOpen  className="w-4 h-4" />
          : <PanelLeftClose className="w-4 h-4" />
        }
      </Button>

      {/* ── Logo ─────────────────────────────────────────── */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-4 overflow-hidden">
          <div className="w-11 h-11 rounded-2xl bg-accent flex items-center justify-center flex-shrink-0 shadow-lg border border-accent/20">
            <Sparkles className="w-5 h-5 text-accent-foreground" />
          </div>

          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col whitespace-nowrap"
            >
              <p className="text-[#2d3558] dark:text-white font-extrabold text-sm tracking-[0.1em] uppercase leading-none">
                CS-Continuum
              </p>
              <p className="label-premium !text-[9px] opacity-60 mt-1.5 text-[#5c5b5b] dark:text-white/60">
                Control Tower
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Navegação ────────────────────────────────────── */}
      <nav className="flex-1 p-4 space-y-10 mt-4 overflow-y-auto overflow-x-hidden custom-scrollbar">
        {/* Main Section */}
        <div className="space-y-2">
          {navItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        {/* Settings Section */}
        <div className={cn("space-y-2", isCollapsed && "pt-6 border-t border-white/10")}>
          {/* Configurações — botão expansível */}
          <button
            type="button"
            onClick={() => { if (!isCollapsed) setSettingsOpen(o => !o) }}
            className={cn(
              "w-full group flex items-center gap-4 px-4 py-3 rounded-2xl text-[10px] font-extrabold uppercase tracking-[0.15em] transition-all border border-transparent",
              settingsOpen && !isCollapsed
                ? "text-[#2d3558] bg-slate-100 dark:text-white dark:bg-white/10"
                : "text-[#5c5b5b]/50 hover:text-[#2d3558] hover:bg-slate-50 dark:text-white/50 dark:hover:text-white dark:hover:bg-white/5"
            )}
          >
            <Layers className={cn(
              "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
              settingsOpen ? "text-[#2d3558] dark:text-white" : "text-[#5c5b5b]/40 dark:text-white/40 group-hover:text-[#2d3558]/70 dark:group-hover:text-white/70"
            )} />
            {!isCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 text-left whitespace-nowrap opacity-70 dark:opacity-60">
                Governance
              </motion.span>
            )}
            {!isCollapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ChevronRight className={cn(
                  "w-4 h-4 text-muted-foreground/40 transition-transform duration-300",
                  settingsOpen && "rotate-90"
                )} />
              </motion.div>
            )}
          </button>

          {/* Sub-itens expansíveis */}
          {(settingsOpen || isCollapsed) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
              className={cn("space-y-2", !isCollapsed && "pl-4")}
            >
              {settingsItems.map((item) => (
                <NavLink key={item.href} {...item} />
              ))}
            </motion.div>
          )}
        </div>
      </nav>

      {/* ── Notificações e Alertas ──────────────────────── */}
      <div className="px-4 py-3 border-t border-white/10 bg-white/5">
        <NotificationCenter isCollapsed={isCollapsed} />
      </div>

      {/* ── Rodapé do usuário ─────────────────────────────── */}
      <div className="p-4 border-t border-white/10 bg-white/5">
        <div className={cn(
          "flex items-center gap-4 p-3 rounded-2xl transition-all",
          !isCollapsed ? "hover:bg-white/5" : "justify-center"
        )}>
          <Avatar className="w-10 h-10 border-2 border-border/50 flex-shrink-0 shadow-md">
            <AvatarImage src={`https://avatar.vercel.sh/${user.email}`} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs font-extrabold">
              {initials}
            </AvatarFallback>
          </Avatar>

          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 min-w-0"
            >
              <p className="text-brand-primary dark:text-white text-[10px] font-extrabold uppercase truncate tracking-tight leading-none">
                {user.email?.split('@')[0]}
              </p>
              <p className="label-premium !text-[8px] opacity-60 mt-1.5 text-brand-grey dark:text-white/60">
                Executive Representative
              </p>
            </motion.div>
          )}

          {!isCollapsed && <ThemeSelector />}

          {!isCollapsed && (
            <button
              onClick={handleSignOut}
              className="text-white/40 hover:text-destructive transition-all p-2 flex-shrink-0 hover:bg-destructive/10 rounded-xl"
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
