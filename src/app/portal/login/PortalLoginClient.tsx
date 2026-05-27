'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Lock, Mail } from 'lucide-react'
import { toast } from 'sonner'

export function PortalLoginClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-surface-background px-4">
        <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
      </div>
    }>
      <PortalLoginClientInternal />
    </Suspense>
  )
}

function PortalLoginClientInternal() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [account, setAccount] = useState<{ name: string; logoUrl: string | null } | null>(null)

  useEffect(() => {
    async function loadAccount() {
      const accountId = searchParams.get('account') || searchParams.get('account_id')
      if (accountId) {
        try {
          const supabase = getSupabaseBrowserClient()
          const { data } = await supabase
            .from('accounts')
            .select('name, logo_url')
            .eq('id', accountId)
            .single()
          if (data) {
            setAccount({
              name: data.name,
              logoUrl: data.logo_url
            })
          }
        } catch (e) {
          console.error('Erro ao buscar conta no login:', e)
        }
      }
    }
    loadAccount()
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error

      // Verifica se é usuário externo aprovado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Erro de autenticação')

      const { data: profile } = await supabase
        .from('profiles')
        .select('user_type, portal_approved_at')
        .eq('id', user.id)
        .single()

      if (!profile || profile.user_type !== 'external') {
        await supabase.auth.signOut()
        throw new Error('Acesso não autorizado para este portal')
      }
      if (!profile.portal_approved_at) {
        await supabase.auth.signOut()
        throw new Error('Seu acesso ainda está pendente de aprovação')
      }

      router.push('/portal/tickets')
    } catch (e: any) {
      toast.error(e.message || 'Erro ao entrar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-background px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* Logo */}
        <div className="flex flex-col items-center gap-4">
          {account?.logoUrl ? (
            <Image
              src={account.logoUrl}
              alt={account.name}
              width={160}
              height={52}
              className="h-12 w-auto object-contain"
              priority
            />
          ) : (
            <Image
              src="/brand/logo.png"
              alt="Portal do Cliente"
              width={160}
              height={52}
              className="h-12 w-auto object-contain"
              priority
            />
          )}
          <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">
              Portal do Cliente
            </h1>
            <p className="text-xs text-content-secondary mt-1 font-medium">
              {account?.name ? `Acompanhe seus chamados da ${account.name}` : 'Acompanhe seus chamados e indicadores'}
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-white dark:bg-slate-900 border border-border-divider rounded-2xl shadow-xl p-8 space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">
              E-mail
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="pl-9 h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="pl-9 h-11 rounded-xl"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-widest text-xs gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Entrar
          </Button>
        </form>

        <p className="text-center text-[10px] text-content-secondary">
          Não possui acesso? Solicite ao seu CSM responsável.
        </p>
      </div>
    </div>
  )
}
