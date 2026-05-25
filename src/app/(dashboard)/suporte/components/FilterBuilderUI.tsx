'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { FilterCondition, FilterGroup } from '@/lib/schemas/filter.schema'
import { FieldDefinition } from '@/lib/types/filter.types'
import { useFilterBuilder } from './FilterBuilder'
import { useState } from 'react'

interface FilterGroupUIProps {
  group: FilterGroup
  path: number[]
  fields: FieldDefinition[]
  expanded?: boolean
}

export function FilterGroupUI({ group, path, fields, expanded = true }: FilterGroupUIProps) {
  const { addCondition, removeCondition, updateCondition, addGroup, removeGroup, updateGroupType } = useFilterBuilder()
  const [isExpanded, setIsExpanded] = useState(expanded)

  return (
    <div className="border border-border-divider rounded-lg p-4 space-y-3 bg-surface-background/50">
      {/* Group Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-surface-card rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>

        <Select value={group.type} onValueChange={(type) => updateGroupType(path, type as 'AND' | 'OR')}>
          <SelectTrigger className="w-24 h-8 text-xs font-bold">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AND">AND</SelectItem>
            <SelectItem value="OR">OR</SelectItem>
          </SelectContent>
        </Select>

        {path.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeGroup(path)}
            className="ml-auto text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4" />
            Remover grupo
          </Button>
        )}
      </div>

      {/* Conditions */}
      {isExpanded && (
        <div className="space-y-2">
          {group.conditions.map((condition: any, idx: number) => (
            'field' in condition ? (
              <FilterConditionUI
                key={idx}
                condition={condition}
                path={path}
                index={idx}
                fields={fields}
              />
            ) : (
              <FilterGroupUI
                key={idx}
                group={condition as FilterGroup}
                path={[...path, idx]}
                fields={fields}
              />
            )
          ))}

          {/* Add Condition Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const field = fields[0]
              const op = field.operators[0]
              addCondition(path, {
                field: field.name,
                op: op as any,
              })
            }}
            className="w-full text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar condição
          </Button>

          {/* Add Group Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => addGroup(path, 'OR')}
            className="w-full text-xs"
          >
            <Plus className="w-3 h-3 mr-1" />
            Adicionar grupo
          </Button>
        </div>
      )}
    </div>
  )
}

interface FilterConditionUIProps {
  condition: FilterCondition
  path: number[]
  index: number
  fields: FieldDefinition[]
}

function FilterConditionUI({ condition, path, index, fields }: FilterConditionUIProps) {
  const { updateCondition, removeCondition } = useFilterBuilder()

  const field = fields.find((f) => f.name === condition.field)

  return (
    <div className="flex flex-col gap-2 bg-surface-card p-3 rounded-xl border border-border-divider/50">
      <div className="flex items-center gap-2">
        {/* Field Selector */}
        <SearchableSelect
          value={condition.field}
          onValueChange={(value) => updateCondition(path, index, { field: value })}
          options={fields.map((f) => ({ label: f.label, value: f.name }))}
          className="h-8 text-xs flex-1"
          placeholder="Campo"
        />

        {/* Operator Selector */}
        {field && (
          <Select
            value={condition.op}
            onValueChange={(op) => updateCondition(path, index, { op: op as any })}
          >
            <SelectTrigger className="h-8 text-xs w-28 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {field.operators.map((op) => (
                <SelectItem key={op} value={op}>
                  {op}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => removeCondition(path, index)}
          className="text-destructive hover:bg-destructive/10 shrink-0 h-8 w-8 p-0"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Value Input — linha separada para mais espaço */}
      {field && condition.op !== 'is_null' && condition.op !== 'not_null' && (
        <ValueInput
          field={field}
          value={condition.op === 'in' || condition.op === 'nin' ? condition.values : condition.value}
          isArray={condition.op === 'in' || condition.op === 'nin'}
          onChange={(val) => {
            if (condition.op === 'in' || condition.op === 'nin') {
              updateCondition(path, index, { values: val as string[] })
            } else {
              updateCondition(path, index, { value: val })
            }
          }}
        />
      )}
    </div>
  )
}

interface ValueInputProps {
  field: FieldDefinition
  value: any
  isArray?: boolean
  onChange: (value: any) => void
}

function ValueInput({ field, value, isArray, onChange }: ValueInputProps) {
  if (field.type === 'enum') {
    if (isArray) {
      return (
        <SearchableSelect
          value={Array.isArray(value) ? value[0] : ''}
          onValueChange={(val) => onChange([val])}
          options={field.options || []}
          className="h-8 text-xs flex-1"
          placeholder="Selecionar valor"
        />
      )
    }
    return (
      <SearchableSelect
        value={value || ''}
        onValueChange={onChange}
        options={field.options || []}
        className="h-8 text-xs flex-1"
        placeholder="Selecionar valor"
      />
    )
  }

  if (field.type === 'date') {
    return (
      <Input
        type="date"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-xs flex-1"
      />
    )
  }

  return (
    <Input
      type="text"
      placeholder="Valor"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="h-8 text-xs flex-1"
    />
  )
}
