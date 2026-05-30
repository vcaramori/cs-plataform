import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { FluxosListClient } from './components/FluxosListClient'

export default async function FluxosPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const db = supabase as any

  const { data: workflows } = await db
    .from('workflow_definitions')
    .select('id, name, description, status, is_enabled, category, updated_at')
    .order('updated_at', { ascending: false })

  // contagem de execuções por fluxo
  const { data: runs } = await db.from('workflow_runs').select('workflow_id, status')
  const runCounts: Record<string, { total: number; running: number }> = {}
  for (const r of runs ?? []) {
    const c = runCounts[r.workflow_id] ?? { total: 0, running: 0 }
    c.total++; if (r.status === 'running' || r.status === 'waiting') c.running++
    runCounts[r.workflow_id] = c
  }

  // Inbox: aprovações pendentes + tarefas humanas de fluxo em aberto
  const { data: approvals } = await db
    .from('workflow_approvals')
    .select('id, title, description, account_id, created_at, accounts(name)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(20)

  const { data: humanTasks } = await db
    .from('csm_tasks')
    .select('id, title, due_date, account_id, accounts(name)')
    .eq('source_label', 'workflow')
    .not('workflow_run_step_id', 'is', null)
    .in('status', ['todo', 'in_progress'])
    .order('created_at', { ascending: true })
    .limit(20)

  return (
    <PageContainer>
      <ModuleHeader
        title="Fluxos & Playbooks"
        subtitle="Desenhe, padronize e automatize os processos de Customer Success"
        iconName="Workflow"
      />
      <FluxosListClient
        workflows={(workflows ?? []).map((w: any) => ({ ...w, runs: runCounts[w.id] ?? { total: 0, running: 0 } }))}
        approvals={approvals ?? []}
        humanTasks={humanTasks ?? []}
      />
    </PageContainer>
  )
}
