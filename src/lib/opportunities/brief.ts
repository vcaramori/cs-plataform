import { generateText } from '@/lib/llm/gateway'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { buildSystemInstruction } from '@/lib/ai/ai-context'
import { computeItemDemand } from './sizing'
import type { CommercialBrief } from './types'

const NARRATIVE_SYSTEM = `Você é um gerente comercial de Customer Success. Escreva um resumo executivo curto
(1 parágrafo, português) de uma OPORTUNIDADE comercial para o time de vendas, deixando claro a necessidade do
cliente, o tipo de oportunidade (upsell de plano, novo módulo/sistema, gap end-to-end), a demanda/receita
potencial e por que vale a pena agir agora. Objetivo, sem floreio.`

/**
 * Monta o pacote comercial (CommercialBrief) de uma oportunidade e persiste em
 * opportunity_items.commercial_brief. Espelha buildProductBrief da wishlist (sem RICE).
 */
export async function buildCommercialBrief(itemId: string): Promise<CommercialBrief> {
  const db = getSupabaseAdminClient() as any

  const { data: item, error } = await db
    .from('opportunity_items')
    .select('id, title, opportunity_type, need, desired_outcome, category, priority, estimated_value')
    .eq('id', itemId)
    .single()
  if (error || !item) throw new Error('Oportunidade não encontrada')

  const demand = await computeItemDemand(itemId)

  const { data: signals } = await db
    .from('opportunity_signals')
    .select('verbatim, source_type, created_at, matched_plan_id, matched_feature_id, accounts(name)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(8)

  const evidence = (signals ?? []).map((s: any) => ({
    account_name: s.accounts?.name ?? '—',
    verbatim: s.verbatim,
    source_type: s.source_type,
    date: (s.created_at ?? '').slice(0, 10),
  }))

  // Plano/feature sugeridos: a partir dos sinais que casaram (upsell)
  let plano_sugerido: CommercialBrief['plano_sugerido'] = null
  let feature_relacionada: CommercialBrief['feature_relacionada'] = null
  const matchedPlanId = (signals ?? []).find((s: any) => s.matched_plan_id)?.matched_plan_id
  const matchedFeatureId = (signals ?? []).find((s: any) => s.matched_feature_id)?.matched_feature_id
  if (matchedPlanId) {
    const { data: p } = await db.from('subscription_plans').select('id, name').eq('id', matchedPlanId).maybeSingle()
    if (p) plano_sugerido = { id: p.id, name: p.name }
  }
  if (matchedFeatureId) {
    const { data: f } = await db.from('product_features').select('id, name').eq('id', matchedFeatureId).maybeSingle()
    if (f) feature_relacionada = { id: f.id, name: f.name }
  }

  let narrative = item.need ?? item.title
  try {
    const facts = [
      `Título: ${item.title}`,
      `Tipo: ${item.opportunity_type}`,
      item.need ? `Necessidade: ${item.need}` : '',
      item.desired_outcome ? `Resultado desejado: ${item.desired_outcome}` : '',
      item.estimated_value ? `Valor estimado: R$ ${Math.round(item.estimated_value).toLocaleString('pt-BR')}` : '',
      `Demanda: ${demand.accounts} cliente(s), ARR ~ R$ ${Math.round(demand.arr).toLocaleString('pt-BR')}`,
      demand.segments.length ? `Segmentos: ${demand.segments.join(', ')}` : '',
      plano_sugerido ? `Plano sugerido (upsell): ${plano_sugerido.name}` : '',
      evidence.length ? `Evidências:\n${evidence.map((e: { account_name: string; verbatim: string }) => `- ${e.account_name}: "${e.verbatim}"`).join('\n')}` : '',
    ].filter(Boolean).join('\n')
    const { result } = await generateText(facts, { systemInstruction: await buildSystemInstruction('opportunity_brief', NARRATIVE_SYSTEM), temperature: 0.2, allowFallback: true })
    if (result && result.trim()) narrative = result.trim()
  } catch (e) {
    console.error('[opportunities/brief] narrative failed:', e instanceof Error ? e.message : e)
  }

  const brief: CommercialBrief = {
    titulo: item.title,
    tipo: item.opportunity_type,
    necessidade: item.need ?? null,
    resultado_desejado: item.desired_outcome ?? null,
    categoria: item.category ?? null,
    prioridade: item.priority ?? null,
    valor_estimado: item.estimated_value ?? null,
    narrative,
    plano_sugerido,
    feature_relacionada,
    clientes: demand.accounts_list.map((a) => ({ account_id: a.account_id, nome: a.account_name, arr: a.arr, segmento: a.segment })),
    demand: { accounts: demand.accounts, arr: demand.arr, segments: demand.segments, accounts_list: demand.accounts_list },
    evidence,
    generated_at: new Date().toISOString(),
  }

  await db.from('opportunity_items').update({ commercial_brief: brief, updated_at: new Date().toISOString() }).eq('id', itemId)
  return brief
}

export interface MarkSentResult {
  ok: boolean
  handoff_id: string | null
  brief: CommercialBrief
}

/**
 * Prepara e marca a oportunidade como ENVIADA ao Pipedrive (manual, sem chamada externa
 * nesta fase). Gera o brief, registra em opportunity_handoffs (status='sent') e marca o
 * item como 'sent'. Espelha o handoff modo export da wishlist.
 */
export async function markAsSent(itemId: string, userId: string | null): Promise<MarkSentResult> {
  const db = getSupabaseAdminClient() as any
  const brief = await buildCommercialBrief(itemId)

  const { data } = await db
    .from('opportunity_handoffs')
    .insert({ item_id: itemId, payload: brief, target: 'pipedrive', status: 'sent', created_by: userId })
    .select('id')
    .single()

  await db
    .from('opportunity_items')
    .update({ status: 'sent', sent_at: new Date().toISOString(), sent_by: userId, updated_at: new Date().toISOString() })
    .eq('id', itemId)

  return { ok: true, handoff_id: data?.id ?? null, brief }
}
