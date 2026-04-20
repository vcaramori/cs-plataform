'use client'

import { useState, useEffect } from 'react'
import { BusinessHours } from '@/lib/supabase/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'

interface Props {
  initialHours: BusinessHours[]
  accountId?: string // If absent, managing Global
}

const DOW_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function BusinessHoursEditor({ initialHours, accountId }: Props) {
  const [hours, setHours] = useState<BusinessHours[]>([])
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    // Scaffold 0-6
    const scaffold: BusinessHours[] = Array.from({ length: 7 }).map((_, i) => {
      const existing = initialHours.find(h => h.dow === i)
      return existing || {
        scope: accountId ? 'account' : 'global',
        account_id: accountId || null,
        dow: i,
        start_time: '09:00',
        end_time: '18:00',
        is_active: i >= 1 && i <= 5 // Mon-Fri active by default
      } as BusinessHours
    })
    setHours(scaffold)
  }, [initialHours, accountId])

  const handleUpdate = (index: number, field: keyof BusinessHours, value: any) => {
    const newHours = [...hours]
    newHours[index] = { ...newHours[index], [field]: value }
    setHours(newHours)
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/business-hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(hours) // API handles scope/accountId
      })

      if (!res.ok) throw new Error(await res.text())
      
      toast.success('Horários comerciais atualizados com sucesso.')
    } catch (err: any) {
      toast.error('Falha ao salvar: ' + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">Horário Operacional {accountId && 'Customizado da Conta'}</h2>
          <p className="text-sm text-zinc-400">Configure os horários operacionais contabilizados para SLA.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-700">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Alterações
        </Button>
      </div>

      <div className="glass-card rounded-2xl border-none overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-zinc-800/50 text-zinc-400">
            <tr>
              <th className="px-4 py-3 font-medium w-16">Status</th>
              <th className="px-4 py-3 font-medium w-32">Dia da Semana</th>
              <th className="px-4 py-3 font-medium">Início</th>
              <th className="px-4 py-3 font-medium">Fim</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 bg-zinc-900/50">
            {hours.map((h, i) => (
               <tr key={i} className={`transition-colors ${h.is_active ? 'hover:bg-zinc-800/30' : 'bg-zinc-900/40 opacity-60 hover:bg-zinc-900/60'}`}>
                 <td className="px-4 py-3 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-zinc-700 bg-zinc-800 text-indigo-500 cursor-pointer"
                      checked={h.is_active}
                      onChange={e => handleUpdate(i, 'is_active', e.target.checked)}
                    />
                 </td>
                 <td className="px-4 py-3 font-medium text-zinc-200">
                   {DOW_LABELS[i]}
                 </td>
                 <td className="px-4 py-3">
                   <Input 
                     type="time" 
                     className="w-32 bg-black/40"
                     value={h.start_time}
                     onChange={e => handleUpdate(i, 'start_time', e.target.value)}
                     disabled={!h.is_active}
                   />
                 </td>
                 <td className="px-4 py-3">
                   <Input 
                     type="time" 
                     className="w-32 bg-black/40"
                     value={h.end_time}
                     onChange={e => handleUpdate(i, 'end_time', e.target.value)}
                     disabled={!h.is_active}
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
