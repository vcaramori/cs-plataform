'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Users, 
  Terminal, 
  Mail, 
  Search, 
  Filter, 
  Clock, 
  AlertTriangle,
  FileText
} from 'lucide-react'
import { EffortEditModal } from '@/components/shared/EffortEditModal'

interface Props {
  interactions: any[]
  efforts: any[]
  accounts: any[]
}

export function AccountUnifiedTimeline({ interactions, efforts, accounts }: Props) {
  const [filter, setFilter] = useState<'all' | 'strategic'>('all')
  const [editingEntry, setEditingEntry] = useState<any>(null)

  // Mesclar e ordenar por data
  const combined = [
    ...interactions.map(i => ({ ...i, isStrategic: true })),
    ...efforts.map(e => ({ ...e, isStrategic: false }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const filtered = filter === 'strategic' ? combined.filter(c => c.isStrategic) : combined

  const getIcon = (item: any) => {
    if (item.isStrategic) return <Users className="w-4 h-4 text-indigo-400" />
    if (item.activity_type === 'email') return <Mail className="w-4 h-4 text-blue-400" />
    if (['preparation', 'analysis', 'reporting'].includes(item.activity_type)) return <Terminal className="w-4 h-4 text-emerald-400" />
    return <FileText className="w-4 h-4 text-slate-400" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-500" />
          <button 
            onClick={() => setFilter('all')}
            className={`text-xs font-bold uppercase tracking-widest ${filter === 'all' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Tudo
          </button>
          <span className="text-slate-800 text-xs">|</span>
          <button 
            onClick={() => setFilter('strategic')}
            className={`text-xs font-bold uppercase tracking-widest ${filter === 'strategic' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Estratégico
          </button>
        </div>
        <span className="text-[10px] text-slate-600 font-bold uppercase">{filtered.length} eventos</span>
      </div>

      <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-indigo-500/50 before:via-slate-800 before:to-transparent">
        {filtered.slice(0, 10).map((item, idx) => (
          <div key={item.id} className="relative flex items-start gap-6 group">
            {/* Dot/Icon */}
            <div className={`mt-1 flex items-center justify-center w-10 h-10 rounded-full border-2 bg-slate-950 z-10 transition-all duration-300 ${item.isStrategic ? 'border-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.3)] scale-110' : 'border-slate-800'}`}>
              {getIcon(item)}
            </div>

            {/* Content */}
            <Card className={`flex-1 bg-slate-900/40 border-slate-800/50 hover:bg-slate-900 transition-all duration-300 ${item.isStrategic ? 'border-l-4 border-l-indigo-500' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white text-sm font-bold truncate max-w-[200px]">
                      {item.title || item.parsed_description}
                    </span>
                    {item.isStrategic && (
                      <Badge variant="outline" className="text-[9px] bg-indigo-500/10 text-indigo-400 border-indigo-500/20 py-0">STRAT</Badge>
                    )}
                  </div>
                  <span className="text-slate-500 text-[10px] font-medium">
                    {new Date(item.date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                
                <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed">
                  {item.raw_transcript || item.parsed_description}
                </p>

                <div className="flex items-center gap-3 mt-3">
                   <div className="flex items-center gap-1 text-[10px] text-slate-500">
                    <Clock className="w-3 h-3" />
                    {item.direct_hours || item.parsed_hours}h
                  </div>
                  {!item.isStrategic && (
                     <button 
                      onClick={() => setEditingEntry(item)}
                      className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold uppercase tracking-wider"
                    >
                      Editar Detalhes
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 opacity-30">
            <Search className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">Nenhuma atividade registrada.</p>
          </div>
        )}
      </div>

      {editingEntry && (
        <EffortEditModal
          open={!!editingEntry}
          onOpenChange={(open) => !open && setEditingEntry(null)}
          entry={editingEntry}
          accounts={accounts}
        />
      )}
    </div>
  )
}
