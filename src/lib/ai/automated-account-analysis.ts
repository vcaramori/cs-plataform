import { runPredictiveRiskAnalysis } from './predictive-risk'
import { generateShadowScore } from '../health/shadow-score'
import { getSupabaseAdminClient } from '../supabase/admin'
import { getHealthClassification } from '../health/utils'

/**
 * Executa a análise unificada de risco e saúde do cliente.
 * Chamada automaticamente após interações críticas ou sincronização de esforço.
 */
export async function runAutomatedAccountAnalysis(accountId: string, userId: string) {
  console.log(`[AI Analysis] Iniciando análise unificada para a conta ${accountId}`)
  
  const supabase = getSupabaseAdminClient()
  const today = new Date().toISOString().slice(0, 10)

  try {
    // 1. Risco Preditivo (Banner Laranja)
    // Nota: runPredictiveRiskAnalysis já persiste seu próprio resultado
    const riskResult = await runPredictiveRiskAnalysis(accountId)
    console.log(`[AI Analysis] Risco Preditivo concluído:`, riskResult?.risk_score)

    // 2. Shadow Score (Gauge do Header)
    const healthResult = await generateShadowScore(accountId)
    console.log(`[AI Analysis] Shadow Score gerado:`, healthResult.score)

    // 3. Persistência do Health Score
    const { error: healthError } = await supabase
      .from('health_scores')
      .insert({
        account_id: accountId,
        evaluated_at: today,
        shadow_score: healthResult.score,
        shadow_reasoning: healthResult.justification,
        classification: getHealthClassification(healthResult.score),
        source_type: 'effort_sync_auto',
        created_by: userId,
        sentiment_component: healthResult.score, // Atribuímos ao componente de relacionamento
        ticket_component: 50, // Valores base para evitar NULL no gráfico/gauge
        engagement_component: 50,
      })

    if (healthError) {
      console.error(`[AI Analysis] Erro ao salvar health_score:`, healthError.message)
      throw healthError
    }
    
    console.log(`[AI Analysis] Análise unificada finalizada com sucesso para ${accountId}`)
    return { riskResult, healthResult }
  } catch (error: any) {
    console.error(`[AI Analysis] Falha crítica na análise da conta ${accountId}:`, error.message)
    return null
  }
}
