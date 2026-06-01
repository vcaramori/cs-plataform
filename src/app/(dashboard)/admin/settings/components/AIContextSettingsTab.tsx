'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Brain, Save, Sparkles, X } from 'lucide-react'
import { toast } from 'sonner'
import { AI_INSTRUCTIONS, AI_INSTRUCTION_DOMAINS } from '@/lib/ai/instructions-catalog'
import { SkillDialog } from './SkillDialog'

const RECOMMENDED_GLOBAL_CONTEXT = `Você é uma IA de Customer Success da Plannera (plataforma SaaS de S&OP/S&OE para indústria e MRO).
Responda SEMPRE em Português do Brasil, com tom profissional, objetivo e cordial.
Guardrails: nunca exponha dados de um cliente para outro; não invente números — use apenas o contexto fornecido; quando não souber, diga que não há dados suficientes.`

interface Skill { id: string; name: string; description: string | null; when_to_use: string | null; body: string; applies_to: string[]; is_active: boolean }

export function AIContextSettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [globalContext, setGlobalContext] = useState('')
  const [rules, setRules] = useState<any>(null)
  const [instructions, setInstructions] = useState<Record<string, string>>({})
  const [skills, setSkills] = useState<Skill[]>([])

  async function loadAll() {
    setLoading(true)
    try {
      const [s, sk] = await Promise.all([
        fetch('/api/admin/settings').then((r) => r.json()),
        fetch('/api/admin/ai-skills').then((r) => r.ok ? r.json() : []),
      ])
      setGlobalContext(typeof s.ai_global_context === 'string' ? s.ai_global_context : '')
      setRules(s.ai_context_rules ?? {})
      const instr: Record<string, string> = {}
      for (const i of AI_INSTRUCTIONS) if (typeof s[i.key] === 'string') instr[i.key] = s[i.key]
      setInstructions(instr)
      setSkills(sk)
    } finally { setLoading(false) }
  }
  useEffect(() => { loadAll() }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'ai_context', settings: { ai_global_context: globalContext, ai_context_rules: rules, instructions } }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.toString() || 'Erro ao salvar')
      toast.success('Configurações de IA salvas!')
    } catch (e: any) { toast.error(e.message) } finally { setSaving(false) }
  }

  function setRule(path: string[], value: any) {
    setRules((prev: any) => {
      const next = structuredClone(prev ?? {})
      let cur = next
      for (let i = 0; i < path.length - 1; i++) { cur[path[i]] = cur[path[i]] ?? {}; cur = cur[path[i]] }
      cur[path[path.length - 1]] = value
      return next
    })
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-content-secondary" /></div>

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-plannera-primary" />
          <h2 className="text-lg font-bold">IA — Contexto & Regras</h2>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar tudo</Button>
      </div>

      {/* Contexto global */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Contexto global</p>
              <p className="text-xs text-content-secondary">Injetado no início de TODAS as IAs (persona, tom, idioma, guardrails). Vazio = comportamento atual.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setGlobalContext(RECOMMENDED_GLOBAL_CONTEXT)}>
              <Sparkles className="w-4 h-4" /> Aplicar recomendado
            </Button>
          </div>
          <Textarea rows={6} value={globalContext} onChange={(e) => setGlobalContext(e.target.value)} placeholder="Deixe vazio para manter o comportamento atual…" />
        </CardContent>
      </Card>

      {/* Regras numéricas */}
      {rules && (
        <Card>
          <CardContent className="p-5 space-y-4">
            <p className="font-bold text-sm">Regras numéricas</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Num label="NPS promotor ≥" value={rules.nps?.promoter_min} onChange={(v) => setRule(['nps', 'promoter_min'], v)} />
              <Num label="NPS passivo ≥" value={rules.nps?.passive_min} onChange={(v) => setRule(['nps', 'passive_min'], v)} />
              <Num label="Renovação urgente (dias)" value={rules.financial?.renewal_urgent_days} onChange={(v) => setRule(['financial', 'renewal_urgent_days'], v)} />
              <Num label="Alerta discrepância health" value={rules.financial?.health_discrepancy_alert} onChange={(v) => setRule(['financial', 'health_discrepancy_alert'], v)} />
            </div>
            <div>
              <Label>Silêncio por segmento (dias)</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-1">
                {Object.entries(rules.silence_by_segment ?? {}).map(([seg, val]) => (
                  <Num key={seg} label={seg} value={val as number} onChange={(v) => setRule(['silence_by_segment', seg], v)} />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Contato de risco — influência (vírgula)</Label>
                <Input value={(rules.contact_high_risk?.influence_levels ?? []).join(', ')} onChange={(e) => setRule(['contact_high_risk', 'influence_levels'], e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
              </div>
              <div>
                <Label>Contato de risco — senioridade (vírgula)</Label>
                <Input value={(rules.contact_high_risk?.seniority_levels ?? []).join(', ')} onChange={(e) => setRule(['contact_high_risk', 'seniority_levels'], e.target.value.split(',').map((s) => s.trim()).filter(Boolean))} />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Biblioteca de Skills</p>
              <p className="text-xs text-content-secondary">Conhecimento reutilizável (MD) injetado por tarefa (ou global).</p>
            </div>
            <SkillDialog onSuccess={loadAll} />
          </div>
          {skills.length === 0 ? (
            <p className="text-sm text-content-secondary">Nenhuma skill cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {skills.map((sk) => (
                <div key={sk.id} className="flex items-start justify-between gap-3 border border-border-divider rounded-lg px-3 py-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{sk.name}</span>
                      {!sk.is_active && <Badge variant="outline" className="text-[9px]">inativa</Badge>}
                      {(sk.applies_to ?? []).slice(0, 4).map((a) => <Badge key={a} variant="neutral" className="text-[9px]">{a === 'global' ? 'global' : (AI_INSTRUCTIONS.find((i) => i.key === a)?.label ?? a)}</Badge>)}
                    </div>
                    {sk.description && <p className="text-xs text-content-secondary mt-0.5">{sk.description}</p>}
                  </div>
                  <SkillDialog skill={sk} onSuccess={loadAll} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instruções por tarefa */}
      <Card>
        <CardContent className="p-5 space-y-4">
          <div>
            <p className="font-bold text-sm">Instruções por tarefa</p>
            <p className="text-xs text-content-secondary">Sobrescreve o prompt-base de cada IA. Vazio = default do código.</p>
          </div>
          {AI_INSTRUCTION_DOMAINS.map((domain) => (
            <div key={domain} className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary/60">{domain}</p>
              {AI_INSTRUCTIONS.filter((i) => i.domain === domain).map((i) => (
                <div key={i.key} className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs">{i.label}</Label>
                    <Badge variant={i.triggerType === 'auto' ? 'secondary' : 'info'} className="text-[8px]">{i.triggerType === 'auto' ? 'automático' : 'usuário'}</Badge>
                    {instructions[i.key] && (
                      <button className="text-[10px] text-content-secondary hover:text-red-500 inline-flex items-center gap-0.5"
                        onClick={() => setInstructions((p) => { const n = { ...p }; delete n[i.key]; return n })}>
                        <X className="w-3 h-3" /> limpar override
                      </button>
                    )}
                  </div>
                  <Textarea rows={2} value={instructions[i.key] ?? ''} placeholder="(usando default do código)"
                    onChange={(e) => setInstructions((p) => ({ ...p, [i.key]: e.target.value }))} />
                </div>
              ))}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar tudo</Button>
      </div>
    </div>
  )
}

function Num({ label, value, onChange }: { label: string; value: number | undefined; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  )
}
