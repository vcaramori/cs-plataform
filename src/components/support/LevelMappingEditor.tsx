'use client'

import { useState } from 'react'
import { SLALevelMapping } from '@/lib/supabase/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Trash2, Plus, ArrowRight } from 'lucide-react'

interface Props {
  policyId: string
  initialMappings: SLALevelMapping[]
}

export function LevelMappingEditor({ policyId, initialMappings }: Props) {
  const [mappings, setMappings] = useState<SLALevelMapping[]>(initialMappings)
  const [newLabel, setNewLabel] = useState('')
  const [newLevel, setNewLevel] = useState<'critical'|'high'|'medium'|'low'>('medium')
  const [isAdding, setIsAdding] = useState(false)

  const handleAdd = async () => {
    if (!newLabel.trim()) return

    setIsAdding(true)
    try {
      const res = await fetch(`/api/sla-policies/${policyId}/mappings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ external_label: newLabel.trim(), internal_level: newLevel })
      })

      if (!res.ok) throw new Error(await res.text())
      
      const created = await res.json()
      setMappings([created, ...mappings])
      setNewLabel('')
      toast.success('Mapeamento adicionado com sucesso.')
    } catch (err: any) {
      toast.error('Falha ao adicionar: ' + err.message)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/sla-policies/${policyId}/mappings/${id}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error(await res.text())
      
      setMappings(mappings.filter(m => m.id !== id))
      toast.success('Mapeamento removido.')
    } catch (err: any) {
      toast.error('Falha ao remover: ' + err.message)
    }
  }

  const lbls = { critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo' }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-brand-primary dark:text-white">Mapeamento de Prioridades Externas</h3>
        <p className="text-sm text-brand-grey dark:text-slate-400">Traduza rótulos vindos de e-mails (IMAP) ou integrações para os níveis de SLA internos.</p>
      </div>

      <div className="flex gap-2 items-center bg-white dark:bg-slate-900/50 p-4 border border-slate-200 dark:border-slate-800 rounded-lg">
        <Input
          placeholder="Ex: Urgent, P1"
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          className="flex-1"
        />
        <ArrowRight className="w-4 h-4 text-brand-grey dark:text-slate-500" />
        <Select value={newLevel} onValueChange={(v) => setNewLevel(v as any)}>
          <SelectTrigger className="w-36 bg-surface-card dark:bg-slate-900 border-border-divider text-content-primary">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface-card dark:bg-slate-900 border-border-divider text-content-primary">
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="high">Alto</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="low">Baixo</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} disabled={isAdding || !newLabel.trim()}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        {mappings.length === 0 ? (
          <div className="p-6 text-center text-sm text-brand-grey dark:text-slate-500 bg-white dark:bg-slate-900/50">
            Nenhum mapeamento configurado. Os tickets não mapeados assumirão "Médio" por padrão.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
              {mappings.map(m => (
                <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-brand-primary dark:text-slate-200">
                    "{m.external_label}"
                  </td>
                  <td className="px-4 py-3 text-brand-grey dark:text-slate-400 w-10 text-center">→</td>
                  <td className="px-4 py-3 text-indigo-400 font-medium whitespace-nowrap w-24">
                    {lbls[m.internal_level]}
                  </td>
                  <td className="px-4 py-3 text-right w-16">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-brand-grey dark:text-slate-500 hover:text-red-400" onClick={() => handleDelete(m.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

