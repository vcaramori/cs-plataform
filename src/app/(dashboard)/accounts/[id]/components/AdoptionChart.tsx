'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'

interface Metric {
  measured_at: string
  value: number
}

export function AdoptionChart({ metrics }: { metrics: Metric[] }) {
  const data = metrics
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
    .map(m => ({
      date: new Date(m.measured_at).toLocaleDateString('pt-BR', { month: 'short' }),
      value: Number(m.value)
    }))

  if (metrics.length === 0) {
    return (
      <Card className="bg-slate-900/40 border-slate-800 border-dashed p-6 text-center">
        <p className="text-slate-600 text-xs">Aguardando dados de adoção do produto.</p>
      </Card>
    )
  }

  return (
    <div className="h-[180px] w-full mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis 
            dataKey="date" 
            stroke="#475569" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
          />
          <YAxis 
            stroke="#475569" 
            fontSize={10} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(val) => `${val}`}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }}
            itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke="#6366f1" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorValue)" 
            name="Ativos"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
