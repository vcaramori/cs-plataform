'use client'

import { MessageSquare, Star, TicketCheck, SmilePlus } from 'lucide-react'
import type { Polarity, VocSource } from '@/lib/voc/portfolio-voc'

export const SOURCE_META: Record<VocSource, { label: string; icon: typeof MessageSquare }> = {
  interaction: { label: 'Reuniões / Interações', icon: MessageSquare },
  nps: { label: 'NPS', icon: Star },
  support: { label: 'Suporte', icon: TicketCheck },
  csat: { label: 'CSAT', icon: SmilePlus },
}

export const POLARITY_META: Record<Polarity, { label: string; emoji: string; text: string; bg: string; dot: string }> = {
  positive: { label: 'Positivo', emoji: '👍', text: 'text-emerald-500', bg: 'bg-emerald-500/15', dot: 'bg-emerald-500' },
  neutral: { label: 'Neutro', emoji: '💭', text: 'text-content-secondary', bg: 'bg-content-secondary/15', dot: 'bg-content-secondary/40' },
  negative: { label: 'Negativo', emoji: '👎', text: 'text-red-500', bg: 'bg-red-500/15', dot: 'bg-red-500' },
}

export function indexColor(idx: number): 'emerald' | 'demand' | 'orange' {
  if (idx > 30) return 'emerald'
  if (idx < -30) return 'demand'
  return 'orange'
}

export function dominantPolarity(a: { positive: number; neutral: number; negative: number }): Polarity {
  if (a.negative >= a.positive && a.negative >= a.neutral) return 'negative'
  if (a.positive >= a.neutral) return 'positive'
  return 'neutral'
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR')
}

/** Normaliza uma citação para {q, by} — tolera string (legado) e {q,by}/{quote,speaker}. */
export function asQuote(x: unknown): { q: string; by: string | null } {
  if (typeof x === 'string') return { q: x, by: null }
  if (x && typeof x === 'object') {
    const o = x as Record<string, unknown>
    const by = o.by ?? o.speaker
    return { q: String(o.q ?? o.quote ?? ''), by: by ? String(by) : null }
  }
  return { q: '', by: null }
}
