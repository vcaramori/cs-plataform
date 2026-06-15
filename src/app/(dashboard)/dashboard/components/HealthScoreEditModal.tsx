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
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { classifyHealth } from '@/lib/health/classify'
import { motion } from 'framer-motion'

interface Props {
  isOpen: boolean
  onClose: () => void
  account: {
    id: string
    name: string
    health_score: number
  } | null
  onSuccess?: () => void
}

const SOURCE_TYPES = [
  { value: 'manual_update', label: 'Atualização Manual' },
  { value: 'historical_import', label: 'Importação Histórica' },
  { value: 'executive_review', label: 'Revisão Executiva' },
  { value: 'post_meeting_review', label: 'Revisão Pós-Reunião' },
]

export function HealthScoreEditModal({ isOpen, onClose, account, onSuccess }: Props) {
  const [score, setScore] = useState<number>(account?.health_score ?? 50)
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [notes, setNotes] = useState('')
  const [sourceType, setSourceType] = useState('manual_update')
  const [loading, setLoading] = useState(false)

  // Reset states when account changes or modal opens
  useEffect(() => {
    if (account && isOpen) {
      setScore(account.health_score)
      setNotes('')
      setSourceType('manual_update')
    }
  }, [account, isOpen])

  async function handleSubmit() {
    if (!account) return

    setLoading(true)
    try {
      const res = await fetch('/api/health-scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: account.id,
          score,
          evaluated_at: date,
          notes,
          source_type: sourceType,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Erro ao salvar score')
      }

      toast.success('Health Score atualizado com sucesso!')
      onSuccess?.()
      onClose()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (!account) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px] bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 shadow-2xl p-0 overflow-hidden rounded-2xl text-[#2d3558] dark:text-white">
        <div className="h-1.5 bg-gradient-to-r from-plannera-orange to-plannera-sop w-full" />
        
        <DialogHeader className="p-6 border-b border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50">
          <DialogTitle className="text-xl font-black uppercase tracking-tighter text-[#2d3558] dark:text-white">
            Saúde do <span className="text-plannera-orange">Logo</span>
          </DialogTitle>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary dark:text-content-secondary opacity-80 mt-1">
            {account.name} — Atualização Estratégica
          </p>
        </DialogHeader>
        
        <div className="p-6 space-y-8">
          <div className="grid gap-8">
            <div className="space-y-4">
              <Label htmlFor="score" className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">Health Score Manual (0-100)</Label>
              <div className="flex items-center gap-6 bg-surface-background dark:bg-slate-800/50 p-6 rounded-2xl border border-border-divider dark:border-slate-800">
                  <Input
                    id="score"
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(Number(e.target.value))}
                    className="w-24 bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-2xl font-black h-16 text-center focus:ring-plannera-orange rounded-2xl text-[#2d3558] dark:text-white"
                  />
                <div className="flex-1 flex flex-col gap-3">
                  <div className="h-3 bg-surface-card dark:bg-slate-800 rounded-full overflow-hidden border border-slate-300 dark:border-slate-700 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      className="h-full transition-all duration-500 rounded-full"
                      style={{
                        backgroundColor: classifyHealth(score).color
                      }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-bold text-content-secondary dark:text-content-secondary uppercase tracking-widest">Estado Atual</span>
                    <span className={cn(
                      "text-[10px] font-black uppercase tracking-widest",
                      classifyHealth(score).textClass
                    )}>
                      {classifyHealth(score).label}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">Data de Referência</Label>
                <div className="relative">
                  <Input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-12 focus:ring-plannera-orange rounded-xl font-bold pl-10 text-[#2d3558] dark:text-white"
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
                      <SelectItem key={t.value} value={t.value} className="text-[11px] font-black uppercase tracking-tight focus:bg-plannera-orange focus:text-white">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-[10px] font-black uppercase tracking-[0.3em] text-content-secondary dark:text-content-secondary">Racional Estratégico</Label>
              <Textarea
                id="notes"
                placeholder="Descreva o motivo desta atualização..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 resize-none h-28 focus:ring-plannera-orange rounded-2xl p-4 font-medium text-sm leading-relaxed text-[#2d3558] dark:text-white"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 border-t border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50 rounded-b-2xl flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 text-[10px] font-black uppercase tracking-[0.2em] h-11 rounded-xl border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white hover:bg-surface-card dark:hover:bg-slate-800">
              Descartar
            </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="flex-[2] bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-[0.2em] text-[11px] h-11 rounded-xl shadow-lg shadow-plannera-orange/20 transition-all active:scale-95"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar Atualização'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
