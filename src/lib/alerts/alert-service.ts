import type { AlertCheckResult } from '@/lib/supabase/types'

export class AlertService {
  private supabase: any

  constructor(supabaseClient: any) {
    this.supabase = supabaseClient
  }

  // 1. CHURN RISK: health_score_v2 < 40
  async checkChurnRisk(accountId: string, healthScore: number): Promise<AlertCheckResult> {
    if (healthScore < 40) {
      return {
        type: 'churn_risk',
        severity: 'critical',
        message: `Conta em risco crítico: Health Score ${healthScore.toFixed(1)}% indica alta probabilidade de churn.`,
        metadata: {
          health_score: healthScore,
          threshold: 40,
          recommendation: 'Agendar QBR imediato com executivo'
        }
      }
    }
    return null
  }

  // 2. SILENT CUSTOMER: 21+ dias sem interação
  async checkSilentCustomer(accountId: string): Promise<AlertCheckResult> {
    const { data: lastInteraction } = await this.supabase
      .from('interactions')
      .select('created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!lastInteraction) {
      // Nunca teve interação
      return {
        type: 'silent_customer',
        severity: 'warning',
        message: 'Cliente sem registro de interação. Primeira abordagem recomendada.',
        metadata: {
          days_silent: null,
          last_interaction: null,
          recommendation: 'Enviar welcome email ou agendar onboarding call'
        }
      }
    }

    const daysSilent = Math.floor(
      (Date.now() - new Date(lastInteraction.created_at).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSilent >= 21) {
      return {
        type: 'silent_customer',
        severity: 'warning',
        message: `Cliente silencioso há ${daysSilent} dias. Engajamento urgente recomendado.`,
        metadata: {
          days_silent: daysSilent,
          last_interaction: lastInteraction.created_at,
          recommendation: 'Enviar check-in email ou agendar health check call'
        }
      }
    }

    return null
  }

  // 3. RENEWAL UPCOMING: renovação em <= 60 dias
  async checkRenewalUpcoming(accountId: string): Promise<AlertCheckResult> {
    const { data: contract } = await this.supabase
      .from('contracts')
      .select('renewal_date, mrr')
      .eq('account_id', accountId)
      .eq('status', 'active')
      .order('renewal_date', { ascending: true })
      .limit(1)
      .single()

    if (!contract) return null

    const daysUntilRenewal = Math.floor(
      (new Date(contract.renewal_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    )

    if (daysUntilRenewal <= 60 && daysUntilRenewal > 0) {
      return {
        type: 'renewal_upcoming',
        severity: daysUntilRenewal <= 30 ? 'critical' : 'warning',
        message: `Renovação de contrato em ${daysUntilRenewal} dias. Planejamento estratégico iniciado.`,
        metadata: {
          renewal_date: contract.renewal_date,
          days_until: daysUntilRenewal,
          current_mrr: contract.mrr,
          recommendation: 'Revisar NPS, adoption gains, e preparar renewal proposal'
        }
      }
    }

    return null
  }

  // 4. ADOPTION ANOMALY: queda > 20% vs mês anterior
  async checkAdoptionAnomaly(accountId: string): Promise<AlertCheckResult> {
    const today = new Date()
    const firstDayThisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)

    const { data: thisMonth } = await this.supabase
      .from('adoption_metrics')
      .select('active_feature_count, total_feature_count')
      .eq('account_id', accountId)
      .gte('evaluated_at', firstDayThisMonth.toISOString())
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .single()

    const { data: lastMonth } = await this.supabase
      .from('adoption_metrics')
      .select('active_feature_count, total_feature_count')
      .eq('account_id', accountId)
      .gte('evaluated_at', firstDayLastMonth.toISOString())
      .lt('evaluated_at', firstDayThisMonth.toISOString())
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .single()

    if (!thisMonth || !lastMonth) return null

    const thisMonthRate = thisMonth.active_feature_count / thisMonth.total_feature_count
    const lastMonthRate = lastMonth.active_feature_count / lastMonth.total_feature_count
    const dropPercent = ((lastMonthRate - thisMonthRate) / lastMonthRate) * 100

    if (dropPercent > 20) {
      return {
        type: 'adoption_anomaly',
        severity: 'warning',
        message: `Queda anômala de ${dropPercent.toFixed(1)}% na adoção vs mês anterior. Investigação recomendada.`,
        metadata: {
          this_month_rate: (thisMonthRate * 100).toFixed(1),
          last_month_rate: (lastMonthRate * 100).toFixed(1),
          drop_percent: dropPercent.toFixed(1),
          features_disabled: lastMonth.active_feature_count - thisMonth.active_feature_count,
          recommendation: 'Analisar qual(is) feature(s) foram desativadas e por quê'
        }
      }
    }

    return null
  }

  // 5. EXPANSION SIGNAL: NPS >= 9 + MRR < mediana segmento OR effort logged opportunity
  async checkExpansionSignal(accountId: string): Promise<AlertCheckResult> {
    const { data: account } = await this.supabase
      .from('accounts')
      .select('segment')
      .eq('id', accountId)
      .single()

    if (!account) return null

    // --- DYNAMIC EFFORT RAG EXPANSION OPPORTUNITIES CHECK ---
    try {
      const { data: contract } = await this.supabase
        .from('contracts')
        .select('service_type, mrr')
        .eq('account_id', accountId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()

      if (contract) {
        const serviceType = contract.service_type

        // Fetch all subscription plans
        const { data: allPlans } = await this.supabase
          .from('subscription_plans')
          .select('id, name, tier_rank')
          .eq('is_active', true)

        const currentPlan = allPlans?.find((p: any) => p.name.toLowerCase() === serviceType?.toLowerCase())
        const currentTierRank = currentPlan?.tier_rank ?? 0

        // Find higher-tier plans
        const higherPlans = allPlans?.filter((p: any) => p.tier_rank > currentTierRank) || []
        const higherPlanNames = higherPlans.map((p: any) => p.name)

        // Fetch all product features
        const { data: allFeatures } = await this.supabase
          .from('product_features')
          .select('id, name, module')
          .eq('is_active', true)

        let currentPlanFeatureIds: string[] = []
        if (currentPlan?.id) {
          const { data: planFeatures } = await this.supabase
            .from('plan_features')
            .select('feature_id')
            .eq('plan_id', currentPlan.id)

          currentPlanFeatureIds = planFeatures?.map((pf: any) => pf.feature_id) || []
        }

        // Excluded features / modules (not in the current plan)
        const excludedFeatures = allFeatures?.filter((f: any) => !currentPlanFeatureIds.includes(f.id)) || []

        const opportunityKeywords = new Set<string>()

        // Add higher-tier plans to keywords
        higherPlanNames.forEach((name: string) => {
          opportunityKeywords.add(name.trim().toLowerCase())
        })

        // Add excluded features and modules to keywords
        excludedFeatures.forEach((f: any) => {
          if (f.name) opportunityKeywords.add(f.name.trim().toLowerCase())
          if (f.module) opportunityKeywords.add(f.module.trim().toLowerCase())
        })

        // Standard sales opportunity terms
        opportunityKeywords.add('expansão')
        opportunityKeywords.add('expansao')
        opportunityKeywords.add('upsell')
        opportunityKeywords.add('cross-sell')
        opportunityKeywords.add('crosssell')
        opportunityKeywords.add('drp') // "DRP" is a system module

        // Fetch recent interactions (past 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const { data: recentInteractions } = await this.supabase
          .from('interactions')
          .select('title, raw_transcript, type, created_at')
          .eq('account_id', accountId)
          .gte('created_at', thirtyDaysAgo)

        // Fetch recent time entries (past 30 days)
        const { data: recentTimeEntries } = await this.supabase
          .from('time_entries')
          .select('parsed_description, natural_language_input, activity_type, date')
          .eq('account_id', accountId)
          .gte('date', thirtyDaysAgo.split('T')[0])

        let matchedKeyword = ''
        let matchingTextSnippet = ''
        let foundSource = ''

        const keywordsList = Array.from(opportunityKeywords).filter((k: string) => k.length > 2)

        // Look for keyword match in recent interactions
        if (recentInteractions) {
          for (const inter of recentInteractions) {
            const textToSearch = `${inter.title || ''} ${inter.raw_transcript || ''}`.toLowerCase()
            for (const kw of keywordsList) {
              if (textToSearch.includes(kw)) {
                matchedKeyword = kw
                matchingTextSnippet = inter.raw_transcript
                  ? (inter.raw_transcript.length > 120 ? `${inter.raw_transcript.slice(0, 120)}...` : inter.raw_transcript)
                  : inter.title || ''
                foundSource = `Interação: "${inter.title || inter.type}"`
                break
              }
            }
            if (matchedKeyword) break
          }
        }

        // Look for keyword match in recent time entries
        if (!matchedKeyword && recentTimeEntries) {
          for (const entry of recentTimeEntries) {
            const textToSearch = `${entry.natural_language_input || ''} ${entry.parsed_description || ''}`.toLowerCase()
            for (const kw of keywordsList) {
              if (textToSearch.includes(kw)) {
                matchedKeyword = kw
                matchingTextSnippet = entry.natural_language_input
                  ? (entry.natural_language_input.length > 120 ? `${entry.natural_language_input.slice(0, 120)}...` : entry.natural_language_input)
                  : entry.parsed_description || ''
                foundSource = `Log de esforço em ${entry.date}`
                break
              }
            }
            if (matchedKeyword) break
          }
        }

        if (matchedKeyword) {
          const displayKeyword = matchedKeyword.toUpperCase()
          return {
            type: 'expansion_signal',
            severity: 'info',
            message: `Oportunidade de expansão identificada via Esforço/Interação: menção ao termo/módulo "${displayKeyword}".`,
            metadata: {
              matched_keyword: displayKeyword,
              source: foundSource,
              snippet: matchingTextSnippet,
              recommendation: `Mapear a oportunidade de upsell/cross-sell para o módulo/feature "${displayKeyword}" detectado.`
            }
          }
        }
      }
    } catch (err) {
      console.error('[AlertService] Error during dynamic effort expansion check:', err)
    }

    // --- FALLBACK STANDARD NPS + MRR CHECK ---
    // Buscar NPS médio (últimas 5 respostas)
    const { data: npsData } = await this.supabase
      .from('nps_responses')
      .select('score')
      .eq('account_id', accountId)
      .order('responded_at', { ascending: false })
      .limit(5)

    if (!npsData || npsData.length === 0) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const avgNps = npsData.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / npsData.length

    if (avgNps < 9) return null

    // Buscar MRR vs mediana do segmento
    const { data: contracts } = await this.supabase
      .from('contracts')
      .select('mrr')
      .eq('account_id', accountId)
      .eq('status', 'active')

    if (!contracts || contracts.length === 0) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentMrr = contracts[0].mrr

    // Calcular mediana do segmento
    const { data: segmentContracts } = await this.supabase
      .from('contracts')
      .select('mrr')
      .eq('segment', account.segment)
      .eq('status', 'active')

    if (!segmentContracts || segmentContracts.length === 0) return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const segmentMrrs = segmentContracts.map((c: any) => c.mrr).sort((a: number, b: number) => a - b)
    const medianMrr = segmentMrrs[Math.floor(segmentMrrs.length / 2)]

    if (currentMrr >= medianMrr) return null

    return {
      type: 'expansion_signal',
      severity: 'info',
      message: `Oportunidade de expansão detectada: NPS ${avgNps.toFixed(1)} + MRR abaixo da mediana do segmento.`,
      metadata: {
        current_nps: avgNps.toFixed(1),
        current_mrr: currentMrr,
        segment_median_mrr: medianMrr,
        expansion_potential: (medianMrr - currentMrr).toFixed(2),
        recommendation: 'Mapear novas oportunidades (add-on, upsell) com cliente'
      }
    }
  }

  // 6. NPS DETRACTOR UNACTIONED: NPS <= 6 sem follow-up 7d
  async checkNPSDetractorUnactioned(accountId: string): Promise<AlertCheckResult> {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: detractors } = await this.supabase
      .from('nps_responses')
      .select('id, score, responded_at')
      .eq('account_id', accountId)
      .lte('score', 6)
      .gte('responded_at', sevenDaysAgo.toISOString())
      .order('responded_at', { ascending: false })
      .limit(1)

    if (!detractors || detractors.length === 0) return null

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detractor: any = detractors[0]

    // Check: existe ticket de follow-up criado após a resposta NPS?
    const { data: followUp } = await this.supabase
      .from('support_tickets')
      .select('id')
      .eq('account_id', accountId)
      .gte('created_at', detractor.responded_at)
      .limit(1)

    if (followUp && followUp.length > 0) return null

    return {
      type: 'nps_detractor_unactioned',
      severity: 'warning',
      message: `Detrator NPS (${detractor.score}) sem follow-up há 7+ dias. Ação urgente recomendada.`,
      metadata: {
        nps_score: detractor.score,
        responded_at: detractor.responded_at,
        days_without_followup: 7,
        nps_response_id: detractor.id,
        recommendation: 'Criar ticket de investigação ou contatar cliente via QBR'
      }
    }
  }

  // 7. PLAYBOOK TRIGGER: health_score_v2 < 50 (Wave 4, Story 14.2)
  async checkPlaybookTrigger(accountId: string): Promise<AlertCheckResult> {
    // Get latest health score v2
    const { data: healthData } = await this.supabase
      .from('health_scores')
      .select('health_score_v2')
      .eq('account_id', accountId)
      .order('evaluated_at', { ascending: false })
      .limit(1)
      .single()

    if (!healthData || !healthData.health_score_v2 || healthData.health_score_v2 >= 50) {
      return null
    }

    // Idempotency check 1: no active playbook
    const { data: activePlaybook } = await this.supabase
      .from('account_playbooks')
      .select('id')
      .eq('account_id', accountId)
      .eq('status', 'in_progress')
      .limit(1)

    if (activePlaybook && activePlaybook.length > 0) {
      return null
    }

    // Idempotency check 2: no existing unresolved playbook_trigger alert
    const { data: existingAlert } = await this.supabase
      .from('proactive_alerts')
      .select('id')
      .eq('account_id', accountId)
      .eq('type', 'playbook_trigger')
      .is('resolved_at', null)
      .limit(1)

    if (existingAlert && existingAlert.length > 0) {
      return null
    }

    return {
      type: 'playbook_trigger',
      severity: 'warning',
      message: `Health Score ${healthData.health_score_v2.toFixed(1)}% abaixo do limite. Ativar playbook de salvamento recomendado.`,
      metadata: {
        health_score_v2: healthData.health_score_v2,
        threshold: 50,
        recommended_playbook_id: '11111111-1111-1111-1111-111111111111',
        recommended_playbook_name: 'Salvamento de Conta - Risco Alto',
        recommendation: 'Iniciar playbook estruturado de salvamento de conta'
      }
    }
  }

  // Avaliar todos os 7 tipos para uma conta
  async evaluateAllAlerts(accountId: string, healthScore: number): Promise<AlertCheckResult[]> {
    const results: AlertCheckResult[] = [
      await this.checkChurnRisk(accountId, healthScore),
      await this.checkSilentCustomer(accountId),
      await this.checkRenewalUpcoming(accountId),
      await this.checkAdoptionAnomaly(accountId),
      await this.checkExpansionSignal(accountId),
      await this.checkNPSDetractorUnactioned(accountId),
      await this.checkPlaybookTrigger(accountId)
    ]
    return results.filter(r => r !== null)
  }
}
