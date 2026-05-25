'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Text } from '@/components/ui/typography'
import { SearchableSelect } from '@/components/ui/searchable-select'

const filterOptions = [
  { label: 'Feed Geral', value: 'all' },
  { label: 'Estratégia', value: 'strategic' },
  { label: 'Atendimento & NPS', value: 'atendimento' },
]

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
    <div className="space-y-3">
      {/* Selector + Sort Toggle in equal cols */}
      <div className="grid grid-cols-2 gap-2 px-2">
        {/* Select Dropdown replacing the filter buttons */}
        <SearchableSelect
          options={filterOptions}
          value={filter}
          onValueChange={(val) => setFilter(val as any)}
          size="sm"
          placeholder="Feed Geral"
          className="w-full !h-9 border-border-divider bg-surface-background dark:bg-[#101623] hover:bg-surface-card hover:border-border-divider/80 text-[10px] font-black uppercase tracking-widest rounded-xl"
        />

        {/* Sort Toggle Button */}
        <button
          onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-bold text-content-secondary hover:text-content-primary hover:bg-surface-background border border-border-divider transition-colors h-9"
        >
          {sortOrder === 'desc' ? '🔽 Recentes' : '🔼 Antigos'}
        </button>
      </div>

      {/* Search Input & Info Labels */}
      <div className="px-2 space-y-2">
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
        <div className="flex items-center justify-between px-1">
          <Text variant="secondary" className="!text-[9px] font-black uppercase tracking-widest opacity-60 select-none">
            Cognitive Stream
          </Text>
          <Text variant="secondary" className="!text-[9px] font-black uppercase tracking-widest opacity-60 select-none">
            {totalActivities} {totalActivities === 1 ? 'atividade' : 'atividades'}
          </Text>
        </div>
      </div>
    </div>
  )
}
