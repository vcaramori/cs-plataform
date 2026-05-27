'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { LayoutDashboard, Ticket, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface PortalHeaderProps {
  accountName: string
  accountLogoUrl: string | null
}

const NAV = [
  { href: '/portal/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { href: '/portal/tickets',   label: 'Chamados',    icon: Ticket },
]

export function PortalHeader({ accountName, accountLogoUrl }: PortalHeaderProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    toast.success('Sessão encerrada')
    router.push('/portal/login')
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-divider bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          {accountLogoUrl ? (
            <Image
              src={accountLogoUrl}
              alt={accountName}
              width={120}
              height={40}
              className="h-8 w-auto object-contain"
              priority
            />
          ) : (
            <Image
              src="/brand/logo.png"
              alt="Portal do Cliente"
              width={120}
              height={40}
              className="h-8 w-auto object-contain"
              priority
            />
          )}
          <div className="hidden sm:block h-5 w-px bg-border-divider" />
          <span className="hidden sm:block text-xs font-bold text-content-secondary uppercase tracking-widest truncate max-w-[160px]">
            {accountName}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all',
                pathname.startsWith(href)
                  ? 'bg-plannera-orange/10 text-plannera-orange'
                  : 'text-content-secondary hover:text-foreground hover:bg-surface-background'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest text-content-secondary hover:text-destructive hover:bg-destructive/5 transition-all"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sair</span>
        </button>
      </div>
    </header>
  )
}
