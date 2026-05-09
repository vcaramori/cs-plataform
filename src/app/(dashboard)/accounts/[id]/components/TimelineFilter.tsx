'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TimelineFilterProps {
  filter: 'all' | 'strategic' | 'atendimento'
  setFilter: (filter: 'all' | 'strategic' | 'atendimento') => void
  sortOrder: 'asc' | 'desc'
  setSortOrder: (order: 'asc' | 'desc') => void
  searchQuery: string
  setSearchQuery: (query: string) => void
  totalActivities: number
}

export function TimelineFilter({
  filter,
  setFilter,
  sortOrder,
  setSortOrder,
  searchQuery,
  setSearchQuery,
  totalActivities
}: TimelineFilterProps) {
  return (
    <div className="space-y-4">
      {/* Tabs + Sort Toggle */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-3">
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

          {/* Sort Toggle Button */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-content-secondary hover:text-content-primary hover:bg-surface-background border border-border-divider transition-colors"
          >
            {sortOrder === 'desc' ? '🔽 Mais recente' : '🔼 Mais antigo'}
          </button>
        </div>
        <span className="text-[9px] text-content-secondary font-bold uppercase tracking-widest">{totalActivities} Atividades</span>
      </div>

      {/* Search Input */}
      <div className="px-2 py-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-content-secondary" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-background border border-border-divider text-[10px] text-content-primary placeholder-content-secondary focus:outline-none focus:ring-1 focus:ring-plannera-sop"
          />
        </div>
      </div>
    </div>
  )
}
