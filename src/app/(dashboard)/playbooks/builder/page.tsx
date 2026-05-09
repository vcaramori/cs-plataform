import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Mail, CheckSquare, AlertTriangle, BarChart2, Heart, Star, Clock } from 'lucide-react'

export default async function PlaybookBuilderPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <PageContainer>
      <ModuleHeader 
        title="Playbook Builder" 
        subtitle="Canvas para criar playbooks automatizados sem código"
        iconName="ListChecks"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
        {/* Actions Panel */}
        <Card variant="glass" className="border-border-divider rounded-2xl overflow-hidden shadow-xl bg-surface-card/80 backdrop-blur-xl">
          <CardHeader className="border-b border-border-divider p-6">
            <CardTitle className="text-content-primary text-sm font-extrabold uppercase tracking-widest">Ações</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-sm font-medium text-content-primary cursor-move hover:bg-primary/10 transition-colors flex items-center gap-3">
              <Mail className="w-4 h-4 text-primary" />
              <span>Enviar E-mail</span>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-sm font-medium text-content-primary cursor-move hover:bg-primary/10 transition-colors flex items-center gap-3">
              <CheckSquare className="w-4 h-4 text-primary" />
              <span>Criar Tarefa</span>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-sm font-medium text-content-primary cursor-move hover:bg-primary/10 transition-colors flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-primary" />
              <span>Disparar Alerta</span>
            </div>
            <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-sm font-medium text-content-primary cursor-move hover:bg-primary/10 transition-colors flex items-center gap-3">
              <BarChart2 className="w-4 h-4 text-primary" />
              <span>Alterar Status</span>
            </div>
          </CardContent>
        </Card>

        {/* Canvas */}
        <Card variant="glass" className="col-span-1 lg:col-span-2 border-border-divider rounded-2xl overflow-hidden shadow-xl bg-surface-card/80 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-[500px] border-2 border-dashed border-border-divider rounded-2xl bg-surface-background/50">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-surface-card border border-border-divider flex items-center justify-center mx-auto shadow-sm">
                  <span className="text-content-secondary opacity-40 text-2xl font-black">?</span>
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-extrabold text-content-primary">Área de Trabalho (Canvas)</p>
                  <p className="text-xs text-content-secondary max-w-sm">Arraste blocos dos painéis laterais para construir seu playbook automatizado</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Conditions Panel */}
        <Card variant="glass" className="border-border-divider rounded-2xl overflow-hidden shadow-xl bg-surface-card/80 backdrop-blur-xl">
          <CardHeader className="border-b border-border-divider p-6">
            <CardTitle className="text-content-primary text-sm font-extrabold uppercase tracking-widest">Condições</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-3">
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl text-sm font-medium text-content-primary cursor-move hover:bg-warning/10 transition-colors flex items-center gap-3">
              <Heart className="w-4 h-4 text-warning" />
              <span>Se Saúde &lt; X</span>
            </div>
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl text-sm font-medium text-content-primary cursor-move hover:bg-warning/10 transition-colors flex items-center gap-3">
              <Star className="w-4 h-4 text-warning" />
              <span>Se NPS &lt; Y</span>
            </div>
            <div className="p-4 bg-warning/5 border border-warning/20 rounded-xl text-sm font-medium text-content-primary cursor-move hover:bg-warning/10 transition-colors flex items-center gap-3">
              <Clock className="w-4 h-4 text-warning" />
              <span>Se Sem Interação &gt; Z dias</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <Button variant="outline" className="rounded-xl px-6 h-11 label-premium">
          Cancelar
        </Button>
        <Button className="rounded-xl px-6 h-11 bg-primary hover:bg-primary/90 text-white font-extrabold text-[10px] uppercase tracking-widest shadow-xl shadow-primary/10 transition-all active:scale-95">
          Salvar Playbook
        </Button>
      </div>
    </PageContainer>
  )
}
