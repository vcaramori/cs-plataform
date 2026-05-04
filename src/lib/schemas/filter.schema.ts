import { z } from 'zod'

export const FilterConditionSchema = z.object({
  field: z.string(),
  op: z.enum(['eq', 'in', 'gt', 'lt', 'is_null', 'not_null']),
  value: z.string().optional(),
  values: z.array(z.string()).optional(),
})

export const FilterSchema = z.object({
  operator: z.enum(['AND', 'OR']).default('AND'),
  conditions: z.array(FilterConditionSchema).default([]),
})

export type FilterCondition = z.infer<typeof FilterConditionSchema>
export type Filter = z.infer<typeof FilterSchema>
