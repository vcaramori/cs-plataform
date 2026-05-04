'use client'

import { useState, useEffect } from 'react'
import { SLAPolicyLevel } from '@/lib/supabase/types'
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
import { Loader2, Save } from 'lucide-react'
import { cn } from '@/lib/utils'

type LevelMap = Record<'critical' | 'high' | 'medium' | 'low', SLAPolicyLevel | undefined>
type UnitKey = `${'critical'|'high'|'medium'|'low'}_${'first'|'res'}`
type UnitType = 'min' | 'h' | 'dia'

interface Props {
  policyId: string
  initialLevels: SLAPolicyLevel[]
}

const DEFAULT_LEVELS: Array<{level: 'critical' | 'high' | 'medium' | 'low', first: number, res: number}> = [
  { level: 'critical', first: 30, res: 120 },
  { level: 'high', first: 60, res: 240 },
  { level: 'medium', first: 240, res: 1440 }, // 1440m = 24h
  { level: 'low', first: 1440, res: 4320 },   // 4320m = 72h
]

function bestUnit(mins: number): UnitType {
  if (mins >= 1440 && mins % 1440 === 0) return 'dia'
  if (mins >= 60 && mins % 60 === 0) return 'h'
  return 'min'
}

const FACTORS: Record<UnitType, number> = { min: 1, h: 60, dia: 1440 }

function displayVal(mins: number, unit: UnitType) {
  return mins === 0 ? '' : String(mins / FACTORS[unit])
}

export function SLAPolicyEditor({ policyId, initialLevels }: Props) {
  const [levels, setLevels] = useState<LevelMap>({} as LevelMap)
  const [units, setUnits] = useState<Record<UnitKey, UnitType>>({} as Record<UnitKey, UnitType>)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize with initial or defaults
  useEffect(() => {
    const map = {} as LevelMap
    const u = {} as Record<UnitKey, UnitType>
    DEFAULT_LEVELS.forEach(d => {
      const existing = initialLevels.find(l => l.level === d.level)
      map[d.level] = existing || {
        id: '', policy_id: policyId, level: d.level,
        first_response_minutes: d.first, resolution_minutes: d.res,
        created_at: '', updated_at: ''
      }
      u[`${d.level}_first`] = bestUnit(existing?.first_response_minutes ?? d.first)
      u[`${d.level}_res`] = bestUnit(existing?.resolution_minutes ?? d.res)
    })
    setLevels(map)
    setUnits(u)
  }, [initialLevels, policyId])

  const handleUpdate = (lev: 'critical'|'high'|'medium'|'low', field: 'first_response_minutes'|'resolution_minutes', val: string, unit: UnitType) => {
    const num = (parseFloat(val) || 0) * FACTORS[unit]
    setLevels(prev => ({
      ...prev,
      [lev]: { ...prev[lev]!, [field]: Math.round(num) }
    }))
  }

  const handleUnitChange = (key: UnitKey, newUnit: UnitType) => {
    setUnits(prev => ({ ...prev, [key]: newUnit }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const payload = Object.values(levels)
      const res = await fetch(`/api/sla-policies/${policyId}/levels`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.map(p => ({
          level: p!.level,
          first_response_minutes: p!.first_response_minutes,
          resolution_minutes: p!.resolution_minutes
        })))
      })

      if (!res.ok) throw new Error(await res.text())
      
      toast.success('Prazos de SLA atualizados com sucesso.')
    } catch (err: any) {
      toast.error('Falha ao salvar prazos: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const lbls = { critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo' }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="w-1 h-4 bg-plannera-primary rounded-full" />
          <div>
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-content-primary">Matriz de Prazos (Minutos Úteis)</h3>
            <p className="text-[9px] font-bold uppercase tracking-widest text-content-secondary opacity-40 mt-1">Acordos de Nível de Serviço Contratuais</p>
          </div>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isSaving} 
          className="bg-plannera-primary hover:bg-plannera-primary/90 text-white rounded-xl h-12 px-6 shadow-lg shadow-plannera-primary/20 active:scale-95 transition-all"
        >
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          <span className="text-[10px] font-black uppercase tracking-widest">Salvar Matriz</span>
        </Button>
      </div>

      <div className="bg-surface-card border border-border-divider rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-background/50 border-b border-border-divider">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Severidade</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Primeira Resposta</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Resolução Final</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-divider bg-transparent">
            {(['critical', 'high', 'medium', 'low'] as const).map(lev => (
               <tr key={lev} className="hover:bg-white/5 transition-all group">
                 <td className="px-8 py-6">
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      lev === 'critical' ? 'text-red-500' :
                      lev === 'high' ? 'text-orange-500' :
                      lev === 'medium' ? 'text-plannera-primary' :
                      'text-content-secondary opacity-60'
                    )}>
                      {lbls[lev]}
                    </span>
                 </td>
                 <td className="px-8 py-6">
                   <div className="flex items-center gap-2">
                     <Input
                       type="number"
                       min="1"
                       className="w-24 bg-surface-background border-border-divider rounded-xl h-11 text-xs font-black text-content-primary focus:ring-2 focus:ring-plannera-primary/50 transition-all"
                       value={displayVal(levels[lev]?.first_response_minutes ?? 0, units[`${lev}_first`])}
                       onChange={e => handleUpdate(lev, 'first_response_minutes', e.target.value, units[`${lev}_first`])}
                     />
                     <Select value={units[`${lev}_first`]} onValueChange={v => handleUnitChange(`${lev}_first`, v as UnitType)}>
                       <SelectTrigger className="w-24 bg-surface-background border-border-divider text-content-secondary rounded-xl h-11 text-[9px] font-black uppercase tracking-widest">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-surface-card border-border-divider rounded-xl">
                         <SelectItem value="min" className="text-[9px] font-black uppercase tracking-widest py-3">min</SelectItem>
                         <SelectItem value="h" className="text-[9px] font-black uppercase tracking-widest py-3">h</SelectItem>
                         <SelectItem value="dia" className="text-[9px] font-black uppercase tracking-widest py-3">dia</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </td>
                 <td className="px-8 py-6">
                   <div className="flex items-center gap-2">
                     <Input
                       type="number"
                       min="1"
                       className="w-24 bg-surface-background border-border-divider rounded-xl h-11 text-xs font-black text-content-primary focus:ring-2 focus:ring-plannera-primary/50 transition-all"
                       value={displayVal(levels[lev]?.resolution_minutes ?? 0, units[`${lev}_res`])}
                       onChange={e => handleUpdate(lev, 'resolution_minutes', e.target.value, units[`${lev}_res`])}
                     />
                     <Select value={units[`${lev}_res`]} onValueChange={v => handleUnitChange(`${lev}_res`, v as UnitType)}>
                       <SelectTrigger className="w-24 bg-surface-background border-border-divider text-content-secondary rounded-xl h-11 text-[9px] font-black uppercase tracking-widest">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent className="bg-surface-card border-border-divider rounded-xl">
                         <SelectItem value="min" className="text-[9px] font-black uppercase tracking-widest py-3">min</SelectItem>
                         <SelectItem value="h" className="text-[9px] font-black uppercase tracking-widest py-3">h</SelectItem>
                         <SelectItem value="dia" className="text-[9px] font-black uppercase tracking-widest py-3">dia</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

