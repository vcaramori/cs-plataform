/**
 * Effort Service - Centralized API calls for CS effort tracking
 */

export interface TimeEntry {
  id: string
  account_id: string
  activity_type: string
  description?: string
  date: string
  direct_hours: number
  csm_id: string
  logged_at?: string
  parsed_hours?: number
}

export interface EffortStats {
  totalHours: number
  byType: Record<string, number>
  averagePerDay: number
}

const API_BASE = '/api'

/**
 * Fetch time entries for an account
 */
export async function fetchTimeEntries(accountId: string, startDate?: string, endDate?: string) {
  const url = new URL(`${API_BASE}/efforts`, typeof window !== 'undefined' ? window.location.origin : '')
  url.searchParams.set('account_id', accountId)
  if (startDate) url.searchParams.set('start_date', startDate)
  if (endDate) url.searchParams.set('end_date', endDate)

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Failed to fetch time entries: ${res.status}`)
  }
  return res.json() as Promise<TimeEntry[]>
}

/**
 * Create a new time entry
 */
export async function createTimeEntry(data: Omit<TimeEntry, 'id' | 'logged_at'>) {
  const res = await fetch(`${API_BASE}/efforts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(`Failed to create time entry: ${res.status}`)
  }
  return res.json() as Promise<TimeEntry>
}

/**
 * Update a time entry
 */
export async function updateTimeEntry(
  entryId: string,
  data: Partial<TimeEntry>
) {
  const res = await fetch(`${API_BASE}/efforts/${entryId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(`Failed to update time entry: ${res.status}`)
  }
  return res.json() as Promise<TimeEntry>
}

/**
 * Delete a time entry
 */
export async function deleteTimeEntry(entryId: string) {
  const res = await fetch(`${API_BASE}/efforts/${entryId}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    throw new Error(`Failed to delete time entry: ${res.status}`)
  }
}

/**
 * Fetch effort statistics
 */
export async function fetchEffortStats(accountId: string) {
  const res = await fetch(`${API_BASE}/efforts/stats?account_id=${accountId}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch effort stats: ${res.status}`)
  }
  return res.json() as Promise<EffortStats>
}

export const effortService = {
  fetchEntries: fetchTimeEntries,
  createEntry: createTimeEntry,
  updateEntry: updateTimeEntry,
  deleteEntry: deleteTimeEntry,
  fetchStats: fetchEffortStats,
}
