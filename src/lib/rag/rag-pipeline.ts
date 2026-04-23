import { generateText, generateEmbedding } from '@/lib/llm/gateway'
import { searchEmbeddingsWithVector } from '@/lib/supabase/vector-search'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAccountPlanSummary, getPortfolioSummary, type PortfolioSummary } from '@/lib/adoption/risk-engine'
import { getNPSSegment } from '@/lib/supabase/types'

export type RAGSource = {
  type: 'interaction' | 'support_ticket'
  source_id: string
  account_name: string
  title: string
  date: string
  excerpt: string
  similarity: number
}

export type RAGResult = {
  answer: string
  sources: RAGSource[]
}

export async function runRAGPipeline(
  question: string,
  csmId: string,
  accountId?: string
): Promise<RAGResult> {
  const supabase = getSupabaseAdminClient()

  // 1. Gera embedding da pergunta UMA ÚNICA VEZ (reutilizado se threshold for relaxado)
  const { result: queryEmbedding } = await generateEmbedding(question, { allowFallback: true })

  // 2. Busca vetorial nos embeddings (reutiliza o vetor)
  const chunks = await searchEmbeddingsWithVector(queryEmbedding, {
    accountId,
    limit: 8,
    threshold: 0.4,
  })

  // Fallback: se poucos resultados, relaxa threshold SEM regenerar embedding
  const finalChunks = chunks.length < 2
    ? await searchEmbeddingsWithVector(queryEmbedding, { accountId, limit: 8, threshold: 0.2 })
    : chunks

  // 2. Enriquece chunks com metadados das fontes originais
  const interactionIds = finalChunks
    .filter((c) => c.source_type === 'interaction')
    .map((c) => c.source_id)
  const ticketIds = finalChunks
    .filter((c) => c.source_type === 'support_ticket')
    .map((c) => c.source_id)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  const results = await Promise.all([
    interactionIds.length > 0
      ? db
          .from('interactions')
          .select('id, title, date, type, raw_transcript, accounts(name)')
          .in('id', interactionIds)
      : Promise.resolve({ data: [] as any[] }),
    ticketIds.length > 0
      ? db
          .from('support_tickets')
          .select('id, title, opened_at, priority, accounts(name)')
          .in('id', ticketIds)
      : Promise.resolve({ data: [] as any[] }),
    accountId
      ? db
          .from('feature_adoption')
          .select('id, status, action_plan, action_status, blocker_category, blocker_reason, product_features(name)')
          .eq('account_id', accountId)
      : Promise.resolve({ data: [] as any[] }),
    accountId
      ? getAccountPlanSummary(accountId, supabase)
      : Promise.resolve(null as any),
    !accountId
      ? getPortfolioSummary(supabase)
      : Promise.resolve(null as PortfolioSummary | null),
    accountId
      ? db
          .from('contacts')
          .select('name, role, influence_level, decision_maker')
          .eq('account_id', accountId)
      : Promise.resolve({ data: [] as any[] }),
    db.from('accounts').select('id, name'),
    accountId
      ? db
          .from('nps_responses')
          .select('score, comment, tags, user_email, responded_at')
          .eq('account_id', accountId)
          .eq('dismissed', false)
          .not('score', 'is', null)
          .order('responded_at', { ascending: false })
          .limit(10)
      : Promise.resolve({ data: [] as any[] }),
    // [8] Journal de Esforço — transcrições de reuniões, relatos de atividades, notas de contato
    accountId
      ? db
          .from('time_entries')
          .select('date, activity_type, parsed_hours, parsed_description, natural_language_input')
          .eq('account_id', accountId)
          .order('date', { ascending: false })
          .limit(20)
      : Promise.resolve({ data: [] as any[] }),
    // [9] Health Score — comparação Manual vs Shadow (detecta discrepância > 20)
    accountId
      ? db
          .from('health_scores')
          .select('evaluated_at, manual_score, shadow_score, discrepancy, discrepancy_alert, manual_notes, shadow_reasoning, classification')
          .eq('account_id', accountId)
          .order('evaluated_at', { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] as any[] }),
    // [10] Financeiro — MRR, ARR, status do contrato e renovação
    accountId
      ? db
          .from('contracts')
          .select('mrr, arr, renewal_date, status, service_type, contracted_hours_monthly, notes')
          .eq('account_id', accountId)
          .eq('status', 'active')
          .limit(1)
      : Promise.resolve({ data: [] as any[] }),
  ]) as [{ data: any[] }, { data: any[] }, { data: any[] }, any, PortfolioSummary | null, { data: any[] }, { data: any[] }, { data: any[] }, { data: any[] }, { data: any[] }, { data: any[] }]

  const interactionRecords = results[0].data
  const ticketRecords = results[1].data
  const adoptionRecords = results[2].data
  const planSummary = results[3]
  const portfolioSummary = results[4]
  const contacts = results[5].data
  const allAccounts = results[6].data
  const npsRecords = results[7].data
  const timeEntries = results[8].data
  const healthScores = results[9].data
  const contracts = results[10].data

  // 2.1 Detecção de Entidades (Account Discovery)
  // Se estamos em modo global, tentamos detectar se a pergunta cita algum cliente
  let extraAccountContext = ''
  if (!accountId && allAccounts && allAccounts.length > 0) {
    const mentionedAccounts = (allAccounts || []).filter((acc: any) => {
      const questionLower = question.toLowerCase()
      const nameLower = (acc.name || '').toLowerCase()
      
      // 1. Match exato ou substring direta
      if (nameLower && questionLower.includes(nameLower)) return true
      
      // 2. Match pelo "Base Name" (remove sufixos após hífens ou parênteses)
      const baseName = (acc.name || '').split(/[-(\[]/)[0].trim().toLowerCase()
      if (baseName.length > 3 && questionLower.includes(baseName)) return true
      
      // 3. Match por termos significativos (palavras longas únicas)
      const words = (acc.name || '').split(/\s+/).filter((w: string) => w.length > 4)
      return words.some((w: string) => questionLower.includes(w.toLowerCase()))
    })

    if (mentionedAccounts.length > 0) {
      try {
        // Busca contexto extra para o primeiro cliente mencionado (limite para não explodir tokens)
        const targetAcc = mentionedAccounts[0]
        const [extraAdoption, extraPlan] = await Promise.all([
          db.from('feature_adoption')
            .select('id, status, action_plan, action_status, product_features(name)')
            .eq('account_id', targetAcc.id),
          getAccountPlanSummary(targetAcc.id, supabase)
        ])

        const extraLines = (extraAdoption.data || []).map((a: any) => 
          `- ${a.product_features?.name || 'Funcionalidade'}: ${(a.status || 'N/A').toUpperCase()}`
        ).join('\n')

        extraAccountContext = `\n\n## CONTEXTO ESPECÍFICO DEEP-DIVE: ${targetAcc.name}
Plan: ${extraPlan?.plan_name || 'Nenhum'} | Downside Risk: ${(extraPlan?.risk_level || 'none').toUpperCase()}
Adoption:
${extraLines || 'Dados de adoção não encontrados.'}`
      } catch (err) {
        console.error('[RAG] Erro no Deep-Dive context:', err)
      }
    }
  }

  const interactionMap = new Map((interactionRecords ?? []).map((i) => [i.id, i]))
  const ticketMap = new Map((ticketRecords ?? []).map((t) => [t.id, t]))

  // 3. Monta contexto para o Gemini
  const contextBlocks = finalChunks.map((chunk, idx) => {
    if (chunk.source_type === 'interaction') {
      const meta = interactionMap.get(chunk.source_id)
      const accountsRaw = meta?.accounts as any
      const account = Array.isArray(accountsRaw) ? accountsRaw[0]?.name : accountsRaw?.name ?? 'Conta desconhecida'
      const date = meta?.date ?? ''
      const type = meta?.type ?? 'meeting'
      const transcriptNote = meta?.raw_transcript ? `\n[TRANSCRIÇÃO DISPONÍVEL — trecho indexado abaixo]` : ''
      return `[${idx + 1}] REUNIÃO | ${account} | ${date} | Tipo: ${type}${transcriptNote}\n${chunk.chunk_text}`
    } else {
      const meta = ticketMap.get(chunk.source_id)
      const accountsRaw = meta?.accounts as any
      const account = Array.isArray(accountsRaw) ? accountsRaw[0]?.name : accountsRaw?.name ?? 'Conta desconhecida'
      const date = meta?.opened_at ?? ''
      const priority = meta?.priority ?? 'medium'
      return `[${idx + 1}] TICKET | ${account} | ${date} | Prioridade: ${priority}\n${chunk.chunk_text}`
    }
  }).join('\n\n---\n\n')

  // 3.1 Adiciona Contexto de Adoção Técnica e Planos de Ação
  let adoptionContext = ''
  if (adoptionRecords && adoptionRecords.length > 0) {
    const adoptionLines = adoptionRecords.map(a => {
      const feature = (a.product_features as any)?.name ?? 'Funcionalidade'
      const statusMap = {
        in_use: 'ADOTADO',
        partial: 'PARCIAL',
        blocked: 'BLOQUEADO',
        not_started: 'NÃO INICIADO',
        na: 'N/A'
      }
      const status = statusMap[a.status as keyof typeof statusMap] || a.status
      let line = `- ${feature}: [${status}]`
      if (a.status === 'blocked') {
        line += ` | BLOQUEIO: ${a.blocker_category || 'Não definido'} (${a.blocker_reason || 'Sem detalhe'})`
      }
      if (a.action_plan) {
        line += ` | PLANO DE AÇÃO: ${a.action_plan} (Status: ${a.action_status})`
      }
      return line
    }).join('\n')
    
    adoptionContext = `\n\n## STATUS DE ADOÇÃO E PLANOS DE AÇÃO\n${adoptionLines}`
  }

  // 3.2 Adiciona Contexto de Plano e Risco de Downgrade
  let planRiskContext = ''
  if (planSummary) {
    planRiskContext = `\n\n## PLANO E RISCO COMERCIAL
Plano Atual: ${planSummary.plan_name}
Risco de Downgrade: ${planSummary.risk_level === 'high' ? 'CRÍTICO' : planSummary.risk_level === 'low' ? 'MÉDIO (Atenção)' : 'BAIXO/NENHUM'}`
    
    if (planSummary.risk_level !== 'none' && planSummary.at_risk_features.length > 0) {
      planRiskContext += `\nFuncionalidades Críticas Não Adotadas: ${planSummary.at_risk_features.join(', ')}`
    }
  }

  // 3.3 Adiciona Contexto Global (se aplicável)
  let portfolioContext = ''
  if (portfolioSummary) {
    const riskList = portfolioSummary.top_downgrade_risks
      .map(r => `- ${r.name} (${r.plan}): Risco ${r.risk.toUpperCase()} | Críticos: ${r.features.join(', ') || 'nenhum'}`)
      .join('\n')
    
    const blockerList = portfolioSummary.top_blockers
      .map(b => `- ${b.category}: ${b.count} ocorrências`)
      .join('\n')

    portfolioContext = `\n\n## RESUMO GLOBAL DO PORTFÓLIO
Média de Health Score: ${portfolioSummary.avg_health}/100
Distribuição de Saúde: ${portfolioSummary.health_dist.healthy} Saudáveis, ${portfolioSummary.health_dist.attention} Atenção, ${portfolioSummary.health_dist.risk} em Risco Crítico.
Total de Contas: ${portfolioSummary.total_accounts}

### Clientes com Maior Risco de Downgrade:
${riskList || 'Nenhum risco imediato detectado.'}

### Principais Bloqueios no Portfólio:
${blockerList || 'Nenhum bloqueio mapeado.'}`
  }

  // 3.4 Adiciona Contexto de NPS
  let npsContext = ''
  if (npsRecords && npsRecords.length > 0) {
    let promoters = 0, passives = 0, detractors = 0, scoreSum = 0
    for (const r of npsRecords) {
      const seg = getNPSSegment(r.score)
      if (seg === 'promoter') promoters++
      else if (seg === 'passive') passives++
      else detractors++
      scoreSum += r.score
    }
    const total = npsRecords.length
    const avgScore = (scoreSum / total).toFixed(1)
    const npsScore = Math.round(((promoters - detractors) / total) * 100)
    const commentLines = npsRecords
      .filter((r: any) => r.comment)
      .slice(0, 5)
      .map((r: any) => {
        const seg = getNPSSegment(r.score)
        const segLabel = seg === 'promoter' ? 'PROMOTOR' : seg === 'passive' ? 'NEUTRO' : 'DETRATOR'
        const tagStr = r.tags?.length > 0 ? ` [${r.tags.join(', ')}]` : ''
        return `- ${r.score}/10 (${segLabel})${tagStr}: "${r.comment}"`
      }).join('\n')
    npsContext = `\n\n## NPS DO CLIENTE
Score NPS: ${npsScore > 0 ? '+' : ''}${npsScore} | Nota Média: ${avgScore}/10 | Respostas: ${total}
Promotores: ${promoters} | Neutros: ${passives} | Detratores: ${detractors}
${commentLines ? `\nÚltimos comentários:\n${commentLines}` : ''}`
  }

  // 3.5 Journal de Esforço — fonte primária qualitativa: transcrições, relatos e notas de atividade
  let effortJournalContext = ''
  if (timeEntries && timeEntries.length > 0) {
    const effortLines = timeEntries.map((e: any) => {
      const typeMap: Record<string, string> = {
        'preparation': 'PREPARAÇÃO',
        'environment-analysis': 'ANÁLISE DE AMBIENTE',
        'strategy': 'ESTRATÉGIA',
        'reporting': 'RELATÓRIO',
        'internal-meeting': 'REUNIÃO INTERNA',
        'meeting': 'REUNIÃO COM CLIENTE',
        'onboarding': 'ONBOARDING',
        'qbr': 'QBR',
        'other': 'OUTRA ATIVIDADE',
      }
      const type = typeMap[e.activity_type] || e.activity_type
      let line = `- [${e.date}] ${type} | ${e.parsed_hours}h: ${e.parsed_description}`
      if (e.natural_language_input && e.natural_language_input !== e.parsed_description) {
        line += `\n  Nota original: "${e.natural_language_input}"`
      }
      return line
    }).join('\n')
    effortJournalContext = `\n\n## JOURNAL DE ESFORÇO E INTERAÇÕES (Fonte Primária Qualitativa)
${effortLines}`
  }

  // 3.6 Health Score — Manual vs Shadow (sinaliza discrepância > 20)
  let healthComparisonContext = ''
  if (healthScores && healthScores.length > 0) {
    const latest = healthScores[0]
    const discAlert = latest.discrepancy_alert || (latest.discrepancy != null && Math.abs(latest.discrepancy) > 20)
    healthComparisonContext = `\n\n## HEALTH SCORE: MANUAL vs SHADOW IA
Última avaliação: ${latest.evaluated_at ?? 'N/A'}
Score Manual (CSM): ${latest.manual_score ?? '—'} | Score Shadow (IA): ${latest.shadow_score ?? '—'} | Discrepância: ${latest.discrepancy != null ? `${latest.discrepancy} pts` : '—'}${discAlert ? ' ⚠️ ALERTA: discrepância > 20 pontos' : ''}
Classificação: ${latest.classification ?? '—'}${latest.manual_notes ? `\nNotas do CSM: ${latest.manual_notes}` : ''}${latest.shadow_reasoning ? `\nRaciocínio IA: ${latest.shadow_reasoning}` : ''}`
  }

  // 3.7 Financeiro — MRR, ARR, status contratual e SLA
  let financialContext = ''
  if (contracts && contracts.length > 0) {
    const c = contracts[0]
    const statusMap: Record<string, string> = {
      'active': 'ATIVO',
      'at-risk': 'EM RISCO',
      'churned': 'CHURN',
      'in-negotiation': 'EM NEGOCIAÇÃO',
    }
    financialContext = `\n\n## FINANCEIRO E CONTRATO
MRR: R$ ${c.mrr?.toLocaleString('pt-BR') ?? '—'} | ARR: R$ ${c.arr?.toLocaleString('pt-BR') ?? '—'}
Status: ${statusMap[c.status] ?? c.status} | Plano: ${c.service_type ?? '—'}
Renovação: ${c.renewal_date ?? '—'} | Horas Contratadas/Mês: ${c.contracted_hours_monthly ?? '—'}h${c.notes ? `\nObservações contratuais: ${c.notes}` : ''}`
  }

  let stakeholderContext = ''
  if (contacts && contacts.length > 0) {
    const contactLines = contacts.map((c: any) =>
      `- ${c.name} (${c.role}): Influência: ${c.influence_level} | Decisor: ${c.decision_maker ? 'Sim' : 'Não'}`
    ).join('\n')
    stakeholderContext = `\n\n## STAKEHOLDERS (POWER MAP)\n${contactLines}`
  }

  // 4. Gera resposta com Gemini Pro
  const RAG_SYSTEM_INSTRUCTION = `Você é o "Cérebro do CS", um assistente de inteligência de elite para Customer Success Managers da Plannera.
Sua missão é realizar uma AUDITORIA EXAUSTIVA cruzando TODAS as fontes de dados disponíveis e extrair insights acionáveis.

REGRAS CRÍTICAS DE IDIOMA E SEGURANÇA:
1. RESPONDA EXCLUSIVAMENTE EM PORTUGUÊS DO BRASIL.
2. É TERMINANTEMENTE PROIBIDO:
   - Usar caracteres chineses, japoneses, coreanos ou qualquer outro alfabeto não-latino.
   - Incluir exemplos de treinamento internos do modelo ou frases de teste (ex: "Pequim é a capital...").
   - Inventar fatos fora do contexto fornecido.
3. Se a informação não existir, diga: "Não encontrei informações suficientes nos registros para responder a isso com precisão."

INSTRUÇÕES DE SÍNTESE 360°:
- NÃO OMITA DETALHES. Se houver uma transcrição, nota de reunião ou relato no Journal de Esforço, sintetize-a na resposta.
- Cruze obrigatoriamente as quatro dimensões quando disponíveis:
  1. Journal de Esforço e Interações — transcrições de reuniões, relatos de atividades, notas de contato (FONTE PRIMÁRIA QUALITATIVA)
  2. Power Map — decisores, influenciadores e nível de engajamento por stakeholder
  3. Financeiro/SLA — MRR, status contratual, renovação e conformidade de prazos
  4. Saúde — Health Score Manual vs Shadow IA (sinalize discrepância > 20 como sinal de alerta)
- Priorize evidências concretas do Journal de Esforço sobre dados estruturados quando houver conflito.

CLASSIFICAÇÃO DE SAÚDE (HEALTH SCORE):
- 0-39: Vermelho (Risco Crítico)
- 40-69: Amarelo (Atenção)
- 70-100: Verde (Saudável)`

  const scopeDescription = accountId
    ? 'sobre um LOGO específico'
    : 'sobre o portfólio completo de CS'

  const userContent = `## Contexto disponível (${scopeDescription})

### 1. Reuniões, Transcrições e Tickets (Busca Semântica)
${contextBlocks || 'Nenhum dado de interação/tickets recente.'}
${effortJournalContext}
${healthComparisonContext}
${financialContext}
${adoptionContext}
${planRiskContext}
${npsContext}
${portfolioContext}
${stakeholderContext}
${extraAccountContext}

## Pergunta do CSM
${question}`

  // 4. Gera resposta via LLM Gateway
  const { result: answer, provider } = await generateText(userContent, {
    systemInstruction: RAG_SYSTEM_INSTRUCTION,
    allowFallback: true,
  })
  if (provider !== 'ollama') {
    console.log(`[RAG] Resposta gerada via: ${provider}`)
  }

  // 5. Monta lista de fontes
  const sources: RAGSource[] = finalChunks.map((chunk) => {
    if (chunk.source_type === 'interaction') {
      const meta = interactionMap.get(chunk.source_id)
      const accountsRaw = meta?.accounts as any
      const account_name = Array.isArray(accountsRaw) ? accountsRaw[0]?.name : accountsRaw?.name ?? 'Conta desconhecida'
      return {
        type: 'interaction' as const,
        source_id: chunk.source_id,
        account_name,
        title: meta?.title ?? 'Reunião',
        date: meta?.date ?? '',
        excerpt: chunk.chunk_text.slice(0, 150),
        similarity: chunk.similarity,
      }
    } else {
      const meta = ticketMap.get(chunk.source_id)
      const accountsRaw = meta?.accounts as any
      const account_name = Array.isArray(accountsRaw) ? accountsRaw[0]?.name : accountsRaw?.name ?? 'Conta desconhecida'
      return {
        type: 'support_ticket' as const,
        source_id: chunk.source_id,
        account_name,
        title: meta?.title ?? 'Ticket',
        date: meta?.opened_at ?? '',
        excerpt: chunk.chunk_text.slice(0, 150),
        similarity: chunk.similarity,
      }
    }
  })

  return { answer, sources }
}

/**
 * Ingests a single NPS response into the RAG vector database.
 * This is called automatically when a new response with a comment is received.
 */
export async function ingestNPSResponse(responseId: string): Promise<boolean> {
  try {
    const admin = getSupabaseAdminClient()
    const db = admin as any

    // 1. Busca os dados completos da resposta e da conta
    const { data: response, error: fetchErr } = await db
      .from('nps_responses')
      .select('*, accounts(name)')
      .eq('id', responseId)
      .single()

    if (fetchErr || !response) {
      console.error('[RAG] Erro ao buscar resposta para ingestão:', fetchErr)
      return false
    }

    if (!response.comment || response.score === null) {
      // Ignora respostas sem comentário ou nota (não agregam valor semântico)
      return false
    }

    const accountName = response.accounts?.name ?? 'Conta desconhecida'
    const segment = getNPSSegment(response.score)
    const segLabel = segment === 'promoter' ? 'PROMOTOR' : segment === 'passive' ? 'NEUTRO' : 'DETRATOR'
    const tagStr = response.tags?.length > 0 ? `Tags: ${response.tags.join(', ')}. ` : ''

    const chunkText = `NPS Response | ${accountName} | Score: ${response.score}/10 (${segLabel}) | ${tagStr}Comentário: ${response.comment} | Email: ${response.user_email} | Data: ${response.responded_at ?? response.created_at}`

    // 2. Gera embedding
    const { result: embedding } = await generateEmbedding(chunkText, { allowFallback: true })

    // 3. Upsert no banco de vetores
    const { error: upsertErr } = await db
      .from('embeddings')
      .upsert({
        account_id: response.account_id,
        source_type: 'nps_response',
        source_id: response.id,
        chunk_index: 0,
        chunk_text: chunkText,
        embedding,
      }, { onConflict: 'source_type,source_id,chunk_index' })

    if (upsertErr) {
      console.error('[RAG] Erro ao fazer upsert do embedding NPS:', upsertErr)
      return false
    }

    return true
  } catch (err) {
    console.error('[RAG] Erro fatal na ingestão NPS:', err)
    return false
  }
}
