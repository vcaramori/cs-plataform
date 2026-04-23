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
      <DialogContent className="sm:max-w-[425px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold uppercase tracking-tight">
            Atualizar Saúde: <span className="text-plannera-orange">{account.name}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="score" className="text-xs font-bold uppercase tracking-widest text-slate-400">Score Manual (0-100)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="score"
                type="number"
                min="0"
                max="100"
                value={score}
                onChange={(e) => setScore(Number(e.target.value))}
                className="bg-black/20 border-white/5 text-xl font-bold h-12 text-center focus:ring-plannera-orange"
              />
              <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full transition-all duration-500 rounded-full"
                  style={{ 
                    width: `${score}%`, 
                    backgroundColor: score >= 70 ? '#2ba09d' : score >= 40 ? '#f7941e' : '#d85d4b' 
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Data de Referência</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-black/20 border-white/5 h-10 focus:ring-plannera-orange"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Origem</Label>
              <Select value={sourceType} onValueChange={setSourceType}>
                <SelectTrigger className="bg-black/20 border-white/5 h-10">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent className="bg-slate-900 border-white/10 text-white">
                  {SOURCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs font-bold uppercase tracking-tight">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-xs font-bold uppercase tracking-widest text-slate-400">Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Por que este score?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-black/20 border-white/5 resize-none h-24 focus:ring-plannera-orange"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">Cancelar</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading}
            className="bg-plannera-orange hover:bg-plannera-orange/80 text-white font-bold uppercase tracking-widest text-xs px-8"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Histórico'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
