'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Filter, Search, Sliders, Sparkles, Loader2 } from 'lucide-react'
import { ViewCreationPopover } from './ViewCreationPopover'

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  open: { label: 'Aberto', color: 'text-destructive', bg: 'bg-destructive/10' },
  'in-progress': { label: 'Em Progresso', color: 'text-accent', bg: 'bg-accent/10' },
  resolved: { label: 'Resolvido', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  closed: { label: 'Fechado', color: 'text-content-secondary', bg: 'bg-surface-background/50' },
}

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  critical: { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive/10' },
  high: { label: 'Alto', color: 'text-accent', bg: 'bg-accent/10' },
  medium: { label: 'Médio', color: 'text-secondary', bg: 'bg-secondary/10' },
  low: { label: 'Baixo', color: 'text-content-secondary', bg: 'bg-surface-background/50' },
}

interface SuporteFiltersProps {
  filterStatus: string
  onStatusChange: (value: string) => void
  filterPriority: string
  onPriorityChange: (value: string) => void
  searchQuery: string
  onSearchChange: (value: string) => void
  isLoadingSearch: boolean
  hasSemanticResults: boolean
  onClearSearch: () => void
  onFilterEditorOpen: () => void
  showCreateViewPopover: boolean
  onCreateViewOpen: (open: boolean) => void
}

export function SuporteFilters({
  filterStatus,
  onStatusChange,
  filterPriority,
  onPriorityChange,
  searchQuery,
  onSearchChange,
  isLoadingSearch,
  hasSemanticResults,
  onClearSearch,
  onFilterEditorOpen,
  showCreateViewPopover,
  onCreateViewOpen,
}: SuporteFiltersProps) {
  const hasActiveFilters = filterStatus !== 'all' || filterPriority !== 'all'

  return (
    <div className="flex gap-4 items-center flex-wrap bg-surface-card border border-border-divider p-5 rounded-[1.5rem] shadow-xl">
      <div className="flex items-center gap-3 pl-2 pr-4 border-r border-border-divider/50 shrink-0">
        <Filter className="w-4 h-4 text-plannera-primary" />
        <span className="text-[10px] font-black uppercase tracking-widest text-content-primary">Filtros</span>
      </div>

      <SearchableSelect
        value={filterStatus}
        onValueChange={onStatusChange}
        className="w-44"
        options={[
          { label: 'Todos os Status', value: 'all' },
          ...Object.entries(statusConfig).map(([value, conf]) => ({ label: conf.label, value }))
        ]}
      />

      <SearchableSelect
        value={filterPriority}
        onValueChange={onPriorityChange}
        className="w-48"
        options={[
          { label: 'Todas as Prioridades', value: 'all' },
          ...Object.entries(priorityConfig).map(([value, conf]) => ({ label: conf.label, value }))
        ]}
      />

      <div className="relative flex-1 min-w-[240px]">
        {isLoadingSearch ? (
          <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-plannera-primary animate-spin" />
        ) : (
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-content-secondary/60" />
        )}
        <Input
          placeholder="PESQUISAR TICKETS..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-11 h-11 rounded-2xl border-border/40 bg-slate-500/5 dark:bg-slate-400/10 shadow-sm text-[10px] font-black uppercase tracking-widest placeholder:text-muted-foreground/50 transition-all focus-visible:ring-primary/30"
        />
        {hasSemanticResults && (
          <Badge
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-plannera-primary/20 text-plannera-primary border border-plannera-primary/30 cursor-pointer hover:bg-plannera-primary/30 transition-all text-[8px] font-black uppercase"
            onClick={onClearSearch}
          >
            <Sparkles className="w-2.5 h-2.5 mr-1" />
            Semântica
          </Badge>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onFilterEditorOpen}
        className="text-[10px] font-black uppercase tracking-widest text-plannera-primary hover:bg-plannera-primary/5 transition-all flex items-center gap-2"
      >
        <Sliders className="w-3.5 h-3.5" />
        Filtros Avançados
      </Button>

      {hasActiveFilters && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { onStatusChange('all'); onPriorityChange('all') }}
            className="text-[10px] font-black uppercase tracking-widest text-plannera-primary hover:bg-plannera-primary/5 transition-all"
          >
            Limpar Busca
          </Button>
          <ViewCreationPopover
            open={showCreateViewPopover}
            onOpenChange={onCreateViewOpen}
          >
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] font-black uppercase tracking-widest text-plannera-primary hover:bg-plannera-primary/5 transition-all flex items-center gap-2"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Salvar como View
            </Button>
          </ViewCreationPopover>
        </>
      )}
    </div>
  )
}
