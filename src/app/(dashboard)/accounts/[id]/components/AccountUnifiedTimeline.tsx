'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import {
  Users,
  Terminal,
  Mail,
  Clock,
  FileText,
  Sparkles,
  Eye,
  Ticket as TicketIcon,
  Star
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { EffortEditModal } from '@/components/shared/EffortEditModal'
import { NPSDetailModal } from './NPSDetailModal'
import { PlaybookHistoryModal } from './PlaybookHistoryModal'
import { InteractionDetailModal } from './InteractionDetailModal'

interface Props {
  interactions: any[]
  efforts: any[]
  tickets: any[]
  npsResponses: any[]
  playbooks: any[]
  accounts: any[]
  accountName?: string
}

export function AccountUnifiedTimeline({ interactions, efforts, tickets, npsResponses, playbooks, accounts, accountName }: Props) {
  const [filter, setFilter] = useState<'all' | 'strategic' | 'atendimento'>('all')
  const [selectedEffort, setSelectedEffort] = useState<any>(null)
  const [selectedPlaybook, setSelectedPlaybook] = useState<any>(null)
  const [selectedNPS, setSelectedNPS] = useState<any>(null)
  const [selectedInteraction, setSelectedInteraction] = useState<any>(null)
  const router = useRouter()

  const combined = [
    ...interactions.map(i => ({ 
      ...i, 
      itemType: i.type === 'playbook' ? 'playbook' : 'interaction',
      date: i.date || i.created_at, 
      isStrategic: i.type !== 'playbook' 
    })),
    ...efforts.map(e => ({ ...e, itemType: 'effort', date: e.date, isStrategic: false })),
    ...tickets.map(t => ({ ...t, itemType: 'ticket', date: t.opened_at, isStrategic: false })),
    ...npsResponses.map(n => ({ ...n, itemType: 'nps', date: n.responded_at || n.created_at, isStrategic: false }))
  ].sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0
    const dateB = b.date ? new Date(b.date).getTime() : 0
    return dateB - dateA
  })

  const filtered = combined.filter(item => {
    if (filter === 'strategic') return item.isStrategic
    if (filter === 'atendimento') return item.itemType === 'ticket' || item.itemType === 'nps'
    return true
  })

  const getIcon = (item: any) => {
    if (item.itemType === 'ticket') return <TicketIcon className="w-3.5 h-3.5 text-plannera-demand" />
    if (item.itemType === 'nps') return <Star className="w-3.5 h-3.5 text-amber-500" />
    if (item.itemType === 'playbook') return <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
    if (item.isStrategic) return <Users className="w-3.5 h-3.5 text-plannera-orange" />
    if (item.activity_type === 'email') return <Mail className="w-3.5 h-3.5 text-plannera-sop" />
    if (['preparation', 'analysis', 'reporting'].includes(item.activity_type)) return <Terminal className="w-3.5 h-3.5 text-plannera-ds" />
    return <FileText className="w-3.5 h-3.5 text-content-secondary" />
  }

  const handleItemClick = (item: any) => {
    switch (item.itemType) {
      case 'effort':
        setSelectedEffort(item)
        break
      case 'ticket':
        router.push(`/suporte/${item.id}`)
        break
      case 'nps':
        setSelectedNPS({ ...item, account_name: accountName || accounts[0]?.name || 'Conta Cliente' })
        break
      case 'playbook':
        // Tentar encontrar o objeto completo do playbook nos playbooks da conta
        const fullPlaybook = playbooks.find(p => 
          p.id === item.id || 
          (item.metadata && p.id === item.metadata.playbook_id) ||
          p.template?.name === item.title
        )
        setSelectedPlaybook(fullPlaybook || item)
        break
      case 'interaction':
        setSelectedInteraction(item)
        break
      default:
        break
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex bg-surface-background p-1 rounded-xl border border-border-divider">
          {[
            { id: 'all', label: 'Feed Geral' },
            { id: 'strategic', label: 'Estratégia' },
            { id: 'atendimento', label: 'Atendimento & NPS' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
                filter === tab.id ? "bg-plannera-sop text-white shadow-lg" : "text-content-secondary hover:text-content-primary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <span className="text-[9px] text-content-secondary font-bold uppercase tracking-widest">{filtered.length} Atividades</span>
      </div>

      <div className="relative space-y-4 px-4">
        <div className="absolute left-8 top-4 bottom-4 w-px bg-border-divider" />

        <AnimatePresence mode="popLayout">
          {filtered.slice(0, 15).map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="relative flex items-start gap-3 group"
            >
              <div className={cn(
                "mt-1.5 flex items-center justify-center w-8 h-8 rounded-xl border bg-surface-background z-10 transition-all duration-300 shadow-lg flex-shrink-0 group-hover:scale-105",
                item.isStrategic ? "border-plannera-orange/30 shadow-[0_0_12px_rgba(247,148,30,0.15)]" :
                item.itemType === 'playbook' ? "border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]" :
                item.itemType === 'ticket' ? "border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]" :
                item.itemType === 'nps' ? "border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]" :
                "border-border-divider"
              )}>
                {getIcon(item)}
              </div>

              <Card 
                onClick={() => handleItemClick(item)}
                className={cn(
                  "flex-1 min-w-0 transition-all duration-300 relative overflow-hidden cursor-pointer hover:bg-muted/30 hover:scale-[1.01] active:scale-[0.99]",
                  item.isStrategic && "ring-1 ring-plannera-orange/20",
                  item.itemType === 'playbook' && "ring-1 ring-emerald-500/20 bg-emerald-500/[0.02]",
                  item.itemType === 'ticket' && "ring-1 ring-red-500/10",
                  item.itemType === 'nps' && "ring-1 ring-amber-500/10"
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <span className="text-content-primary text-xs font-bold tracking-tight truncate">
                        {item.itemType === 'ticket' ? `Ticket: ${item.title}` :
                         item.itemType === 'nps' ? `Avaliação NPS: ${item.score}/10` :
                         item.title || item.parsed_description}
                      </span>
                      {item.priority === 'critical' && (
                        <Badge className="bg-red-500/10 text-red-500 border-none text-[7px] font-bold uppercase tracking-widest h-3.5 shrink-0">
                          Crítico
                        </Badge>
                      )}
                    </div>
                    <span className="text-content-secondary text-[9px] font-bold font-mono tracking-tighter shrink-0 mt-0.5">
                      {new Date(item.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <p className="text-content-secondary text-[11px] leading-relaxed line-clamp-2 italic">
                    {item.raw_transcript || item.parsed_description || item.description || item.comment || "Nenhum comentário registrado."}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      {item.itemType === 'ticket' ? (
                        <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest bg-muted/30 border-none">
                          Status: {item.status}
                        </Badge>
                      ) : (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-background border border-border-divider text-[9px] text-content-secondary font-bold uppercase tracking-tight">
                          <Clock className="w-2.5 h-2.5 text-plannera-sop" />
                          {item.direct_hours || item.parsed_hours || 0}h
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-plannera-sop font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <Eye className="w-3 h-3" /> 
                        {item.itemType === 'ticket' ? 'Abrir Chamado' : 
                         item.itemType === 'effort' ? 'Editar Registro' :
                         'Ver Detalhes'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <EffortEditModal
        entry={selectedEffort}
        onClose={() => setSelectedEffort(null)}
        onUpdate={() => {
          setSelectedEffort(null)
          router.refresh()
        }}
        accounts={accounts}
      />

      <NPSDetailModal
        render={selectedNPS}
        onOpenChange={(open) => !open && setSelectedNPS(null)}
      />

      <PlaybookHistoryModal
        playbook={selectedPlaybook}
        onOpenChange={(open) => !open && setSelectedPlaybook(null)}
      />

      <InteractionDetailModal
        interaction={selectedInteraction}
        onClose={() => setSelectedInteraction(null)}
        onUpdate={() => {
          setSelectedInteraction(null)
          router.refresh()
        }}
        accountName={accountName || accounts[0]?.name}
      />
    </div>
  )
}
