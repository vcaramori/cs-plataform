import { redirect } from 'next/navigation'
import { Coffee } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { EsforcoClient } from './components/EsforcoClient'

export default async function EsforcoPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: accounts }, { data: entries }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name')
      .order('name'),
    supabase
      .from('time_entries')
      .select('*, accounts(name)')
      .eq('csm_id', user.id)
      .order('logged_at', { ascending: false })
      .limit(50),
  ])

  return (
    <PageContainer>
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <Coffee className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Esforço Back-office</h1>
        </div>
        <p className="label-premium flex items-center gap-2">
          Registro de produtividade indireta via I.A — Processamento autônomo de conta, tipo e duração.
        </p>
      </div>

      <EsforcoClient
        accounts={accounts ?? []}
        initialEntries={(entries ?? []) as any}
      />
    </PageContainer>
  )
}
