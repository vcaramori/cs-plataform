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
import { Trash2, Plus, ArrowRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  policyId: string
  initialMappings: SLALevelMapping[]
  readOnly?: boolean
}

export function LevelMappingEditor({ policyId, initialMappings, readOnly = false }: Props) {
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
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1 h-4 bg-plannera-orange rounded-full" />
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-content-primary">Mapeamento de Prioridades Externas</h3>
      </div>

      {!readOnly && (
        <div className="flex gap-3 items-center bg-surface-card/50 backdrop-blur-md p-4 border border-border-divider rounded-2xl shadow-sm">
          <Input
            placeholder="Ex: Urgent, P1, Urgente"
            value={newLabel}
            onChange={e => setNewLabel(e.target.value)}
            className="flex-1 bg-surface-background border-border-divider rounded-xl h-12 text-xs font-bold uppercase tracking-tight"
          />
          <div className="px-2 text-content-secondary opacity-60">
            <ArrowRight className="w-4 h-4" />
          </div>
          <Select value={newLevel} onValueChange={(v) => setNewLevel(v as any)}>
            <SelectTrigger className="w-40 bg-surface-background border-border-divider text-content-primary rounded-xl h-12 text-[10px] font-black uppercase tracking-widest">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-surface-card border-border-divider rounded-xl">
              <SelectItem value="critical" className="text-[10px] font-black uppercase tracking-widest py-3">Crítico</SelectItem>
              <SelectItem value="high" className="text-[10px] font-black uppercase tracking-widest py-3">Alto</SelectItem>
              <SelectItem value="medium" className="text-[10px] font-black uppercase tracking-widest py-3">Médio</SelectItem>
              <SelectItem value="low" className="text-[10px] font-black uppercase tracking-widest py-3">Baixo</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            onClick={handleAdd} 
            disabled={isAdding || !newLabel.trim()}
            className="bg-plannera-orange hover:bg-plannera-orange/90 text-white h-12 px-6 rounded-xl shadow-lg shadow-plannera-orange/20 active:scale-95 transition-all"
          >
            {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            <span className="text-[10px] font-black uppercase tracking-widest">Adicionar</span>
          </Button>
        </div>
      )}

      <div className="bg-surface-card border border-border-divider rounded-2xl overflow-hidden shadow-xl">
        {mappings.length === 0 ? (
          <div className="p-12 text-center text-[10px] font-black uppercase tracking-widest text-content-secondary opacity-60 bg-surface-background/50">
            Nenhum mapeamento configurado
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <tbody className="divide-y divide-border-divider bg-transparent">
              {mappings.map(m => (
                <tr key={m.id} className="hover:bg-white/5 transition-all group">
                  <td className="px-8 py-5">
                    <span className="text-xs font-black uppercase tracking-widest text-content-primary opacity-60 group-hover:opacity-100 transition-opacity">
                      "{m.external_label}"
                    </span>
                  </td>
                  <td className="px-4 py-5 text-content-secondary opacity-20 w-10 text-center">
                    <ArrowRight className="w-3 h-3 mx-auto" />
                  </td>
                  <td className="px-8 py-5">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border",
                      m.internal_level === 'critical' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                      m.internal_level === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                      m.internal_level === 'medium' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                      'bg-surface-background0/10 text-content-secondary border-border-divider'
                    )}>
                      {lbls[m.internal_level]}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="px-8 py-5 text-right w-16">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 text-content-secondary opacity-20 hover:opacity-100 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all" 
                        onClick={() => handleDelete(m.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

