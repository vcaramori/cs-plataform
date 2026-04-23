'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Activity, Plus, TicketCheck, Clock, AlertTriangle } from 'lucide-react'
import { TranscriptUploadModal } from './TranscriptUploadModal'

const typeLabels: Record<string, string> = {
  meeting: 'Reunião', email: 'Email', qbr: 'QBR', onboarding: 'Onboarding',
  'health-check': 'Health Check', expansion: 'Expansão', 'churn-risk': 'Risco Churn',
}

const typeColors: Record<string, string> = {
  meeting: 'bg-blue-500/20 text-blue-300', qbr: 'bg-purple-500/20 text-purple-300',
  'churn-risk': 'bg-red-500/20 text-red-300', expansion: 'bg-emerald-500/20 text-emerald-300',
  onboarding: 'bg-indigo-500/20 text-indigo-300', 'health-check': 'bg-yellow-500/20 text-yellow-300',
  email: 'bg-surface-background text-content-secondary',
}

const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300', high: 'bg-orange-500/20 text-orange-300',
  medium: 'bg-yellow-500/20 text-yellow-300', low: 'bg-surface-background text-content-secondary',
}

function SentimentDot({ score }: { score: number | null }) {
  if (score === null) return null
  const color = score >= 0.2 ? 'bg-emerald-400' : score <= -0.2 ? 'bg-red-400' : 'bg-yellow-400'
  return <span className={`inline-block w-2 h-2 rounded-full ${color} flex-shrink-0`} title={`Sentimento: ${score.toFixed(2)}`} />
}

export function InteractionsList({ interactions, tickets, accountId, contractId }: {
  interactions: any[]
  tickets: any[]
  accountId: string
  contractId: string | null
}) {
  const [modalOpen, setModalOpen] = useState(false)
  const recentInteractions = [...interactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in-progress')

  return (
    <div className="space-y-4">
      {contractId && (
        <TranscriptUploadModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          accountId={accountId}
          contractId={contractId}
        />
      )}
      {/* Tickets abertos */}
      {openTickets.length > 0 && (
        <Card className="border-red-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-content-primary text-base flex items-center gap-2">
              <TicketCheck className="w-4 h-4 text-red-400" />
              Tickets em Aberto
              <Badge className="bg-red-500/20 text-red-300 text-xs ml-1">{openTickets.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {openTickets.slice(0, 3).map(t => (
              <div key={t.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-background">
                <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-content-primary text-sm font-medium truncate">{t.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`text-xs ${priorityColors[t.priority] ?? ''}`}>{t.priority}</Badge>
                    <span className="text-content-secondary text-xs">
                      {new Date(t.opened_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Interações recentes */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-content-primary text-base flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" /> Interações Recentes
            </CardTitle>
            {contractId && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setModalOpen(true)}
                className="text-content-secondary hover:text-content-primary h-7 gap-1 text-xs"
              >
                <Plus className="w-3 h-3" /> Nova
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {recentInteractions.length === 0 ? (
            <div className="text-center py-6">
              <Activity className="w-8 h-8 text-content-secondary mx-auto mb-2 opacity-40" />
              <p className="text-content-secondary text-sm">Nenhuma interação registrada</p>
              {contractId && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setModalOpen(true)}
                  className="text-indigo-400 hover:text-indigo-300 mt-2 text-xs"
                >
                  Registrar primeira interação
                </Button>
              )}
            </div>
          ) : (
            recentInteractions.map(i => (
              <div key={i.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-surface-background hover:bg-surface-card transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <SentimentDot score={i.sentiment_score} />
                    <span className="text-content-primary text-sm font-medium truncate">{i.title}</span>
                    {i.alert_triggered && <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge className={`text-xs ${typeColors[i.type] ?? 'bg-surface-background text-content-secondary'}`}>
                      {typeLabels[i.type] ?? i.type}
                    </Badge>
                    <span className="text-content-secondary text-xs">
                      {new Date(i.date).toLocaleDateString('pt-BR')}
                    </span>
                    {i.direct_hours > 0 && (
                      <span className="text-content-secondary text-xs flex items-center gap-0.5">
                        <Clock className="w-3 h-3" />{i.direct_hours}h
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
          {interactions.length > 5 && (
            <p className="text-content-secondary text-xs text-center pt-1">
              +{interactions.length - 5} interações anteriores
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
