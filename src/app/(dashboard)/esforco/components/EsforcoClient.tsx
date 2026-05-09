'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EffortEditModal } from '@/components/shared/EffortEditModal'
import { toast } from 'sonner'
import { EsforcoKPIs } from './EsforcoKPIs'
import { EsforcoChart } from './EsforcoChart'
import { EsforcoTable } from './EsforcoTable'

const activityLabels: Record<string, string> = {
  preparation: 'Preparação de material',
  'environment-analysis': 'Análise de ambiente',
  strategy: 'Estratégia',
  reporting: 'Relatório',
  'internal-meeting': 'Reunião interna',
  meeting: 'Reunião com cliente',
  onboarding: 'Implantação / Onboarding',
  qbr: 'QBR / Sucesso',
  other: 'Outro',
}

type Account = { id: string; name: string }
export type Entry = {
  id: string
  account_id: string
  csm_id: string
  activity_type: string
  natural_language_input?: string
  parsed_hours: number
  parsed_description: string
  date: string
  logged_at: string
  accounts: { name: string } | null
}

const examples = [
  'Passei 2h preparando o deck de QBR para a Empresa X',
  'Analisei os logs de erro por 45min para entender o problema da Empresa Y',
  'Reunião interna de 30min para alinhar estratégia de renovação',
  '1h30 gerando relatório de esforço mensal',
]

export function EsforcoClient({
  accounts,
  initialEntries,
}: {
  accounts: Account[]
  initialEntries: Entry[]
}) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entries, setEntries] = useState<Entry[]>(initialEntries)

  async function handleSubmit() {
    if (!text.trim()) {
      toast.error('Digite o que você fez')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/time-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raw_text: text,
          account_id: selectedAccountId !== 'all' ? selectedAccountId : undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 422 && data.parsed) {
          toast.error(`LOGO não identificado. Selecione o LOGO manualmente.`)
        } else {
          toast.error(data.error ?? 'Erro ao registrar')
        }
        return
      }

      toast.success(
        `${data.parsed_hours}h registrada — ${activityLabels[data.activity_type] ?? data.activity_type}`
      )
      setText('')
      setSelectedAccountId('all')
      router.refresh()

      // Adiciona ao topo da lista local para feedback imediato
      setEntries((prev) => [data, ...prev].slice(0, 50))
    } catch (err) {
      console.error('Error submitting entry:', err)
      toast.error('Erro ao registrar atividade')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUpdate = (updated: Entry) => {
    setEntries(prev => prev.map(e => e.id === updated.id ? updated : e))
    setSelectedEntry(updated)
  }

  // Agrupa horas por conta
  const totalsByAccount = entries.reduce<Record<string, { name: string; hours: number }>>(
    (acc, e) => {
      const name = e.accounts?.name ?? 'LOGO removido'
      if (!acc[e.account_id]) acc[e.account_id] = { name, hours: 0 }
      acc[e.account_id].hours += Number(e.parsed_hours)
      return acc
    },
    {}
  )

  const sortedAccounts = Object.values(totalsByAccount).sort((a, b) => b.hours - a.hours)
  const totalHours = sortedAccounts.reduce((acc, curr) => acc + curr.hours, 0)

  // Pareto Data
  let cumulativeHours = 0
  const paretoData = sortedAccounts.map(acc => {
    cumulativeHours += acc.hours
    return {
      ...acc,
      percentage: (acc.hours / totalHours) * 100,
      cumulativePercentage: (cumulativeHours / totalHours) * 100
    }
  })

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-in fade-in duration-700">
      {/* Logger Column */}
      <div className="lg:col-span-3 space-y-8">
        <EsforcoKPIs
          selectedAccountId={selectedAccountId}
          onAccountChange={setSelectedAccountId}
          accounts={accounts}
          text={text}
          onTextChange={setText}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          examples={examples}
        />
      </div>

      {/* Telemetry Column */}
      <div className="lg:col-span-1 h-full">
        <EsforcoChart paretoData={paretoData} />
      </div>

      {/* History Area */}
      <div className="lg:col-span-4 mt-8">
        <EsforcoTable
          entries={entries}
          totalHours={entries.reduce((acc, e) => acc + Number(e.parsed_hours), 0)}
          onSelectEntry={(e: Entry) => setSelectedEntry(e)}
          activityLabels={activityLabels}
        />
      </div>

      {selectedEntry && (
        <EffortEditModal
          entry={selectedEntry}
          accounts={accounts}
          onClose={() => setSelectedEntry(null)}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  )
}
