'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { X, Filter } from 'lucide-react'
import { AccountFilterSchema, type AccountFilters } from '@/lib/filters/account-filters.schema'
import { cn } from '@/lib/utils'

interface Props {
  onFiltersChange: (filters: AccountFilters) => void
  defaultFilters?: AccountFilters
}

export function AccountFilterBuilder({ onFiltersChange, defaultFilters = {} }: Props) {
  const [filters, setFilters] = useState<AccountFilters>(defaultFilters)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleFilterChange = useCallback((newFilters: AccountFilters) => {
    setFilters(newFilters)
    onFiltersChange(newFilters)
  }, [onFiltersChange])

  const updateFilter = (key: keyof AccountFilters, value: any) => {
    const updated = { ...filters, [key]: value }
    if (value === undefined || value === '' || value === null) {
      delete updated[key]
    }
    handleFilterChange(updated)
  }

  const clearFilters = () => {
    handleFilterChange({})
  }

  const activeFilterCount = Object.values(filters).filter(v => v !== undefined && v !== null && v !== '').length

  return (
    <Card className="bg-surface-card border-border-divider">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Filter header com toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-content-secondary" />
              <span className="text-sm font-medium text-content-primary">Filtrar Contas</span>
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {activeFilterCount} ativo{activeFilterCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-content-secondary hover:text-content-primary"
            >
              {isExpanded ? 'Ocultar' : 'Mostrar'}
            </Button>
          </div>

          {/* Filtros expandíveis */}
          {isExpanded && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border-divider">
              {/* Health Status */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-secondary uppercase">
                  Health Status
                </label>
                <Select
                  value={filters.health_status || ''}
                  onValueChange={(value) => updateFilter('health_status', value || undefined)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="healthy">Saudável</SelectItem>
                    <SelectItem value="at-risk">Em Risco</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Segment */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-secondary uppercase">
                  Segmento
                </label>
                <Select
                  value={filters.segment || ''}
                  onValueChange={(value) => updateFilter('segment', value || undefined)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="Indústria">Indústria</SelectItem>
                    <SelectItem value="MRO">MRO</SelectItem>
                    <SelectItem value="Varejo">Varejo</SelectItem>
                    <SelectItem value="Distribuidor">Distribuidor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* MRR Min */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-secondary uppercase">
                  MRR Mínimo
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="R$ 0"
                  value={filters.mrr_min || ''}
                  onChange={(e) => updateFilter('mrr_min', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="h-8"
                />
              </div>

              {/* MRR Max */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-secondary uppercase">
                  MRR Máximo
                </label>
                <Input
                  type="number"
                  min="0"
                  placeholder="R$ ∞"
                  value={filters.mrr_max || ''}
                  onChange={(e) => updateFilter('mrr_max', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="h-8"
                />
              </div>

              {/* Contract Status */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-secondary uppercase">
                  Status Contrato
                </label>
                <Select
                  value={filters.contract_status || ''}
                  onValueChange={(value) => updateFilter('contract_status', value || undefined)}
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="at-risk">Em Risco</SelectItem>
                    <SelectItem value="churned">Cancelado</SelectItem>
                    <SelectItem value="in-negotiation">Negociação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Adoption Min */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-secondary uppercase">
                  Adoção Mín %
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="0"
                  value={filters.adoption_min || ''}
                  onChange={(e) => updateFilter('adoption_min', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="h-8"
                />
              </div>

              {/* Adoption Max */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-secondary uppercase">
                  Adoção Máx %
                </label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="100"
                  value={filters.adoption_max || ''}
                  onChange={(e) => updateFilter('adoption_max', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="h-8"
                />
              </div>

              {/* Clear Button */}
              {activeFilterCount > 0 && (
                <div className="flex items-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Limpar
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
