'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import {
  LayoutDashboard,
  Clock,
  TicketCheck,
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
  Settings,
  Target,
  SmilePlus,
  Workflow,
  CheckCircle2,
  Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { NotificationCenter } from '@/components/notifications/NotificationCenter'
import { AlertCenter } from '@/components/alerts/AlertCenter'
import { useModulePermission } from '@/hooks/useModulePermission'

import { UserRole } from '@/lib/supabase/types'
import { env } from '@/lib/env'

// Grupos de navegação "por jornada". Início e Atividades são inseridos
// dinamicamente conforme permissão (ver render).
const analiseItems = [
  { href: '/dashboard',         label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/adoption',          label: 'Adoção',          icon: Target },
  { href: '/nps',               label: 'NPS',             icon: Star },
  { href: '/voc',               label: 'Voz do Cliente',  icon: SmilePlus },
]

const operacaoItems = [
  { href: '/esforco',           label: 'Esforço',          icon: Clock },
  { href: '/suporte',           label: 'Suporte',          icon: TicketCheck },
  { href: '/suporte/dashboard', label: 'Dashboard Suporte', icon: BarChart2 },
  { href: '/playbooks',         label: 'Playbooks',         icon: Workflow },
]

const settingsItems = [
  { href: '/users',                 label: 'Usuários',  icon: Users, minRole: 'csm_senior' as const },
  { href: '/settings/roles',        label: 'Perfis de Acesso', icon: ShieldCheck, minRole: 'csm_senior' as const },
  { href: '/cs-ops',               label: 'Capacidade',  icon: Users, minRole: 'csm_senior' as const },
  { href: '/settings/features',     label: 'Funcionalidades', icon: Sparkles },
  { href: '/settings/plans',        label: 'Planos',         icon: Layers },
  { href: '/settings/business-hours', label: 'Horário SLA',  icon: Clock },
  { href: '/settings/sla',           label: 'Política SLA', icon: ShieldCheck },
  { href: '/admin',                 label: 'Administração',    icon: Settings, minRole: 'admin' as const },
]

const ROLE_LABELS: Record<UserRole, string> = {
  csm: 'Customer Success',
  csm_senior: 'CS Sênior',
  head_cs: 'Head de CS',
  admin: 'Administrador',
  super_admin: 'Administrador',
}

/** Marca compacta da Plannera (grade 3×3 de pontos laranja, meio-direita ausente). */
function PlanneraMark({ className }: { className?: string }) {
  const dots = [
    [4, 4], [12, 4], [20, 4],
    [4, 12], [12, 12],
    [4, 20], [12, 20], [20, 20],
  ]
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r={2.6} fill="#f7941e" />
      ))}
    </svg>
  )
}

interface SidebarProps {
  user: User
  role?: UserRole | null
  /** Callback para fechar o drawer mobile ao navegar */
  onMobileClose?: () => void
}

export function Sidebar({ user, role, onMobileClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const [isCollapsed, setIsCollapsed] = useState(false)

  const canViewHome       = useModulePermission('home', 'view')
  const canViewAtividades = useModulePermission('atividades', 'view')

  const roleHierarchy: Record<UserRole, number> = {
    'csm': 0,
    'csm_senior': 1,
    'head_cs': 2,
    'admin': 3,
    'super_admin': 4,
  }

  const canViewItem = (minRole?: string) => {
    if (!minRole) return true
    if (!role) return false
    return roleHierarchy[role] >= roleHierarchy[minRole as UserRole]
  }

  const visibleSettingsItems = settingsItems.filter(item => canViewItem(item.minRole))

  const [settingsOpen, setSettingsOpen] = useState(
    visibleSettingsItems.some(i => pathname === i.href || (i.href !== '/dashboard' && pathname.startsWith(i.href)))
  )

  async function handleSignOut() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user.email?.slice(0, 2).toUpperCase() ?? 'CS'

  const NavLink = ({ href, label, icon: Icon, highlight }: any) => {
    const isActive = () => {
      if (pathname === href) return true
      if (href === '/' || href === '/dashboard') return false
      if (href === '/suporte') {
        return pathname.startsWith('/suporte/') && !pathname.startsWith('/suporte/dashboard') && !pathname.startsWith('/suporte/sla')
      }
      return pathname.startsWith(href + '/')
    }
    
    const active = isActive()

    return (
      <Link
        key={href}
        href={href}
        onClick={onMobileClose}
        className="block"
      >
        <div className={cn(
          "group flex items-center transition-all relative border",
          isCollapsed ? "justify-center p-2 rounded-xl" : "gap-3 px-3 py-2 rounded-xl",
          active
            ? "text-brand-primary bg-muted/40 border-border-divider shadow-sm dark:text-white"
            : highlight
              ? "text-content-primary bg-accent/[0.07] border-accent/25 hover:bg-accent/15"
              : "text-content-secondary border-transparent hover:text-content-primary hover:bg-muted/30 dark:hover:bg-white/5"
        )}>
          <Icon className={cn(
            "w-5 h-5 flex-shrink-0 transition-all duration-300",
            active
              ? "text-accent scale-110 drop-shadow-[0_0_8px_rgba(var(--accent),0.4)]"
              : highlight
                ? "text-accent group-hover:scale-110"
                : "text-content-secondary/40 group-hover:text-brand-primary group-hover:scale-110"
          )} />

          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 whitespace-nowrap text-[10px] font-extrabold uppercase tracking-[0.15em]"
            >
              {label}
            </motion.span>
          )}

          {highlight && !isCollapsed && !active && (
            <span className="text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-accent/20 text-accent">IA</span>
          )}

          {active && !isCollapsed && (
            <ChevronRight className="w-4 h-4 text-content-secondary/40" />
          )}

          {/* Barra lateral do item ativo */}
          {active && (
            <div className={cn(
              "absolute bg-accent rounded-full shadow-[0_0_15px_rgba(var(--accent),0.6)] transition-all",
              isCollapsed 
                ? "left-[-8px] top-1/2 -translate-y-1/2 w-1 h-10 opacity-100" 
                : "left-[-16px] top-1/2 -translate-y-1/2 w-1.5 h-6"
            )} />
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
        "h-screen flex-shrink-0 bg-surface-card",
        "border-r border-border-divider flex flex-col relative z-50",
        "shadow-sm dark:shadow-[10px_0_40px_rgba(0,0,0,0.15)]"
      )}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className={cn(
          "absolute -right-4 w-8 h-8 rounded-2xl bg-primary hover:bg-primary/90 border-primary/30 text-primary-foreground z-50 shadow-xl hidden md:flex items-center justify-center p-0 transition-all hover:scale-110 active:scale-95",
          isCollapsed ? "top-[36px]" : "top-[46px]"
        )}
        style={{ transform: 'translateY(-50%)' }}
        aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
      >
        {isCollapsed
          ? <PanelLeftOpen  className="w-4 h-4" />
          : <PanelLeftClose className="w-4 h-4" />
        }
      </Button>

      {/* ── Logo Plannera ────────────────────────────────── */}
      <div className={cn(
        "border-b border-border transition-all duration-300 flex items-center",
        isCollapsed ? "p-3 justify-center" : "px-4 py-3 justify-center"
      )}>
        <Link href="/" onClick={onMobileClose} className="flex items-center" aria-label="Plannera — Início">
          {isCollapsed ? (
            <div className="w-10 h-10 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
              <PlanneraMark className="w-5 h-5" />
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
              <Image
                src="/brand/logo-sem-assinatura.png"
                alt="Plannera"
                width={200}
                height={60}
                priority
                className="h-10 w-auto object-contain object-center"
              />
            </motion.div>
          )}
        </Link>
      </div>

      {/* ── Navegação ────────────────────────────────────── */}
      <nav className={cn(
        "flex-1 space-y-4 mt-1 overflow-y-auto overflow-x-hidden scrollbar-none hover:scrollbar-thin transition-all",
        isCollapsed ? "p-2" : "p-3"
      )}>
        {/* Pergunte à IA — interface principal, em destaque */}
        <div className="space-y-1">
          <NavLink href="/perguntar" label="Pergunte à IA" icon={Sparkles} highlight />
          {canViewHome && (
            <NavLink href="/home" label="Início" icon={Zap} />
          )}
        </div>

        {/* Grupo: Análise */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-4 mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-content-secondary/40">Análise</p>
          )}
          {analiseItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        {/* Grupo: Operação */}
        <div className="space-y-1">
          {!isCollapsed && (
            <p className="px-4 mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-content-secondary/40">Operação</p>
          )}
          {canViewAtividades && (
            <NavLink href="/atividades" label="Atividades" icon={CheckCircle2} />
          )}
          {operacaoItems.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </div>

        {/* Settings Section */}
        <div className={cn("space-y-1", isCollapsed && "pt-6 border-t border-border-divider")}>
          {/* Configurações — botão expansível */}
          <button
            type="button"
            onClick={() => { if (!isCollapsed) setSettingsOpen(o => !o) }}
            className={cn(
              "w-full group flex items-center transition-all border border-transparent",
              isCollapsed ? "justify-center p-2 rounded-xl" : "gap-3 px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-[0.15em]",
              settingsOpen && !isCollapsed
                ? "text-content-primary bg-muted"
                : "text-content-secondary/50 hover:text-content-primary hover:bg-muted/50"
            )}
          >
            <Layers className={cn(
              "w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110",
              settingsOpen ? "text-content-primary" : "text-content-secondary/40 group-hover:text-content-primary"
            )} />
            {!isCollapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 text-left whitespace-nowrap opacity-70 dark:opacity-60">
                Governança
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
              className={cn("space-y-1", !isCollapsed && "pl-4")}
            >
              {visibleSettingsItems.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} icon={item.icon} />
              ))}
            </motion.div>
          )}
        </div>
      </nav>

      {/* ── Notificações e Alertas ──────────────────────── */}
      <div className={cn(
        "py-2 border-t border-border-divider bg-muted/20 transition-all duration-300",
        isCollapsed ? "px-2" : "px-3"
      )}>
        <div className="flex items-center gap-2 justify-center">
          <NotificationCenter isCollapsed={isCollapsed} />
          <AlertCenter />
        </div>
      </div>

      {/* ── Rodapé do usuário ─────────────────────────────── */}
      <div className={cn(
        "border-t border-border-divider bg-muted/20 transition-all duration-300",
        isCollapsed ? "p-2" : "p-3"
      )}>
        <div className={cn(
          "flex items-center transition-all",
          !isCollapsed ? "gap-3 p-2 rounded-2xl hover:bg-muted/50" : "justify-center p-2 rounded-xl"
        )}>
          <Avatar className="w-9 h-9 border-2 border-border/50 flex-shrink-0 shadow-md">
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
              <p className="text-content-primary text-[10px] font-extrabold uppercase truncate tracking-tight leading-none">
                {user.email?.split('@')[0]}
              </p>
              <p className="label-premium !text-[8px] opacity-60 mt-1.5">
                {role ? ROLE_LABELS[role] : 'Customer Success'}
              </p>
              <p className="label-premium !text-[7px] opacity-40 mt-0.5 truncate">
                {env.app.instanceName}
              </p>
            </motion.div>
          )}

          {!isCollapsed && (
            <button
              onClick={handleSignOut}
              className="text-content-secondary/40 hover:text-destructive transition-all p-2 flex-shrink-0 hover:bg-destructive/10 rounded-xl"
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
