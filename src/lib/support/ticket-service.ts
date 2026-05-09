/**
 * Support Ticket Service - Centralized API calls for support operations
 * Provides abstractions for ticket CRUD, search, bulk operations
 */

export interface SupportTicket {
  id: string
  title: string
  description: string
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  priority: 'low' | 'medium' | 'high' | 'critical'
  category?: string
  account_id: string
  opened_at: string
  resolved_at?: string
  assigned_to?: string
}

const API_BASE = '/api'

/**
 * Fetch a single ticket
 */
export async function fetchTicket(ticketId: string) {
  const res = await fetch(`${API_BASE}/support-tickets/${ticketId}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch ticket: ${res.status}`)
  }
  return res.json() as Promise<SupportTicket>
}

/**
 * Fetch tickets for an account
 */
export async function fetchTickets(
  accountId: string,
  options?: { status?: string; priority?: string; limit?: number }
) {
  const url = new URL(`${API_BASE}/support-tickets`, typeof window !== 'undefined' ? window.location.origin : '')
  url.searchParams.set('account_id', accountId)
  if (options?.status) url.searchParams.set('status', options.status)
  if (options?.priority) url.searchParams.set('priority', options.priority)
  if (options?.limit) url.searchParams.set('limit', options.limit.toString())

  const res = await fetch(url.toString())
  if (!res.ok) {
    throw new Error(`Failed to fetch tickets: ${res.status}`)
  }
  return res.json() as Promise<SupportTicket[]>
}

/**
 * Create a new ticket
 */
export async function createTicket(data: Omit<SupportTicket, 'id' | 'opened_at'>) {
  const res = await fetch(`${API_BASE}/support-tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(`Failed to create ticket: ${res.status}`)
  }
  return res.json() as Promise<SupportTicket>
}

/**
 * Update a ticket
 */
export async function updateTicket(ticketId: string, data: Partial<SupportTicket>) {
  const res = await fetch(`${API_BASE}/support-tickets/${ticketId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(`Failed to update ticket: ${res.status}`)
  }
  return res.json() as Promise<SupportTicket>
}

/**
 * Bulk import tickets
 */
export async function bulkImportTickets(data: { tickets: any[]; source: string }) {
  const res = await fetch(`${API_BASE}/support-tickets/bulk-import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    throw new Error(`Failed to bulk import tickets: ${res.status}`)
  }
  return res.json() as Promise<{ imported: number; failed: number; errors?: string[] }>
}

/**
 * Send a reply to a ticket
 */
export async function replyToTicket(ticketId: string, reply: { body: string; outcome?: string }) {
  const res = await fetch(`${API_BASE}/support-tickets/${ticketId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reply),
  })
  if (!res.ok) {
    throw new Error(`Failed to send reply: ${res.status}`)
  }
  return res.json()
}

export const ticketService = {
  fetch: fetchTicket,
  fetchMany: fetchTickets,
  create: createTicket,
  update: updateTicket,
  bulkImport: bulkImportTickets,
  reply: replyToTicket,
}
