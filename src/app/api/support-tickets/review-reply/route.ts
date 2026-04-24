import { NextRequest, NextResponse } from 'next/server'
import { generateText } from '@/lib/llm/gateway'
import { env } from '@/lib/env'
import { z } from 'zod'

const schema = z.object({
  body: z.string().min(1).max(10000),
  ticketTitle: z.string().optional(),
  ticketDescription: z.string().optional(),
  clientName: z.string().optional(),
  agentName: z.string().optional(),
  category: z.string().optional(),
  conversationHistory: z.array(z.object({
    author: z.string(),
    body: z.string(),
  })).optional(),
})

export interface ReplyReviewResult {
  sentiment: 'Equilibrado' | 'Neutro' | 'Rígido'
  feedback_summary: string
  evaluation: {
    tom: number
    estrutura: number
    empatia: number
    clareza: number
    alinhamento: number
  }
  recommended_version: string
  training_notes: string
  pillar_scores: {
    habilidades_comunicacao: number
    efetividade_respostas: number
  }
  nota_final: number | null
  show_alert: boolean
  suggested_outcome: 'solution' | 'pending_client' | 'pending_product' | 'none'
  outcome_reasoning: string
}

const SYSTEM_PROMPT = `Você é o Revisor de Chamados da Plannera. Sua missão é revisar e aprimorar mensagens enviadas pela equipe de suporte, garantindo clareza, empatia, profissionalismo e consistência com o Padrão Plannera.

PADRÃO PLANNERA — toda resposta deve ter:
1. Saudação personalizada com o nome real do cliente
2. Reconhecimento do pedido ou contexto específico do chamado
3. Explicação objetiva ou status
4. Próximos passos ou orientação
5. Fechamento empático
6. Assinatura: "Atenciosamente, [Nome do agente]\nEquipe de Suporte – Plannera"

REGRA CRÍTICA: Quando você receber o nome real do cliente e o nome real do agente, use-os na versão reescrita. Nunca deixe placeholders como [Nome do Cliente] ou [Nome] — substitua sempre pelos nomes reais fornecidos.

DIRETRIZES DE TOM:
- Equilibrado: caloroso e colaborativo
- Neutro: correto, porém frio
- Rígido: defensivo ou distante
- Usar frases curtas e voz ativa
- Nunca transferir responsabilidade sem orientação
- Usar "você pode..." / "segue como fazer..." em vez de "podemos fazer por você..."
- Evitar formalismos excessivos, jargões e excessos de desculpas
- Substituir "Permaneço à disposição." por "Permanecemos à disposição sempre que precisar."

AVALIAÇÃO DOS 5 CRITÉRIOS DE QUALIDADE (notas de 0 a 10):
Avalie cada critério usando TODO o histórico do chamado como contexto — compare o rascunho com o que foi dito anteriormente, qual é o problema original e qual é o sentimento acumulado do cliente.
- Tom (0-10): adequação emocional ao contexto do cliente, calor humano, linguagem apropriada à gravidade do chamado
- Estrutura (0-10): sequência lógica, clareza de propósito, aderência ao Padrão Plannera (saudação → contexto → solução → próximos passos → fechamento)
- Empatia (0-10): reconhecimento genuíno do sentimento do cliente, validação da dor, personalização baseada no histórico do chamado
- Clareza (0-10): objetividade, linguagem simples e direta, ausência de ambiguidades ou jargões desnecessários
- Alinhamento (0-10): conformidade plena com o Padrão Plannera, uso dos nomes reais, zero placeholders, assinatura correta

CÁLCULO DA NOTA FINAL — Média Harmônica dos 5 Critérios:
nota_final = 5 / (1/tom + 1/estrutura + 1/empatia + 1/clareza + 1/alinhamento)
Escala de resultado: 0-10. Penaliza fortemente critérios fracos — um único critério com nota baixa reduz significativamente a nota final.

ALERTA: inclua show_alert=true se nota_final < 6.

CLASSIFICAÇÃO DO STATUS SUGERIDO (campo "suggested_outcome"):
Aplique as regras na ordem abaixo e use a PRIMEIRA que se encaixar:
1. "pending_client": Use SEMPRE que o agente fizer uma pergunta ao cliente, pedir informação, solicitar arquivo, pedir confirmação, pedir que o cliente realize um teste ou qualquer ação. Palavras-chave: "poderia", "você pode", "consegue", "me envie", "aguardamos", "por favor", "podemos confirmar?", "você verificou?", "nos informe".
2. "pending_product": Use quando o agente mencionou que vai acionar o time de Produto ou Engenharia, reportou um bug internamente, identificou um problema no sistema, ou a categoria do chamado for Bug/Erro e a mensagem mencionar que o problema foi identificado/escalado.
3. "solution": Use quando o agente resolveu o problema definitivamente, enviou a solução ou confirmou o encerramento.
4. "none": Use apenas se for acompanhamento neutro sem solicitação clara nem mudança de estado.

Retorne APENAS JSON válido, sem texto adicional, sem markdown.`

export async function POST(req: NextRequest) {
  try {
    const json = await req.json()
    const {
      body: replyBody,
      ticketTitle,
      ticketDescription,
      clientName,
      agentName,
      category,
      conversationHistory,
    } = schema.parse(json)

    const contextBlock = [
      clientName && `NOME DO CLIENTE: ${clientName}`,
      agentName && `NOME DO AGENTE (use na assinatura): ${agentName}`,
      ticketTitle && `ASSUNTO DO CHAMADO: ${ticketTitle}`,
      category && `CATEGORIA DO CHAMADO: ${category}`,
      ticketDescription && `DESCRIÇÃO ORIGINAL DO CHAMADO: ${ticketDescription.slice(0, 500)}`,
    ].filter(Boolean).join('\n')

    const historyBlock = conversationHistory && conversationHistory.length > 0
      ? `HISTÓRICO DE MENSAGENS ANTERIORES (do mais antigo para o mais recente):\n${conversationHistory.map(m => `[${m.author}]: ${m.body}`).join('\n---\n')
      }`
      : ''

    const userPrompt = `Avalie a seguinte mensagem de suporte usando TODO o histórico do chamado como contexto. Seu julgamento dos 5 critérios deve levar em conta o que foi dito antes, o problema original do cliente e o sentimento acumulado — não avalie o rascunho de forma isolada.

${contextBlock}

${historyBlock}

MENSAGEM QUE O AGENTE QUER ENVIAR:
"${replyBody}"

INSTRUÇÕES IMPORTANTES:
- Na "recommended_version", use o nome real do cliente (${clientName ?? '[cliente]'}) na saudação e o nome real do agente (${agentName ?? '[agente]'}) na assinatura.
- Contextualize a mensagem com base no assunto e histórico do chamado — nunca deixe "[inserir contexto do chamado]" ou placeholders similares.
- Se a mensagem original já tiver os nomes preenchidos corretamente, mantenha-os.
- Em "suggested_outcome", classifique o status do chamado após este envio seguindo as regras do sistema.
- Em "outcome_reasoning", explique em 1 frase curta o motivo da classificação.

FORMATO DE SAÍDA OBRIGATÓRIO (JSON apenas, sem markdown):
{
  "sentiment": "Equilibrado" | "Neutro" | "Rígido",
  "feedback_summary": "Pontos fortes e de melhoria em 2-3 frases, referenciando o histórico do chamado quando relevante",
  "evaluation": {
    "tom": <0-10>,
    "estrutura": <0-10>,
    "empatia": <0-10>,
    "clareza": <0-10>,
    "alinhamento": <0-10>
  },
  "recommended_version": "Versão reescrita completa com nomes reais e contexto do chamado",
  "training_notes": "Breve explicação de aprendizado para o agente (1-2 frases)",
  "nota_final": null,
  "show_alert": false,
  "suggested_outcome": "solution" | "pending_client" | "pending_product" | "none",
  "outcome_reasoning": "Motivo em 1 frase curta"
}

CRITICAL: Use a escala de 0 a 10. Se a mensagem for curta, genérica ("vou ver e te aviso") ou não profissional, atribua notas BAIXAS (2-4). O sistema é rigoroso.`

    const result = await generateText(userPrompt, {
      systemInstruction: SYSTEM_PROMPT,
      temperature: 0.2,
      allowFallback: true,
      model: env.gemini.flashModel,
      maxOutputTokens: 2048,
      disableThinking: true,
    })

    const jsonMatch = result.result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('[ReplyReview] JSON não encontrado na resposta:', result.result.slice(0, 300))
      return NextResponse.json({ error: 'Resposta da IA não contém JSON válido' }, { status: 500 })
    }

    const parsed = JSON.parse(jsonMatch[0]) as ReplyReviewResult

    if (!parsed.evaluation) {
      console.error('[ReplyReview] Campo evaluation ausente:', parsed)
      return NextResponse.json({ error: 'IA não retornou scores de avaliação' }, { status: 500 })
    }

    // Normaliza para escala 0-10 (auto-corrige se IA retornar 0-100)
    const normalize = (v: number) => {
      const n = Number(v)
      return Math.round((n > 10 ? n / 10 : n) * 10) / 10
    }
    const scores = {
      tom:         normalize(parsed.evaluation.tom),
      estrutura:   normalize(parsed.evaluation.estrutura),
      empatia:     normalize(parsed.evaluation.empatia),
      clareza:     normalize(parsed.evaluation.clareza),
      alinhamento: normalize(parsed.evaluation.alinhamento),
    }
    parsed.evaluation = scores

    const vals = Object.values(scores)
    if (vals.every(s => s > 0)) {
      const sumInv = vals.reduce((acc, s) => acc + (1 / s), 0)
      parsed.nota_final = Math.round((vals.length / sumInv) * 10) / 10
    } else {
      parsed.nota_final = 0
    }

    parsed.show_alert = (parsed.nota_final ?? 0) < 6

    parsed.pillar_scores = {
      habilidades_comunicacao: Math.round(((scores.tom + scores.clareza + scores.empatia) / 3) * 10) / 10,
      efetividade_respostas:   Math.round(((scores.estrutura + scores.alinhamento) / 2) * 10) / 10,
    }

    return NextResponse.json(parsed)
  } catch (err: any) {
    console.error('[ReplyReview] Error details:', err)
    return NextResponse.json({
      error: 'Erro ao revisar mensagem',
      details: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    }, { status: 500 })
  }
}
