'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Clock, Loader2, Sparkles, ChevronDown } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const activityLabels: Record<string, string> = {
  preparation: 'Preparação de material',
  'environment-analysis': 'Análise de ambiente',
  strategy: 'Estratégia',
  reporting: 'Relatório',
  'internal-meeting': 'Reunião interna',
  other: 'Outro',
}

type Account = { id: string; name: string }
type Entry = {
  id: string
  account_id: string
  activity_type: string
  natural_language_input: string
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
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
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
          account_id: selectedAccountId || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 422 && data.parsed) {
          toast.error(`Conta não identificada. Selecione a conta manualmente.`)
        } else {
          toast.error(data.error ?? 'Erro ao registrar')
        }
        return
      }

      toast.success(
        `${data.parsed_hours}h registrada — ${activityLabels[data.activity_type] ?? data.activity_type}`
      )
      setText('')
      setSelectedAccountId('')
      router.refresh()

      // Adiciona ao topo da lista local para feedback imediato
      setEntries((prev) => [data, ...prev].slice(0, 50))
    } finally {
      setIsSubmitting(false)
    }
  }

  // Agrupa horas por conta para o totalizador
  const totalsByAccount = entries.reduce<Record<string, { name: string; hours: number }>>(
    (acc, e) => {
      const name = e.accounts?.name ?? 'Conta removida'
      if (!acc[e.account_id]) acc[e.account_id] = { name, hours: 0 }
      acc[e.account_id].hours += Number(e.parsed_hours)
      return acc
    },
    {}
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Formulário */}
      <div className="lg:col-span-2 space-y-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Log de Esforço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">
                Conta <span className="text-slate-500">(opcional — pode mencionar no texto)</span>
              </Label>
              <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Selecionar conta..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-white hover:bg-slate-700">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">O que você fez?</Label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ex: Passei 2h preparando o deck de QBR para a Empresa X..."
                rows={4}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
              />
            </div>

            {/* Exemplos */}
            <div className="space-y-1.5">
              <p className="text-slate-500 text-xs flex items-center gap-1">
                <ChevronDown className="w-3 h-3" /> Exemplos
              </p>
              <div className="flex flex-wrap gap-2">
                {examples.map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => setText(ex)}
                    className="text-xs text-slate-400 hover:text-indigo-300 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-md transition-colors text-left"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !text.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processando com IA...</>
              ) : (
                'Registrar Esforço'
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Totalizador por conta */}
      <div>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-sm flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              Horas Indiretas (histórico)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.values(totalsByAccount).length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">Nenhum registro ainda</p>
            ) : (
              Object.values(totalsByAccount)
                .sort((a, b) => b.hours - a.hours)
                .map((t) => (
                  <div key={t.name} className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <span className="text-slate-300 text-sm truncate">{t.name}</span>
                    <Badge className="bg-indigo-500/20 text-indigo-300 ml-2 flex-shrink-0">
                      {t.hours.toFixed(1)}h
                    </Badge>
                  </div>
                ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de entradas recentes */}
      <div className="lg:col-span-3">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              Entradas Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {entries.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">
                Nenhum esforço registrado ainda. Use o formulário acima para começar.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left text-slate-400 font-medium pb-2 pr-4">Conta</th>
                      <th className="text-left text-slate-400 font-medium pb-2 pr-4">Atividade</th>
                      <th className="text-left text-slate-400 font-medium pb-2 pr-4">Descrição</th>
                      <th className="text-center text-slate-400 font-medium pb-2 pr-4">Horas</th>
                      <th className="text-left text-slate-400 font-medium pb-2">Data</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {entries.map((e) => (
                      <tr key={e.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 pr-4 text-white font-medium">
                          {e.accounts?.name ?? '—'}
                        </td>
                        <td className="py-2.5 pr-4">
                          <Badge className="bg-slate-700/60 text-slate-300 text-xs">
                            {activityLabels[e.activity_type] ?? e.activity_type}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-300 max-w-xs truncate">
                          {e.parsed_description}
                        </td>
                        <td className="py-2.5 pr-4 text-center">
                          <Badge className="bg-indigo-500/20 text-indigo-300">
                            {Number(e.parsed_hours).toFixed(1)}h
                          </Badge>
                        </td>
                        <td className="py-2.5 text-slate-400 text-xs whitespace-nowrap">
                          {format(new Date(e.date + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
