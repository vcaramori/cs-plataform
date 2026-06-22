'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EffortEditModal } from '@/components/shared/EffortEditModal'
import { toast } from 'sonner'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { EsforcoKPIs } from './EsforcoKPIs'
import { EsforcoTable } from './EsforcoTable'
import { HistoricalImportPanel } from './HistoricalImportPanel'

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
  csm_name?: string | null
  file_urls?: string[] | null
}

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
  const [fileUrls, setFileUrls] = useState<string[]>([])
  const [eventDate, setEventDate] = useState<string>('') // vazio = hoje/IA (carga histórica usa data real)
  const [isOnboarding, setIsOnboarding] = useState(false) // tag "ação de onboarding" (sem rodar o projeto)

  // O filtro de data vive na URL e o SERVIDOR já traz tudo do intervalo. Ao trocar o
  // filtro (router.push → re-render do server component), ressincroniza a lista local.
  useEffect(() => { setEntries(initialEntries) }, [initialEntries])

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
          date: eventDate || undefined,
          is_onboarding: isOnboarding || undefined,
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
      setEventDate('')
      setIsOnboarding(false)
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
          eventDate={eventDate}
          onEventDateChange={setEventDate}
          isOnboarding={isOnboarding}
          onIsOnboardingChange={setIsOnboarding}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />

        {/* Carga histórica de esforços (IA separa por data) */}
        <HistoricalImportPanel accounts={accounts} />

        {/* History Area — o servidor já trouxe tudo do intervalo selecionado */}
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
          onUpdate={(updated) => handleUpdate(updated as unknown as Entry)}
        />
      )}
    </div>
  )
}
