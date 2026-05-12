import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Activity, Clock, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'

export default async function CSOpsPlaybooksPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Fetch from the view
  const { data: playbooks } = await supabase
    .from('playbook_planned_vs_realized')
    .select('*')
    .order('started_at', { ascending: false })

  if (!playbooks) return null

  const now = new Date()
  
  // Calculate metrics
  const activePlaybooks = playbooks.filter(p => p.status === 'in_progress' || p.status === 'pending')
  const overduePlaybooks = activePlaybooks.filter(p => p.planned_completion_date && new Date(p.planned_completion_date) < now)
  const completedPlaybooks = playbooks.filter(p => p.status === 'completed')
  
  const completedOnTime = completedPlaybooks.filter(p => !p.delay_days || p.delay_days <= 0)
  const efficiency = completedPlaybooks.length > 0 
    ? Math.round((completedOnTime.length / completedPlaybooks.length) * 100) 
    : 0

  const avgDelay = completedPlaybooks.reduce((acc, p) => acc + (p.delay_days > 0 ? p.delay_days : 0), 0) / (completedPlaybooks.length || 1)

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="h1-page">Performance de Playbooks</h1>
          <p className="text-muted-foreground mt-1">Acompanhamento do planejado vs. realizado na execução da jornada.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-surface-card border border-border-divider rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Playbooks Ativos</p>
            <Activity className="w-4 h-4 text-primary opacity-60" />
          </div>
          <p className="text-2xl font-black tracking-tight text-primary">{activePlaybooks.length}</p>
        </Card>

        <Card className="p-4 bg-surface-card border border-border-divider rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Em Atraso</p>
            <AlertTriangle className={cn("w-4 h-4 opacity-60", overduePlaybooks.length > 0 ? "text-destructive" : "text-muted-foreground")} />
          </div>
          <p className={cn("text-2xl font-black tracking-tight", overduePlaybooks.length > 0 ? "text-destructive" : "text-foreground")}>
            {overduePlaybooks.length}
          </p>
        </Card>

        <Card className="p-4 bg-surface-card border border-border-divider rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Eficiência (SLA)</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-500 opacity-60" />
          </div>
          <p className="text-2xl font-black tracking-tight text-emerald-500">{efficiency}%</p>
        </Card>

        <Card className="p-4 bg-surface-card border border-border-divider rounded-2xl">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Média de Atraso</p>
            <Clock className="w-4 h-4 text-amber-500 opacity-60" />
          </div>
          <p className="text-2xl font-black tracking-tight text-amber-500">{avgDelay.toFixed(1)} dias</p>
        </Card>
      </div>

      <div className="bg-surface-card border border-border-divider rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border-divider">
          <h3 className="font-semibold text-content-primary">Planejado vs. Realizado</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-background/50 border-b border-border-divider">
              <tr>
                <th className="px-4 py-3 font-medium text-muted-foreground uppercase text-[10px] tracking-widest">Conta</th>
                <th className="px-4 py-3 font-medium text-muted-foreground uppercase text-[10px] tracking-widest">Playbook</th>
                <th className="px-4 py-3 font-medium text-muted-foreground uppercase text-[10px] tracking-widest">Início</th>
                <th className="px-4 py-3 font-medium text-muted-foreground uppercase text-[10px] tracking-widest">Previsão</th>
                <th className="px-4 py-3 font-medium text-muted-foreground uppercase text-[10px] tracking-widest">Conclusão</th>
                <th className="px-4 py-3 font-medium text-muted-foreground uppercase text-[10px] tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-divider">
              {playbooks.map((pb) => {
                const isOverdue = pb.status !== 'completed' && pb.planned_completion_date && new Date(pb.planned_completion_date) < now
                
                return (
                  <tr key={pb.playbook_id} className="hover:bg-surface-background/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-content-primary">{pb.account_name}</td>
                    <td className="px-4 py-3 text-content-secondary">{pb.template_name}</td>
                    <td className="px-4 py-3 text-content-secondary">
                      {pb.started_at ? format(new Date(pb.started_at), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3 text-content-secondary">
                      {pb.planned_completion_date ? format(new Date(pb.planned_completion_date), 'dd/MM/yyyy') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {pb.actual_completion_date ? (
                        <span className={cn(pb.delay_days > 0 ? "text-amber-500" : "text-emerald-500")}>
                          {format(new Date(pb.actual_completion_date), 'dd/MM/yyyy')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {pb.status === 'completed' ? (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Concluído</Badge>
                      ) : isOverdue ? (
                        <Badge variant="destructive">Atrasado</Badge>
                      ) : (
                        <Badge variant="secondary">Em Andamento</Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
              {playbooks.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    Nenhum playbook encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
