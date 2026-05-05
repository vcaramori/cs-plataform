import { FilterCondition, FilterGroup } from '@/lib/schemas/filter.schema'

export type FieldType = 'enum' | 'text' | 'date' | 'uuid' | 'array'

export interface FieldDefinition {
  name: string
  label: string
  type: FieldType
  operators: string[]
  options?: Array<{ value: string; label: string }> // for enum/array
}

export interface FilterBuilderContextType {
  filter: FilterGroup
  addCondition: (groupPath: number[], condition: FilterCondition) => void
  removeCondition: (groupPath: number[], conditionIndex: number) => void
  updateCondition: (groupPath: number[], conditionIndex: number, updates: Partial<FilterCondition>) => void
  addGroup: (groupPath: number[], type: 'AND' | 'OR') => void
  removeGroup: (groupPath: number[]) => void
  updateGroupType: (groupPath: number[], type: 'AND' | 'OR') => void
  setFilter: (filter: FilterGroup) => void
}
