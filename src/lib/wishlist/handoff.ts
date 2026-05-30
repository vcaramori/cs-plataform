import { generateText } from '@/lib/llm/gateway'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { runHttp } from '@/lib/workflows/actions'
import type { NodeConfig, RunContext } from '@/lib/workflows/types'
import { computeItemDemand } from './demand'
import type { ProductBrief, WishlistSettings } from './types'

const SETTINGS_KEY = 'wishlist_settings'

export async function getWishlistSettings(): Promise<WishlistSettings> {
  const db = getSupabaseAdminClient() as any
  const { data } = await db.from('app_settings').select('value').eq('key', SETTINGS_KEY).maybeSingle()
  const v = data?.value ?? {}
  return {
    handoff_endpoint: v.handoff_endpoint ?? null,
    handoff_secret_header: v.handoff_secret_header ?? null,
  }
}

export async function saveWishlistSettings(settings: WishlistSettings, userId: string | null): Promise<void> {
  const db = getSupabaseAdminClient() as any
  await db.from('app_settings').upsert(
    {
      key: SETTINGS_KEY,
      value: settings,
      description: 'Configuração de handoff do módulo Wishlist',
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )
}

const NARRATIVE_SYSTEM = `Você é um Product Owner. Escreva um resumo executivo curto (1 parágrafo, português) de um pedido de produto para o time de engenharia/produto, deixando claro o problema, o resultado desejado e por que importa (demanda/receita). Seja objetivo e sem floreio.`

/**
 * Monta o pacote refinado (ProductBrief) de um item e persiste em wishlist_items.product_brief.
 */
export async function buildProductBrief(itemId: string): Promise<ProductBrief> {
  const db = getSupabaseAdminClient() as any

  const { data: item, error } = await db
    .from('wishlist_items')
    .select('id, title, kind, category, priority, problem, desired_outcome, matched_feature_id')
    .eq('id', itemId)
    .single()
  if (error || !item) throw new Error('Item não encontrado')

  const demand = await computeItemDemand(itemId)

  const { data: signals } = await db
    .from('wishlist_signals')
    .select('verbatim, source_type, created_at, accounts(name)')
    .eq('item_id', itemId)
    .order('created_at', { ascending: false })
    .limit(8)

  const evidence = (signals ?? []).map((s: any) => ({
    account_name: s.accounts?.name ?? '—',
    verbatim: s.verbatim,
    source_type: s.source_type,
    date: (s.created_at ?? '').slice(0, 10),
  }))

  let related_feature: ProductBrief['related_feature'] = null
  if (item.matched_feature_id) {
    const { data: f } = await db.from('product_features').select('id, name').eq('id', item.matched_feature_id).maybeSingle()
    if (f) related_feature = { id: f.id, name: f.name }
  }

  // Narrativa via LLM (não bloqueia: fallback para o problema bruto)
  let narrative = item.problem ?? item.title
  try {
    const facts = [
      `Título: ${item.title}`,
      `Tipo: ${item.kind}`,
      item.category ? `Categoria: ${item.category}` : '',
      item.problem ? `Problema: ${item.problem}` : '',
      item.desired_outcome ? `Resultado desejado: ${item.desired_outcome}` : '',
      `Demanda: ${demand.accounts} cliente(s), ARR ~ R$ ${Math.round(demand.arr).toLocaleString('pt-BR')}`,
      demand.segments.length ? `Segmentos: ${demand.segments.join(', ')}` : '',
      related_feature ? `Funcionalidade relacionada: ${related_feature.name}` : '',
      evidence.length ? `Evidências:\n${evidence.map((e: { account_name: string; verbatim: string }) => `- ${e.account_name}: "${e.verbatim}"`).join('\n')}` : '',
    ].filter(Boolean).join('\n')
    const { result } = await generateText(facts, { systemInstruction: NARRATIVE_SYSTEM, temperature: 0.2, allowFallback: true })
    if (result && result.trim()) narrative = result.trim()
  } catch (e) {
    console.error('[wishlist/handoff] narrative failed:', e instanceof Error ? e.message : e)
  }

  const brief: ProductBrief = {
    title: item.title,
    kind: item.kind,
    category: item.category ?? null,
    priority: item.priority ?? null,
    problem: item.problem ?? null,
    desired_outcome: item.desired_outcome ?? null,
    narrative,
    demand: {
      accounts: demand.accounts,
      arr: demand.arr,
      segments: demand.segments,
      accounts_list: demand.accounts_list,
    },
    related_feature,
    evidence,
    generated_at: new Date().toISOString(),
  }

  await db.from('wishlist_items').update({ product_brief: brief }).eq('id', itemId)
  return brief
}

export interface HandoffResult {
  ok: boolean
  target: 'export' | 'webhook'
  handoff_id: string
  brief: ProductBrief
  status_code?: number
  error?: string
}

/**
 * Encaminha o item ao produto. 'export' apenas gera/registra o pacote; 'webhook' faz POST
 * para o endpoint configurado (via runHttp — https-only, allowlist, timeout), reusando a
 * infraestrutura segura dos Fluxos.
 */
export async function handoffItem(
  itemId: string,
  opts: { mode: 'export' | 'webhook'; userId: string | null }
): Promise<HandoffResult> {
  const db = getSupabaseAdminClient() as any
  const brief = await buildProductBrief(itemId)

  if (opts.mode === 'export') {
    const { data } = await db
      .from('wishlist_handoffs')
      .insert({ item_id: itemId, payload: brief, target: 'export', status: 'prepared', created_by: opts.userId })
      .select('id')
      .single()
    await db.from('wishlist_items').update({ status: 'handed_off', handed_off_at: new Date().toISOString() }).eq('id', itemId)
    return { ok: true, target: 'export', handoff_id: data.id, brief }
  }

  // webhook
  const settings = await getWishlistSettings()
  if (!settings.handoff_endpoint) {
    throw new Error('Configure o endpoint de webhook em Configurações do Wishlist antes de enviar.')
  }

  const headers: Record<string, string> = {}
  if (settings.handoff_secret_header) headers['X-Wishlist-Secret'] = settings.handoff_secret_header

  const cfg = {
    http_url: settings.handoff_endpoint,
    http_method: 'POST',
    http_headers: headers,
    http_body: JSON.stringify({ type: 'wishlist_item', item_id: itemId, brief }),
  } as unknown as NodeConfig

  let result: Record<string, any>
  try {
    result = await runHttp(cfg, {} as RunContext)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'falha no envio'
    const { data } = await db
      .from('wishlist_handoffs')
      .insert({ item_id: itemId, payload: brief, target: 'webhook', endpoint: settings.handoff_endpoint, status: 'failed', response_body: msg, created_by: opts.userId })
      .select('id')
      .single()
    return { ok: false, target: 'webhook', handoff_id: data?.id, brief, error: msg }
  }

  const ok = !!result.ok
  const { data } = await db
    .from('wishlist_handoffs')
    .insert({
      item_id: itemId,
      payload: brief,
      target: 'webhook',
      endpoint: settings.handoff_endpoint,
      status: ok ? 'sent' : 'failed',
      response_status: result.status_code ?? null,
      response_body: typeof result.response === 'string' ? result.response.slice(0, 2000) : JSON.stringify(result.response ?? '').slice(0, 2000),
      created_by: opts.userId,
    })
    .select('id')
    .single()

  if (ok) {
    await db.from('wishlist_items').update({ status: 'handed_off', handed_off_at: new Date().toISOString() }).eq('id', itemId)
  }

  return { ok, target: 'webhook', handoff_id: data?.id, brief, status_code: result.status_code }
}
