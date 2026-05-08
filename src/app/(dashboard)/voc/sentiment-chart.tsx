'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartProps {
  data: { date: string, score: number }[]
}

export default function SentimentChart({ data }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
        <XAxis 
          dataKey="date" 
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
        />
        <YAxis 
          domain={[-1, 1]} 
          stroke="#888888"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value) => `${value > 0 ? '+' : ''}${value}`}
        />
        <Tooltip 
          contentStyle={{ 
            background: 'hsl(var(--background))', 
            border: '1px solid hsl(var(--border))',
            borderRadius: 'var(--radius)'
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Line 
          type="monotone" 
          dataKey="score" 
          stroke="hsl(var(--primary))" 
          strokeWidth={2} 
          dot={{ r: 4, fill: 'hsl(var(--primary))' }}
          activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
