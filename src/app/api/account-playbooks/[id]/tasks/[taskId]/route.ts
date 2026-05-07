import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const UpdatePlaybookTaskSchema = z.object({
  status: z.enum(['pending', 'completed', 'skipped']),
  notes: z.string().optional(),
  time_spent_hours: z.number().positive().max(24).optional(),
  comment: z.string().max(500).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const { id, taskId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdatePlaybookTaskSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { status, notes, time_spent_hours, comment } = parsed.data

  // Get the playbook task to validate ownership
  const { data: task, error: taskErr } = await supabase
    .from('account_playbook_tasks')
    .select('account_playbook_id')
    .eq('id', taskId)
    .single()

  if (taskErr || !task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 })
  }

  // Validate CSM ownership via account_playbooks -> accounts
  const { data: playbook, error: pbErr } = await supabase
    .from('account_playbooks')
    .select('csm_owner_id, account_id')
    .eq('id', task.account_playbook_id)
    .single()

  if (pbErr || !playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  if (playbook.csm_owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Build update object
  const updateData: any = {
    status,
    notes: notes || null,
    completed_at: status === 'completed' ? new Date().toISOString() : null,
  }

  if (time_spent_hours !== undefined) {
    updateData.time_spent_hours = time_spent_hours || null
  }

  if (status === 'completed') {
    updateData.completed_by = user.id
  }

  // Handle comment: fetch current comments, append new one if provided
  if (comment) {
    const { data: currentTask } = await supabase
      .from('account_playbook_tasks')
      .select('comments')
      .eq('id', taskId)
      .single()

    const currentComments = currentTask?.comments || []
    const newComment = {
      author_id: user.id,
      author_name: user.email?.split('@')[0] || 'Unknown',
      text: comment,
      created_at: new Date().toISOString(),
    }
    updateData.comments = [...currentComments, newComment]
  }

  // Update the task
  const { data: updatedTask, error: updateErr } = await supabase
    .from('account_playbook_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single()

  if (updateErr) {
    console.error('Error updating playbook task:', updateErr)
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // Log event for auditability
  try {
    await supabase.from('ticket_events').insert({
      type: 'playbook_task_updated',
      account_id: playbook.account_id,
      metadata: {
        task_id: taskId,
        playbook_id: task.account_playbook_id,
        new_status: status,
        notes,
      },
    })
  } catch (e) {
    // Non-critical: don't fail the update if event logging fails
    console.error('Error logging playbook task event:', e)
  }

  return NextResponse.json(updatedTask)
}
