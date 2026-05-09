import { Suspense } from 'react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SuccessPlan, SuccessPlanGoal } from '@/lib/supabase/types'

const statusConfig = {
  pending: { label: 'Pendente', icon: AlertCircle, color: 'bg-gray-100 text-gray-700' },
  ongoing: { label: 'Em andamento', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluído', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  delayed: { label: 'Atrasado', icon: AlertCircle, color: 'bg-red-100 text-red-700' }
}

async function SuccessPlanContent({ token }: { token: string }) {
  const supabase = await getSupabaseServerClient()

  const { data: plan, error: planError } = await supabase
    .from('success_plans')
    .select('*')
    .eq('shared_token', token)
    .is('deleted_at', null)
    .single()

  if (planError || !plan) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-destructive">Plano de sucesso não encontrado ou foi removido.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { data: goals } = await supabase
    .from('success_plan_goals')
    .select('*')
    .eq('plan_id', plan.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  const planData = plan as SuccessPlan
  const goalsData = (goals || []) as SuccessPlanGoal[]

  const completedCount = goalsData.filter(g => g.status === 'completed').length
  const totalCount = goalsData.length

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">{planData.title}</h1>
          <p className="text-gray-600">Plano de Sucesso Compartilhado</p>
          {totalCount > 0 && (
            <div className="mt-4 flex justify-center gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">{completedCount}</p>
                <p className="text-sm text-gray-600">Metas Concluídas</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{totalCount - completedCount}</p>
                <p className="text-sm text-gray-600">Em Progresso</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        {totalCount > 0 && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-gray-700">Progresso Geral</span>
                <span className="text-sm text-gray-500">
                  {Math.round((completedCount / totalCount) * 100)}%
                </span>
              </div>
              <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                  style={{ width: `${(completedCount / totalCount) * 100}%` }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Goals */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Metas</h2>
          {goalsData.length === 0 ? (
            <Card className="border-dashed p-8 text-center">
              <p className="text-gray-500">Nenhuma meta definida ainda.</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {goalsData.map((goal) => {
                const config = statusConfig[goal.status as keyof typeof statusConfig]
                const Icon = config.icon

                return (
                  <Card
                    key={goal.id}
                    className={cn(
                      'hover:shadow-md transition',
                      goal.status === 'completed' && 'bg-green-50 border-green-200'
                    )}
                  >
                    <CardContent className="pt-6 space-y-3">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 pt-1">
                          <Icon className={cn('w-6 h-6', config.color.split(' ')[1])} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-lg">{goal.title}</h3>
                          {goal.description && (
                            <p className="text-gray-600 mt-2">{goal.description}</p>
                          )}
                          <div className="flex items-center gap-3 mt-3 flex-wrap">
                            <Badge className={cn('gap-1', config.color)}>
                              <Icon className="w-3 h-3" />
                              {config.label}
                            </Badge>
                            {goal.target_date && (
                              <span className="text-xs text-gray-500">
                                Prazo: {new Date(goal.target_date).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                            {goal.completed_at && (
                              <span className="text-xs text-green-600 font-medium">
                                Concluído em {new Date(goal.completed_at).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>Plano de sucesso criado em {new Date(planData.created_at).toLocaleDateString('pt-BR')}</p>
        </div>
      </div>
    </div>
  )
}

export default async function PublicSuccessPlanPage({
  params
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Carregando...</div>}>
      <SuccessPlanContent token={token} />
    </Suspense>
  )
}
