import { generateText } from '@/lib/llm/gateway'
import type { SupabaseClient } from '@supabase/supabase-js'

interface AdoptionTrendData {
  date: string
  adoptionPct: number
}

interface AdoptionForecast {
  baselineAdoptionPct: number
  forecastedAdoptionPct: number
  forecastedDate: string
  confidence: number
  trend: 'accelerating' | 'stable' | 'declining'
  recommendations: string[]
}

interface FeatureBlocker {
  blockerId: string
  featureId: string
  featureName: string
  blockerType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
  rootCauseAnalysis?: {
    factors: string[]
    recommendations: string[]
  }
  detectedAt: string
}

export class AdoptionService {
  private supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  /**
   * Get adoption heatmap data for an account (7d, 30d, 90d window)
   */
  async getAdoptionHeatmap(accountId: string, daysBack: number = 90) {
    const { data: adoptionData, error } = await this.supabase
      .from('account_feature_adoption')
      .select(
        `
        id,
        feature_id,
        adoption_status,
        adoption_pct,
        updated_at,
        features:feature_id(id, name)
      `
      )
      .eq('account_id', accountId)
      .order('updated_at', { ascending: false })

    if (error) throw new Error(`Failed to fetch adoption data: ${error.message}`)

    // Group by feature and calculate historical adoption percentages
    const heatmapData = adoptionData.reduce((acc: any, row: any) => {
      const featureId = row.feature_id
      if (!acc[featureId]) {
        acc[featureId] = {
          featureId,
          featureName: row.features?.name || 'Unknown',
          adoptionHistory: [],
        }
      }
      acc[featureId].adoptionHistory.push({
        date: new Date(row.updated_at).toISOString().split('T')[0],
        adoptionPct: row.adoption_pct,
      })
      return acc
    }, {})

    // Get account name
    const { data: account } = await this.supabase
      .from('accounts')
      .select('name, health_score')
      .eq('id', accountId)
      .single()

    // Calculate summary
    const adoptionHistory = Object.values(heatmapData) as any[]
    const overallAdoptionPct =
      adoptionHistory.length > 0
        ? Math.round(
            adoptionHistory.reduce((sum: number, h: any) => {
              const latest = h.adoptionHistory[0]?.adoptionPct || 0
              return sum + latest
            }, 0) / adoptionHistory.length
          )
        : 0

    // Determine trend
    const trend = this.calculateTrend(adoptionHistory)
    const topFeatures = adoptionHistory
      .sort((a: any, b: any) => (b.adoptionHistory[0]?.adoptionPct || 0) - (a.adoptionHistory[0]?.adoptionPct || 0))
      .slice(0, 3)
      .map((f: any) => f.featureName)
    const bottomFeatures = adoptionHistory
      .sort((a: any, b: any) => (a.adoptionHistory[0]?.adoptionPct || 0) - (b.adoptionHistory[0]?.adoptionPct || 0))
      .slice(0, 3)
      .map((f: any) => f.featureName)

    return {
      accountId,
      accountName: account?.name || 'Unknown',
      data: Object.values(heatmapData),
      summary: {
        overallAdoptionPct,
        adoptionTrend: trend,
        featuresAdopted: adoptionHistory.filter((h: any) => (h.adoptionHistory[0]?.adoptionPct || 0) >= 80).length,
        featuresTotal: adoptionHistory.length,
        topFeatures,
        bottomFeatures,
      },
      timeRange: {
        startDate: new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      },
    }
  }

  /**
   * Forecast adoption for next 90 days using Claude
   */
  async forecastAdoption(accountId: string, forecastDays: number = 90): Promise<AdoptionForecast> {
    // Get historical adoption data
    const { data: adoptionHistory } = await this.supabase
      .from('adoption_analysis')
      .select('analysis_date, overall_adoption_pct, adoption_trend')
      .eq('account_id', accountId)
      .order('analysis_date', { ascending: false })
      .limit(30)

    if (!adoptionHistory || adoptionHistory.length === 0) {
      return {
        baselineAdoptionPct: 0,
        forecastedAdoptionPct: 0,
        forecastedDate: new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        confidence: 0.3,
        trend: 'stable',
        recommendations: ['Insufficient historical data for accurate forecast'],
      }
    }

    const baselineAdoptionPct = adoptionHistory[0].overall_adoption_pct
    const historicalTrend = adoptionHistory.map((h: any) => h.overall_adoption_pct).slice(0, 10)

    try {
      const prompt = `Based on the historical adoption trend (${historicalTrend.join(', ')}%), forecast the adoption percentage for the next ${forecastDays} days.

Also estimate:
1. Confidence level (0-1)
2. Trend (accelerating, stable, declining)
3. Top 3 recommendations to improve adoption

Provide JSON response: {forecastedAdoptionPct, confidence, trend, recommendations}`

      const response = await generateText(prompt, {
        maxOutputTokens: 500,
        responseMimeType: 'application/json',
        disableThinking: true,
      })

      const jsonMatch = response.result.match(/\{[\s\S]*\}/)
      const forecast = jsonMatch ? JSON.parse(jsonMatch[0]) : null

      return {
        baselineAdoptionPct,
        forecastedAdoptionPct: forecast?.forecastedAdoptionPct || baselineAdoptionPct,
        forecastedDate: new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        confidence: forecast?.confidence || 0.5,
        trend: forecast?.trend || 'stable',
        recommendations: forecast?.recommendations || [],
      }
    } catch (error) {
      console.error('[AdoptionService] Forecast error:', error)
      return {
        baselineAdoptionPct,
        forecastedAdoptionPct: baselineAdoptionPct,
        forecastedDate: new Date(Date.now() + forecastDays * 24 * 60 * 60 * 1000)
          .toISOString()
          .split('T')[0],
        confidence: 0.3,
        trend: 'stable',
        recommendations: ['Error in forecast, please try again later'],
      }
    }
  }

  /**
   * Get feature blockers for an account with root cause analysis
   */
  async getFeatureBlockers(accountId: string): Promise<FeatureBlocker[]> {
    const { data: blockers, error } = await this.supabase
      .from('feature_blockers')
      .select(
        `
        id,
        feature_id,
        blocker_type,
        severity,
        description,
        root_cause_analysis,
        detected_at,
        features:feature_id(name)
      `
      )
      .eq('account_id', accountId)
      .is('resolved_at', null)
      .order('severity', { ascending: false })

    if (error) throw new Error(`Failed to fetch blockers: ${error.message}`)

    return blockers.map((b: any) => ({
      blockerId: b.id,
      featureId: b.feature_id,
      featureName: b.features?.name || 'Unknown',
      blockerType: b.blocker_type,
      severity: b.severity,
      description: b.description,
      rootCauseAnalysis: b.root_cause_analysis,
      detectedAt: b.detected_at,
    }))
  }

  /**
   * Detect blockers using Claude and feature usage metrics
   */
  async detectBlockersAI(accountId: string): Promise<FeatureBlocker[]> {
    // Get adoption data and tickets
    const { data: lowAdoption } = await this.supabase
      .from('account_feature_adoption')
      .select(
        `
        id,
        feature_id,
        adoption_status,
        adoption_pct,
        blockers_identified,
        features:feature_id(name)
      `
      )
      .eq('account_id', accountId)
      .lt('adoption_pct', 20)

    const { data: tickets } = await this.supabase
      .from('support_tickets')
      .select('id, title, description, category')
      .eq('account_id', accountId)
      .in('status', ['open', 'in-progress'])
      .limit(10)

    // Use Claude to analyze and suggest blockers
    const blockers: FeatureBlocker[] = []

    for (const adoption of lowAdoption || []) {
      try {
        const blockerPrompt = `Feature "${(adoption.features as any)?.name}" has only ${adoption.adoption_pct}% adoption.
Recent support tickets: ${tickets?.map((t) => t.title).join(', ') || 'None'}

Analyze what might be blocking adoption. Provide JSON:
{type: 'technical'|'training'|'organizational'|'business', factors: [], recommendations: []}`

        const blockerResponse = await generateText(blockerPrompt, {
          maxOutputTokens: 300,
          responseMimeType: 'application/json',
          disableThinking: true,
        })

        const jsonMatch = blockerResponse.result.match(/\{[\s\S]*\}/)
        const analysis = JSON.parse(jsonMatch ? jsonMatch[0] : '{}')

        blockers.push({
          blockerId: adoption.id,
          featureId: adoption.feature_id,
          featureName: (adoption.features as any)?.name || 'Unknown',
          blockerType: analysis.type || 'other',
          severity: adoption.adoption_pct < 10 ? 'critical' : 'high',
          description: `Low adoption detected: ${adoption.adoption_pct}%`,
          rootCauseAnalysis: {
            factors: analysis.factors || [],
            recommendations: analysis.recommendations || [],
          },
          detectedAt: new Date().toISOString(),
        })
      } catch (error) {
        console.error('[AdoptionService] Blocker detection error:', error)
      }
    }

    return blockers
  }

  /**
   * Get feature dependency graph (DAG)
   */
  async getFeatureDependencies(accountId?: string) {
    // Get all features
    const { data: features } = await this.supabase
      .from('features')
      .select('id, name, category, launch_date, tier')
      .eq('is_active', true)

    // Get dependencies
    const { data: dependencies } = await this.supabase
      .from('feature_dependencies')
      .select('feature_id, depends_on_id, relationship_type')

    // Get account adoption data if provided
    let accountAdoption: Record<string, number> = {}
    if (accountId) {
      const { data: adoption } = await this.supabase
        .from('account_feature_adoption')
        .select('feature_id, adoption_pct')
        .eq('account_id', accountId)

      accountAdoption = adoption?.reduce((acc: any, a: any) => {
        acc[a.feature_id] = a.adoption_pct
        return acc
      }, {})
    }

    return {
      features: features || [],
      dependencies: (dependencies || []).map((d: any) => ({
        fromFeatureId: d.feature_id,
        toFeatureId: d.depends_on_id,
        relationshipType: d.relationship_type,
      })),
      accountAdoption: accountAdoption || undefined,
    }
  }

  /**
   * Calculate adoption trend
   */
  private calculateTrend(
    adoptionHistory: any[]
  ): 'accelerating' | 'stable' | 'declining' {
    if (adoptionHistory.length === 0) return 'stable'

    const recentValues = adoptionHistory
      .slice(0, Math.min(5, adoptionHistory.length))
      .map((h: any) => h.adoptionHistory[0]?.adoptionPct || 0)

    if (recentValues.length < 2) return 'stable'

    const trend = recentValues[0] - recentValues[recentValues.length - 1]

    if (trend > 5) return 'accelerating'
    if (trend < -5) return 'declining'
    return 'stable'
  }
}
