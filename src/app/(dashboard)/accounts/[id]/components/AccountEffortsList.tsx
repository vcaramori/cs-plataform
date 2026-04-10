'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Clock, Eye } from 'lucide-react'
import { format } from 'date-fns'
import { EffortEditModal } from '@/components/shared/EffortEditModal'

const activityLabels: Record<string, string> = {
  meeting: 'Reunião com Cliente',
  onboarding: 'Onboarding / Implantação',
  qbr: 'QBR / Review',
  internal: 'Reunião Interna',
  analysis: 'Análise de Dados',
  report: 'Elaboração de Relatório',
  setup: 'Configuração / Setup',
  other: 'Outro'
}

export function AccountEffortsList({ entries, accounts }: { entries: any[], accounts: { id: string; name: string }[] }) {
  const [localEntries, setLocalEntries] = useState(entries)
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null)

  const handleUpdate = (updated: any) => {
    setLocalEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    setSelectedEntry(updated)
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3 px-6 pt-6">
          <CardTitle className="text-white text-base flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" /> Histórico de Esforços
          </CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="py-3 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Data</th>
                  <th className="py-3 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
                  <th className="py-3 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descrição</th>
                  <th className="py-3 px-2 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">Horas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {localEntries.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-600 text-sm">
                      Nenhum esforço registrado para esta conta.
                    </td>
                  </tr>
                ) : (
                  localEntries.map((e) => (
                    <tr 
                      key={e.id} 
                      onClick={() => setSelectedEntry(e)}
                      className="group hover:bg-slate-800/40 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-2 text-sm text-slate-400 font-medium">
                        {format(new Date(e.date + 'T12:00:00'), 'dd/MM/yyyy')}
                      </td>
                      <td className="py-3 px-2">
                        <Badge className="bg-slate-800/50 text-slate-500 border-slate-700/50 text-[10px] font-medium py-0">
                          {activityLabels[e.activity_type] ?? e.activity_type}
                        </Badge>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2 max-w-[400px]">
                          <p className="text-sm text-slate-200 truncate">{e.parsed_description}</p>
                          <Eye className="w-3.5 h-3.5 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </td>
                      <td className="py-3 px-2 text-sm text-indigo-400 font-bold text-right">
                        {e.parsed_hours}h
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <EffortEditModal 
        entry={selectedEntry}
        onClose={() => setSelectedEntry(null)}
        onUpdate={handleUpdate}
        accounts={accounts}
      />
    </div>
  )
}
