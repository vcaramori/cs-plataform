'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Users,
  Terminal,
  Mail,
  Search,
  Clock,
  FileText,
  Sparkles,
  ChevronRight
} from 'lucide-react'
import { EffortEditModal } from '@/components/shared/EffortEditModal'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface Props {
  interactions: any[]
  efforts: any[]
  accounts: any[]
}

export function AccountUnifiedTimeline({ interactions, efforts, accounts }: Props) {
  const [filter, setFilter] = useState<'all' | 'strategic'>('all')
  const [editingEntry, setEditingEntry] = useState<any>(null)
  const router = useRouter()

  const combined = [
    ...interactions.map(i => ({ ...i, isStrategic: true })),
    ...efforts.map(e => ({ ...e, isStrategic: false }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filtered = filter === 'strategic' ? combined.filter(c => c.isStrategic) : combined

  const getIcon = (item: any) => {
    if (item.isStrategic) return <Users className="w-3.5 h-3.5 text-plannera-orange" />
    if (item.activity_type === 'email') return <Mail className="w-3.5 h-3.5 text-plannera-sop" />
    if (['preparation', 'analysis', 'reporting'].includes(item.activity_type)) return <Terminal className="w-3.5 h-3.5 text-plannera-ds" />
    return <FileText className="w-3.5 h-3.5 text-slate-500" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2">
        <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
              filter === 'all' ? "bg-plannera-sop text-white shadow-lg" : "text-slate-500 hover:text-white"
            )}
          >
            Feed Geral
          </button>
          <button
            onClick={() => setFilter('strategic')}
            className={cn(
              "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-all",
              filter === 'strategic' ? "bg-plannera-sop text-white shadow-lg" : "text-slate-500 hover:text-white"
            )}
          >
            Estratégia
          </button>
        </div>
        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{filtered.length} Atividades</span>
      </div>

      {/* Rail left = 16px (px-4) + 16px (half of w-8) = 32px = left-8 */}
      <div className="relative space-y-4 px-4">
        <div className="absolute left-8 top-4 bottom-4 w-px bg-white/[0.06]" />

        <AnimatePresence mode="popLayout">
          {filtered.slice(0, 10).map((item, idx) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="relative flex items-start gap-3 group"
            >
              {/* Icon — w-8 h-8 to keep column narrow */}
              <div className={cn(
                "mt-1.5 flex items-center justify-center w-8 h-8 rounded-xl border bg-slate-900 z-10 transition-all duration-300 shadow-lg flex-shrink-0 group-hover:scale-105",
                item.isStrategic
                  ? "border-plannera-orange/30 shadow-[0_0_12px_rgba(247,148,30,0.15)] bg-plannera-orange/5"
                  : "border-white/5 bg-white/5"
              )}>
                {getIcon(item)}
              </div>

              {/* Card — min-w-0 + overflow-hidden to prevent text escape */}
              <Card className={cn(
                "flex-1 min-w-0 glass-card hover:bg-white/5 transition-all duration-300 border-none group/card relative overflow-hidden",
                item.isStrategic && "ring-1 ring-plannera-orange/20"
              )}>
                {item.isStrategic && (
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/card:opacity-20 transition-opacity pointer-events-none">
                    <Sparkles className="w-10 h-10 text-plannera-orange" />
                  </div>
                )}

                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-1.5 min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0 overflow-hidden">
                      <span className="text-white text-xs font-bold tracking-tight truncate">
                        {item.title || item.parsed_description}
                      </span>
                      {item.isStrategic && (
                        <Badge className="bg-plannera-orange/10 text-plannera-orange border-none text-[7px] font-bold uppercase tracking-widest h-3.5 shrink-0 hidden sm:inline-flex">
                          Estratégico
                        </Badge>
                      )}
                    </div>
                    <span className="text-slate-500 text-[9px] font-bold font-mono tracking-tighter shrink-0 mt-0.5">
                      {new Date(item.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <p className="text-slate-400 text-[11px] leading-relaxed line-clamp-2 italic">
                    {item.raw_transcript || item.parsed_description}
                  </p>

                  <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/20 border border-white/5 text-[9px] text-slate-500 font-bold uppercase tracking-tight">
                        <Clock className="w-2.5 h-2.5 text-plannera-sop" />
                        {item.direct_hours || item.parsed_hours}h
                      </div>
                      {item.sentiment_indicator && (
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          item.sentiment_indicator === 'positive' ? 'bg-plannera-ds' : 'bg-plannera-demand'
                        )} />
                      )}
                    </div>

                    {!item.isStrategic && (
                      <button
                        onClick={() => setEditingEntry(item)}
                        className="text-[9px] text-plannera-sop hover:text-plannera-orange font-bold uppercase tracking-widest flex items-center gap-0.5 group/btn"
                      >
                        Editar
                        <ChevronRight className="w-2.5 h-2.5 group-hover/btn:translate-x-0.5 transition-transform" />
                      </button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>

        {filtered.length === 0 && (
          <div className="text-center py-20 opacity-20">
            <Search className="w-10 h-10 mx-auto mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Nenhuma atividade registrada</p>
          </div>
        )}
      </div>

      {editingEntry && (
        <EffortEditModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onUpdate={() => {
            setEditingEntry(null)
            router.refresh()
          }}
          accounts={accounts}
        />
      )}
    </div>
  )
}
