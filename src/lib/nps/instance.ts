// Helpers para o modelo de "instância" do NPS.
//
// A instância é a URL do sistema do cliente (contracts.instance_url), informada
// pelo embed via data-instance. Uma conta pode ter VÁRIAS instâncias (vários
// contratos). Respostas cuja instância ainda não está cadastrada ficam "órfãs"
// (account_id NULL) e são religadas retroativamente quando o contrato é criado.

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Normaliza uma instância/URL para comparação tolerante:
 * minúsculas, sem protocolo, sem "www.", sem barra/espaços nas pontas.
 * Ex.: "HTTPS://www.Cliente.Plannera.com.br/" -> "cliente.plannera.com.br"
 */
export function normalizeInstance(value: string | null | undefined): string | null {
  if (!value) return null
  const v = String(value)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .trim()
  return v.length > 0 ? v : null
}

/**
 * Resolve o account_id a partir de uma instância, comparando de forma
 * normalizada contra contracts.instance_url. Retorna null se não houver
 * contrato cadastrado com essa instância.
 */
export async function resolveAccountByInstance(
  db: any,
  instance: string | null | undefined
): Promise<string | null> {
  const norm = normalizeInstance(instance)
  if (!norm) return null

  const { data: contracts } = await db
    .from('contracts')
    .select('account_id, instance_url')
    .not('instance_url', 'is', null)

  const match = (contracts ?? []).find(
    (c: any) => normalizeInstance(c.instance_url) === norm
  )
  return match?.account_id ?? null
}

/**
 * Religa retroativamente as respostas órfãs (account_id NULL) cuja instância
 * bate com a instância recém-cadastrada de um contrato. Chamado ao criar/editar
 * contrato. Retorna a quantidade de respostas vinculadas.
 */
export async function backfillResponsesForInstance(
  db: any,
  instanceUrl: string | null | undefined,
  accountId: string | null | undefined
): Promise<number> {
  const norm = normalizeInstance(instanceUrl)
  if (!norm || !accountId) return 0

  // Busca respostas órfãs com instância preenchida e compara normalizado em JS
  const { data: orphans } = await db
    .from('nps_responses')
    .select('id, instance')
    .is('account_id', null)
    .not('instance', 'is', null)

  const ids = (orphans ?? [])
    .filter((r: any) => normalizeInstance(r.instance) === norm)
    .map((r: any) => r.id)

  if (ids.length === 0) return 0

  const { error } = await db
    .from('nps_responses')
    .update({ account_id: accountId })
    .in('id', ids)

  if (error) {
    console.error('[NPS/instance] backfill error:', error.message)
    return 0
  }
  return ids.length
}
