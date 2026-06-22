import { generateText } from '@/lib/llm/gateway'
import { buildSystemInstruction } from '@/lib/ai/ai-context'
import { safeParseLLMJson } from '@/lib/llm/safe-json'
import { computeAccountAdoption, type AdoptionStatus } from './account-adoption'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Analytics de adoção sobre o modelo REAL (`feature_adoption`).
 * Reescrito (jun/2026): o schema antigo (account_feature_adoption, adoption_analysis,
 * features, feature_blockers, feature_dependencies) nunca existiu neste banco. Tudo aqui
 * usa `computeAccountAdoption` (feature_adoption + fórmula do portfólio) e o snapshot
 * diário em `adoption_analysis` (para tendência/forecast).
 */

interface AdoptionForecast {
  forecastDays: number
  baselineAdoptionPct: number
  forecastedAdoptionPct: number
  forecastedDate: string
  confidence: number
  forecastTrend: 'accelerating' | 'stable' | 'declining'
  recommendations: string[]
  methodology?: string
}

interface FeatureBlocker {
  blockerId: string
  featureId: string
  featureName: string
  blockerType: 'technical' | 'training' | 'organizational' | 'business' | 'other'
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  rootCauseAnalysis?: { factors: string[]; recommendations: string[] }
  detectedAt: string
  detectionSource: 'usage_metrics' | 'support_tickets' | 'interview' | 'system_inference'
}

const STATUS_PCT: Record<AdoptionStatus, number> = { in_use: 100, partial: 50, blocked: 0, not_started: 0, na: 0 }
const today = () => new Date().toISOString().split('T')[0]

// blocker_category (real) → blockerType (schema)
const BLOCKER_TYPE: Record<string, FeatureBlocker['blockerType']> = {
  data_integration: 'technical',
  product_roadmap: 'business',
  people_process: 'organizational',
  governance: 'organizational',
  no_strategic_relevance: 'business',
  other: 'other',
}
const PRIORITY_SEVERITY: Record<string, FeatureBlocker['severity']> = { high: 'high', medium: 'medium', low: 'low' }

export class AdoptionService {
  private supabase: SupabaseClient
  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  /** Tendência a partir dos 2 últimos snapshots diários (adoption_analysis). */
  private async trend(accountId: string): Promise<'accelerating' | 'stable' | 'declining'> {
    const { data } = await this.supabase
      .from('adoption_analysis')
      .select('overall_adoption_pct')
      .eq('account_id', accountId)
      .order('analysis_date', { ascending: false })
      .limit(2)
    const rows = (data as any[]) ?? []
    if (rows.length < 2) return 'stable'
    const delta = rows[0].overall_adoption_pct - rows[1].overall_adoption_pct
    if (delta > 5) return 'accelerating'
    if (delta < -5) return 'declining'
    return 'stable'
  }

  /** Heatmap = estado ATUAL por feature (o modelo real não tem série temporal). */
  async getAdoptionHeatmap(accountId: string, daysBack: number = 90) {
    const adoption = await computeAccountAdoption(accountId, this.supabase)
    const { data: account } = await this.supabase.from('accounts').select('name').eq('id', accountId).maybeSingle()
    const d = today()

    const data = adoption.features.map((f) => ({
      featureId: f.featureId,
      featureName: f.name,
      adoptionHistory: [{ date: d, adoptionPct: STATUS_PCT[f.status] }],
    }))

    const byPctDesc = [...adoption.features].sort((a, b) => STATUS_PCT[b.status] - STATUS_PCT[a.status])
    return {
      accountId,
      accountName: account?.name || 'Conta',
      data,
      summary: {
        overallAdoptionPct: adoption.overallAdoptionPct,
        adoptionTrend: await this.trend(accountId),
        featuresAdopted: adoption.featuresAdopted,
        featuresTotal: adoption.featuresTotal,
        topFeatures: byPctDesc.slice(0, 3).map((f) => f.name),
        bottomFeatures: byPctDesc.slice(-3).reverse().map((f) => f.name),
      },
      timeRange: {
        startDate: new Date(Date.now() - daysBack * 86400000).toISOString().split('T')[0],
        endDate: d,
      },
    }
  }

  /** Forecast sobre o histórico de adoption_analysis (snapshots diários). */
  async forecastAdoption(accountId: string, forecastDays: number = 90): Promise<AdoptionForecast> {
    const { data: history } = await this.supabase
      .from('adoption_analysis')
      .select('analysis_date, overall_adoption_pct')
      .eq('account_id', accountId)
      .order('analysis_date', { ascending: false })
      .limit(30)
    const rows = (history as any[]) ?? []

    const forecastedDate = new Date(Date.now() + forecastDays * 86400000).toISOString().split('T')[0]

    // Sem histórico suficiente: usa o estado atual como baseline, sem extrapolar.
    if (rows.length < 2) {
      const current = await computeAccountAdoption(accountId, this.supabase)
      const baseline = current.hasData ? current.overallAdoptionPct : 0
      return {
        forecastDays, baselineAdoptionPct: baseline, forecastedAdoptionPct: baseline,
        forecastedDate, confidence: 0.3, forecastTrend: 'stable',
        recommendations: current.hasData ? ['Histórico insuficiente para projeção — colete mais snapshots diários.'] : ['Sem dados de adoção registrados para esta conta.'],
        methodology: 'baseline (histórico insuficiente)',
      }
    }

    const baseline = rows[0].overall_adoption_pct
    const series = rows.map((r) => r.overall_adoption_pct).slice(0, 10)

    try {
      const prompt = `Histórico de % de adoção (mais recente primeiro): ${series.join(', ')}%.
Projete a % de adoção em ${forecastDays} dias. Responda em JSON:
{"forecastedAdoptionPct": number 0-100, "confidence": number 0-1, "forecastTrend": "accelerating"|"stable"|"declining", "recommendations": string[]}`
      const response = await generateText(prompt, {
        systemInstruction: await buildSystemInstruction('adoption_forecast'),
        maxOutputTokens: 500, responseMimeType: 'application/json', disableThinking: true,
      })
      const f = safeParseLLMJson<{ forecastedAdoptionPct?: number; confidence?: number; forecastTrend?: string; recommendations?: string[] }>(response.result)
      const clampPct = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || baseline)))
      const trend = (['accelerating', 'stable', 'declining'] as const).includes(f?.forecastTrend as any) ? (f!.forecastTrend as AdoptionForecast['forecastTrend']) : 'stable'
      return {
        forecastDays,
        baselineAdoptionPct: baseline,
        forecastedAdoptionPct: f ? clampPct(f.forecastedAdoptionPct) : baseline,
        forecastedDate,
        confidence: Math.max(0, Math.min(1, Number(f?.confidence) || 0.5)),
        forecastTrend: trend,
        recommendations: Array.isArray(f?.recommendations) ? f!.recommendations!.slice(0, 5) : [],
        methodology: 'IA sobre histórico de snapshots',
      }
    } catch {
      return {
        forecastDays, baselineAdoptionPct: baseline, forecastedAdoptionPct: baseline,
        forecastedDate, confidence: 0.3, forecastTrend: 'stable',
        recommendations: ['Erro na projeção — tente novamente mais tarde.'], methodology: 'fallback',
      }
    }
  }

  /** Bloqueios REAIS: features com status='blocked' em feature_adoption. */
  async getFeatureBlockers(accountId: string): Promise<FeatureBlocker[]> {
    const adoption = await computeAccountAdoption(accountId, this.supabase)
    // updated_at por feature para detectedAt
    const { data: rows } = await this.supabase
      .from('feature_adoption')
      .select('feature_id, updated_at, priority_level')
      .eq('account_id', accountId)
      .eq('status', 'blocked')
    const meta = new Map<string, { updated_at: string | null; priority_level: string | null }>(
      ((rows as any[]) ?? []).map((r) => [r.feature_id, { updated_at: r.updated_at, priority_level: r.priority_level }])
    )

    return adoption.blockers.map((b) => {
      const m = meta.get(b.featureId)
      const factors = [b.blockerReason].filter((x): x is string => !!x)
      const recommendations = [b.actionPlan].filter((x): x is string => !!x)
      return {
        blockerId: b.featureId, // 1 bloqueio por (conta,feature) — feature_id (uuid) é estável
        featureId: b.featureId,
        featureName: b.featureName,
        blockerType: BLOCKER_TYPE[b.blockerCategory ?? 'other'] ?? 'other',
        severity: PRIORITY_SEVERITY[m?.priority_level ?? ''] ?? 'medium',
        description: b.blockerReason || `Bloqueio em ${b.featureName}`,
        rootCauseAnalysis: factors.length || recommendations.length ? { factors, recommendations } : undefined,
        detectedAt: m?.updated_at ?? new Date().toISOString(),
        detectionSource: 'system_inference',
      }
    })
  }

  /** Mantido por compat — hoje os bloqueios já são dados reais; delega a getFeatureBlockers. */
  async detectBlockersAI(accountId: string): Promise<FeatureBlocker[]> {
    return this.getFeatureBlockers(accountId)
  }

  /**
   * Grafo de dependências: não há tabela de dependências neste banco. Retorna vazio
   * (a UI mostra grafo vazio em vez de quebrar). Inclui a adoção atual por feature.
   */
  async getFeatureDependencies(accountId?: string) {
    let accountAdoption: Record<string, number> | undefined
    if (accountId) {
      const adoption = await computeAccountAdoption(accountId, this.supabase)
      accountAdoption = Object.fromEntries(adoption.features.map((f) => [f.featureId, STATUS_PCT[f.status]]))
    }
    return { features: [], dependencies: [], accountAdoption }
  }
}
