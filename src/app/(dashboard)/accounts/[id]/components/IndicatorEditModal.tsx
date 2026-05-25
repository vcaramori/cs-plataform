'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Calendar as CalendarIcon } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  indicator: any
  onSuccess?: () => void
}

const SOURCE_TYPES = [
  { value: 'manual', label: 'Manual' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'import', label: 'Importação' }
]

export function IndicatorEditModal({ isOpen, onClose, indicator, onSuccess }: Props) {
  const [value, setValue] = useState<number | ''>('')
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [sourceType, setSourceType] = useState('manual')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (indicator && isOpen) {
      setValue(indicator.current_value)
      setNotes('')
      setSourceType('manual')
    }
  }, [indicator, isOpen])

  async function handleSubmit() {
    if (!indicator) return
    if (value === '') {
      toast.error('Informe o valor')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/accounts/${indicator.account_id}/indicators/${indicator.id}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: Number(value),
          date,
          notes,
          source_type: sourceType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao salvar valor')
      }

      toast.success('Valor atualizado com sucesso!')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!indicator) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 shadow-2xl p-0 overflow-hidden rounded-2xl text-[#2d3558] dark:text-white">
        <div className="h-1.5 w-full" style={{ background: indicator.color || '#2ba09d' }} />
        
        <DialogHeader className="p-6 border-b border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50">
          <DialogTitle className="text-xl font-black uppercase tracking-tighter text-[#2d3558] dark:text-white">
            Atualizar <span style={{ color: indicator.color || '#2ba09d' }}>{indicator.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-8">
          <div className="grid gap-6">
            <div className="space-y-4">
              <Label htmlFor="value" className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">
                Novo Valor ({indicator.unit})
              </Label>
              <Input
                id="value"
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-2xl font-black h-16 text-center focus:ring-plannera-orange rounded-2xl text-[#2d3558] dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">Data</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-12 rounded-xl font-bold pl-10 text-[#2d3558] dark:text-white"
                  />
                  <CalendarIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-secondary dark:text-content-secondary" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">Origem</Label>
                <Select value={sourceType} onValueChange={setSourceType}>
                  <SelectTrigger className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-12 rounded-xl font-bold text-[#2d3558] dark:text-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white rounded-xl">
                    {SOURCE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.label} className="text-[11px] font-black uppercase tracking-tight">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">Anotações</Label>
              <Textarea
                id="notes"
                placeholder="Detalhes opcionais sobre esta medição..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 resize-none h-28 rounded-2xl p-4 font-medium text-sm leading-relaxed text-[#2d3558] dark:text-white"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50 rounded-b-2xl flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 text-[10px] font-black uppercase tracking-[0.2em] h-11 rounded-xl border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white hover:bg-surface-card dark:hover:bg-slate-800">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="flex-[2] bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-[0.2em] text-[11px] h-11 rounded-xl shadow-lg transition-all active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Medição'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
