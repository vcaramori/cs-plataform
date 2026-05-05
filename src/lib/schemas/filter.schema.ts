import { z } from 'zod'

// Operators by field type
export const FIELD_OPERATORS = {
  enum: ['eq', 'neq', 'in', 'nin'] as const,
  text: ['eq', 'neq', 'contains', 'is_null'] as const,
  date: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'is_null'] as const,
  uuid: ['eq', 'neq', 'is_null'] as const,
  array: ['in', 'nin'] as const,
} as const

export const FilterConditionSchema = z.object({
  field: z.string(),
  op: z.enum(['eq', 'neq', 'in', 'nin', 'gt', 'gte', 'lt', 'lte', 'contains', 'is_null', 'not_null']),
  value: z.any().optional(),
  values: z.array(z.any()).optional(),
})

// Recursive group schema (supports nested AND/OR)
export const FilterGroupSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.enum(['AND', 'OR']),
    conditions: z.array(
      z.union([FilterConditionSchema, FilterGroupSchema])
    ).default([]),
  })
)

// Legacy flat schema (for backward compat with F1-01)
export const FilterSchema = z.object({
  operator: z.enum(['AND', 'OR']).default('AND'),
  conditions: z.array(FilterConditionSchema).default([]),
})

export type FilterCondition = z.infer<typeof FilterConditionSchema>
export type FilterGroup = z.infer<typeof FilterGroupSchema>
export type Filter = z.infer<typeof FilterSchema>
