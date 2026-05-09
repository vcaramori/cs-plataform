import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function PlaybookBuilderPage() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-content-primary">Playbook Builder</h1>
          <p className="text-slate-600 mt-2">Canvas para criar playbooks automatizados sem código</p>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-border-divider p-4">
            <h3 className="font-medium text-content-primary mb-3">Actions</h3>
            <div className="space-y-2">
              <div className="p-2 bg-blue-50 rounded text-sm font-medium text-blue-900 cursor-move hover:bg-blue-100">📧 Send Email</div>
              <div className="p-2 bg-blue-50 rounded text-sm font-medium text-blue-900 cursor-move hover:bg-blue-100">✓ Create Task</div>
              <div className="p-2 bg-blue-50 rounded text-sm font-medium text-blue-900 cursor-move hover:bg-blue-100">🚨 Trigger Alert</div>
              <div className="p-2 bg-blue-50 rounded text-sm font-medium text-blue-900 cursor-move hover:bg-blue-100">📊 Change Status</div>
            </div>
          </div>

          <div className="col-span-2 bg-white rounded-lg shadow-sm border border-border-divider p-6">
            <div className="flex items-center justify-center h-96 text-content-secondary">
              <div className="text-center">
                <p className="text-lg font-medium">Canvas</p>
                <p className="text-sm mt-2">Arraste blocos do painel lateral para construir seu playbook</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-border-divider p-4">
            <h3 className="font-medium text-content-primary mb-3">Conditions</h3>
            <div className="space-y-2">
              <div className="p-2 bg-amber-50 rounded text-sm font-medium text-amber-900 cursor-move hover:bg-amber-100">💪 If Health &lt; X</div>
              <div className="p-2 bg-amber-50 rounded text-sm font-medium text-amber-900 cursor-move hover:bg-amber-100">⭐ If NPS &lt; Y</div>
              <div className="p-2 bg-amber-50 rounded text-sm font-medium text-amber-900 cursor-move hover:bg-amber-100">📅 If No Interaction &gt; Z days</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 rounded border border-slate-300 hover:bg-surface-background font-medium">Cancelar</button>
          <button className="px-4 py-2 rounded bg-slate-900 text-white hover:bg-slate-800 font-medium">Salvar Playbook</button>
        </div>
      </div>
    </div>
  )
}
