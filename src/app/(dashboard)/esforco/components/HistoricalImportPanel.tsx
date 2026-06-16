'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2, History, Sparkles, CalendarDays, AlertTriangle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

type Account = { id: string; name: string }
type ActionItem = { title: string; due_date: string | null }
type Entry = {
  date: string
  raw_text: string
  parsed_description: string
  activity_type: string
  parsed_hours: number
  account_name_hint: string | null
  action_items: ActionItem[]
  skip_tasks: boolean
}
type WarningCode = 'truncated' | 'invalid_date' | 'future_date' | 'duplicate'
type Warning = { level: 'error' | 'warning'; code: WarningCode; message: string; entryIndexes: number[] }

const ISSUE_LABEL: Record<WarningCode, string> = {
  truncated: 'truncado',
  invalid_date: 'data inválida',
  future_date: 'data futura',
  duplicate: 'duplicada',
}

export function HistoricalImportPanel({ accounts }: { accounts: Account[] }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [accountId, setAccountId] = useState('')
  const [createTasks, setCreateTasks] = useState(true)
  const [entries, setEntries] = useState<Entry[] | null>(null)
  const [warnings, setWarnings] = useState<Warning[]>([])
  const [excluded, setExcluded] = useState<Set<number>>(new Set())
  const [analyzing, setAnalyzing] = useState(false)
  const [committing, setCommitting] = useState(false)

  // índice → { level, codes } das entradas sinalizadas na validação
  const entryIssues = useMemo(() => {
    const m = new Map<number, { level: 'error' | 'warning'; codes: WarningCode[] }>()
    for (const w of warnings) {
      for (const idx of w.entryIndexes) {
        const cur = m.get(idx) ?? { level: 'warning' as const, codes: [] }
        cur.codes.push(w.code)
        if (w.level === 'error') cur.level = 'error'
        m.set(idx, cur)
      }
    }
    return m
  }, [warnings])

  const includedCount = entries ? entries.length - excluded.size : 0

  async function analyze() {
    if (text.trim().length < 10) { toast.error('Cole o texto com as reuniões.'); return }
    setAnalyzing(true)
    try {
      const res = await fetch('/api/time-entries/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'preview', text }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error ?? 'Falha ao analisar.')
      if (!d.entries?.length) { toast.error('Nenhuma reunião identificada no texto.'); return }
      const w: Warning[] = d.warnings ?? []
      setEntries(d.entries)
      setWarnings(w)
      // desmarca por padrão tudo que tem erro (ex.: data inválida) e duplicatas
      const offByDefault = w
        .filter(x => x.level === 'error' || x.code === 'duplicate')
        .flatMap(x => x.entryIndexes)
      setExcluded(new Set(offByDefault))
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao analisar.')
    } finally {
      setAnalyzing(false)
    }
  }

  async function commit() {
    if (!accountId) { toast.error('Selecione o LOGO.'); return }
    if (!entries?.length) return
    const toSave = entries.filter((_, i) => !excluded.has(i))
    if (!toSave.length) { toast.error('Nenhuma reunião marcada para importar.'); return }
    setCommitting(true)
    try {
      const res = await fetch('/api/time-entries/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: 'commit', account_id: accountId, create_tasks: createTasks, entries: toSave }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(typeof d.error === 'string' ? d.error : 'Falha ao salvar.')
      toast.success(`${d.saved} esforço(s) carregado(s)${d.tasksCreated ? ` · ${d.tasksCreated} tarefa(s)` : ''}`)
      if (d.errors?.length) toast.error(`${d.errors.length} entrada(s) com erro`)
      setText(''); setEntries(null); setWarnings([]); setExcluded(new Set()); setAccountId('')
      router.refresh()
    } catch (e: any) {
      toast.error(e?.message ?? 'Falha ao salvar.')
    } finally {
      setCommitting(false)
    }
  }

  function toggleSkip(i: number) {
    setEntries(prev => prev ? prev.map((e, idx) => (idx === i ? { ...e, skip_tasks: !e.skip_tasks } : e)) : prev)
  }

  function toggleExclude(i: number) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-content-secondary hover:text-plannera-orange transition-colors"
      >
        <History className="w-3.5 h-3.5" /> Carga histórica de esforços
      </button>
    )
  }

  return (
    <Card className="p-5 space-y-4 border-plannera-orange/20">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-plannera-orange" />
          <h3 className="text-sm font-black uppercase tracking-tight">Carga histórica de esforços</h3>
        </div>
        <button
          onClick={() => { setOpen(false); setEntries(null) }}
          className="text-[10px] uppercase font-bold text-content-secondary hover:text-content-primary"
        >
          Fechar
        </button>
      </div>
      <p className="text-xs text-content-secondary">
        Cole um texto com várias reuniões (cada uma com sua data). A IA separa por data e registra cada esforço com a data real.
        Se o texto pedir para não registrar atividades de alguma reunião, isso é respeitado.
      </p>

      <div className="w-72">
        <SearchableSelect
          value={accountId}
          onValueChange={setAccountId}
          options={accounts.map(a => ({ label: a.name.toUpperCase(), value: a.id }))}
        />
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder="Ex.: 12/03 - Reunião de kickoff com a diretoria... | 28/03 - GT de configuração da ferramenta... | 05/04 - Treinamento (apenas histórico, não registrar atividades)..."
        className="w-full min-h-[140px] rounded-xl border border-border-divider bg-surface-background p-3 text-sm text-content-primary"
      />

      <div className="flex items-center gap-3 flex-wrap">
        <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-content-secondary">
          <input type="checkbox" checked={createTasks} onChange={e => setCreateTasks(e.target.checked)} />
          Criar atividades dos action items
        </label>
        <Button onClick={analyze} disabled={analyzing} size="sm" className="ml-auto gap-2">
          {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Analisar
        </Button>
      </div>

      {entries && (
        <div className="space-y-2 pt-3 border-t border-border-divider">
          {warnings.length > 0 && (
            <div className="space-y-1.5">
              {warnings.map((w, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 rounded-lg border p-2.5 text-[11px] leading-snug ${
                    w.level === 'error'
                      ? 'border-red-500/30 bg-red-500/10 text-red-400'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                  }`}
                >
                  {w.level === 'error'
                    ? <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    : <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />}
                  <span>{w.message}</span>
                </div>
              ))}
            </div>
          )}

          <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">
            {entries.length} detectado(s) · {includedCount} marcado(s) para importar — revise antes de confirmar
          </p>
          {entries.map((e, i) => {
            const issue = entryIssues.get(i)
            const isExcluded = excluded.has(i)
            return (
              <div
                key={i}
                className={`rounded-lg border p-3 transition-opacity ${
                  issue?.level === 'error' ? 'border-red-500/30' : 'border-border-divider'
                } ${isExcluded ? 'opacity-50' : ''} bg-surface-background`}
              >
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-content-secondary cursor-pointer">
                    <input type="checkbox" checked={!isExcluded} onChange={() => toggleExclude(i)} />
                    Importar
                  </label>
                  <Badge variant="outline" className="text-[9px] gap-1"><CalendarDays className="w-3 h-3" />{e.date}</Badge>
                  <Badge variant="outline" className="text-[9px] uppercase">{e.activity_type}</Badge>
                  <span className="text-[10px] text-content-secondary">{e.parsed_hours}h</span>
                  {issue?.codes.map(code => (
                    <Badge
                      key={code}
                      variant="outline"
                      className={`text-[9px] uppercase ${
                        issue.level === 'error'
                          ? 'border-red-500/40 text-red-400'
                          : 'border-amber-500/40 text-amber-400'
                      }`}
                    >
                      {ISSUE_LABEL[code]}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-content-primary">{e.parsed_description}</p>
                {e.action_items.length > 0 ? (
                  <label className="mt-2 flex items-start gap-2 text-[10px] font-bold text-content-secondary cursor-pointer">
                    <input type="checkbox" checked={!e.skip_tasks} onChange={() => toggleSkip(i)} className="mt-0.5" disabled={isExcluded} />
                    <span>Criar {e.action_items.length} atividade(s): {e.action_items.map(a => a.title).join('; ')}</span>
                  </label>
                ) : (
                  <p className="text-[10px] text-content-secondary/60 mt-1">Sem atividades</p>
                )}
              </div>
            )
          })}
          <Button onClick={commit} disabled={committing || !accountId || includedCount === 0} className="w-full gap-2 mt-2">
            {committing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Confirmar carga ({includedCount})
          </Button>
        </div>
      )}
    </Card>
  )
}
