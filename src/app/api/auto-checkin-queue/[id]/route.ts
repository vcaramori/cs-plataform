import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const UpdateQueueItemSchema = z.object({
  action: z.enum(['approve', 'edit', 'cancel']),
  edited_subject: z.string().optional(),
  edited_body: z.string().optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateQueueItemSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { action, edited_subject, edited_body } = parsed.data

  // Fetch queue item to verify ownership
  const { data: queueItem, error: fetchErr } = await supabase
    .from('auto_checkin_queue')
    .select('id, csm_id, status')
    .eq('id', id)
    .single()

  if (fetchErr || !queueItem) {
    return NextResponse.json({ error: 'Queue item not found' }, { status: 404 })
  }

  // Verify ownership (CSM must own the item)
  if (queueItem.csm_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Handle actions
  const updateData: any = {
    approved_at: action === 'approve' ? new Date().toISOString() : undefined
  }

  if (action === 'approve') {
    updateData.status = 'approved'
  } else if (action === 'edit') {
    updateData.status = 'edited'
    updateData.edited_subject = edited_subject || null
    updateData.edited_body = edited_body || null
  } else if (action === 'cancel') {
    updateData.status = 'cancelled'
  }

  // Update the queue item
  const { data: updated, error: updateErr } = await supabase
    .from('auto_checkin_queue')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (updateErr) {
    console.error('Error updating queue item:', updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json(updated)
}
