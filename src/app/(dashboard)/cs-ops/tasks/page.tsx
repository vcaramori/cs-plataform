import { getSupabaseServerClient } from '@/lib/supabase/server'
import { CSOpsTasksClient } from './components/CSOpsTasksClient'

export default async function CSOpsTasksPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null

  // Fetch user role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'head_cs'

  let query = supabase
    .from('account_playbook_tasks')
    .select(`
      *,
      playbook_tasks(is_note_required),
      account_playbooks(
        accounts(id, name),
        playbook_templates(name)
      ),
      profiles!assigned_to(id, full_name, avatar_url)
    `)
    .eq('status', 'pending')
    .order('due_date', { ascending: true })

  if (!isAdmin) {
    query = query.eq('assigned_to', user.id)
  }

  const { data: tasks } = await query

  // Fetch all CSMs if admin to allow reassignment
  let csms = []
  if (isAdmin) {
    const { data: csmData } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .in('role', ['csm', 'csm_senior', 'head_cs', 'admin'])
    csms = csmData || []
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="h1-page">Central de Tarefas</h1>
          <p className="text-muted-foreground mt-1">Acompanhamento e execução de atividades de Playbooks.</p>
        </div>
      </div>
      
      <CSOpsTasksClient 
        initialTasks={tasks || []} 
        isAdmin={isAdmin} 
        csms={csms} 
        currentUserId={user.id} 
      />
    </div>
  )
}
