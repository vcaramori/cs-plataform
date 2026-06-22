// Lógica PURA de intervalos de data (sem 'use client') — compartilhada entre o hook
// useDateRange (cliente) e Server Components que precisam respeitar o mesmo filtro da URL.

export type DateRangePeriod =
  | 'today'
  | '7d'
  | '30d'
  | '90d'
  | 'mtd' // Month-to-date
  | 'last_month'
  | 'qtd' // Quarter-to-date
  | 'ytd' // Year-to-date
  | 'last_year'
  | 'custom'

export interface DateRange {
  from: Date
  to: Date
  label: string
  period: DateRangePeriod
}

const MONTH_START = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)
const MONTH_END = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0)
const QUARTER_START = (d: Date) => {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3, 1)
}
const QUARTER_END = (d: Date) => {
  const q = Math.floor(d.getMonth() / 3)
  return new Date(d.getFullYear(), q * 3 + 3, 0)
}
const YEAR_START = (d: Date) => new Date(d.getFullYear(), 0, 1)
const YEAR_END = (d: Date) => new Date(d.getFullYear(), 11, 31)

export function calculateDateRange(period: DateRangePeriod, customFrom?: Date, customTo?: Date): DateRange {
  const now = new Date()
  now.setHours(23, 59, 59, 999)

  switch (period) {
    case 'today': {
      const today = new Date(now)
      today.setHours(0, 0, 0, 0)
      return { from: today, to: now, label: 'Hoje', period: 'today' }
    }
    case '7d': {
      const from = new Date(now)
      from.setDate(from.getDate() - 7)
      return { from, to: now, label: 'Últimos 7 dias', period: '7d' }
    }
    case '30d': {
      const from = new Date(now)
      from.setDate(from.getDate() - 30)
      return { from, to: now, label: 'Últimos 30 dias', period: '30d' }
    }
    case '90d': {
      const from = new Date(now)
      from.setDate(from.getDate() - 90)
      return { from, to: now, label: 'Últimos 90 dias', period: '90d' }
    }
    case 'mtd': {
      const from = MONTH_START(now)
      return { from, to: now, label: 'Mês atual', period: 'mtd' }
    }
    case 'last_month': {
      const lastMonth = new Date(now)
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      const from = MONTH_START(lastMonth)
      const to = MONTH_END(lastMonth)
      return { from, to, label: 'Mês anterior', period: 'last_month' }
    }
    case 'qtd': {
      const from = QUARTER_START(now)
      return { from, to: now, label: 'Trimestre atual', period: 'qtd' }
    }
    case 'ytd': {
      const from = YEAR_START(now)
      return { from, to: now, label: 'Ano atual', period: 'ytd' }
    }
    case 'last_year': {
      const lastYear = new Date(now)
      lastYear.setFullYear(lastYear.getFullYear() - 1)
      const from = YEAR_START(lastYear)
      const to = YEAR_END(lastYear)
      return { from, to, label: 'Ano anterior', period: 'last_year' }
    }
    case 'custom': {
      return {
        from: customFrom || new Date(now.getFullYear(), now.getMonth(), 1),
        to: customTo || now,
        label: 'Personalizado',
        period: 'custom',
      }
    }
    default:
      return { from: MONTH_START(now), to: now, label: 'Mês atual', period: 'mtd' }
  }
}

/** Data local YYYY-MM-DD (para comparar com colunas DATE). */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
