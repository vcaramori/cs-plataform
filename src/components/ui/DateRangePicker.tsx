'use client'

import { useDateRange, DateRangePeriod } from '@/hooks/useDateRange'
import { Button } from './button'
import { CalendarRange } from 'lucide-react'

interface DateRangePickerProps {
  onPeriodChange?: (period: DateRangePeriod) => void
}

export function DateRangePicker({ onPeriodChange }: DateRangePickerProps) {
  const { period, setPeriod } = useDateRange()

  const periods: { value: DateRangePeriod; label: string }[] = [
    { value: 'today', label: 'Hoje' },
    { value: '7d', label: '7 dias' },
    { value: '30d', label: '30 dias' },
    { value: '90d', label: '90 dias' },
    { value: 'mtd', label: 'MTD' },
    { value: 'last_month', label: 'Mês anterior' },
    { value: 'qtd', label: 'QTD' },
    { value: 'ytd', label: 'YTD' },
    { value: 'last_year', label: 'Ano anterior' },
  ]

  const handlePeriodChange = (newPeriod: DateRangePeriod) => {
    setPeriod(newPeriod)
    onPeriodChange?.(newPeriod)
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-surface-card rounded-lg border border-border-divider">
      <CalendarRange className="w-4 h-4 text-content-secondary" />
      <div className="flex flex-wrap gap-1">
        {periods.map((p) => (
          <Button
            key={p.value}
            variant={period === p.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => handlePeriodChange(p.value)}
            className="text-xs"
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
