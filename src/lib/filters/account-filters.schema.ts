import { z } from 'zod'

export const AccountFilterSchema = z.object({
  // Health Status
  health_status: z.enum(['healthy', 'at-risk', 'critical']).optional(),

  // Segment
  segment: z.enum(['Indústria', 'MRO', 'Varejo', 'Distribuidor']).optional(),

  // MRR Range
  mrr_min: z.number().min(0).optional(),
  mrr_max: z.number().min(0).optional(),

  // Renewal Date Range
  renewal_date_min: z.string().datetime().optional(),
  renewal_date_max: z.string().datetime().optional(),

  // CSM Owner
  csm_id: z.string().uuid().optional(),

  // Contract Status
  contract_status: z.enum(['active', 'at-risk', 'churned', 'in-negotiation']).optional(),

  // Adoption Range
  adoption_min: z.number().min(0).max(100).optional(),
  adoption_max: z.number().min(0).max(100).optional(),
})

export type AccountFilters = z.infer<typeof AccountFilterSchema>
