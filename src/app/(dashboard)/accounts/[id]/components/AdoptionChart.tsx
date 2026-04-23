'use client'

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import { Zap, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Metric {
  measured_at: string
  value: number
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-surface-card border border-border-divider p-3 rounded-xl shadow-2xl">
        <p className="text-[10px] text-content-secondary font-bold uppercase tracking-widest mb-1">{label}</p>
        <div className="flex items-center gap-2">
           <Zap className="w-3.5 h-3.5 text-plannera-operations" />
           <p className="text-sm font-bold text-content-primary">{payload[0].value} <span className="text-[9px] text-content-secondary font-bold uppercase ml-1">Usuários Ativos</span></p>
        </div>
      </div>
    );
  }
  return null;
};

export function AdoptionChart({ metrics }: { metrics: Metric[] }) {
  const data = metrics
    .sort((a, b) => new Date(a.measured_at).getTime() - new Date(b.measured_at).getTime())
    .map(m => ({
      date: new Date(m.measured_at).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase(),
      value: Number(m.value)
    }))

  if (metrics.length === 0) {
    return (
      <Card className="border-dashed p-10 text-center">
        <p className="text-content-secondary text-[10px] font-bold uppercase tracking-widest">Aguardando dados de telemetria</p>
      </Card>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-surface-card border border-border-divider shadow-sm p-6 rounded-2xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
        <TrendingUp className="w-16 h-16 text-plannera-operations" />
      </div>

      <div className="flex items-center justify-between mb-8">
        <div className="space-y-1">
          <h3 className="text-content-primary text-[11px] font-heading font-extrabold uppercase tracking-[0.15em] flex items-center gap-2">
             Volume de Uso
          </h3>
          <p className="text-content-secondary text-[9px] font-bold uppercase tracking-tighter">Telemetria MAU Mensal</p>
        </div>
        <Badge variant="outline" className="bg-plannera-operations/10 text-plannera-operations border-none text-[9px] font-bold uppercase h-5">Real-time Sync</Badge>
      </div>

      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorAdoption" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f8b967" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#f8b967" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="rgba(128,128,128,0.3)"
              fontSize={8}
              fontFamily="var(--font-inter)"
              fontWeight={700}
              tickLine={false}
              axisLine={false}
              dy={10}
            />
            <YAxis
              stroke="rgba(128,128,128,0.3)"
              fontSize={8}
              fontFamily="var(--font-inter)"
              fontWeight={700}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#f8b967"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorAdoption)"
              name="Ativos"
              animationDuration={2000}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex items-center justify-center gap-6">
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-plannera-operations shadow-[0_0_8px_rgba(248,185,103,0.5)]" />
           <span className="text-[10px] text-content-secondary font-bold uppercase tracking-widest">Adoção Estável</span>
        </div>
      </div>
    </motion.div>
  )
}
