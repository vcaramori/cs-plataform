'use client'

import { Card } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, CartesianGrid,
} from 'recharts'
import type { CockpitData, Distribution } from './risk-types'

function DistBar({ title, data, empty }: { title: string; data: Distribution[]; empty: string }) {
  return (
    <Card className="p-4 border-border-divider">
      <p className="font-bold text-sm text-content-primary mb-2">{title}</p>
      {data.length === 0 ? (
        <p className="text-xs text-content-secondary py-6 text-center">{empty}</p>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(120, data.length * 38)}>
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
            <XAxis type="number" hide allowDecimals={false} />
            <YAxis type="category" dataKey="label" width={110} tick={{ fontSize: 11 }} />
            <Tooltip cursor={{ fill: 'rgba(148,163,184,0.1)' }} formatter={(v: any) => [`${v} conta(s)`, 'Em risco']} />
            <Bar dataKey="count" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

export function RiskDistributions({ data, showOwner }: { data: CockpitData; showOwner: boolean }) {
  const maxDriver = Math.max(1, ...data.byDriver.map(d => d.count))
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <DistBar title="Risco por segmento" data={data.bySegment} empty="Sem dados de segmento." />
      {showOwner && <DistBar title="Risco por CSM" data={data.byOwner} empty="Sem dados por responsável." />}

      {/* Principais motivos (drivers) */}
      <Card className="p-4 border-border-divider">
        <p className="font-bold text-sm text-content-primary mb-2">Principais motivos de risco</p>
        {data.byDriver.length === 0 ? (
          <p className="text-xs text-content-secondary py-6 text-center">Sem motivos — portfólio saudável.</p>
        ) : (
          <div className="space-y-2">
            {data.byDriver.map(d => (
              <div key={d.label} className="space-y-0.5">
                <div className="flex justify-between text-[11px]"><span className="text-content-primary">{d.label}</span><span className="text-content-secondary font-bold">{d.count}</span></div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden"><div className="h-full bg-amber-500" style={{ width: `${(d.count / maxDriver) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tendência de sinais de risco */}
      <Card className="p-4 border-border-divider">
        <p className="font-bold text-sm text-content-primary mb-2">Tendência de sinais de risco</p>
        {data.trend.length < 2 ? (
          <p className="text-xs text-content-secondary py-6 text-center">Histórico insuficiente — a curva cresce ao longo do tempo.</p>
        ) : (
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={data.trend} margin={{ left: 0, right: 8, top: 6, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border-divider" />
              <XAxis dataKey="week" tick={{ fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} width={24} />
              <Tooltip formatter={(v: any) => [`${v} sinal(is)`, 'Risco']} />
              <Area type="monotone" dataKey="signals" stroke="#ef4444" fill="#ef4444" fillOpacity={0.15} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  )
}
