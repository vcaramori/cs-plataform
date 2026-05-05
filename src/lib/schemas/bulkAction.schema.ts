import { z } from 'zod'

export const BulkActionSchema = z.object({
  action: z.enum(['change_status', 'assign', 'close']),
  ticket_ids: z.array(z.string().uuid()).min(1),
  payload: z.object({
    status: z.enum(['open', 'in-progress', 'resolved', 'closed']).optional(),
    assigned_to: z.string().uuid().nullable().optional(),
  }),
})

export type BulkAction = z.infer<typeof BulkActionSchema>

export interface BulkActionResponse {
  success: boolean
  updated_count: number
  snapshot?: Array<{ id: string; status: string; assigned_to: string | null }>
  errors?: Array<{ ticket_id: string; reason: string }>
}
