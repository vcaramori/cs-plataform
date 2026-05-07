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
