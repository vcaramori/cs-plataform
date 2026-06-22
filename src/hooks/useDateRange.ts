'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useCallback, useMemo } from 'react'
import { calculateDateRange, type DateRangePeriod } from '@/lib/date-range'

export type { DateRangePeriod } from '@/lib/date-range'

export function useDateRange(defaultPeriod: DateRangePeriod = '30d') {
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
