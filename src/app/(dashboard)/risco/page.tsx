import { PageContainer } from "@/components/layout/PageContainer"
import { ModuleHeader } from "@/components/shared/guardians/ModuleHeader"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { RiskCockpitClient, type RiskAccount } from "./RiskCockpitClient"

export const dynamic = 'force-dynamic'

export default async function RiscoPage() {
  const supabase = await getSupabaseServerClient()

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name, segment, health_score, account_risk_assessments(risk_score, sentiment_label, ai_reasoning, analyzed_at)')
    .order('health_score', { ascending: true })

  const atRisk: RiskAccount[] = (accounts ?? [])
    .map((a: any) => {
      const assessments = Array.isArray(a.account_risk_assessments) ? a.account_risk_assessments : []
      const latest = [...assessments].sort(
        (x: any, y: any) => new Date(y.analyzed_at).getTime() - new Date(x.analyzed_at).getTime()
      )[0]
      const healthRisk = (a.health_score ?? 100) < 40
      const aiRisk = !!latest && (latest.risk_score >= 80 || latest.sentiment_label === 'at-risk' || latest.sentiment_label === 'negative')
      return {
        id: a.id,
        name: a.name,
        segment: a.segment ?? null,
        health_score: a.health_score ?? null,
        risk_score: latest?.risk_score ?? null,
        sentiment_label: latest?.sentiment_label ?? null,
        ai_reasoning: latest?.ai_reasoning ?? null,
        analyzed_at: latest?.analyzed_at ?? null,
        isAtRisk: healthRisk || aiRisk,
      }
    })
    .filter((a: RiskAccount) => a.isAtRisk)
    .sort((a: RiskAccount, b: RiskAccount) => (b.risk_score ?? 0) - (a.risk_score ?? 0))

  // Curadorias (auditoria) das contas em risco
  const ids = atRisk.map(a => a.id)
  const curationsByAccount: Record<string, any[]> = {}
  if (ids.length > 0) {
    const { data: cur } = await (supabase as any)
      .from('risk_curation_feedback')
      .select('account_id, decision, reason, risk_key, created_at')
      .in('account_id', ids)
      .order('created_at', { ascending: false })
    for (const row of cur ?? []) {
      const list = curationsByAccount[row.account_id] ?? []
      list.push(row)
      curationsByAccount[row.account_id] = list
    }
  }
  const withCurations = atRisk.map(a => ({ ...a, curations: (curationsByAccount[a.id] ?? []).slice(0, 5) }))

  return (
    <PageContainer>
      <ModuleHeader
        title="Cockpit de Risco"
        subtitle="Contas em risco — drivers, motivo da IA e curadoria"
        iconName="AlertTriangle"
      />
      <RiskCockpitClient accounts={withCurations} />
    </PageContainer>
  )
}
