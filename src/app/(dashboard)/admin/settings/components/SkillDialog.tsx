'use client'

import { useState } from 'react'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Settings2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AI_INSTRUCTIONS, AI_INSTRUCTION_DOMAINS } from '@/lib/ai/instructions-catalog'

interface Skill {
  id: string
  name: string
  description: string | null
  when_to_use: string | null
  body: string
  applies_to: string[]
  is_active: boolean
}

export function SkillDialog({ skill, onSuccess }: { skill?: Skill; onSuccess?: () => void }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(skill?.name ?? '')
  const [description, setDescription] = useState(skill?.description ?? '')
  const [whenToUse, setWhenToUse] = useState(skill?.when_to_use ?? '')
  const [body, setBody] = useState(skill?.body ?? '')
  const [appliesTo, setAppliesTo] = useState<Set<string>>(new Set(skill?.applies_to ?? ['global']))
  const [isActive, setIsActive] = useState(skill?.is_active ?? true)

  const toggle = (k: string) => setAppliesTo((prev) => {
    const next = new Set(prev); next.has(k) ? next.delete(k) : next.add(k); return next
  })

  async function submit() {
    if (name.trim().length < 2) { toast.error('Nome obrigatório'); return }
    setLoading(true)
    try {
      const url = skill ? `/api/admin/ai-skills/${skill.id}` : '/api/admin/ai-skills'
      const res = await fetch(url, {
        method: skill ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), description, when_to_use: whenToUse, body,
          applies_to: Array.from(appliesTo), is_active: isActive,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.error?.toString() || 'Erro ao salvar skill')
      toast.success(skill ? 'Skill atualizada!' : 'Skill criada!')
      setOpen(false); onSuccess?.()
    } catch (e: any) { toast.error(e.message) } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {skill ? (
          <Button variant="ghost" size="icon" className="text-content-secondary/40 hover:text-plannera-primary"><Settings2 className="w-4 h-4" /></Button>
        ) : (
          <Button size="sm" className="gap-2"><Plus className="w-4 h-4" /> Nova Skill</Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{skill ? 'Editar Skill' : 'Nova Skill'}</DialogTitle>
          <DialogDescription>Conhecimento reutilizável (MD) injetado no system instruction das tarefas selecionadas.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Nome *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: Glossário S&OP" /></div>
            <div className="flex items-end justify-between gap-2">
              <div className="flex-1"><Label>Descrição</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="resumo curto" /></div>
              <label className="inline-flex items-center gap-2 text-sm pb-2 whitespace-nowrap"><Switch checked={isActive} onCheckedChange={setIsActive} /> Ativa</label>
            </div>
          </div>
          <div><Label>Quando usar</Label><Input value={whenToUse} onChange={(e) => setWhenToUse(e.target.value)} placeholder="contexto em que esta skill é relevante" /></div>
          <div>
            <Label>Conteúdo (Markdown)</Label>
            <Textarea rows={8} value={body} onChange={(e) => setBody(e.target.value)} placeholder="# Regras / conhecimento que a IA deve seguir…" />
          </div>
          <div>
            <Label>Aplicar a</Label>
            <div className="max-h-48 overflow-y-auto rounded-xl border border-border-divider p-3 space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold">
                <Checkbox checked={appliesTo.has('global')} onCheckedChange={() => toggle('global')} /> Global (todas as IAs)
              </label>
              {AI_INSTRUCTION_DOMAINS.map((domain) => (
                <div key={domain} className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary/60 mt-2">{domain}</p>
                  <div className="grid grid-cols-2 gap-1 pl-2">
                    {AI_INSTRUCTIONS.filter((i) => i.domain === domain).map((i) => (
                      <label key={i.key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox checked={appliesTo.has(i.key)} onCheckedChange={() => toggle(i.key)} /> {i.label}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={loading}>{loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {skill ? 'Salvar' : 'Criar'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
