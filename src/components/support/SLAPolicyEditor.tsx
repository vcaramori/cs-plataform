'use client'

import { useState, useEffect } from 'react'
import { SLAPolicyLevel } from '@/lib/supabase/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'

type LevelMap = Record<'critical' | 'high' | 'medium' | 'low', SLAPolicyLevel | undefined>

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

export function SLAPolicyEditor({ policyId, initialLevels }: Props) {
  const [levels, setLevels] = useState<LevelMap>({} as LevelMap)
  const [isSaving, setIsSaving] = useState(false)

  // Initialize with initial or defaults
  useEffect(() => {
    const map = {} as LevelMap
    DEFAULT_LEVELS.forEach(d => {
      const existing = initialLevels.find(l => l.level === d.level)
      map[d.level] = existing || {
        id: '', policy_id: policyId, level: d.level,
        first_response_minutes: d.first, resolution_minutes: d.res,
        created_at: '', updated_at: ''
      }
    })
    setLevels(map)
  }, [initialLevels, policyId])

  const handleUpdate = (levelEnum: 'critical'|'high'|'medium'|'low', field: 'first_response_minutes'|'resolution_minutes', val: string) => {
    const num = parseInt(val) || 0
    setLevels(prev => ({
      ...prev,
      [levelEnum]: { ...prev[levelEnum]!, [field]: num }
    }))
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-brand-primary dark:text-white">Matriz de Prazos (Minutos Úteis)</h3>
          <p className="text-sm text-brand-grey dark:text-slate-400">Configure os prazos máximos exigidos contratualmente.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Matriz
        </Button>
      </div>

      <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-brand-grey dark:text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Nível de Severidade</th>
              <th className="px-4 py-3 font-medium">Primeira Resposta (min)</th>
              <th className="px-4 py-3 font-medium">Resolução (min)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
            {(['critical', 'high', 'medium', 'low'] as const).map(lev => (
               <tr key={lev} className="transition-colors">
                 <td className="px-4 py-3 font-medium text-brand-primary dark:text-slate-200">
                   {lbls[lev]}
                 </td>
                 <td className="px-4 py-3">
                   <Input 
                     type="number" 
                     className="w-32"
                     value={levels[lev]?.first_response_minutes || ''}
                     onChange={e => handleUpdate(lev, 'first_response_minutes', e.target.value)}
                   />
                 </td>
                 <td className="px-4 py-3">
                   <Input 
                     type="number" 
                     className="w-32"
                     value={levels[lev]?.resolution_minutes || ''}
                     onChange={e => handleUpdate(lev, 'resolution_minutes', e.target.value)}
                   />
                 </td>
               </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

