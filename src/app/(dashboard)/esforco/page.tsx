import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { Coffee } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { PageContainer } from '@/components/ui/page-container'
import { calculateDateRange, toDateStr, type DateRangePeriod } from '@/lib/date-range'
import { EsforcoClient, Entry } from './components/EsforcoClient'

export const dynamic = 'force-dynamic'

const SAFETY_CAP = 2000 // teto de segurança p/ intervalos muito amplos

export default async function EsforcoPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Filtro vem da URL (mesma fonte do DateRangePicker). O SERVIDOR respeita o intervalo:
  // traz TODOS os lançamentos dentro de [from, to] (não os "últimos N").
  const sp = await searchParams
  const period = (sp.period as DateRangePeriod) || '30d' // bate com o default do DateRangePicker (sem param na URL)
  const range = calculateDateRange(
    period,
    sp.from ? new Date(sp.from) : undefined,
    sp.to ? new Date(sp.to) : undefined
  )
  const fromStr = toDateStr(range.from)
  const toStr = toDateStr(range.to)

  // Journal GLOBAL (back-office): a RLS (time_entries_internal_view_all) já libera o time
  // p/ internos. Ordena por DATA do evento e filtra pelo intervalo selecionado.
  const [{ data: accounts }, { data: entries }] = await Promise.all([
    supabase.from('accounts').select('id, name').order('name'),
    supabase
      .from('time_entries')
      .select('*, accounts(name)')
      .gte('date', fromStr)
      .lte('date', toStr)
      .order('date', { ascending: false })
      .order('logged_at', { ascending: false })
      .limit(SAFETY_CAP),
  ])

  // Nome do CSM por lançamento (visão global) — full_name não é sensível; admin evita
  // depender da RLS de profiles.
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
