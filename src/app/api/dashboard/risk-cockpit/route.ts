import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'
import { classifyAccountRisk, buildCockpitAggregates, RISK_ALERT_TYPES, type ClassifyInput, type Treatment } from '@/lib/risk/risk-cockpit'

// GET /api/dashboard/risk-cockpit — payload completo do Cockpit de Risco.
// Escopo: global vê todas as contas; CSM só as próprias (mesmo padrão de /api/alerts).
export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '90'), 7), 365)
  const today = new Date().toISOString().slice(0, 10)

  const admin = getSupabaseAdminClient() as any

  // Escopo de contas
  const scope = await getUserAccessScope(user.id, 'accounts')
  let accQ = admin.from('accounts').select('id, name, segment, csm_owner_id, health_score, health_score_v2')
  if (scope !== 'global') accQ = accQ.eq('csm_owner_id', user.id)
  const { data: accounts } = await accQ
  const list = (accounts ?? []) as any[]
  const ids = list.map(a => a.id)
  if (ids.length === 0) return NextResponse.json({ scope, kpis: null, accounts: [], bySegment: [], byOwner: [], byDriver: [], trend: [] })

  // Sinais (todos em lote, depois reduzidos por conta)
  const [assessRes, alertsRes, manualRes, contractsRes, curationRes, tasksRes, ownersRes] = await Promise.all([
    admin.from('account_risk_assessments').select('account_id, risk_score, sentiment_label, ai_reasoning, analyzed_at').in('account_id', ids).order('analyzed_at', { ascending: false }),
    admin.from('proactive_alerts').select('account_id, type, severity, message, created_at').in('account_id', ids).is('resolved_at', null),
    admin.from('account_risks').select('account_id, risk_type, severity, status').in('account_id', ids),
    admin.from('contracts').select('account_id, arr, renewal_date, status').in('account_id', ids),
    admin.from('risk_curation_feedback').select('account_id, decision, reason, created_at').in('account_id', ids).order('created_at', { ascending: false }),
    admin.from('csm_tasks').select('account_id, status, completed_at, deleted_at, alert_id, source_label').in('account_id', ids),
    admin.from('profiles').select('id, full_name'),
  ])

  // latest por conta
  const latestAssess = new Map<string, any>()
  for (const r of assessRes.data ?? []) if (!latestAssess.has(r.account_id)) latestAssess.set(r.account_id, r)
  const latestCuration = new Map<string, any>()
  for (const r of curationRes.data ?? []) if (!latestCuration.has(r.account_id)) latestCuration.set(r.account_id, r)

  const alertsByAcct = new Map<string, any[]>()
  for (const a of alertsRes.data ?? []) { const arr = alertsByAcct.get(a.account_id) ?? []; arr.push(a); alertsByAcct.set(a.account_id, arr) }
  const manualByAcct = new Map<string, any[]>()
  for (const r of manualRes.data ?? []) { const arr = manualByAcct.get(r.account_id) ?? []; arr.push(r); manualByAcct.set(r.account_id, arr) }
  // ARR ativo e renovação mais próxima por conta
  const arrByAcct = new Map<string, number>()
  const renewalByAcct = new Map<string, string | null>()
  for (const c of contractsRes.data ?? []) {
    const st = String(c.status ?? '').toLowerCase()
    if (st && st !== 'active' && st !== 'ativo') continue
    arrByAcct.set(c.account_id, (arrByAcct.get(c.account_id) ?? 0) + Number(c.arr ?? 0))
    if (c.renewal_date) {
      const cur = renewalByAcct.get(c.account_id)
      if (!cur || c.renewal_date < cur) renewalByAcct.set(c.account_id, c.renewal_date)
    }
  }
  // tratamento por conta (tarefas vinculadas a alertas de risco)
  const treatmentByAcct = new Map<string, Treatment>()
  for (const t of tasksRes.data ?? []) {
    if (t.deleted_at) continue
    if (!t.alert_id && t.source_label !== 'alert') continue
    const prev = treatmentByAcct.get(t.account_id)
    const isOpen = t.status === 'todo' && !t.completed_at
    if (isOpen) treatmentByAcct.set(t.account_id, 'em_tratamento')
    else if (prev !== 'em_tratamento') treatmentByAcct.set(t.account_id, 'tratado')
  }
  const ownerName = new Map<string, string>()
  for (const o of ownersRes.data ?? []) ownerName.set(o.id, o.full_name)

  // Classifica cada conta
  const profiles = list.map(a => {
    const assess = latestAssess.get(a.id)
    const cur = latestCuration.get(a.id)
    const input: ClassifyInput = {
      id: a.id, name: a.name, segment: a.segment, csm_owner_id: a.csm_owner_id,
      owner_name: a.csm_owner_id ? (ownerName.get(a.csm_owner_id) ?? null) : null,
      health_score: a.health_score, health_score_v2: a.health_score_v2,
      ai_risk_score: assess?.risk_score ?? null,
      ai_sentiment: assess?.sentiment_label ?? null,
      ai_reasoning: assess?.ai_reasoning ?? null,
      alerts: (alertsByAcct.get(a.id) ?? []).filter((x: any) => RISK_ALERT_TYPES.has(x.type)),
      manualRisks: manualByAcct.get(a.id) ?? [],
      arr: arrByAcct.get(a.id) ?? 0,
      renewalDate: renewalByAcct.get(a.id) ?? null,
      treatment: treatmentByAcct.get(a.id) ?? 'pendente',
      curatedFalsePositive: cur?.decision === 'false_positive',
      today,
    }
    return classifyAccountRisk(input)
  })

  const arrTotal = Array.from(arrByAcct.values()).reduce((s, v) => s + v, 0)
  const { kpis, bySegment, byOwner, byDriver } = buildCockpitAggregates(profiles, arrTotal)

  // Tendência: sinais de risco por semana (alertas de risco + assessments at-risk) na janela
  const since = new Date(Date.now() - days * 86400000)
  const weekKey = (iso: string) => { const d = new Date(iso); const onejan = new Date(d.getFullYear(), 0, 1); const wk = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7); return `${d.getFullYear()}-S${String(wk).padStart(2, '0')}` }
  const trendMap = new Map<string, { week: string; signals: number }>()
  for (const a of alertsRes.data ?? []) {
    if (!RISK_ALERT_TYPES.has(a.type) || !a.created_at || new Date(a.created_at) < since) continue
    const k = weekKey(a.created_at); const e = trendMap.get(k) ?? { week: k, signals: 0 }; e.signals++; trendMap.set(k, e)
  }
  for (const r of assessRes.data ?? []) {
    if (!r.analyzed_at || new Date(r.analyzed_at) < since) continue
    if (r.sentiment_label !== 'at-risk' && r.sentiment_label !== 'negative') continue
    const k = weekKey(r.analyzed_at); const e = trendMap.get(k) ?? { week: k, signals: 0 }; e.signals++; trendMap.set(k, e)
  }
  const trend = Array.from(trendMap.values()).sort((a, b) => a.week.localeCompare(b.week))

  // Ordena contas por risco × ARR (prioridade)
  const order: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1, none: 0 }
  const accountsOut = profiles
    .filter(p => order[p.riskLevel] >= order['low'])
    .sort((a, b) => (order[b.riskLevel] - order[a.riskLevel]) || (b.arrAtRisk - a.arrAtRisk) || ((b.aiRisk ?? 0) - (a.aiRisk ?? 0)))

  return NextResponse.json({ scope, kpis, accounts: accountsOut, bySegment, byOwner, byDriver, trend })
}
