import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Sincroniza os vínculos FK de um contrato (contract_plans / contract_products)
 * a partir do plano correspondente ao `service_type` (nome do plano).
 * Mantém o service_type como entrada de UI, mas as junctions passam a ser a fonte
 * canônica para a lógica de adoção/produto (migração service_type → FKs).
 */
export async function syncContractLinks(contractId: string, serviceType?: string | null): Promise<void> {
  const db = getSupabaseAdminClient() as any

  await db.from('contract_plans').delete().eq('contract_id', contractId)
  await db.from('contract_products').delete().eq('contract_id', contractId)

  const name = (serviceType ?? '').trim()
  if (!name) return

  const { data: plan } = await db
    .from('subscription_plans')
    .select('id, product_id')
    .ilike('name', name)
    .maybeSingle()
  if (!plan) return

  await db.from('contract_plans').insert({ contract_id: contractId, plan_id: plan.id })
  if (plan.product_id) {
    await db.from('contract_products').insert({ contract_id: contractId, product_id: plan.product_id })
  }
}
