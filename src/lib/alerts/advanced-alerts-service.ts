import { generateText } from '@/lib/llm/gateway'
import type { SupabaseClient } from '@supabase/supabase-js'

export class AdvancedAlertsService {
  private supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  /**
   * Epic 22.1: Detect predictive churn (health < 40 for 3 consecutive days)
   */
  async checkPredictiveChurn() {
    // Get accounts with health < 40
    const { data: lowHealthAccounts } = await this.supabase
      .from('accounts')
      .select('id, name, health_score, csm_owner_id')
      .lt('health_score', 40)

    const churnAlerts = []

    for (const account of lowHealthAccounts || []) {
      // Check if this has been low for 3+ consecutive days
      const { data: history } = await this.supabase
        .from('churn_risk_history')
        .select('below_threshold, consecutive_days, alert_triggered_at')
        .eq('account_id', account.id)
        .order('evaluation_date', { ascending: false })
        .limit(3)

      const belowThresholdCount = (history || []).filter((h: any) => h.below_threshold).length

      if (belowThresholdCount >= 3 && !history?.[0]?.alert_triggered_at) {
        // Create alert
        const alert = {
          accountId: account.id,
          accountName: account.name,
          alertType: 'churn_risk',
          severity: 'critical',
          riskScore: Math.min(1, (100 - account.health_score) / 100),
          riskFactors: [
            {
              factor: 'health_declining',
              weight: 0.5,
              evidence: `Health score at ${account.health_score}% for 3+ days`,
            },
            {
              factor: 'churn_probability_high',
              weight: 0.5,
              evidence: 'Consistent low health indicates engagement loss',
            },
          ],
          recommendedAction: 'Schedule immediate executive business review with stakeholders',
          metadata: {
            currentHealthScore: account.health_score,
            daysBelow40: belowThresholdCount,
          },
        }

        // Store in database
        await this.supabase.from('alerts').insert([
          {
            account_id: account.id,
            alert_type: 'churn_risk',
            severity: alert.severity,
            risk_score: alert.riskScore,
            risk_factors: alert.riskFactors,
            recommended_action: alert.recommendedAction,
            metadata: alert.metadata,
          },
        ])

        churnAlerts.push(alert)
      }
    }

    return churnAlerts
  }

  /**
   * Epic 22.2: Detect anomalies using statistical analysis
   */
  async detectAnomalies() {
    const metricTypes = ['health_score', 'nps', 'ticket_volume', 'response_time', 'engagement']
    const anomalies = []

    for (const metricType of metricTypes) {
      const { data: metrics } = await this.supabase
        .from('anomaly_detection')
        .select('*')
        .eq('metric_type', metricType)
        .order('detection_date', { ascending: false })
        .limit(30)

      if (!metrics || metrics.length < 10) continue

      // Calculate mean and std dev
      const values = metrics.map((m: any) => m.metric_value)
      const mean = values.reduce((a: number, b: number) => a + b) / values.length
      const stdDev = Math.sqrt(
        values.reduce((sq: number, n: number) => sq + Math.pow(n - mean, 2)) / values.length
      )

      // Check for outliers (z-score > 2.5)
      const latestMetric = metrics[0]
      const zScore = Math.abs((latestMetric.metric_value - mean) / stdDev)

      if (zScore > 2.5) {
        const isSpike = latestMetric.metric_value > mean
        const anomalyType = isSpike ? 'spike' : 'drop'
        const severity = zScore > 3.5 ? 'high' : 'medium'

        anomalies.push({
          accountId: latestMetric.account_id,
          metricType,
          metricValue: latestMetric.metric_value,
          expectedValue: mean,
          zScore: Math.round(zScore * 100) / 100,
          anomalyType,
          severity,
          explanation: `${metricType} unexpectedly ${anomalyType}ed to ${latestMetric.metric_value.toFixed(2)} (expected ~${mean.toFixed(2)})`,
        })

        // Store alert
        await this.supabase.from('alerts').insert([
          {
            account_id: latestMetric.account_id,
            alert_type: 'anomaly',
            severity,
            risk_score: Math.min(zScore / 4, 1),
            risk_factors: [
              {
                factor: `${metricType}_${anomalyType}`,
                weight: 0.7,
                evidence: `Z-score: ${zScore.toFixed(2)}`,
              },
            ],
            recommended_action: `Investigate unusual ${metricType} ${anomalyType}`,
            metadata: {
              metric_type: metricType,
              current_value: latestMetric.metric_value,
              expected_value: mean,
              z_score: zScore,
            },
          },
        ])
      }
    }

    return anomalies
  }

  /**
   * Epic 22.3: Sentiment triggers (NPS sentiment < -0.5)
   */
  async detectSentimentTriggers() {
    const { data: lowSentiment } = await this.supabase
      .from('sentiment_trigger_events')
      .select('id, account_id, sentiment_score, sentiment_text')
      .lt('sentiment_score', -0.5)
      .eq('alert_created', false)

    const alerts = []

    for (const event of lowSentiment || []) {
      // Get account info
      const { data: account } = await this.supabase
        .from('accounts')
        .select('name')
        .eq('id', event.account_id)
        .single()

      let suggestedResponse = 'Schedule check-in call to address concerns'
      try {
        const aiResponse = await generateText(
          `Customer feedback: "${event.sentiment_text}"\n\nSuggest a 1-sentence response that addresses their concern. Be empathetic and action-oriented.`,
          { maxOutputTokens: 200 }
        )
        suggestedResponse = aiResponse.result || suggestedResponse
      } catch (error) {
        console.error('[AdvancedAlerts] Sentiment analysis error:', error)
      }

      const alert = {
        accountId: event.account_id,
        accountName: account?.name || 'Unknown',
        sentimentScore: event.sentiment_score,
        sentimentText: event.sentiment_text,
        severity: event.sentiment_score < -0.8 ? 'high' : 'medium',
        suggestedResponse,
      }

      // Store alert
      await this.supabase.from('alerts').insert([
        {
          account_id: event.account_id,
          alert_type: 'sentiment_trigger',
          severity: alert.severity,
          risk_score: Math.abs(event.sentiment_score),
          risk_factors: [
            {
              factor: 'negative_sentiment_detected',
              weight: 1,
              evidence: event.sentiment_text.substring(0, 100),
            },
          ],
          recommended_action: suggestedResponse,
          metadata: {
            sentiment_score: event.sentiment_score,
            feedback_snippet: event.sentiment_text,
          },
        },
      ])

      alerts.push(alert)
    }

    // Mark as handled
    if (lowSentiment && lowSentiment.length > 0) {
      await this.supabase
        .from('sentiment_trigger_events')
        .update({ alert_created: true })
        .in(
          'id',
          lowSentiment.map((e: any) => e.id)
        )
    }

    return alerts
  }

  /**
   * Epic 22.4: Contract risk alerts (renewal < 30d AND health < 50)
   */
  async detectContractRisk() {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Get contracts renewing within 30 days
    const { data: upcomingRenewals } = await this.supabase
      .from('contracts')
      .select('id, account_id, accounts(name, health_score), renewal_date, mrr')
      .lte('renewal_date', thirtyDaysFromNow.toISOString().split('T')[0])
      .gte('renewal_date', new Date().toISOString().split('T')[0])
      .eq('status', 'active')

    const riskAlerts = []

    for (const contract of upcomingRenewals || []) {
      const account = (contract as any).accounts
      const healthScore = account?.health_score || 50

      // Check if health < 50
      if (healthScore < 50) {
        const daysUntilRenewal = Math.floor(
          (new Date((contract as any).renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )

        const severity = daysUntilRenewal < 14 ? 'critical' : 'high'
        const riskScore = (100 - healthScore) / 100 * (1 - daysUntilRenewal / 30)

        const alert = {
          accountId: contract.account_id,
          accountName: account?.name || 'Unknown',
          contractId: contract.id,
          renewalDate: (contract as any).renewal_date,
          daysUntilRenewal,
          healthScore,
          contractValue: (contract as any).mrr,
          severity,
          riskFactors: [
            'renewal_urgency',
            'health_concern',
          ],
          recommendedActions: [
            'Schedule executive business review',
            'Prepare renewal proposal with value justification',
            'Address health score drivers',
          ],
        }

        // Store alert
        await this.supabase.from('alerts').insert([
          {
            account_id: contract.account_id,
            alert_type: 'contract_risk',
            severity,
            risk_score: Math.min(riskScore, 1),
            risk_factors: [
              {
                factor: 'renewal_urgency',
                weight: 0.6,
                evidence: `${daysUntilRenewal} days until renewal`,
              },
              {
                factor: 'health_concern',
                weight: 0.4,
                evidence: `Health score at ${healthScore}%`,
              },
            ],
            recommended_action: 'Schedule immediate executive review and renewal strategy session',
            metadata: {
              contract_value: (contract as any).mrr,
              renewal_date: (contract as any).renewal_date,
            },
          },
        ])

        riskAlerts.push(alert)
      }
    }

    return riskAlerts
  }

  /**
   * Epic 22.5: Adoption cliff alerts (> 20% drop in 7 days)
   */
  async detectAdoptionCliffs() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]

    // Get adoption data from last 7 days
    const { data: cliffEvents } = await this.supabase
      .from('adoption_cliff_events')
      .select('*')
      .eq('cliff_detected', false)

    const cliffAlerts = []

    for (const event of cliffEvents || []) {
      if ((event as any).adoption_drop_pct > 20) {
        // Get account info
        const { data: account } = await this.supabase
          .from('accounts')
          .select('name')
          .eq('id', (event as any).account_id)
          .single()

        const alert = {
          accountId: (event as any).account_id,
          accountName: account?.name || 'Unknown',
          cliffDate: (event as any).cliff_date,
          adoptionPct7dAgo: (event as any).adoption_pct_7d_ago,
          adoptionPctToday: (event as any).adoption_pct_today,
          dropPct: (event as any).adoption_drop_pct,
          affectedFeatures: [],
          severity: (event as any).adoption_drop_pct > 40 ? 'high' : 'medium',
          usageDeclineReason: (event as any).usage_decline_details?.reason || 'Unknown',
          recommendedAction: 'Investigate adoption decline and re-engage users on affected features',
        }

        // Store alert
        await this.supabase.from('alerts').insert([
          {
            account_id: (event as any).account_id,
            alert_type: 'adoption_cliff',
            severity: alert.severity,
            risk_score: Math.min((event as any).adoption_drop_pct / 100, 1),
            risk_factors: [
              {
                factor: 'adoption_cliff',
                weight: 1,
                evidence: `Adoption dropped ${(event as any).adoption_drop_pct.toFixed(1)}% in 7 days`,
              },
            ],
            recommended_action: alert.recommendedAction,
            metadata: {
              adoption_drop_pct: (event as any).adoption_drop_pct,
              affected_features: (event as any).affected_features || [],
            },
          },
        ])

        cliffAlerts.push(alert)
      }
    }

    // Mark as processed
    if (cliffEvents && cliffEvents.length > 0) {
      const detectedCliffs = cliffEvents.filter((e: any) => e.adoption_drop_pct > 20)
      if (detectedCliffs.length > 0) {
        await this.supabase
          .from('adoption_cliff_events')
          .update({ cliff_detected: true })
          .in(
            'id',
            detectedCliffs.map((e: any) => e.id)
          )
      }
    }

    return cliffAlerts
  }

  /**
   * Get all active alerts for CSM (RLS: own accounts only)
   */
  async getAlerts(csmId: string, filters?: Record<string, any>) {
    let query = this.supabase
      .from('alerts')
      .select(
        `
        id,
        account_id,
        accounts(name),
        alert_type,
        severity,
        status,
        risk_score,
        risk_factors,
        recommended_action,
        metadata,
        triggered_at,
        acknowledged_at,
        resolved_at
      `
      )
      .in('status', ['active', 'acknowledged'])

    // RLS: Only get alerts for accounts managed by this CSM
    const { data: csmAccounts } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('csm_owner_id', csmId)

    const csmAccountIds = (csmAccounts || []).map((a) => a.id)

    if (csmAccountIds.length > 0) {
      query = query.in('account_id', csmAccountIds)
    } else {
      return { alerts: [], summary: { totalAlerts: 0, criticalCount: 0, highCount: 0 } }
    }

    // Apply filters
    if (filters?.alertType) {
      query = query.eq('alert_type', filters.alertType)
    }
    if (filters?.severity) {
      query = query.eq('severity', filters.severity)
    }

    const { data: alerts } = await query.order('triggered_at', { ascending: false })

    // Calculate summary
    const summary = {
      totalAlerts: alerts?.length || 0,
      criticalCount: (alerts || []).filter((a: any) => a.severity === 'critical').length,
      highCount: (alerts || []).filter((a: any) => a.severity === 'high').length,
      mediumCount: (alerts || []).filter((a: any) => a.severity === 'medium').length,
      lowCount: (alerts || []).filter((a: any) => a.severity === 'low').length,
      activeCount: (alerts || []).filter((a: any) => a.status === 'active').length,
    }

    return {
      alerts: (alerts || []).map((a: any) => ({
        alertId: a.id,
        accountId: a.account_id,
        accountName: a.accounts?.name || 'Unknown',
        alertType: a.alert_type,
        severity: a.severity,
        status: a.status,
        riskScore: a.risk_score,
        riskFactors: a.risk_factors,
        recommendedAction: a.recommended_action,
        metadata: a.metadata,
        triggeredAt: a.triggered_at,
        acknowledgedAt: a.acknowledged_at,
        resolvedAt: a.resolved_at,
      })),
      summary,
    }
  }
}
