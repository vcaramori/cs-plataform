/**
 * Voice of Customer Service - Centralized API calls for VoC analysis
 */

export interface VOCTheme {
  id: string
  theme: string
  frequency: number
  sentiment: 'positive' | 'neutral' | 'negative'
  examples: string[]
}

export interface VOCTrend {
  date: string
  sentiment_score: number
  theme: string
  volume: number
}

export interface VOCQuote {
  id: string
  source_type: 'support_ticket' | 'interaction' | 'survey'
  source_id: string
  quote: string
  sentiment: 'positive' | 'neutral' | 'negative'
  date: string
}

const API_BASE = '/api'

/**
 * Fetch sentiment trends for an account
 */
export async function fetchSentimentTrends(accountId: string, daysBack: number = 90) {
  const res = await fetch(`${API_BASE}/voc/trends?account_id=${accountId}&days=${daysBack}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch sentiment trends: ${res.status}`)
  }
  return res.json() as Promise<VOCTrend[]>
}

/**
 * Fetch VOC themes
 */
export async function fetchVOCThemes(accountId: string) {
  const res = await fetch(`${API_BASE}/voc/themes?account_id=${accountId}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch VOC themes: ${res.status}`)
  }
  return res.json() as Promise<VOCTheme[]>
}

/**
 * Fetch VOC quotes
 */
export async function fetchVOCQuotes(accountId: string, limit: number = 10) {
  const res = await fetch(`${API_BASE}/voc/quotes?account_id=${accountId}&limit=${limit}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch VOC quotes: ${res.status}`)
  }
  return res.json() as Promise<VOCQuote[]>
}

/**
 * Get overall sentiment score
 */
export async function fetchOverallSentiment(accountId: string) {
  const res = await fetch(`${API_BASE}/voc/sentiment?account_id=${accountId}`)
  if (!res.ok) {
    throw new Error(`Failed to fetch overall sentiment: ${res.status}`)
  }
  return res.json() as Promise<{ score: number; trend: 'up' | 'down' | 'flat' }>
}

export const vocService = {
  fetchTrends: fetchSentimentTrends,
  fetchThemes: fetchVOCThemes,
  fetchQuotes: fetchVOCQuotes,
  fetchSentiment: fetchOverallSentiment,
}
