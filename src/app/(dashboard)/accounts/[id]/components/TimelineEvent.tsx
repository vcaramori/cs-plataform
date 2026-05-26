'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Eye, Heart, DollarSign, TicketIcon, Star, Sparkles, Users, Mail, Terminal, FileText, Clock, Paperclip } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

interface TimelineEventProps {
  item: any
  idx: number
  onItemClick: (item: any) => void
}

export function TimelineEvent({ item, idx, onItemClick }: TimelineEventProps) {
  const getIcon = (item: any) => {
    if (item.itemType === 'health_event') {
      if (item.health_status === 'healthy') return <Heart className="w-3.5 h-3.5 text-success" />
      if (item.health_status === 'at_risk') return <Heart className="w-3.5 h-3.5 text-warning" />
      if (item.health_status === 'critical') return <Heart className="w-3.5 h-3.5 text-red-500" />
      return <Heart className="w-3.5 h-3.5 text-gray-400" />
    }
    if (item.itemType === 'contract_event') return <DollarSign className="w-3.5 h-3.5 text-indigo-500" />
    if (item.itemType === 'ticket') return <TicketIcon className="w-3.5 h-3.5 text-plannera-demand" />
    if (item.itemType === 'nps') return <Star className="w-3.5 h-3.5 text-warning" />
    if (item.itemType === 'playbook') return <Sparkles className="w-3.5 h-3.5 text-success" />
    if (item.isStrategic) return <Users className="w-3.5 h-3.5 text-plannera-orange" />
    if (item.activity_type === 'email') return <Mail className="w-3.5 h-3.5 text-plannera-sop" />
    if (['preparation', 'analysis', 'reporting'].includes(item.activity_type)) return <Terminal className="w-3.5 h-3.5 text-plannera-ds" />
    return <FileText className="w-3.5 h-3.5 text-content-secondary" />
  }

  const getEventTitle = () => {
    if (item.itemType === 'health_event') return item.title
    if (item.itemType === 'ticket') return `Ticket: ${item.title}`
    if (item.itemType === 'nps') return `Avaliação NPS: ${item.score}/10`
    if (item.itemType === 'contract_event') return item.title
    return item.title || item.parsed_description
  }

  const getEventDescription = () => {
    if (item.itemType === 'health_event') return item.description
    return item.raw_transcript || item.parsed_description || item.description || item.comment || "Nenhum comentário registrado."
  }

  const getActionLabel = () => {
    if (item.itemType === 'ticket') return 'Abrir Chamado'
    if (item.itemType === 'effort') return 'Editar Registro'
    if (item.itemType === 'contract_event') return 'Ver Contrato'
    if (item.itemType === 'health_event') return 'Ver Health Score'
    return 'Ver Detalhes'
  }

  return (
    <motion.div
      key={item.id}
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.05, duration: 0.4 }}
      className="relative flex items-start gap-3 group"
    >
      <div
        className={cn(
          "mt-1.5 flex items-center justify-center w-8 h-8 rounded-xl border bg-surface-background z-10 transition-all duration-300 shadow-lg flex-shrink-0 group-hover:scale-105",
          item.itemType === 'health_event' && "border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]",
          item.itemType === 'contract_event' && "border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]",
          item.isStrategic && item.itemType !== 'contract_event' && item.itemType !== 'health_event' && "border-plannera-orange/30 shadow-[0_0_12px_rgba(247,148,30,0.15)]",
          item.itemType === 'playbook' && "border-success-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]",
          item.itemType === 'ticket' && "border-red-500/30 shadow-[0_0_12px_rgba(239,68,68,0.15)]",
          item.itemType === 'nps' && "border-warning-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
          !item.itemType && "border-border-divider"
        )}
      >
        {getIcon(item)}
      </div>

      <Card
        onClick={() => onItemClick(item)}
        className={cn(
          "flex-1 min-w-0 transition-all duration-300 relative overflow-hidden cursor-pointer hover:bg-muted/30 hover:scale-[1.01] active:scale-[0.99]",
          item.itemType === 'health_event' && "ring-1 ring-red-500/20 bg-red-500/[0.02]",
          item.itemType === 'contract_event' && "ring-1 ring-indigo-500/20 bg-indigo-500/[0.02]",
          item.isStrategic && item.itemType !== 'contract_event' && item.itemType !== 'health_event' && "ring-1 ring-plannera-orange/20",
          item.itemType === 'playbook' && "ring-1 ring-emerald-500/20 bg-success/[0.02]",
          item.itemType === 'ticket' && "ring-1 ring-red-500/10",
          item.itemType === 'nps' && "ring-1 ring-amber-500/10"
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
              <span className="text-content-primary text-xs font-bold tracking-tight truncate">
                {getEventTitle()}
              </span>
              {item.priority === 'critical' && (
                <Badge className="bg-red-500/10 text-red-500 border-none text-[7px] font-bold uppercase tracking-widest h-3.5 shrink-0">
                  Crítico
                </Badge>
              )}
              {item.itemType === 'health_event' && item.health_status === 'critical' && (
                <Badge className="bg-red-500/10 text-red-500 border-none text-[7px] font-bold uppercase tracking-widest h-3.5 shrink-0">
                  Crítico
                </Badge>
              )}
              {item.itemType === 'health_event' && item.health_status === 'at_risk' && (
                <Badge className="bg-warning/10 text-warning border-none text-[7px] font-bold uppercase tracking-widest h-3.5 shrink-0">
                  Em Risco
                </Badge>
              )}
            </div>
            <span className="text-content-secondary text-[9px] font-bold font-mono tracking-tighter shrink-0 mt-0.5">
              {new Date(item.date).toLocaleDateString('pt-BR')}
            </span>
          </div>

          <p className="text-content-secondary text-[11px] leading-relaxed line-clamp-2 italic">
            {getEventDescription()}
          </p>

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2">
              {item.itemType === 'ticket' ? (
                <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest bg-muted/30 border-none">
                   Status: {item.status}
                </Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-surface-background border border-border-divider text-[9px] text-content-secondary font-bold uppercase tracking-tight">
                    <Clock className="w-2.5 h-2.5 text-plannera-sop" />
                    {item.direct_hours || item.parsed_hours || 0}h
                  </div>
                  {item.file_urls && item.file_urls.length > 0 && (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-plannera-orange/10 border border-plannera-orange/20 text-[9px] text-plannera-orange font-black uppercase tracking-widest">
                      <Paperclip className="w-2.5 h-2.5" />
                      Anexos ({item.file_urls.length})
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[9px] text-plannera-sop font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {getActionLabel()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
