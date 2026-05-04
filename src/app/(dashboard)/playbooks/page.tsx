import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, PlayCircle, Plus, Settings2 } from 'lucide-react'

export default async function PlaybooksPage() {
  const supabase = await getSupabaseServerClient()

  // Buscar todos os templates
  const { data: templates } = await supabase
    .from('playbook_templates')
    .select('*, tasks:playbook_tasks(*)')
    .order('created_at', { ascending: false })

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
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Novo Playbook
        </button>
      </div>

      {/* TEMPLATES LIST */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates?.map((template: any) => (
          <Card key={template.id} variant="glass" className="flex flex-col group hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg font-bold line-clamp-1">{template.name}</CardTitle>
                <Badge variant="neutral" className={template.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}>
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
                <button className="text-primary hover:bg-primary/10 p-2 rounded-full transition-colors">
                  <Settings2 className="w-4 h-4" />
                </button>
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
