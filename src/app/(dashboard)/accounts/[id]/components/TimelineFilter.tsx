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
      {/* Selector + Sort Toggle */}
      <div className="flex items-center justify-between px-2 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Select Dropdown replacing the filter buttons */}
          <select
            value={filter}
            onChange={e => setFilter(e.target.value as any)}
            className="bg-surface-background border border-border-divider rounded-xl h-9 px-3 text-[10px] font-black uppercase tracking-widest text-content-primary focus:outline-none focus:ring-1 focus:ring-plannera-sop cursor-pointer shadow-sm transition-all hover:bg-surface-card"
          >
            <option value="all">Feed Geral</option>
            <option value="strategic">Estratégia</option>
            <option value="atendimento">Atendimento & NPS</option>
          </select>

          {/* Sort Toggle Button */}
          <button
            onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
            className="flex items-center gap-1 px-3 py-2 rounded-xl text-[10px] font-bold text-content-secondary hover:text-content-primary hover:bg-surface-background border border-border-divider transition-colors h-9"
          >
            {sortOrder === 'desc' ? '🔽 Recentes' : '🔼 Antigos'}
          </button>
        </div>
        <span className="text-[9px] text-content-secondary font-bold uppercase tracking-widest shrink-0">{totalActivities} Atividades</span>
      </div>

      {/* Search Input */}
      <div className="px-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-3 w-3.5 h-3.5 text-content-secondary" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-surface-background border border-border-divider text-[10px] text-content-primary placeholder-content-secondary focus:outline-none focus:ring-1 focus:ring-plannera-sop h-9"
          />
        </div>
      </div>
    </div>
  )
}
