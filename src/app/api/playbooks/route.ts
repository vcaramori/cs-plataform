import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch all active playbook templates with their tasks
  const { data: templates, error } = await supabase
    .from('playbook_templates')
    .select(`
      *,
      tasks:playbook_tasks(*)
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching playbook templates:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(templates || [])
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { name, description, target_segment, trigger_type, ui_flow_json, tasks } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    // 1. Insert template
    const { data: template, error: templateError } = await supabase
      .from('playbook_templates')
      .insert({
        name,
        description,
        target_segment,
        trigger_type,
        ui_flow_json: ui_flow_json || {},
        created_by: user.id
      })
      .select()
      .single()

    if (templateError) {
      console.error('Error creating playbook template:', templateError)
      return NextResponse.json({ error: templateError.message }, { status: 500 })
    }

    // 2. Insert tasks if provided
    if (tasks && Array.isArray(tasks) && tasks.length > 0) {
      const tasksToInsert = tasks.map((task: any, index: number) => ({
        template_id: template.id,
        title: task.title,
        description: task.description,
        order: task.order || index,
        due_days: task.due_days || 0
      }))

      const { error: tasksError } = await supabase
        .from('playbook_tasks')
        .insert(tasksToInsert)

      if (tasksError) {
        console.error('Error creating playbook tasks:', tasksError)
        return NextResponse.json({ error: tasksError.message }, { status: 500 })
      }
    }

    return NextResponse.json(template, { status: 201 })

  } catch (error: any) {
    console.error('Error in POST /api/playbooks:', error)
    return NextResponse.json({ error: error.message || 'Invalid request' }, { status: 400 })
  }
}
