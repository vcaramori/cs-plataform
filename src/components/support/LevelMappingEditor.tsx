'use client'

import { useState } from 'react'
import { SLALevelMapping } from '@/lib/supabase/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
        <h3 className="text-lg font-semibold text-zinc-100">Mapeamento de Prioridades Externas</h3>
        <p className="text-sm text-zinc-400">Traduza rótulos vindos de e-mails (IMAP) ou integrações para os níveis de SLA internos.</p>
      </div>

      <div className="flex gap-2 items-center bg-zinc-900/50 p-4 border border-zinc-800 rounded-lg">
        <Input 
          placeholder="Ex: Urgent, P1" 
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          className="flex-1 bg-black/40"
        />
        <ArrowRight className="w-4 h-4 text-zinc-500" />
        <select 
          className="h-9 px-3 py-1 bg-black/40 border border-zinc-800 rounded-md text-sm text-zinc-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          value={newLevel}
          onChange={e => setNewLevel(e.target.value as any)}
        >
          <option value="critical">Crítico</option>
          <option value="high">Alto</option>
          <option value="medium">Médio</option>
          <option value="low">Baixo</option>
        </select>
        <Button onClick={handleAdd} disabled={isAdding || !newLabel.trim()}>
          <Plus className="w-4 h-4 mr-1" /> Adicionar
        </Button>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        {mappings.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-500 bg-zinc-900/50">
            Nenhum mapeamento configurado. Os tickets não mapeados assumirão "Médio" por padrão.
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
              {mappings.map(m => (
                <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-zinc-200">
                    "{m.external_label}"
                  </td>
                  <td className="px-4 py-3 text-zinc-400 w-10 text-center">→</td>
                  <td className="px-4 py-3 text-indigo-400 font-medium whitespace-nowrap w-24">
                    {lbls[m.internal_level]}
                  </td>
                  <td className="px-4 py-3 text-right w-16">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-500 hover:text-red-400" onClick={() => handleDelete(m.id)}>
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
