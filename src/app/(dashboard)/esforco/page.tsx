import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Coffee } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { PageContainer } from '@/components/ui/page-container'
import { EsforcoClient, Entry } from './components/EsforcoClient'

export default async function EsforcoPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Journal GLOBAL (visão de back-office): usuários internos veem o esforço de todo o time
  // — a RLS (time_entries_internal_view_all = is_internal_user) já garante isso; externos
  // ficam restritos pela policy de escopo. Ordena por DATA do evento (não logged_at): senão
  // imports em massa do Read.ai (logged_at recente, date histórica) afundavam os lançamentos
  // do período e o journal aparecia vazio.
  const [{ data: accounts }, { data: entries }] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name')
      .order('name'),
    supabase
      .from('time_entries')
      .select('*, accounts(name)')
      .order('date', { ascending: false })
      .order('logged_at', { ascending: false })
      .limit(500),
  ])

  // Nome do CSM por lançamento (a visão é global) — full_name não é sensível; usa admin
  // p/ não depender da RLS de profiles.
  const csmIds = [...new Set((entries ?? []).map((e: any) => e.csm_id).filter(Boolean))]
  const nameById = new Map<string, string>()
  if (csmIds.length > 0) {
    const admin = getSupabaseAdminClient() as any
    const { data: profs } = await admin.from('profiles').select('id, full_name').in('id', csmIds)
    for (const p of (profs ?? []) as Array<{ id: string; full_name: string | null }>) {
      if (p.full_name) nameById.set(p.id, p.full_name)
    }
  }
  const initialEntries = ((entries ?? []) as any[]).map((e) => ({ ...e, csm_name: nameById.get(e.csm_id) ?? null })) as Entry[]

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

      <Suspense>
        <EsforcoClient
          accounts={accounts ?? []}
          initialEntries={initialEntries}
        />
      </Suspense>
    </PageContainer>
  )
}
