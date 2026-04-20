'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ListChecks, AlignLeft, Hash, ToggleLeft, ToggleRight, Pencil,
  Play, StopCircle, CalendarRange, BookmarkCheck, Bookmark,
  Power, PowerOff, AlertTriangle, Building2, Globe, Trash2, GripVertical, ChevronUp, ChevronDown, Check, Plus, Copy,
  ArrowLeft, Target
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import type { NPSQuestion, NPSQuestionType } from '@/lib/supabase/types'
import Link from 'next/link'

interface Props {
  accounts: { id: string; name: string }[]
}

const TYPE_META: Record<NPSQuestionType, { label: string; icon: React.ElementType; color: string }> = {
  nps_scale:        { label: 'NPS 0–10',        icon: Hash,       color: 'text-orange-400 border-orange-500/20 bg-orange-500/10' },
  multiple_choice:  { label: 'Múltipla Escolha', icon: ListChecks, color: 'text-indigo-400 border-indigo-500/20 bg-indigo-500/10'  },
  text:             { label: 'Texto Livre',       icon: AlignLeft,  color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' },
}

// ─── Question Row ────────────────────────────────────────────────────────────

function QuestionRow({
  q, index, total, programId, onSaved, onDeleted,
}: {
  q: NPSQuestion; index: number; total: number
  programId: string; onSaved: () => void; onDeleted: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(q.title)
  const [required, setRequired] = useState(q.required)
  const [options, setOptions] = useState<string[]>(q.options ?? [])
  const [newOption, setNewOption] = useState('')
  const [saving, setSaving] = useState(false)
  const meta = TYPE_META[q.type]

  async function save() {
    setSaving(true)
    const res = await fetch(`/api/nps/programs/${programId}/questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, required, options: q.type === 'multiple_choice' ? options : undefined }),
    })
    setSaving(false)
    if (res.ok) { setEditing(false); onSaved() }
    else toast.error('Erro ao salvar pergunta')
  }

  async function del() {
    if (!confirm(`Remover pergunta "${q.title}"?`)) return
    const res = await fetch(`/api/nps/programs/${programId}/questions/${q.id}`, { method: 'DELETE' })
    if (res.ok) onDeleted()
    else toast.error('Erro ao remover pergunta')
  }

  async function move(dir: -1 | 1) {
    await fetch(`/api/nps/programs/${programId}/questions/${q.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_index: q.order_index + dir }),
    })
    onSaved()
  }

  const Icon = meta.icon

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-start gap-3">
        <GripVertical className="w-4 h-4 text-slate-700 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className={`text-[10px] font-bold border ${meta.color} gap-1`}>
              <Icon className="w-3 h-3" /> {meta.label}
            </Badge>
            <button onClick={() => setRequired(!required)}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:text-slate-400 transition-colors">
              {required ? <ToggleRight className="w-3.5 h-3.5 text-orange-400" /> : <ToggleLeft className="w-3.5 h-3.5" />}
              {required ? 'Obrigatória' : 'Opcional'}
            </button>
          </div>

          {editing ? (
            <Input value={title} onChange={e => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white text-sm mb-2" autoFocus />
          ) : (
            <p className="text-white text-sm">{q.title}</p>
          )}

          {q.type === 'multiple_choice' && editing && (
            <div className="mt-2 space-y-1.5">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <Input value={opt} onChange={e => setOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                    className="bg-white/5 border-white/10 text-white text-xs h-7" />
                  <button onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))}>
                    <Trash2 className="w-3.5 h-3.5 text-slate-600 hover:text-red-400" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="Nova opção..." value={newOption} onChange={e => setNewOption(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newOption.trim()) { setOptions(p => [...p, newOption.trim()]); setNewOption('') } }}
                  className="bg-white/5 border-white/10 text-white text-xs h-7 placeholder:text-slate-600" />
                <Button size="sm" variant="outline" className="border-white/10 h-7 text-xs"
                  onClick={() => { if (newOption.trim()) { setOptions(p => [...p, newOption.trim()]); setNewOption('') } }}>+</Button>
              </div>
            </div>
          )}

          {q.type === 'multiple_choice' && !editing && options.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {options.map((o, i) => (
                <span key={i} className="text-[10px] text-slate-500 border border-white/5 rounded-md px-1.5 py-0.5">{o}</span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => move(-1)} disabled={index === 0} className="text-slate-700 hover:text-slate-400 disabled:opacity-20 transition-colors">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={() => move(1)} disabled={index === total - 1} className="text-slate-700 hover:text-slate-400 disabled:opacity-20 transition-colors">
            <ChevronDown className="w-4 h-4" />
          </button>
          {editing ? (
            <Button size="sm" onClick={save} disabled={saving}
              className="bg-orange-500 hover:bg-orange-600 text-white h-7 text-xs px-2.5 ml-1">
              {saving ? '...' : 'Ok'}
            </Button>
          ) : (
            <button onClick={() => setEditing(true)} className="text-slate-600 hover:text-slate-300 transition-colors ml-1">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={del} className="text-slate-700 hover:text-red-400 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Question Form (inline, sem API até confirmar) ───────────────────────

function AddQuestionForm({ programId, onAdded }: { programId: string; onAdded: () => void }) {
  const [type, setType] = useState<NPSQuestionType>('nps_scale')
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const [newOption, setNewOption] = useState('')
  const [required, setRequired] = useState(false)
  const [loading, setLoading] = useState(false)

  async function add() {
    if (!title.trim()) return
    setLoading(true)
    const res = await fetch(`/api/nps/programs/${programId}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, title: title.trim(), options: type === 'multiple_choice' ? options : null, required }),
    })
    setLoading(false)
    if (res.ok) {
      setTitle(''); setOptions([]); setNewOption(''); setRequired(false); setType('nps_scale')
      onAdded()
      toast.success('Pergunta adicionada ao questionário')
    } else {
      toast.error('Erro ao adicionar pergunta')
    }
  }

  return (
    <div className="rounded-xl border border-dashed border-white/10 p-4 space-y-3 bg-white/[0.01]">
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Nova Pergunta</p>
      <div className="flex flex-wrap gap-2">
        {(Object.keys(TYPE_META) as NPSQuestionType[]).map(t => {
          const m = TYPE_META[t]
          const MIcon = m.icon
          return (
            <button key={t} onClick={() => setType(t)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
                type === t ? m.color + ' border-opacity-100' : 'border-white/5 text-slate-600 hover:text-slate-400'
              }`}>
              <MIcon className="w-3 h-3" /> {m.label}
            </button>
          )
        })}
      </div>
      <Input
        placeholder={
          type === 'nps_scale'       ? 'Ex: Qual a probabilidade de recomendar o Plannera?' :
          type === 'multiple_choice' ? 'Ex: Como você conheceu o Plannera?' :
                                       'Ex: O que poderíamos melhorar?'
        }
        value={title} onChange={e => setTitle(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') add() }}
        className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-sm"
      />

      {type === 'multiple_choice' && (
        <div className="space-y-1.5">
          {options.map((opt, i) => (
            <div key={i} className="flex gap-2 items-center">
              <Input value={opt} onChange={e => setOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                className="bg-white/5 border-white/10 text-white text-xs h-7" />
              <button onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))}>
                <Trash2 className="w-3.5 h-3.5 text-slate-600 hover:text-red-400" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="Opção... (Enter)" value={newOption} onChange={e => setNewOption(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && newOption.trim()) { setOptions(p => [...p, newOption.trim()]); setNewOption('') } }}
              className="bg-white/5 border-white/10 text-white text-xs h-7 placeholder:text-slate-600" />
            <Button size="sm" variant="outline" className="border-white/10 h-7 text-xs"
              onClick={() => { if (newOption.trim()) { setOptions(p => [...p, newOption.trim()]); setNewOption('') } }}>+</Button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <button onClick={() => setRequired(!required)}
          className={`flex items-center gap-1.5 text-xs font-bold transition-colors ${required ? 'text-orange-400' : 'text-slate-600'}`}>
          {required ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          {required ? 'Obrigatória' : 'Opcional'}
        </button>
        <Button onClick={add} disabled={!title.trim() || loading}
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs h-8 gap-1.5">
          <Plus className="w-3.5 h-3.5" /> {loading ? 'Adicionando...' : 'Adicionar ao questionário'}
        </Button>
      </div>
    </div>
  )
}

// ─── Create + Configure Program Dialog (modal unificado) ────────────────────

function CreateProgramDialog({ accounts, onCreated }: { accounts: { id: string; name: string }[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false)
  // Step 1: dados básicos
  const [step, setStep] = useState<'form' | 'questions'>('form')
  const [createdProgram, setCreatedProgram] = useState<any>(null)
  const [questions, setQuestions] = useState<NPSQuestion[]>([])

  const [name, setName] = useState('')
  const [scope, setScope] = useState<'global' | 'account'>('global')
  const [accountId, setAccountId] = useState('')
  const [activeFrom, setActiveFrom] = useState('')
  const [activeUntil, setActiveUntil] = useState('')
  const [targetScore, setTargetScore] = useState('')
  const [loading, setLoading] = useState(false)

  const [copied, setCopied] = useState(false)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  function reset() {
    setStep('form'); setCreatedProgram(null); setQuestions([])
    setName(''); setScope('global'); setAccountId('')
    setActiveFrom(''); setActiveUntil(''); setTargetScore('')
  }

  async function handleCreate() {
    if (scope === 'account' && !accountId) return
    setLoading(true)
    const res = await fetch('/api/nps/programs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: scope === 'account' ? accountId : null,
        name: name.trim() || null,
        active_from: activeFrom ? new Date(activeFrom).toISOString() : null,
        active_until: activeUntil ? new Date(activeUntil).toISOString() : null,
        target_score: targetScore ? parseInt(targetScore, 10) : null,
      }),
    })
    setLoading(false)
    if (res.ok) {
      const prog = await res.json()
      setCreatedProgram(prog)
      setStep('questions')
      onCreated()
      toast.success('Programa criado! Adicione as perguntas abaixo.')
    } else {
      const err = await res.json()
      toast.error(err.error || 'Erro ao criar programa')
    }
  }

  async function fetchQuestions() {
    if (!createdProgram) return
    const res = await fetch(`/api/nps/programs/${createdProgram.id}/questions`)
    if (res.ok) setQuestions(await res.json())
  }

  useEffect(() => { if (step === 'questions') fetchQuestions() }, [step])

  function copy() {
    const snippet = `<script src="${origin}/embed.js"\n  data-program-key="${createdProgram?.program_key}"\n  data-user-id="USER_ID"\n  data-email="USER_EMAIL"\n  data-base-url="${origin}">\n<\/script>`
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleClose(v: boolean) {
    if (!v) reset()
    setOpen(v)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogTrigger asChild>
        <Button className="bg-orange-500 hover:bg-orange-600 text-white font-bold gap-2 h-9 text-xs uppercase tracking-wide">
          <Plus className="w-4 h-4" /> Novo Programa NPS
        </Button>
      </DialogTrigger>

      <DialogContent aria-describedby={undefined}
        className="bg-slate-900 border border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white font-black uppercase tracking-tight">
            {step === 'form' ? 'Criar Programa NPS' : 'Configurar Questionário'}
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-5">
            {/* Nome */}
            <div>
              <Label className="text-slate-400 text-xs font-bold uppercase mb-1.5 block">Nome do programa</Label>
              <Input value={name} onChange={e => setName(e.target.value)}
                placeholder="Ex: Pesquisa de satisfação Q2 2025"
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-sm" />
            </div>

            {/* Escopo */}
            <div>
              <Label className="text-slate-400 text-xs font-bold uppercase mb-2 block">Escopo</Label>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setScope('global')}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                    scope === 'global'
                      ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                      : 'border-white/5 text-slate-600 hover:text-slate-400'
                  }`}>
                  <Globe className="w-4 h-4" /> Global
                </button>
                <button onClick={() => setScope('account')}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${
                    scope === 'account'
                      ? 'border-orange-500/40 bg-orange-500/10 text-orange-400'
                      : 'border-white/5 text-slate-600 hover:text-slate-400'
                  }`}>
                  <Building2 className="w-4 h-4" /> Por Conta
                </button>
              </div>
              <p className="text-slate-600 text-[10px] mt-2">
                {scope === 'global'
                  ? 'O programa vale para todos os seus clientes.'
                  : 'O programa é restrito a um único cliente.'}
              </p>
            </div>

            {scope === 'account' && (
              <div>
                <Label className="text-slate-400 text-xs font-bold uppercase mb-1.5 block">Conta</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10">
                    {accounts.map(a => (
                      <SelectItem key={a.id} value={a.id} className="text-white">{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Período de vigência */}
            <div>
              <Label className="text-slate-400 text-xs font-bold uppercase mb-2 block flex items-center gap-1.5">
                <CalendarRange className="w-3.5 h-3.5" /> Período de vigência (opcional)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-slate-600 text-[10px] mb-1">Início</p>
                  <Input type="date" value={activeFrom} onChange={e => setActiveFrom(e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-sm" />
                </div>
                <div>
                  <p className="text-slate-600 text-[10px] mb-1">Término</p>
                  <Input type="date" value={activeUntil} onChange={e => setActiveUntil(e.target.value)}
                    className="bg-white/5 border-white/10 text-white text-sm" />
                </div>
              </div>
              <p className="text-slate-600 text-[10px] mt-1.5">
                Sem datas: pesquisa ativa indefinidamente enquanto estiver ativa.
              </p>
            </div>
            {/* Meta NPS (Opcional) */}
            <div>
              <Label className="text-slate-400 text-xs font-bold uppercase mb-1.5 block flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" /> Meta NPS do Programa (Opcional)
              </Label>
              <Input type="number" value={targetScore} onChange={e => setTargetScore(e.target.value)}
                placeholder="Ex: 75"
                className="bg-white/5 border-white/10 text-white text-sm" />
              <p className="text-slate-600 text-[10px] mt-1.5">
                Se vazio, herdará a meta padrão da empresa válida para o período.
              </p>
            </div>

            <Button onClick={handleCreate}
              disabled={(scope === 'account' && !accountId) || loading}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold">
              {loading ? 'Criando...' : 'Criar e Configurar Perguntas →'}
            </Button>
          </div>
        )}

        {step === 'questions' && createdProgram && (
          <div className="space-y-6">
            {/* Info do programa criado */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="text-emerald-400 text-xs font-bold">Programa criado com sucesso!</p>
                <p className="text-slate-500 text-[10px] font-mono">{createdProgram.program_key}</p>
              </div>
            </div>

            {/* Lista de perguntas (ao vivo) */}
            <div className="space-y-2">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                Questionário ({questions.length} {questions.length === 1 ? 'pergunta' : 'perguntas'})
              </p>
              {questions.length === 0 ? (
                <div className="text-slate-600 text-xs py-3 text-center">
                  Adicione perguntas abaixo — elas aparecerão aqui imediatamente.
                </div>
              ) : (
                <AnimatePresence>
                  {questions.map((q, i) => (
                    <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                      <QuestionRow q={q} index={i} total={questions.length}
                        programId={createdProgram.id}
                        onSaved={fetchQuestions} onDeleted={fetchQuestions} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Formulário de nova pergunta */}
            <AddQuestionForm programId={createdProgram.id} onAdded={() => { fetchQuestions(); onCreated() }} />

            {/* Embed code + Salvar */}
            <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-2">
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Código de Embed</p>
              <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto">
{`<script src="${origin}/embed.js"
  data-program-key="${createdProgram.program_key}"
  data-user-id="USER_ID"
  data-email="USER_EMAIL"
  data-base-url="${origin}">
</script>`}
              </pre>
              <Button onClick={copy} size="sm" variant="outline" className="border-white/10 text-slate-400 hover:text-white gap-2 h-7 text-xs">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copiado!' : 'Copiar código'}
              </Button>
            </div>

            <Button onClick={() => { setOpen(false); reset() }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold">
              Salvar Pesquisa e Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Edit Questionnaire Dialog ───────────────────────────────────────────────

function QuestionBuilderDialog({ program, onSaved }: { program: any; onSaved: () => void }) {
  const [questions, setQuestions] = useState<NPSQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const snippet = `<script src="${origin}/embed.js"\n  data-program-key="${program.program_key}"\n  data-user-id="USER_ID"\n  data-email="USER_EMAIL"\n  data-base-url="${origin}">\n<\/script>`
  const [copied, setCopied] = useState(false)

  const fetchQuestions = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/nps/programs/${program.id}/questions`)
    if (res.ok) setQuestions(await res.json())
    setLoading(false)
  }, [program.id])

  useEffect(() => { fetchQuestions() }, [fetchQuestions])

  function copy() {
    navigator.clipboard.writeText(snippet)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <DialogContent aria-describedby={undefined} className="bg-slate-900 border border-white/10 max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle className="text-white font-black uppercase tracking-tight flex items-center gap-2">
          {program.account_id ? <Building2 className="w-4 h-4 text-slate-500" /> : <Globe className="w-4 h-4 text-indigo-400" />}
          {program.name ?? program.accounts?.name ?? 'Global'} — Questionário
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-6">
        {/* Embed code */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">Código de Embed</p>
          <pre className="text-[10px] text-emerald-400 font-mono overflow-x-auto mb-2">{snippet}</pre>
          <Button onClick={copy} size="sm" variant="outline" className="border-white/10 text-slate-400 hover:text-white gap-2 h-7 text-xs">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copiado!' : 'Copiar código'}
          </Button>
        </div>

        {/* Lista de perguntas */}
        <div className="space-y-2">
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
            Perguntas ({questions.length})
          </p>
          {loading ? (
            <div className="text-slate-600 text-xs py-4 text-center">Carregando...</div>
          ) : questions.length === 0 ? (
            <div className="text-slate-600 text-xs py-4 text-center">Nenhuma pergunta ainda. Adicione abaixo.</div>
          ) : (
            <AnimatePresence>
              {questions.map((q, i) => (
                <motion.div key={q.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <QuestionRow q={q} index={i} total={questions.length}
                    programId={program.id}
                    onSaved={() => { fetchQuestions(); onSaved() }}
                    onDeleted={() => { fetchQuestions(); onSaved() }} />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        <AddQuestionForm programId={program.id} onAdded={() => { fetchQuestions(); onSaved() }} />
      </div>
    </DialogContent>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function ProgramsClient({ accounts }: Props) {
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [testLoading, setTestLoading] = useState<string | null>(null)
  const [defaultLoading, setDefaultLoading] = useState<string | null>(null)
  const [activeLoading, setActiveLoading] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/nps/programs')
    const data = await res.json()
    setPrograms(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleToggleTest(programId: string, currentStatus: boolean) {
    setTestLoading(programId)
    const res = await fetch(`/api/nps/programs?id=${programId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_test_mode: !currentStatus }),
    })
    if (res.ok) {
      toast.success(!currentStatus
        ? 'Modo de teste ativado! O widget aparecerá no Dashboard principal.'
        : 'Modo de teste desativado. Respostas de teste removidas.')
      fetchData()
    } else {
      toast.error('Erro ao alternar modo de teste')
    }
    setTestLoading(null)
  }

  async function handleToggleDefault(programId: string, currentStatus: boolean) {
    if (currentStatus) return // não permite remover default sem definir outro
    setDefaultLoading(programId)
    const res = await fetch(`/api/nps/programs?id=${programId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    })
    if (res.ok) {
      toast.success('Programa definido como padrão do dashboard.')
      fetchData()
    } else {
      toast.error('Erro ao definir programa padrão')
    }
    setDefaultLoading(null)
  }

  async function handleToggleActive(programId: string, currentlyActive: boolean, programName: string, isDefault: boolean) {
    setActiveLoading(programId)
    const res = await fetch(`/api/nps/programs?id=${programId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !currentlyActive }),
    })
    if (res.ok) {
      const data = await res.json()
      if (!currentlyActive) {
        toast.success(`"${programName}" reativado.`)
      } else {
        toast.success(`"${programName}" inativado.`)
        if (data._default_cleared) {
          toast(`Este programa era o default. Defina outro programa como default.`, {
            icon: <AlertTriangle className="w-4 h-4 text-orange-400" />,
            duration: 6000,
          })
        }
      }
      fetchData()
    } else {
      toast.error('Erro ao alterar status do programa')
    }
    setActiveLoading(null)
  }

  async function handleDeleteProgram(programId: string, programName: string) {
    if (!confirm(`Excluir o programa "${programName}"? Esta ação não pode ser desfeita.`)) return
    setDeleteLoading(programId)
    const res = await fetch(`/api/nps/programs?id=${programId}`, { method: 'DELETE' })
    const data = await res.json()
    if (res.ok) {
      toast.success(`Programa "${programName}" excluído.`)
      fetchData()
    } else if (data.has_responses) {
      toast.error(data.error)
    } else {
      toast.error('Erro ao excluir programa')
    }
    setDeleteLoading(null)
  }

  return (
    <div className="space-y-8 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/nps" className="mr-2 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 rounded-xl bg-orange-600/10 border border-orange-500/20 flex items-center justify-center">
            <ListChecks className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tighter uppercase">Programas</h1>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
              Configuração e Distribuição de Pesquisas NPS
            </p>
          </div>
        </div>
        <div className="flex-shrink-0">
          <CreateProgramDialog accounts={accounts} onCreated={fetchData} />
        </div>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-white text-sm font-black uppercase tracking-wide">Meus Programas ({programs.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="animate-pulse bg-white/5 h-20 rounded-xl" />
          ) : programs.length === 0 ? (
            <div className="text-center py-20 text-slate-600">
              <ListChecks className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm font-bold uppercase tracking-wide">Nenhum programa configurado</p>
              <p className="text-xs mt-1">Crie seu primeiro programa clicando no botão acima.</p>
            </div>
          ) : (
            programs.map((p: any) => (
              <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 gap-4 shadow-sm hover:bg-white/10 transition-colors">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 mt-1 sm:mt-0 ${p.is_active ? 'bg-emerald-500' : 'bg-slate-600'}`} />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {p.account_id
                        ? <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        : <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                      <p className="text-white text-sm font-bold truncate">
                        {p.name ?? p.accounts?.name ?? 'Global — Todos os Clientes'}
                      </p>
                      {p.is_default && (
                        <Badge className="bg-indigo-500/20 text-indigo-400 border-indigo-500/30 text-[10px] font-black uppercase shrink-0">
                          Default
                        </Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <code className="text-slate-500 bg-black/20 px-1.5 py-0.5 rounded text-[10px] uppercase font-mono tracking-wider">{p.program_key}</code>
                      {p.active_from && (
                        <p className="text-slate-400 text-[11px] flex items-center gap-1">
                          <CalendarRange className="w-3 h-3" />
                          {new Date(p.active_from).toLocaleDateString('pt-BR')} →{' '}
                          {p.active_until ? new Date(p.active_until).toLocaleDateString('pt-BR') : 'sem fim'}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ações (Responsivas para Mobile) */}
                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 sm:justify-end">
                  {/* Badges de status */}
                  {!p.is_active && (
                    <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[10px] font-black uppercase">
                      Inativo
                    </Badge>
                  )}
                  {p.is_test_mode && (
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse text-[10px] font-black uppercase">
                      Em Teste
                    </Badge>
                  )}
                  <Badge variant="outline" className="border-white/10 text-slate-500 text-[10px]">
                    {p.nps_questions?.length ?? 0} perguntas
                  </Badge>
                  <Badge variant="outline"
                    className={`text-[10px] ${(p.response_count ?? 0) > 0 ? 'border-indigo-500/20 text-indigo-400' : 'border-white/10 text-slate-600'}`}>
                    {p.response_count ?? 0} respostas
                  </Badge>

                  <div className="w-full sm:w-auto flex flex-wrap gap-2 mt-2 sm:mt-0 justify-end">
                    {/* Botão Default */}
                    {p.is_active && (
                      <Button size="sm" variant="outline"
                        disabled={defaultLoading === p.id || p.is_default}
                        onClick={() => handleToggleDefault(p.id, p.is_default)}
                        title={p.is_default ? 'Programa default atual' : 'Definir como default'}
                        className={`gap-1.5 text-xs h-8 flex-1 sm:flex-none transition-all ${
                          p.is_default
                            ? 'border-indigo-500/40 text-indigo-400 cursor-default bg-indigo-500/5'
                            : 'border-white/10 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30'
                        }`}>
                        {p.is_default
                          ? <BookmarkCheck className="w-3.5 h-3.5" />
                          : <Bookmark className="w-3.5 h-3.5" />}
                        {p.is_default ? 'Default' : 'Default'}
                      </Button>
                    )}

                    {/* Botão Teste */}
                    {p.is_active && (
                      <Button size="sm" variant="outline"
                        disabled={testLoading === p.id}
                        onClick={() => handleToggleTest(p.id, p.is_test_mode)}
                        className={`gap-1.5 text-xs h-8 flex-1 sm:flex-none transition-all ${
                          p.is_test_mode
                            ? 'border-orange-500/40 text-orange-400 hover:bg-orange-500/10'
                            : 'border-white/10 text-slate-400 hover:text-white'
                        }`}>
                        {p.is_test_mode ? <StopCircle className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {p.is_test_mode ? 'Parar Teste' : 'Testar'}
                      </Button>
                    )}

                    {/* Botão Editar Questionário */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="outline"
                          className="border-white/10 text-slate-400 hover:text-white gap-1.5 text-xs h-8 flex-1 sm:flex-none">
                          <Pencil className="w-3.5 h-3.5" /> Editar
                        </Button>
                      </DialogTrigger>
                      <QuestionBuilderDialog program={p} onSaved={fetchData} />
                    </Dialog>

                    {/* Botão Inativar / Reativar */}
                    <Button size="sm" variant="outline"
                      disabled={activeLoading === p.id}
                      onClick={() => handleToggleActive(p.id, p.is_active, p.name ?? p.accounts?.name ?? 'Global', p.is_default)}
                      title={p.is_active ? 'Inativar programa' : 'Reativar programa'}
                      className={`gap-1.5 text-xs h-8 flex-1 sm:flex-none transition-all ${
                        p.is_active
                          ? 'border-white/10 text-slate-500 hover:text-yellow-400 hover:border-yellow-500/30'
                          : 'border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10'
                      }`}>
                      {p.is_active
                        ? <PowerOff className="w-3.5 h-3.5" />
                        : <Power className="w-3.5 h-3.5" />}
                      {p.is_active ? 'Inativar' : 'Reativar'}
                    </Button>

                    {/* Botão Excluir */}
                    {(p.response_count ?? 0) === 0 && (
                      <Button size="sm" variant="outline"
                        disabled={deleteLoading === p.id}
                        onClick={() => handleDeleteProgram(p.id, p.name ?? p.accounts?.name ?? 'Global')}
                        className="gap-1.5 text-xs h-8 flex-1 sm:flex-none border-red-500/20 text-red-500/80 hover:text-red-400 hover:border-red-500/40 hover:bg-red-500/10 transition-all shadow-none">
                        <Trash2 className="w-3.5 h-3.5" />
                        {deleteLoading === p.id ? '...' : 'Excluir'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  )
}
