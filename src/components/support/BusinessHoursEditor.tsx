'use client'

import { useState, useEffect } from 'react'
import { BusinessHours } from '@/lib/supabase/types'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

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
          <h2 className="text-xl font-bold text-brand-primary dark:text-white">Horário Operacional {accountId && 'Customizado da Conta'}</h2>
          <p className="text-sm text-brand-grey dark:text-slate-400">Configure os horários operacionais contabilizados para SLA.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving} className="bg-plannera-orange hover:bg-plannera-orange/90 text-white font-bold rounded-xl shadow-md transition-all">
          {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar Alterações
        </Button>
      </div>

      <div className="bg-surface-card border border-border-divider rounded-2xl shadow-xl overflow-hidden backdrop-blur-md">
        <table className="w-full text-left border-collapse">
          <thead className="bg-surface-background/50 border-b border-border-divider">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Dia da Semana</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Status</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Abertura</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Fechamento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-divider bg-transparent">
            {hours.map((h, i) => (
              <tr 
                key={i} 
                className={cn(
                  "transition-all",
                  h.is_active 
                    ? "bg-transparent hover:bg-white/5" 
                    : "bg-surface-background/30 opacity-60"
                )}
              >
                <td className="px-8 py-6">
                  <span className="text-xs font-black uppercase tracking-widest text-content-primary">
                    {DOW_LABELS[h.dow]}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <input
                    type="checkbox"
                    checked={h.is_active}
                    onChange={(e) => handleUpdate(i, 'is_active', e.target.checked)}
                    className="w-5 h-5 rounded-lg border-border-divider bg-surface-background text-plannera-orange focus:ring-plannera-orange cursor-pointer transition-all active:scale-90"
                  />
                </td>
                <td className="px-8 py-6">
                  <input
                    type="time"
                    value={h.start_time}
                    disabled={!h.is_active}
                    onChange={(e) => handleUpdate(i, 'start_time', e.target.value)}
                    className="bg-surface-background border border-border-divider rounded-xl px-4 py-2 text-xs font-black text-content-primary focus:ring-2 focus:ring-plannera-orange/50 transition-all disabled:opacity-20"
                  />
                </td>
                <td className="px-8 py-6">
                  <input
                    type="time"
                    value={h.end_time}
                    disabled={!h.is_active}
                    onChange={(e) => handleUpdate(i, 'end_time', e.target.value)}
                    className="bg-surface-background border border-border-divider rounded-xl px-4 py-2 text-xs font-black text-content-primary focus:ring-2 focus:ring-plannera-orange/50 transition-all disabled:opacity-20"
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

