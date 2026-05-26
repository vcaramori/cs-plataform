'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EffortEditModal } from '@/components/shared/EffortEditModal'
import { toast } from 'sonner'
import { useDateRange } from '@/hooks/useDateRange'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { EsforcoKPIs } from './EsforcoKPIs'
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

export function EsforcoClient({
  accounts,
  initialEntries,
}: {
  accounts: Account[]
  initialEntries: Entry[]
}) {
  const router = useRouter()
  const { dateFrom, dateTo } = useDateRange('mtd')
  const [text, setText] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState<string>('all')
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [entries, setEntries] = useState<Entry[]>(initialEntries)
  const [fileUrls, setFileUrls] = useState<string[]>([])

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
          file_urls: fileUrls,
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
      setFileUrls([])
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

  const filteredEntries = entries.filter(e => {
    const d = new Date(e.date ?? e.logged_at)
    return d >= new Date(dateFrom) && d <= new Date(dateTo)
  })

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <DateRangePicker />

      <div className="space-y-8">
        {/* Logger Component */}
        <EsforcoKPIs
          selectedAccountId={selectedAccountId}
          onAccountChange={setSelectedAccountId}
          accounts={accounts}
          text={text}
          onTextChange={setText}
          fileUrls={fileUrls}
          onFileUrlsChange={setFileUrls}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        {/* History Area */}
        <EsforcoTable
          entries={filteredEntries}
          totalHours={filteredEntries.reduce((acc, e) => acc + Number(e.parsed_hours), 0)}
          onSelectEntry={(e: Entry) => setSelectedEntry(e)}
          activityLabels={activityLabels}
        />
      </div>

      {selectedEntry && (
        <EffortEditModal
          entry={selectedEntry}
          accounts={accounts}
          onClose={() => setSelectedEntry(null)}
          onUpdate={(updated) => handleUpdate(updated as unknown as Entry)}
        />
      )}
    </div>
  )
}
