'use client'

import { createContext, useContext, useReducer, ReactNode, useMemo } from 'react'
import { FilterCondition, FilterGroup } from '@/lib/schemas/filter.schema'
import { FilterBuilderContextType } from '@/lib/types/filter.types'

type Action =
  | { type: 'ADD_CONDITION'; groupPath: number[]; condition: FilterCondition }
  | { type: 'REMOVE_CONDITION'; groupPath: number[]; conditionIndex: number }
  | { type: 'UPDATE_CONDITION'; groupPath: number[]; conditionIndex: number; updates: Partial<FilterCondition> }
  | { type: 'ADD_GROUP'; groupPath: number[]; groupType: 'AND' | 'OR' }
  | { type: 'REMOVE_GROUP'; groupPath: number[] }
  | { type: 'UPDATE_GROUP_TYPE'; groupPath: number[]; groupType: 'AND' | 'OR' }
  | { type: 'SET_FILTER'; filter: FilterGroup }

const DEFAULT_FILTER: FilterGroup = {
  type: 'AND',
  conditions: [],
}

function getGroupAtPath(filter: FilterGroup, path: number[]): FilterGroup {
  let current = filter
  for (const idx of path) {
    const condition = current.conditions[idx]
    if (condition && 'type' in condition && 'conditions' in condition) {
      current = condition as FilterGroup
    }
  }
  return current
}

function setGroupAtPath(filter: FilterGroup, path: number[], newGroup: FilterGroup): FilterGroup {
  if (path.length === 0) return newGroup

  const newFilter = { ...filter }
  let current = newFilter

  for (let i = 0; i < path.length - 1; i++) {
    const idx = path[i]
    const condition = current.conditions[idx]
    if (condition && 'type' in condition) {
      current.conditions[idx] = { ...condition }
      current = current.conditions[idx] as FilterGroup
    }
  }

  const lastIdx = path[path.length - 1]
  current.conditions[lastIdx] = newGroup

  return newFilter
}

function filterReducer(state: FilterGroup, action: Action): FilterGroup {
  switch (action.type) {
    case 'ADD_CONDITION': {
      const group = getGroupAtPath(state, action.groupPath)
      return setGroupAtPath(state, action.groupPath, {
        ...group,
        conditions: [...group.conditions, action.condition],
      })
    }

    case 'REMOVE_CONDITION': {
      const group = getGroupAtPath(state, action.groupPath)
      return setGroupAtPath(state, action.groupPath, {
        ...group,
        conditions: group.conditions.filter((_: any, i: number) => i !== action.conditionIndex),
      })
    }

    case 'UPDATE_CONDITION': {
      const group = getGroupAtPath(state, action.groupPath)
      const updated = [...group.conditions]
      const condition = updated[action.conditionIndex]
      if (condition && 'field' in condition) {
        updated[action.conditionIndex] = { ...condition, ...action.updates }
      }
      return setGroupAtPath(state, action.groupPath, {
        ...group,
        conditions: updated,
      })
    }

    case 'ADD_GROUP': {
      const group = getGroupAtPath(state, action.groupPath)
      const newSubgroup: FilterGroup = { type: action.groupType, conditions: [] }
      return setGroupAtPath(state, action.groupPath, {
        ...group,
        conditions: [...group.conditions, newSubgroup],
      })
    }

    case 'REMOVE_GROUP': {
      if (action.groupPath.length === 0) return state
      const parentPath = action.groupPath.slice(0, -1)
      const parentGroup = getGroupAtPath(state, parentPath)
      const groupIndex = action.groupPath[action.groupPath.length - 1]
      return setGroupAtPath(state, parentPath, {
        ...parentGroup,
        conditions: parentGroup.conditions.filter((_: any, i: number) => i !== groupIndex),
      })
    }

    case 'UPDATE_GROUP_TYPE': {
      const group = getGroupAtPath(state, action.groupPath)
      return setGroupAtPath(state, action.groupPath, {
        ...group,
        type: action.groupType,
      })
    }

    case 'SET_FILTER':
      return action.filter

    default:
      return state
  }
}

const FilterBuilderContext = createContext<FilterBuilderContextType | null>(null)

export function FilterBuilderProvider({ children, initialFilter }: { children: ReactNode; initialFilter?: FilterGroup }) {
  const [filter, dispatch] = useReducer(filterReducer, initialFilter || DEFAULT_FILTER)

  const value = useMemo<FilterBuilderContextType>(
    () => ({
      filter,
      addCondition: (groupPath, condition) => {
        dispatch({ type: 'ADD_CONDITION', groupPath, condition })
      },
      removeCondition: (groupPath, conditionIndex) => {
        dispatch({ type: 'REMOVE_CONDITION', groupPath, conditionIndex })
      },
      updateCondition: (groupPath, conditionIndex, updates) => {
        dispatch({ type: 'UPDATE_CONDITION', groupPath, conditionIndex, updates })
      },
      addGroup: (groupPath, type) => {
        dispatch({ type: 'ADD_GROUP', groupPath, groupType: type })
      },
      removeGroup: (groupPath) => {
        dispatch({ type: 'REMOVE_GROUP', groupPath })
      },
      updateGroupType: (groupPath, type) => {
        dispatch({ type: 'UPDATE_GROUP_TYPE', groupPath, groupType: type })
      },
      setFilter: (newFilter) => {
        dispatch({ type: 'SET_FILTER', filter: newFilter })
      },
    }),
    [filter]
  )

  return <FilterBuilderContext.Provider value={value}>{children}</FilterBuilderContext.Provider>
}

export function useFilterBuilder(): FilterBuilderContextType {
  const context = useContext(FilterBuilderContext)
  if (!context) {
    throw new Error('useFilterBuilder must be used within FilterBuilderProvider')
  }
  return context
}
