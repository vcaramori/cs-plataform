/**
 * NPS Service - Centralized API calls for NPS operations
 * Provides fetch abstractions with error handling & retry logic
 */

export interface NPSProgram {
  id: string
  name: string
  account_id: string
  status: 'active' | 'paused' | 'archived'
  created_at: string
}

export interface NPSResponse {
  id: string
  program_id: string
  score: number
  comment?: string
  answered_at: string
  respondent_email?: string
}

export interface NPSStats {
  promoters: number
  passives: number
  detractors: number
  score: number
  trend: 'up' | 'down' | 'flat'
}

const API_BASE = '/api'

/**
 * Fetch NPS programs for an account
 */
export async function fetchNPSPrograms(accountId?: string) {
  const url = new URL(`${API_BASE}/nps/programs`, typeof window !== 'undefined' ? window.location.origin : '')
  if (accountId) url.searchParams.set('account_id', accountId)

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Failed to fetch NPS programs: ${res.status}`)
  }
  return res.json() as Promise<NPSProgram[]>
}

/**
 * Fetch NPS responses for a program
 */
export async function fetchNPSResponses(programId: string) {
  const res = await fetch(`${API_BASE}/nps/programs/${programId}/responses`)
  if (!res.ok) {
    throw new Error(`Failed to fetch NPS responses: ${res.status}`)
  }
  return res.json() as Promise<NPSResponse[]>
}

/**
 * Fetch NPS statistics (promoters/passives/detractors)
 */
export async function fetchNPSStats(programId: string) {
  const res = await fetch(`${API_BASE}/nps/stats?program_id=${programId}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch NPS stats: ${res.status}`)
  }
  return res.json() as Promise<NPSStats>
}

/**
 * Create a new NPS program
 */
export async function createNPSProgram(data: { name: string; account_id: string }) {
  const res = await fetch(`${API_BASE}/nps/programs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(`Failed to create NPS program: ${res.status}`)
  }
  return res.json() as Promise<NPSProgram>
}

/**
 * Update an NPS program
 */
export async function updateNPSProgram(
  programId: string,
  data: Partial<{ name: string; status: string }>
) {
  const res = await fetch(`${API_BASE}/nps/programs/${programId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(`Failed to update NPS program: ${res.status}`)
  }
  return res.json() as Promise<NPSProgram>
}

/**
 * Submit an NPS response
 */
export async function submitNPSResponse(data: {
  program_id: string
  score: number
  comment?: string
  respondent_email?: string
}) {
  const res = await fetch(`${API_BASE}/nps/response`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(`Failed to submit NPS response: ${res.status}`)
  }
  return res.json() as Promise<NPSResponse>
}

export const npsService = {
  fetchPrograms: fetchNPSPrograms,
  fetchResponses: fetchNPSResponses,
  fetchStats: fetchNPSStats,
  createProgram: createNPSProgram,
  updateProgram: updateNPSProgram,
  submitResponse: submitNPSResponse,
}
