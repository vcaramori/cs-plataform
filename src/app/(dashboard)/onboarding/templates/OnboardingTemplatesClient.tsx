'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Plus, Trash2, Loader2, Save, Library } from 'lucide-react'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Item = { name: string; milestone_type: string; offset_days: number; duration_days: number; sort_order: number }
type Template = { id: string; name: string; description: string | null; project_type: string | null; is_active: boolean; items: Item[] }

const TYPE_OPTS = [
  ['kickoff', 'Kickoff'], ['workteam', 'GT'], ['training', 'Treinamento'],
  ['instance_setup', 'Instância/Config'], ['go_live', 'Go Live'], ['hypercare', 'Hypercare'],
  ['handover', 'Handover'], ['milestone', 'Marco'], ['other', 'Outro'],
] as const

const inputCls = 'text-[12px] px-2 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary focus:outline-none focus:ring-1 focus:ring-plannera-primary/30'

export function OnboardingTemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/onboarding/templates')
      const data = await res.json()
      setTemplates((Array.isArray(data) ? data : []).map((t: any) => ({ ...t, items: (t.items ?? []).map((i: any) => ({ name: i.name, milestone_type: i.milestone_type, offset_days: i.offset_days, duration_days: i.duration_days ?? 0, sort_order: i.sort_order ?? 0 })) })))
    } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const update = (id: string, patch: Partial<Template>) => setTemplates((ts) => ts.map((t) => t.id === id ? { ...t, ...patch } : t))
  const updateItem = (id: string, idx: number, patch: Partial<Item>) =>
    setTemplates((ts) => ts.map((t) => t.id === id ? { ...t, items: t.items.map((it, i) => i === idx ? { ...it, ...patch } : it) } : t))
  const addItem = (id: string) => setTemplates((ts) => ts.map((t) => t.id === id ? { ...t, items: [...t.items, { name: '', milestone_type: 'milestone', offset_days: 0, duration_days: 0, sort_order: t.items.length + 1 }] } : t))
  const removeItem = (id: string, idx: number) => setTemplates((ts) => ts.map((t) => t.id === id ? { ...t, items: t.items.filter((_, i) => i !== idx) } : t))

  const createTemplate = async () => {
    setBusy(true)
    try {
      await fetch('/api/onboarding/templates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Novo modelo', items: [{ name: 'Kick off', milestone_type: 'kickoff', offset_days: 0, sort_order: 1 }] }) })
      await load()
    } finally { setBusy(false) }
  }
  const saveTemplate = async (t: Template) => {
    setBusy(true)
    try {
      await fetch(`/api/onboarding/templates/${t.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: t.name, description: t.description, project_type: t.project_type, is_active: t.is_active, items: t.items.map((it, i) => ({ ...it, sort_order: i + 1 })) }) })
      await load()
    } finally { setBusy(false) }
  }
  const deleteTemplate = async (id: string) => {
    if (!confirm('Excluir este modelo?')) return
    setBusy(true)
    try { await fetch(`/api/onboarding/templates/${id}`, { method: 'DELETE' }); await load() } finally { setBusy(false) }
  }

  return (
    <PageContainer>
      <Link href="/onboarding" className="text-[11px] text-content-secondary hover:text-content-primary flex items-center gap-1 mb-3"><ArrowLeft className="w-4 h-4" /> Onboarding</Link>
      <ModuleHeader title="Modelos de Cronograma" subtitle="Biblioteca de templates de implantação (por tipo). Datas calculadas a partir do início pelo offset em dias." iconName="Library">
        <Button size="sm" onClick={createTemplate} disabled={busy}><Plus className="w-4 h-4 mr-2" /> Novo modelo</Button>
      </ModuleHeader>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]"><Loader2 className="w-6 h-6 animate-spin text-content-secondary" /></div>
      ) : templates.length === 0 ? (
        <Card className="p-10 text-center text-content-secondary">Nenhum modelo. Crie o primeiro.</Card>
      ) : (
        <div className="space-y-5">
          {templates.map((t) => (
            <Card key={t.id} className="p-4 rounded-2xl bg-surface-card/60 border border-border-divider/50 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <input value={t.name} onChange={(e) => update(t.id, { name: e.target.value })} className={`flex-1 min-w-[180px] font-bold ${inputCls}`} />
                <input value={t.project_type ?? ''} onChange={(e) => update(t.id, { project_type: e.target.value })} placeholder="tipo (ex.: padrao)" className={`w-32 ${inputCls}`} />
                <Button size="sm" onClick={() => saveTemplate(t)} disabled={busy}><Save className="w-3.5 h-3.5 mr-1" /> Salvar</Button>
                <button onClick={() => deleteTemplate(t.id)} className="text-content-secondary/50 hover:text-rose-500 p-1.5"><Trash2 className="w-4 h-4" /></button>
              </div>
              <input value={t.description ?? ''} onChange={(e) => update(t.id, { description: e.target.value })} placeholder="Descrição" className={`w-full ${inputCls}`} />

              <div className="rounded-xl border border-border-divider/40 divide-y divide-border-divider/30">
                <div className="grid grid-cols-[1fr_120px_90px_90px_32px] gap-2 px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-content-secondary/60">
                  <span>Marco</span><span>Tipo</span><span>Offset (dias)</span><span>Duração</span><span></span>
                </div>
                {t.items.map((it, idx) => (
                  <div key={idx} className="grid grid-cols-[1fr_120px_90px_90px_32px] gap-2 px-2 py-1.5 items-center">
                    <input value={it.name} onChange={(e) => updateItem(t.id, idx, { name: e.target.value })} className={inputCls} />
                    <select value={it.milestone_type} onChange={(e) => updateItem(t.id, idx, { milestone_type: e.target.value })} className={inputCls}>
                      {TYPE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                    <input type="number" value={it.offset_days} onChange={(e) => updateItem(t.id, idx, { offset_days: Number(e.target.value) })} className={inputCls} />
                    <input type="number" value={it.duration_days} onChange={(e) => updateItem(t.id, idx, { duration_days: Number(e.target.value) })} className={inputCls} />
                    <button onClick={() => removeItem(t.id, idx)} className="text-content-secondary/50 hover:text-rose-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => addItem(t.id)} className="w-full text-[11px] text-plannera-primary hover:bg-muted/30 py-2 flex items-center justify-center gap-1"><Plus className="w-3.5 h-3.5" /> Adicionar marco</button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  )
}
