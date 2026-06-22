import { useState, useMemo } from 'react'

export type SortDirection = 'asc' | 'desc' | null

export interface SortConfig<T> {
  key: keyof T | string | null
  direction: SortDirection
}

export function useTableSort<T>(data: T[], defaultSort?: SortConfig<T>) {
  const [sortConfig, setSortConfig] = useState<SortConfig<T>>(
    defaultSort || { key: null, direction: null }
  )

  const sortedData = useMemo(() => {
    if (!sortConfig.key || sortConfig.direction === null) {
      return data
    }

    const sortableItems = [...data]
    sortableItems.sort((a: any, b: any) => {
      // Allow dot notation for nested keys (e.g. 'accounts.name')
      const aValue = (sortConfig.key as string).split('.').reduce((obj, key) => obj?.[key], a)
      const bValue = (sortConfig.key as string).split('.').reduce((obj, key) => obj?.[key], b)

      if (aValue === bValue) return 0
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue)
        return sortConfig.direction === 'asc' ? comparison : -comparison
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1
      }
      return 0
    })
    return sortableItems
  }, [data, sortConfig])

  const requestSort = (key: keyof T | string) => {
    let direction: SortDirection = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null
      key = null as any
    }
    setSortConfig({ key, direction })
  }

  return { sortedData, requestSort, sortConfig }
}
