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
  Filter, 
  Clock, 
  AlertTriangle,
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
    if (item.isStrategic) return <Users className="w-4 h-4 text-plannera-orange" />
    if (item.activity_type === 'email') return <Mail className="w-4 h-4 text-plannera-sop" />
    if (['preparation', 'analysis', 'reporting'].includes(item.activity_type)) return <Terminal className="w-4 h-4 text-plannera-ds" />
    return <FileText className="w-4 h-4 text-slate-500" />
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

      <div className="relative space-y-6 px-4">
        {/* Timeline Hub Rail — left-10 = 40px aligns with icon center (16px padding + 24px half of w-12) */}
        <div className="absolute left-10 top-6 bottom-6 w-px bg-white/[0.06]" />

        <AnimatePresence mode="popLayout">
          {filtered.slice(0, 10).map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.4 }}
              className="relative flex items-start gap-4 group"
            >
              {/* Dot/Icon Hub */}
              <div className={cn(
                "mt-2 flex items-center justify-center w-12 h-12 rounded-2xl border bg-slate-900 z-10 transition-all duration-300 shadow-xl flex-shrink-0 group-hover:scale-105",
                item.isStrategic 
                  ? "border-plannera-orange/30 shadow-[0_0_15px_rgba(247,148,30,0.15)] bg-plannera-orange/5" 
                  : "border-white/5 bg-white/5"
              )}>
                {getIcon(item)}
              </div>

              {/* Event Content Card */}
              <Card className={cn(
                "flex-1 glass-card hover:bg-white/5 transition-all duration-300 border-none group/card relative",
                item.isStrategic && "ring-1 ring-plannera-orange/20"
              )}>
                {item.isStrategic && (
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover/card:opacity-20 transition-opacity">
                    <Sparkles className="w-12 h-12 text-plannera-orange" />
                  </div>
                )}
                
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-bold tracking-tight truncate min-w-0">
                        {item.title || item.parsed_description}
                      </span>
                      {item.isStrategic && (
                        <Badge className="bg-plannera-orange/10 text-plannera-orange border-none text-[8px] font-bold uppercase tracking-widest h-4 shrink-0">Strategic</Badge>
                      )}
                    </div>
                    <span className="text-slate-500 text-[9px] font-bold uppercase font-mono tracking-tighter shrink-0">
                      {new Date(item.date).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  
                  <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 italic">
                    {item.raw_transcript || item.parsed_description}
                  </p>

                  <div className="flex items-center justify-between mt-4">
                     <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black/20 border border-white/5 text-[9px] text-slate-500 font-bold uppercase tracking-tight">
                          <Clock className="w-3 h-3 text-plannera-sop" />
                          {item.direct_hours || item.parsed_hours}h Effort
                        </div>
                        {item.sentiment_indicator && (
                           <div className={cn(
                             "w-2 h-2 rounded-full",
                             item.sentiment_indicator === 'positive' ? 'bg-plannera-ds' : 'bg-plannera-demand'
                           )} />
                        )}
                     </div>
                    
                    {!item.isStrategic && (
                       <button 
                        onClick={() => setEditingEntry(item)}
                        className="text-[10px] text-plannera-sop hover:text-plannera-orange font-bold uppercase tracking-widest flex items-center gap-1 group/btn"
                      >
                        Editar Log
                        <ChevronRight className="w-3 h-3 group-hover/btn:translate-x-1 transition-transform" />
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
            <Search className="w-12 h-12 mx-auto mb-4" />
            <p className="text-xs font-black uppercase tracking-widest">Nenhuma atividade registrada</p>
          </div>
        )}
      </div>

      {editingEntry && (
        <EffortEditModal
          entry={editingEntry}
          onClose={() => setEditingEntry(null)}
          onUpdate={(updated) => {
            setEditingEntry(null)
            router.refresh()
          }}
          accounts={accounts}
        />
      )}
    </div>
  )
}
