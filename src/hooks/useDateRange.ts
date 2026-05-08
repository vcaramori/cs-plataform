'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'

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

interface DateRange {
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

function calculateDateRange(period: DateRangePeriod, customFrom?: Date, customTo?: Date): DateRange {
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

export function useDateRange(defaultPeriod: DateRangePeriod = 'mtd') {
  const searchParams = useSearchParams()
  const router = useRouter()

  const period = (searchParams.get('period') as DateRangePeriod) || defaultPeriod
  const customFrom = searchParams.get('from') ? new Date(searchParams.get('from')!) : undefined
  const customTo = searchParams.get('to') ? new Date(searchParams.get('to')!) : undefined

  const dateRange = useMemo(() => {
    return calculateDateRange(period, customFrom, customTo)
  }, [period, customFrom, customTo])

  const setPeriod = useCallback(
    (newPeriod: DateRangePeriod, newFrom?: Date, newTo?: Date) => {
      const params = new URLSearchParams(searchParams)
      params.set('period', newPeriod)

      if (newPeriod === 'custom' && newFrom && newTo) {
        params.set('from', newFrom.toISOString().split('T')[0])
        params.set('to', newTo.toISOString().split('T')[0])
      } else {
        params.delete('from')
        params.delete('to')
      }

      router.push(`?${params.toString()}`)
    },
    [router, searchParams]
  )

  return {
    ...dateRange,
    setPeriod,
    dateFrom: dateRange.from.toISOString(),
    dateTo: dateRange.to.toISOString(),
  }
}
