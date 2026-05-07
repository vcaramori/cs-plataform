import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const PlaybookStartSchema = z.object({
  template_id: z.string().uuid('Template ID must be a valid UUID'),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = PlaybookStartSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { template_id } = parsed.data

  // Validate account ownership (RLS check)
  const { data: account, error: accountErr } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', id)
    .eq('csm_owner_id', user.id)
    .single()

  if (accountErr || !account) {
    return NextResponse.json({ error: 'Account not found or forbidden' }, { status: 403 })
  }

  // Fetch template with its tasks
  const { data: template, error: templateErr } = await supabase
    .from('playbook_templates')
    .select('*, tasks:playbook_tasks(*)')
    .eq('id', template_id)
    .single()

  if (templateErr || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  // Create account playbook instance
  const { data: playbook, error: pbError } = await supabase
    .from('account_playbooks')
    .insert({
      account_id: id,
      template_id: template_id,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      csm_owner_id: user.id,
    })
    .select()
    .single()

  if (pbError) {
    console.error('Error creating playbook instance:', pbError)
    return NextResponse.json({ error: pbError.message }, { status: 500 })
  }

  // Create account playbook tasks from template tasks
  const tasks = (template.tasks || []).map((t: any) => ({
    account_playbook_id: playbook.id,
    task_id: t.id,
    status: 'pending',
    created_at: new Date().toISOString(),
  }))

  if (tasks.length > 0) {
    const { error: tasksError } = await supabase
      .from('account_playbook_tasks')
      .insert(tasks)

    if (tasksError) {
      console.error('Error creating playbook tasks:', tasksError)
      return NextResponse.json({ error: tasksError.message }, { status: 500 })
    }
  }

  return NextResponse.json(
    {
      ...playbook,
      template,
      tasks,
    },
    { status: 201 }
  )
}
