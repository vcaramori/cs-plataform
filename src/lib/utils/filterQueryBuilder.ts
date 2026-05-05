import { FilterCondition, FilterGroup } from '@/lib/schemas/filter.schema'
import type { SupportTicket } from '@/lib/supabase/types'

/**
 * Apply filter group to Supabase query
 * Supabase doesn't support native nested AND/OR, so we convert to flat conditions
 */
export function applyFilterToQuery(
  query: any,
  filter: FilterGroup
): any {
  if (!filter.conditions || filter.conditions.length === 0) {
    return query
  }

  // Flatten nested groups into OR clauses
  const orClauses: string[] = []

  for (const condition of filter.conditions) {
    if (isFilterCondition(condition)) {
      orClauses.push(buildConditionString(condition as FilterCondition))
    } else if (isFilterGroup(condition)) {
      const andParts = flattenGroup(condition as FilterGroup)
      orClauses.push(`(${andParts.join(' and ')})`)
    }
  }

  if (orClauses.length === 0) return query

  // For AND root group, apply all conditions sequentially
  // For OR root group, use .or() method
  if (filter.type === 'AND') {
    return query.or(orClauses.join(','))
  } else {
    return query.or(orClauses.join(','))
  }
}

function isFilterCondition(obj: any): obj is FilterCondition {
  return obj && typeof obj === 'object' && 'field' in obj && 'op' in obj
}

function isFilterGroup(obj: any): obj is FilterGroup {
  return obj && typeof obj === 'object' && 'type' in obj && 'conditions' in obj
}

function buildConditionString(condition: FilterCondition): string {
  const { field, op, value, values } = condition

  switch (op) {
    case 'eq':
      return `${field}.eq.${escapeValue(value)}`
    case 'neq':
      return `${field}.neq.${escapeValue(value)}`
    case 'in':
      return `${field}.in.(${values?.map(escapeValue).join(',') || ''})`
    case 'nin':
      return `${field}.not.in.(${values?.map(escapeValue).join(',') || ''})`
    case 'gt':
      return `${field}.gt.${escapeValue(value)}`
    case 'gte':
      return `${field}.gte.${escapeValue(value)}`
    case 'lt':
      return `${field}.lt.${escapeValue(value)}`
    case 'lte':
      return `${field}.lte.${escapeValue(value)}`
    case 'contains':
      return `${field}.like.%${escapeValue(value)}%`
    case 'is_null':
      return `${field}.is.null`
    case 'not_null':
      return `${field}.not.is.null`
    default:
      return ''
  }
}

function flattenGroup(group: FilterGroup): string[] {
  const parts: string[] = []

  for (const condition of group.conditions) {
    if (isFilterCondition(condition)) {
      parts.push(buildConditionString(condition as FilterCondition))
    } else if (isFilterGroup(condition)) {
      const nested = flattenGroup(condition as FilterGroup)
      parts.push(`(${nested.join(` ${(condition as FilterGroup).type} `)})`)
    }
  }

  return parts
}

function escapeValue(val: any): string {
  if (val === null || val === undefined) return 'null'
  if (typeof val === 'string') return encodeURIComponent(val)
  return String(val)
}

/**
 * In-memory filter matching for preview
 * Used to count matching tickets without hitting API
 */
export function countMatchingTickets(
  tickets: SupportTicket[],
  filter: FilterGroup
): number {
  return tickets.filter(ticket => matchesFilter(ticket, filter)).length
}

function matchesFilter(ticket: any, filter: FilterGroup): boolean {
  if (!filter.conditions || filter.conditions.length === 0) {
    return true // Empty filter matches all
  }

  if (filter.type === 'AND') {
    return filter.conditions.every((condition: any) =>
      isFilterCondition(condition)
        ? matchesCondition(ticket, condition)
        : matchesFilter(ticket, condition as FilterGroup)
    )
  } else {
    // OR
    return filter.conditions.some((condition: any) =>
      isFilterCondition(condition)
        ? matchesCondition(ticket, condition)
        : matchesFilter(ticket, condition as FilterGroup)
    )
  }
}

function matchesCondition(ticket: any, condition: FilterCondition): boolean {
  const { field, op, value, values } = condition
  const fieldValue = getNestedValue(ticket, field)

  switch (op) {
    case 'eq':
      return fieldValue === value
    case 'neq':
      return fieldValue !== value
    case 'in':
      return values ? values.includes(fieldValue) : false
    case 'nin':
      return values ? !values.includes(fieldValue) : true
    case 'gt':
      return fieldValue > value
    case 'gte':
      return fieldValue >= value
    case 'lt':
      return fieldValue < value
    case 'lte':
      return fieldValue <= value
    case 'contains':
      return String(fieldValue).includes(String(value))
    case 'is_null':
      return fieldValue === null || fieldValue === undefined
    case 'not_null':
      return fieldValue !== null && fieldValue !== undefined
    default:
      return true
  }
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}
