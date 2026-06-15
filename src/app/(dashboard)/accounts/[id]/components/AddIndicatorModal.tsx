'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  accountId: string
  onSuccess?: () => void
}

const ICONS = ['Activity', 'Zap', 'Ticket', 'Heart', 'MessageSquare', 'ShieldCheck', 'PieChart', 'Star', 'Target', 'ArrowUpRight', 'TrendingUp']
const COLORS = [
  { label: 'Azul', value: '#3b82f6' },
  { label: 'Verde', value: '#10b981' },
  { label: 'Laranja', value: '#f59e0b' },
  { label: 'Vermelho', value: '#ef4444' },
  { label: 'Roxo', value: '#8b5cf6' },
  { label: 'Plannera', value: '#2ba09d' }
]

export function AddIndicatorModal({ isOpen, onClose, accountId, onSuccess }: Props) {
  const [name, setName] = useState('')
  const [target, setTarget] = useState<number | ''>('')
  const [unit, setUnit] = useState('%')
  const [targetDate, setTargetDate] = useState('')
  const [icon, setIcon] = useState('Activity')
  const [color, setColor] = useState('#2ba09d')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!name || target === '' || !targetDate) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/accounts/${accountId}/indicators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          target_value: Number(target),
          unit,
          target_date: targetDate,
          icon,
          color,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao criar indicador')
      }

      toast.success('Indicador criado!')
      setName('')
      setTarget('')
      setTargetDate('')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 shadow-2xl p-0 overflow-hidden rounded-2xl text-[#2d3558] dark:text-white">
        <DialogHeader className="p-6 border-b border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50">
          <DialogTitle className="text-xl font-black uppercase tracking-tighter text-[#2d3558] dark:text-white">
            Novo Indicador
          </DialogTitle>
        </DialogHeader>
        
        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">
              Nome do Indicador *
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Adoção do Módulo Y"
              className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-12 rounded-xl text-[#2d3558] dark:text-white font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">
                Meta (Alvo) *
              </Label>
              <Input
                type="number"
                value={target}
                onChange={(e) => setTarget(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="100"
                className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-12 rounded-xl text-[#2d3558] dark:text-white font-medium"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">
                Unidade
              </Label>
              <Input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="%, qtd, R$"
                className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-12 rounded-xl text-[#2d3558] dark:text-white font-medium"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">
              Atingir até *
            </Label>
            <Input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-12 rounded-xl text-[#2d3558] dark:text-white font-medium"
            />
            <p className="text-[10px] text-content-secondary dark:text-content-secondary">
              Data em que a meta deve ser atingida — usada para acompanhar o prazo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">Ícone</Label>
              <Select value={icon} onValueChange={setIcon}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-12 rounded-xl font-medium text-[#2d3558] dark:text-white">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {ICONS.map((i) => (
                    <SelectItem key={i} value={i}>{i}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">Cor</Label>
              <Select value={color} onValueChange={setColor}>
                <SelectTrigger className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-12 rounded-xl font-medium text-[#2d3558] dark:text-white">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {COLORS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50 rounded-b-2xl flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 text-[10px] font-black uppercase tracking-[0.2em] h-11 rounded-xl">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="flex-[2] bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-[0.2em] text-[11px] h-11 rounded-xl"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar Indicador'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
