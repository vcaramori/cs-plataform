'use client'

import { useMemo } from 'react'
import { FilterGroup } from '@/lib/schemas/filter.schema'
import { countMatchingTickets } from '@/lib/utils/filterQueryBuilder'
import { Loader2 } from 'lucide-react'

interface FilterPreviewProps {
  filter: FilterGroup
  tickets: any[]
}

export function FilterPreview({ filter, tickets }: FilterPreviewProps) {
  // Calculate matching count using in-memory filtering
  const matchingCount = useMemo(() => {
    return countMatchingTickets(tickets, filter)
  }, [filter, tickets])

  return (
    <div className="px-4 py-3 bg-surface-background/50 border-t border-border-divider rounded-b-lg text-sm">
      <div className="flex items-center gap-2 text-content-secondary">
        <span className="text-[10px] font-bold uppercase tracking-widest">Resultado:</span>
        <span className="text-content-primary font-bold">{matchingCount}</span>
        <span className="text-content-secondary">ticket{matchingCount !== 1 ? 's' : ''}</span>
      </div>
    </div>
  )
}
