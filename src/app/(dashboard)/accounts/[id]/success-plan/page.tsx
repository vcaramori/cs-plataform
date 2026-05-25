'use client'

import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Clock, AlertCircle, CheckSquare, Copy, Share2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { SuccessPlan, SuccessPlanGoal } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

const statusConfig = {
  pending: { label: 'Pendente', icon: AlertCircle, color: 'bg-gray-100 text-gray-700' },
  ongoing: { label: 'Em andamento', icon: Clock, color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Concluído', icon: CheckCircle2, color: 'bg-green-100 text-green-700' },
  delayed: { label: 'Atrasado', icon: AlertCircle, color: 'bg-red-100 text-red-700' }
}

export default function SuccessPlanPage() {
  const params = useParams()
  const accountId = params.id as string
  const queryClient = useQueryClient()

  const [newGoalTitle, setNewGoalTitle] = useState('')
  const [newGoalDesc, setNewGoalDesc] = useState('')
  const [newGoalDate, setNewGoalDate] = useState('')
  const [publicUrl, setPublicUrl] = useState<string | null>(null)

  // Fetch success plan
  const { data: planData, isLoading, error } = useQuery({
    queryKey: ['success-plan', accountId],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${accountId}/success-plans`)
      if (!res.ok) throw new Error('Failed to fetch plan')
      return res.json() as Promise<{ plan: SuccessPlan | null; goals: SuccessPlanGoal[] }>
    }
  })

  const plan = planData?.plan
  const goals = planData?.goals || []

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (data: { title: string; description?: string; target_date?: string }) => {
      const res = await fetch(`/api/accounts/${accountId}/success-plans/goals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!res.ok) throw new Error('Failed to create goal')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Meta criada com sucesso')
      setNewGoalTitle('')
      setNewGoalDesc('')
      setNewGoalDate('')
      queryClient.invalidateQueries({ queryKey: ['success-plan', accountId] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar meta')
    }
  })

  // Update goal mutation
  const updateGoalMutation = useMutation({
    mutationFn: async (data: { goalId: string; status: string }) => {
      const res = await fetch(`/api/accounts/${accountId}/success-plans/goals/${data.goalId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: data.status })
      })
      if (!res.ok) throw new Error('Failed to update goal')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Meta atualizada')
      queryClient.invalidateQueries({ queryKey: ['success-plan', accountId] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao atualizar meta')
    }
  })

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: string) => {
      const res = await fetch(`/api/accounts/${accountId}/success-plans/goals/${goalId}`, {
        method: 'DELETE'
      })
      if (!res.ok) throw new Error('Failed to delete goal')
      return res.json()
    },
    onSuccess: () => {
      toast.success('Meta removida')
      queryClient.invalidateQueries({ queryKey: ['success-plan', accountId] })
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao remover meta')
    }
  })

  const handleCreateGoal = async () => {
    if (!newGoalTitle.trim()) {
      toast.error('Digite o título da meta')
      return
    }
    await createGoalMutation.mutateAsync({
      title: newGoalTitle,
      description: newGoalDesc || undefined,
      target_date: newGoalDate || undefined
    })
  }

  const handleCopyPublicLink = () => {
    if (plan) {
      const url = `${window.location.origin}/public/success-plans/${plan.shared_token}`
      navigator.clipboard.writeText(url)
      toast.success('Link copiado para a área de transferência')
      setPublicUrl(url)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-content-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-destructive">Erro ao carregar plano de sucesso</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-content-primary">Plano de Sucesso</h1>
          {plan && <p className="text-sm text-content-secondary mt-1">{plan.title}</p>}
        </div>
        {plan && (
          <Button
            onClick={handleCopyPublicLink}
            variant="outline"
            className="gap-2"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar Link
          </Button>
        )}
      </div>

      {publicUrl && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6 flex items-center gap-2">
            <p className="text-sm text-blue-700 flex-1 break-all">{publicUrl}</p>
            <Button
              size="sm"
              onClick={() => {
                navigator.clipboard.writeText(publicUrl)
                toast.success('Link copiado')
              }}
            >
              <Copy className="w-4 h-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Create Goal Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Adicionar Nova Meta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Título da meta (ex: Implementar módulo X)"
            value={newGoalTitle}
            onChange={(e) => setNewGoalTitle(e.target.value)}
            disabled={createGoalMutation.isPending}
          />
          <Textarea
            placeholder="Descrição (opcional)"
            value={newGoalDesc}
            onChange={(e) => setNewGoalDesc(e.target.value)}
            disabled={createGoalMutation.isPending}
            rows={3}
          />
          <Input
            type="date"
            value={newGoalDate}
            onChange={(e) => setNewGoalDate(e.target.value)}
            disabled={createGoalMutation.isPending}
          />
          <Button
            onClick={handleCreateGoal}
            disabled={createGoalMutation.isPending}
            className="w-full"
          >
            {createGoalMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Criando...
              </>
            ) : (
              'Criar Meta'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Monthly Evolution */}
      {goals.length > 0 && (() => {
        const byMonth: Record<string, { created: number; completed: number }> = {}
        goals.forEach(g => {
          const month = new Date(g.created_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
          if (!byMonth[month]) byMonth[month] = { created: 0, completed: 0 }
          byMonth[month].created++
          if (g.completed_at) {
            const cm = new Date(g.completed_at).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
            if (!byMonth[cm]) byMonth[cm] = { created: 0, completed: 0 }
            byMonth[cm].completed++
          }
        })
        const months = Object.entries(byMonth)
        const maxVal = Math.max(...months.map(([, v]) => v.created))
        return (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-content-primary">Evolução Mensal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 overflow-x-auto pb-2">
                {months.map(([month, val]) => (
                  <div key={month} className="flex flex-col items-center gap-1 min-w-[52px]">
                    <div className="flex items-end gap-1 h-20">
                      <div
                        className="w-4 rounded-t bg-blue-400/50 transition-all"
                        style={{ height: `${Math.round((val.created / (maxVal || 1)) * 72)}px` }}
                        title={`${val.created} criadas`}
                      />
                      <div
                        className="w-4 rounded-t bg-emerald-500/70 transition-all"
                        style={{ height: `${Math.round((val.completed / (maxVal || 1)) * 72)}px` }}
                        title={`${val.completed} concluídas`}
                      />
                    </div>
                    <span className="text-[9px] text-content-secondary font-bold uppercase tracking-wider">{month}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border-divider">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-blue-400/50" /><span className="text-[9px] text-content-secondary font-bold uppercase tracking-wider">Criadas</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-500/70" /><span className="text-[9px] text-content-secondary font-bold uppercase tracking-wider">Concluídas</span></div>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Goals List */}
      <div>
        <h2 className="text-lg font-semibold text-content-primary mb-4">Metas ({goals.length})</h2>
        {goals.length === 0 ? (
          <Card className="border-dashed p-8 text-center">
            <p className="text-content-secondary text-sm">Nenhuma meta criada ainda</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => {
              const config = statusConfig[goal.status as keyof typeof statusConfig]
              const Icon = config.icon

              return (
                <Card key={goal.id} className="hover:shadow-md transition">
                  <CardContent className="pt-6 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <h3 className="font-semibold text-content-primary">{goal.title}</h3>
                        {goal.description && (
                          <p className="text-sm text-content-secondary mt-1">{goal.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3 flex-wrap">
                          <Badge className={cn('gap-1', config.color)}>
                            <Icon className="w-3 h-3" />
                            {config.label}
                          </Badge>
                          {goal.target_date && (
                            <span className="text-xs text-content-secondary">
                              Prazo: {new Date(goal.target_date).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                          {goal.completed_at && (
                            <span className="text-xs text-green-600">
                              Concluído em {new Date(goal.completed_at).toLocaleDateString('pt-BR')}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        {goal.status !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateGoalMutation.mutate({ goalId: goal.id, status: 'completed' })}
                            disabled={updateGoalMutation.isPending}
                          >
                            <CheckSquare className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteGoalMutation.mutate(goal.id)}
                          disabled={deleteGoalMutation.isPending}
                          className="text-destructive hover:text-red-700"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
