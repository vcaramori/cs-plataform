import { redirect, notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { FlowEditor } from '../components/FlowEditor'

export default async function FlowEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const db = supabase as any

  const { data: def } = await db.from('workflow_definitions').select('*').eq('id', id).maybeSingle()
  if (!def) notFound()

  const [{ data: nodes }, { data: edges }, { data: accounts }, { data: runs }] = await Promise.all([
    db.from('workflow_nodes').select('node_id, node_type, label, position_x, position_y, config').eq('workflow_id', id),
    db.from('workflow_edges').select('source_node_id, target_node_id, edge_label').eq('workflow_id', id),
    db.from('accounts').select('id, name').order('name').limit(200),
    db.from('workflow_runs').select('id, status, triggered_by, started_at, completed_at, account_id, accounts(name), workflow_run_steps(node_id, node_type, status, error, completed_at)')
      .eq('workflow_id', id).order('started_at', { ascending: false }).limit(10),
  ])

  return (
    <FlowEditor
      definition={def}
      initialNodes={nodes ?? []}
      initialEdges={edges ?? []}
      accounts={accounts ?? []}
      runs={runs ?? []}
    />
  )
}
