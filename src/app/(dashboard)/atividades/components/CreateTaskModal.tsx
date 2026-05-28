'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2 } from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { CsmTask, CsmTaskStatus, CsmTaskPriority, CsmTaskActivityType, CsmTaskSourceLabel } from '@/lib/supabase/types'

interface CreateTaskModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: (task: CsmTask) => void
  prefill?: Partial<CsmTask>
  editTask?: CsmTask | null
}

const activityTypeOptions = [
  { label: 'Reunião', value: 'meeting' },
  { label: 'E-mail', value: 'email' },
  { label: 'Ligação', value: 'call' },
  { label: 'Análise', value: 'analysis' },
  { label: 'Follow-up', value: 'follow_up' },
  { label: 'Interno', value: 'internal' },
  { label: 'Outro', value: 'other' },
]

const priorityOptions = [
  { label: 'Baixa', value: 'low' },
  { label: 'Média', value: 'medium' },
  { label: 'Alta', value: 'high' },
]

export function CreateTaskModal({ open, onOpenChange, onSaved, prefill, editTask }: CreateTaskModalProps) {
  const supabase = getSupabaseBrowserClient()
  const [saving, setSaving] = useState(false)
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])

  const isEdit = !!editTask

  const [form, setForm] = useState({
    title: '',
    description: '',
    activity_type: '' as CsmTaskActivityType | '',
    priority: 'medium' as CsmTaskPriority,
    due_date: '',
    account_id: '',
  })

  useEffect(() => {
    if (open) {
      if (editTask) {
        setForm({
          title: editTask.title,
          description: editTask.description ?? '',
          activity_type: editTask.activity_type ?? '',
          priority: editTask.priority,
          due_date: editTask.due_date ?? '',
          account_id: editTask.account_id ?? '',
        })
      } else {
        setForm({
          title: prefill?.title ?? '',
          description: prefill?.description ?? '',
          activity_type: prefill?.activity_type ?? '',
          priority: prefill?.priority ?? 'medium',
          due_date: prefill?.due_date ?? '',
          account_id: prefill?.account_id ?? '',
        })
      }
    }
  }, [open, editTask, prefill])

  useEffect(() => {
    supabase.from('accounts').select('id, name').order('name').then(({ data }) => {
      if (data) setAccounts(data)
    })
  }, [supabase])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)

    const payload: Record<string, any> = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      activity_type: form.activity_type || null,
      priority: form.priority,
      due_date: form.due_date || null,
      account_id: form.account_id || null,
    }

    let data: CsmTask | null = null

    const db = supabase as any

    if (isEdit && editTask) {
      const { data: updated } = await db
        .from('csm_tasks')
        .update(payload)
        .eq('id', editTask.id)
        .select('*, accounts(name)')
        .single()
      data = updated as CsmTask
    } else {
      payload.source_label = (prefill?.source_label as CsmTaskSourceLabel) ?? 'manual'
      payload.adoption_id = prefill?.adoption_id ?? null
      payload.time_entry_id = prefill?.time_entry_id ?? null
      payload.alert_id = prefill?.alert_id ?? null

      const { data: created } = await db
        .from('csm_tasks')
        .insert(payload)
        .select('*, accounts(name)')
        .single()
      data = created as CsmTask
    }

    setSaving(false)
    if (data) {
      onSaved(data)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar Atividade' : 'Nova Atividade'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título *</Label>
            <Input
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="O que precisa ser feito?"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label>Descrição</Label>
            <Textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Contexto adicional..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <SearchableSelect
                options={activityTypeOptions}
                value={form.activity_type}
                onValueChange={v => setForm(f => ({ ...f, activity_type: v as CsmTaskActivityType }))}
                placeholder="Selecionar..."
              />
            </div>
            <div className="space-y-1.5">
              <Label>Prioridade</Label>
              <SearchableSelect
                options={priorityOptions}
                value={form.priority}
                onValueChange={v => setForm(f => ({ ...f, priority: v as CsmTaskPriority }))}
                placeholder="Selecionar..."
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Conta</Label>
            <SearchableSelect
              options={accounts.map(a => ({ label: a.name, value: a.id }))}
              value={form.account_id}
              onValueChange={v => setForm(f => ({ ...f, account_id: v }))}
              placeholder="Nenhuma conta específica"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Data de entrega</Label>
            <Input
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={saving || !form.title.trim()}>
              {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {isEdit ? 'Salvar' : 'Criar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
