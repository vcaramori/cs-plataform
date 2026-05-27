'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, User, Lock } from 'lucide-react'
import { toast } from 'sonner'

export function PortalSetupClient() {
  const router = useRouter()
  const [supabase] = useState(() => getSupabaseBrowserClient())
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [account, setAccount] = useState<{ name: string; logoUrl: string | null } | null>(null)

  useEffect(() => {
    console.log('PORTAL SETUP SUPABASE KEY:', supabase.supabaseKey === 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy' ? 'DUMMY_KEY' : 'REAL_KEY');

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('PORTAL SETUP AUTH EVENT:', event, session ? 'SESSION OK' : 'SESSION NULL');
    });

    async function loadAccount() {
      try {
        // Tenta ler o account_id da URL primeiro
        const searchParams = new URLSearchParams(window.location.search)
        let accountId = searchParams.get('account') || searchParams.get('account_id')

        const { data: { user } } = await supabase.auth.getUser()
        
        if (!accountId && user) {
          // Fallback: Busca da tabela profiles no banco
          const { data: profile } = await supabase
            .from('profiles')
            .select('account_id')
            .eq('id', user.id)
            .single()
          if (profile?.account_id) {
            accountId = profile.account_id
          }
        }

        if (!accountId && user && user.user_metadata?.account_id) {
          accountId = user.user_metadata.account_id
        }

        if (accountId) {
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
        }
      } catch (e: any) {
        console.error('Erro ao carregar conta no setup:', e?.message || e);
      }
    }
    loadAccount()
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase])

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      toast.error('As senhas não coincidem')
      return
    }
    if (password.length < 8) {
      toast.error('A senha deve ter ao menos 8 caracteres')
      return
    }
    setLoading(true)
    try {
      const sessionRes = await supabase.auth.getSession();
      console.log('PORTAL SETUP SUBMIT SESSION:', sessionRes.data.session ? 'ACTIVE' : 'NULL', sessionRes.error?.message || 'NO ERR');

      // Atualiza senha e nome utilizando a instância do Supabase carregada na montagem do componente
      const { error: pwErr } = await supabase.auth.updateUser({ password })
      if (pwErr) throw pwErr

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Sessão inválida')

      await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', user.id)

      toast.success('Conta configurada! Bem-vindo ao portal.')

      // Aguarda o client do Supabase gravar o cookie no browser para evitar race condition
      let attempts = 0
      while (attempts < 20 && !document.cookie.includes('-auth-token')) {
        await new Promise(resolve => setTimeout(resolve, 50))
        attempts++
      }

      router.push('/portal/tickets')
    } catch (e: any) {
      console.error('Erro ao configurar conta:', e?.message || e);
      toast.error(e.message || 'Erro ao configurar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          {account?.logoUrl ? (
            <Image src={account.logoUrl} alt={account.name} width={160} height={52} className="h-12 w-auto object-contain" priority />
          ) : (
            <Image src="/brand/logo.png" alt="Portal" width={160} height={52} className="h-12 w-auto object-contain" priority />
          )}
          <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">Primeiro Acesso</h1>
            <p className="text-xs text-content-secondary mt-1 font-medium">
              {account?.name ? `Configure seu acesso ao portal de ${account.name}` : 'Configure seu nome e senha para continuar'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSetup} className="bg-white dark:bg-slate-900 border border-border-divider rounded-2xl shadow-xl p-8 space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Seu nome completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="João Silva" required className="pl-9 h-11 rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Nova senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
              <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mín. 8 caracteres" required className="pl-9 h-11 rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Confirmar senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
              <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" required className="pl-9 h-11 rounded-xl" />
            </div>
          </div>
          <Button type="submit" disabled={loading || !fullName.trim() || !password} className="w-full h-11 rounded-xl bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-widest text-xs gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirmar e Entrar
          </Button>
        </form>
      </div>
    </div>
  )
}
