'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Loader2, Brain, Save, Sparkles, X, Edit3, AlignLeft } from 'lucide-react'
import { toast } from 'sonner'
import { AI_INSTRUCTIONS, AI_INSTRUCTION_DOMAINS, type AIInstructionDef } from '@/lib/ai/instructions-catalog'
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

  // Modal State
  const [editingInst, setEditingInst] = useState<AIInstructionDef | null>(null)
  const [editingText, setEditingText] = useState('')
  const [glossaryRows, setGlossaryRows] = useState<{ sigla: string; sig: string }[]>([])

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
      const g = s.sop_glossary && typeof s.sop_glossary === 'object' ? s.sop_glossary : {}
      setGlossaryRows(Object.entries(g).map(([sigla, sig]) => ({ sigla, sig: String(sig) })))
    } finally { setLoading(false) }
  }
  useEffect(() => { loadAll() }, [])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'ai_context', settings: { ai_global_context: globalContext, ai_context_rules: rules, instructions, sop_glossary: Object.fromEntries(glossaryRows.filter((r) => r.sigla.trim()).map((r) => [r.sigla.trim(), r.sig])) } }),
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

      {/* Glossário S&OP */}
      <Card>
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm">Glossário S&amp;OP</p>
              <p className="text-xs text-content-secondary">Siglas/módulos de sistemas correlatos a S&amp;OP (ex.: MPS, DRP, MRO). A IA usa para reconhecer necessidades de sistema como <strong>oportunidades</strong>.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => setGlossaryRows((r) => [...r, { sigla: '', sig: '' }])}>+ Termo</Button>
          </div>
          <div className="space-y-2">
            {glossaryRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input className="w-36" placeholder="Sigla (ex.: DRP)" value={row.sigla} onChange={(e) => setGlossaryRows((rs) => rs.map((r, i) => (i === idx ? { ...r, sigla: e.target.value } : r)))} />
                <Input className="flex-1" placeholder="Significado / o que o sistema faz" value={row.sig} onChange={(e) => setGlossaryRows((rs) => rs.map((r, i) => (i === idx ? { ...r, sig: e.target.value } : r)))} />
                <button onClick={() => setGlossaryRows((rs) => rs.filter((_, i) => i !== idx))} className="text-content-secondary hover:text-red-500 p-1" aria-label="Remover termo"><X className="w-4 h-4" /></button>
              </div>
            ))}
            {glossaryRows.length === 0 && (
              <p className="text-xs text-content-secondary">Nenhum termo cadastrado — a IA usa o glossário padrão (S&amp;OP, MPS, MRP, DRP, MRO, CPFR, IBP).</p>
            )}
          </div>
        </CardContent>
      </Card>

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
            <div key={domain} className="space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary/60">{domain}</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {AI_INSTRUCTIONS.filter((i) => i.domain === domain).map((i) => {
                  const hasCustom = !!instructions[i.key]
                  const isPlanned = i.status === 'planned'

                  return (
                    <div 
                      key={i.key} 
                      onClick={() => {
                        setEditingInst(i)
                        setEditingText(instructions[i.key] ?? '')
                      }}
                      className="border border-border-divider bg-surface-background/30 rounded-xl p-3 flex flex-col gap-2 cursor-pointer hover:border-plannera-orange/30 hover:bg-surface-background transition-all group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Label className="text-xs font-semibold cursor-pointer group-hover:text-plannera-orange transition-colors">{i.label}</Label>
                        <div className="flex flex-col gap-1 items-end">
                          <Badge variant={i.triggerType === 'auto' ? 'secondary' : 'info'} className="text-[8px] whitespace-nowrap">{i.triggerType === 'auto' ? 'automático' : 'usuário'}</Badge>
                          {isPlanned && <Badge variant="outline" className="text-[8px] text-content-secondary whitespace-nowrap border-dashed">planejado</Badge>}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between mt-auto pt-1">
                        <div className="flex items-center gap-1.5 text-content-secondary text-[10px]">
                          {hasCustom ? (
                            <span className="text-plannera-orange flex items-center gap-1 font-medium"><AlignLeft className="w-3 h-3"/> Customizado</span>
                          ) : (
                            <span className="flex items-center gap-1"><AlignLeft className="w-3 h-3"/> Padrão do código</span>
                          )}
                        </div>
                        <Edit3 className="w-3.5 h-3.5 text-content-secondary group-hover:text-plannera-orange transition-colors" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar tudo</Button>
      </div>

      <Dialog open={!!editingInst} onOpenChange={(o) => !o && setEditingInst(null)}>
        <DialogContent className="max-w-3xl bg-surface-card border-border-divider">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-plannera-orange" />
              Editar Prompt: {editingInst?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-xs text-content-secondary">
              Escreva as regras em Markdown. Este texto substituirá integralmente o prompt padrão desta rotina.
              {editingInst?.status === 'planned' && (
                <span className="ml-2 px-2 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  Esta funcionalidade está em fase de planejamento/integração.
                </span>
              )}
            </p>
            <Textarea 
              className="font-mono text-xs p-4 resize-y bg-surface-background border-border-divider focus-visible:ring-plannera-orange" 
              rows={16} 
              value={editingText}
              onChange={(e) => setEditingText(e.target.value)}
              placeholder={editingInst?.default ?? 'Nenhum padrão cadastrado no catálogo. A IA usará o fallback embutido no código base.'}
            />
          </div>
          <DialogFooter className="flex items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  if (editingInst?.default) setEditingText(editingInst.default)
                }}
              >
                Copiar Padrão
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                onClick={() => setEditingText('')}
              >
                Limpar (Usar Padrão do Código)
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setEditingInst(null)}>Cancelar</Button>
              <Button onClick={() => {
                if (editingInst) {
                  setInstructions(p => {
                    const n = { ...p }
                    if (editingText.trim() === '') {
                      delete n[editingInst.key]
                    } else {
                      n[editingInst.key] = editingText
                    }
                    return n
                  })
                }
                setEditingInst(null)
              }}>
                Confirmar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
