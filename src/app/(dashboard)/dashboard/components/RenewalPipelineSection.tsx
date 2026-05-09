'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function RenewalPipelineSection() {
  const { data: renewalData } = useQuery({
    queryKey: ['renewal-pipeline'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/renewal-pipeline')
      return res.json()
    },
  })

  if (!renewalData?.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pipeline de Renovações</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-96" />
        </CardContent>
      </Card>
    )
  }

  const { critical = [], urgent = [], planning = [] } = renewalData.data

  const Column = ({ title, items, color }: any) => (
    <div className="flex-1">
      <div className={`text-sm font-bold mb-3 px-3 py-2 rounded ${color}`}>
        {title} ({items.length})
      </div>
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {items.map((item: any) => (
          <Link
            key={item.id}
            href={`/accounts/${item.account_id}/renewal`}
            className={`p-3 rounded border-l-4 bg-white hover:shadow-md transition cursor-pointer ${
              color.includes('red') ? 'border-l-red-500' :
              color.includes('amber') ? 'border-l-amber-500' :
              'border-l-blue-500'
            }`}
          >
            <p className="font-medium text-sm text-content-primary">{item.account_name}</p>
            <p className="text-xs text-content-secondary mt-1">
              ARR: ${item.arr.toLocaleString()}
            </p>
            <div className={`text-xs font-bold mt-2 inline-block px-2 py-1 rounded ${
              item.readiness_color === 'green' ? 'bg-emerald-100 text-emerald-800' :
              item.readiness_color === 'yellow' ? 'bg-amber-100 text-amber-800' :
              'bg-red-100 text-red-800'
            }`}>
              {item.health_score}% health • {item.nps || 'N/A'} NPS
            </div>
          </Link>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-content-secondary text-center py-4">Nenhuma conta</p>
        )}
      </div>
    </div>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline de Renovações</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4">
          <Column
            title="🔴 Crítico (<30d)"
            items={critical}
            color="bg-red-100"
          />
          <Column
            title="🟡 Urgente (30-60d)"
            items={urgent}
            color="bg-amber-100"
          />
          <Column
            title="🔵 Planejamento (60-90d)"
            items={planning}
            color="bg-blue-100"
          />
        </div>
      </CardContent>
    </Card>
  )
}
