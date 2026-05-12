import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, PlayCircle, Plus, Settings2, Power, PowerOff } from 'lucide-react'
import Link from 'next/link'
import { togglePlaybookStatus, instantiatePlaybook } from './actions'

export default async function PlaybooksPage() {
  const supabase = await getSupabaseServerClient()

  // Buscar todos os templates
  const { data: templates } = await supabase
    .from('playbook_templates')
    .select('*, tasks:playbook_tasks(*)')
    .order('created_at', { ascending: false })

  // Buscar uma conta para teste
  const { data: testAccounts } = await supabase
    .from('accounts')
    .select('id, name')
    .limit(1)
  const testAccountId = testAccounts?.[0]?.id

  return (
    <div className="p-6 md:p-10 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="h1-premium flex items-center gap-3">
            <PlayCircle className="w-8 h-8 text-primary" />
            Playbooks & Automação
          </h1>
          <p className="p-premium mt-2 max-w-2xl">
            Gerencie as jornadas e fluxos de tarefas padronizados. Playbooks ativos são instanciados automaticamente em contas baseados em gatilhos de Health Score.
          </p>
        </div>
        <Link href="/playbooks/builder" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Playbook
        </Link>
      </div>

      {/* TEMPLATES LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template: any) => (
          <Card key={template.id} variant="glass" className="flex flex-col group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-bold line-clamp-1">{template.name}</CardTitle>
                <Badge variant="neutral" className={template.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-surface-card text-content-secondary'}>
                  {template.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>
              <p className="text-sm text-content-secondary line-clamp-2 mt-2">{template.description}</p>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-end pt-0">
              <div className="mt-4 p-3 bg-accent/5 rounded-lg border border-border-divider">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider opacity-60">Gatilho Automático</span>
                </div>
                <code className="text-[10px] bg-background px-2 py-1 rounded text-primary border border-primary/20">
                  {template.trigger_condition || 'Nenhum / Instanciação Manual'}
                </code>
              </div>
              
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border-divider">
                <span className="text-xs font-medium text-content-secondary">
                  {template.tasks?.length || 0} Etapas configuradas
                </span>
                <div className="flex items-center gap-2">
                  <form action={togglePlaybookStatus.bind(null, template.id, !template.is_active)}>
                    <button type="submit" className={`p-2 rounded-full transition-colors ${template.is_active ? "text-content-secondary hover:bg-surface-background" : "text-emerald-600 hover:bg-emerald-50"}`} title={template.is_active ? "Inativar" : "Ativar"}>
                      {template.is_active ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}
                    </button>
                  </form>
                  
                  {testAccountId && (
                    <form action={instantiatePlaybook.bind(null, testAccountId, template.id)}>
                      <button type="submit" className="text-amber-600 hover:bg-amber-50 p-2 rounded-full transition-colors" title={`Disparar teste para ${testAccounts?.[0]?.name}`}>
                        <PlayCircle className="w-4 h-4" />
                      </button>
                    </form>
                  )}

                  <Link href={`/playbooks/builder?id=${template.id}`} className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors" title="Editar">
                    <Settings2 className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!templates || templates.length === 0) && (
           <Card variant="glass" className="flex flex-col items-center justify-center p-10 col-span-full border-dashed border-2">
             <div className="p-4 bg-accent/10 rounded-full mb-4">
               <PlayCircle className="w-8 h-8 text-content-secondary opacity-50" />
             </div>
             <p className="text-content-secondary font-medium">Nenhum playbook configurado</p>
             <p className="text-sm text-content-secondary opacity-60 mt-1">Execute as migrations do Supabase para inserir os templates padrão.</p>
           </Card>
        )}
      </div>
    </div>
  )
}
