'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FilterGroup } from '@/lib/schemas/filter.schema'
import { FieldDefinition } from '@/lib/types/filter.types'
import { FilterBuilderProvider, useFilterBuilder } from './FilterBuilder'
import { FilterGroupUI } from './FilterBuilderUI'
import { FilterPreview } from './FilterPreview'
import { Sliders } from 'lucide-react'

interface FilterEditorModalProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  initialFilter?: FilterGroup
  onSave?: (filter: FilterGroup) => Promise<void> | void
  tickets: any[]
  fields?: FieldDefinition[]
  children?: React.ReactNode
}

const DEFAULT_FIELDS: FieldDefinition[] = [
  {
    name: 'status',
    label: 'Status',
    type: 'enum',
    operators: ['eq', 'neq', 'in', 'nin'],
    options: [
      { value: 'open', label: 'Aberto' },
      { value: 'in-progress', label: 'Em Progresso' },
      { value: 'resolved', label: 'Resolvido' },
      { value: 'closed', label: 'Fechado' },
    ],
  },
  {
    name: 'priority',
    label: 'Prioridade',
    type: 'enum',
    operators: ['eq', 'neq', 'in', 'nin'],
    options: [
      { value: 'low', label: 'Baixa' },
      { value: 'medium', label: 'Média' },
      { value: 'high', label: 'Alta' },
      { value: 'critical', label: 'Crítica' },
    ],
  },
  {
    name: 'sla_status',
    label: 'SLA',
    type: 'enum',
    operators: ['eq', 'neq', 'in', 'nin'],
    options: [
      { value: 'no_prazo', label: 'No Prazo' },
      { value: 'atencao', label: 'Atenção' },
      { value: 'vencido', label: 'Vencido' },
    ],
  },
  {
    name: 'assigned_to',
    label: 'Atribuído a',
    type: 'uuid',
    operators: ['eq', 'neq', 'is_null', 'not_null'],
  },
  {
    name: 'created_at',
    label: 'Data de Abertura',
    type: 'date',
    operators: ['gt', 'gte', 'lt', 'lte', 'eq'],
  },
]

function FilterEditorContent({ onSave, tickets, fields }: {
  onSave?: (filter: FilterGroup) => Promise<void> | void
  tickets: any[]
  fields: FieldDefinition[]
}) {
  const { filter } = useFilterBuilder()
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = async () => {
    setIsLoading(true)
    try {
      await onSave?.(filter)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <FilterGroupUI group={filter} path={[]} fields={fields} expanded={true} />
      <FilterPreview filter={filter} tickets={tickets} />

      <DialogFooter>
        <Button
          onClick={handleSave}
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? 'Salvando...' : 'Salvar Filtro'}
        </Button>
      </DialogFooter>
    </div>
  )
}

export function FilterEditorModal({
  open: controlledOpen,
  onOpenChange,
  initialFilter,
  onSave,
  tickets,
  fields = DEFAULT_FIELDS,
  children,
}: FilterEditorModalProps) {
  const [internalOpen, setInternalOpen] = useState(false)

  const open = controlledOpen ?? internalOpen
  const setOpen = onOpenChange ?? setInternalOpen

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Editar Filtros
          </DialogTitle>
          <DialogDescription>
            Combine condições com AND/OR para filtrar tickets
          </DialogDescription>
        </DialogHeader>

        <FilterBuilderProvider initialFilter={initialFilter}>
          <FilterEditorContent onSave={onSave} tickets={tickets} fields={fields} />
        </FilterBuilderProvider>
      </DialogContent>
    </Dialog>
  )
}
