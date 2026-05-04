import { z } from 'zod'
import { FilterSchema } from './filter.schema'

export const SavedViewSchema = z.object({
  name: z.string().min(1).max(200),
  entity_type: z.enum(['support_ticket', 'account', 'playbook']).default('support_ticket'),
  filters: FilterSchema,
  icon: z.enum(['list', 'alert', 'user', 'checkmark', 'star', 'clock', 'zap', 'filter']).default('list'),
  visibility: z.enum(['personal', 'team']).default('personal'),
  account_id: z.string().uuid().optional(),
})

export const SavedViewResponseSchema = SavedViewSchema.extend({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const SavedViewUpdateSchema = SavedViewSchema.partial().pick({
  name: true,
  icon: true,
  visibility: true,
})

export type SavedView = z.infer<typeof SavedViewSchema>
export type SavedViewResponse = z.infer<typeof SavedViewResponseSchema>
export type SavedViewUpdate = z.infer<typeof SavedViewUpdateSchema>
