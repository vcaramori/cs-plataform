import { generateText, generateEmbedding } from '@/lib/llm/gateway'
import { searchEmbeddingsWithVector } from '@/lib/supabase/vector-search'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getAccountPlanSummary, getPortfolioSummary, type PortfolioSummary } from '@/lib/adoption/risk-engine'

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
          .select('id, title, date, type, accounts(name)')
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
    db.from('accounts').select('id, name')
  ]) as [{ data: any[] }, { data: any[] }, { data: any[] }, any, PortfolioSummary | null, { data: any[] }, { data: any[] }]

  const interactionRecords = results[0].data
  const ticketRecords = results[1].data
  const adoptionRecords = results[2].data
  const planSummary = results[3]
  const portfolioSummary = results[4]
  const contacts = results[5].data
  const allAccounts = results[6].data

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
      return `[${idx + 1}] REUNIÃO | ${account} | ${date} | Tipo: ${type}\n${chunk.chunk_text}`
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

  // 3.4 Adiciona Contexto de Stakeholders
  let stakeholderContext = ''
  if (contacts && contacts.length > 0) {
    const contactLines = contacts.map(c => 
      `- ${c.name} (${c.role}): Influência: ${c.influence_level} | Decisor: ${c.decision_maker ? 'Sim' : 'Não'}`
    ).join('\n')
    stakeholderContext = `\n\n## STAKEHOLDERS (POWER MAP)\n${contactLines}`
  }

  // 4. Gera resposta com Gemini Pro
  const scopeDescription = accountId
    ? 'sobre um LOGO específico'
    : 'sobre o portfólio completo de CS'

  const prompt = `Você é o "Cerebro do CS", um assistente de elite para Customer Success Managers. 
Sua missão é extrair insights acionáveis do contexto abaixo.

REGRAS CRÍTICAS DE IDIOMA E SEGURANÇA:
1. RESPONDA EXCLUSIVAMENTE EM PORTUGUÊS DO BRASIL. 
2. É TERMINANTEMENTE PROIBIDO: 
   - Usar caracteres chineses, japoneses, coreanos ou qualquer outro alfabeto não-latino.
   - Incluir exemplos de treinamento internos do modelo ou frases de teste (ex: "Pequim é a capital...").
   - Inventar fatos fora do contexto fornecido.
3. Se a informação não existir, diga: "Não encontrei informações suficientes nos registros para responder a isso com precisão."

CLASSIFICAÇÃO DE SAÚDE (HEALTH SCORE):
- 0-39: Vermelho (Risco Crítico)
- 40-69: Amarelo (Atenção)
- 70-100: Verde (Saudável)

## Contexto disponível (${scopeDescription})
${contextBlocks || 'Nenhum dado de interação/tickets recente.'}
${adoptionContext}
${planRiskContext}
${portfolioContext}
${stakeholderContext}
${extraAccountContext}

## Pergunta do CSM
${question}`

  // 4. Gera resposta via LLM Gateway (Ollama ou Gemini com fallback)
  const { result: answer, provider } = await generateText(prompt, { allowFallback: true })
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
