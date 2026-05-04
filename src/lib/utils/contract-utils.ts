import { Contract, CommercialGovernance } from '@/lib/supabase/types'

function isRuleCurrentlyActive(rule: CommercialGovernance, referenceDate = new Date()) {
  const startsAt = rule.starts_at ? new Date(rule.starts_at) : null
  const endsAt = rule.ends_at ? new Date(rule.ends_at) : null

  return (!startsAt || startsAt <= referenceDate) && (!endsAt || endsAt >= referenceDate)
}

/**
 * Calcula o MRR liquido de um contrato considerando apenas a Governanca Comercial.
 * Descontos legados dentro do contrato nao entram mais neste calculo.
 */
export function calculateNetMRR(
  contract: Contract | null | undefined,
  governanceRules: CommercialGovernance[] = []
): number {
  if (!contract) return 0

  const baseMRR = Number(contract.mrr) || 0
  const today = new Date()
  let totalDiscount = 0

  const activeDiscounts = governanceRules.filter((rule) =>
    rule.is_active &&
    rule.rule_type === 'discount' &&
    (rule.contract_id === contract.id || !rule.contract_id) &&
    isRuleCurrentlyActive(rule, today)
  )

  for (const rule of activeDiscounts) {
    if (rule.sub_type === 'progressive' && rule.config?.stages) {
      const stage = rule.config.stages.find((item) => {
        const startsAt = item.starts_at ? new Date(item.starts_at) : null
        const endsAt = item.ends_at ? new Date(item.ends_at) : null

        return (!startsAt || startsAt <= today) && (!endsAt || endsAt >= today)
      })

      if (stage) {
        totalDiscount += stage.type === 'percentage' ? baseMRR * (stage.discount / 100) : stage.discount
      }

      continue
    }

    if (rule.sub_type === 'percentage') {
      totalDiscount += baseMRR * ((Number(rule.value) || 0) / 100)
    }

    if (rule.sub_type === 'fixed') {
      totalDiscount += Number(rule.value) || 0
    }
  }

  return Math.max(0, baseMRR - totalDiscount)
}

/**
 * Retorna o valor total de descontos aplicados atualmente.
 */
export function calculateCurrentDiscount(
  contract: Contract | null | undefined,
  governanceRules: CommercialGovernance[] = []
): number {
  if (!contract) return 0
  const baseMRR = Number(contract.mrr) || 0
  const netMRR = calculateNetMRR(contract, governanceRules)
  return Math.max(0, baseMRR - netMRR)
}
