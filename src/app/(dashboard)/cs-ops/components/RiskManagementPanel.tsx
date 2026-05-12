'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2, Plus, AlertTriangle } from 'lucide-react'
import { createRisk } from '../actions'
import { cn } from '@/lib/utils'

interface RiskManagementPanelProps {
  accounts: { id: string, name: string }[]
  onSuccess?: () => void
}

export function RiskManagementPanel({ accounts, onSuccess }: RiskManagementPanelProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [accountId, setAccountId] = useState('')
  const [riskType, setRiskType] = useState('churn')
  const [severity, setSeverity] = useState('low')
  const [description, setDescription] = useState('')
  const [actionPlan, setActionPlan] = useState('')

  const handleCreate = async () => {
    if (!accountId || !description) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    if (severity === 'critical' && (!actionPlan || actionPlan.trim() === '')) {
      toast.error('Plano de ação é obrigatório para riscos de severidade crítica.')
      return
    }

    setLoading(true)
    const res = await createRisk({
      account_id: accountId,
      risk_type: riskType,
      severity,
      status: 'identified',
      description,
      action_plan: actionPlan
    })
    
    setLoading(false)

    if (res.success) {
      toast.success('Risco cadastrado com sucesso!')
      setOpen(false)
      // Reset form
      setAccountId('')
      setRiskType('churn')
      setSeverity('low')
      setDescription('')
      setActionPlan('')
      if (onSuccess) onSuccess()
    } else {
      toast.error(res.error || 'Erro ao cadastrar risco')
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-500 hover:bg-red-600 text-white gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl px-4 py-2 h-auto">
          <Plus className="w-4 h-4" />
          Registrar Risco
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] border-border-divider bg-surface-background rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-black tracking-tight text-content-primary flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Registrar Novo Risco
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Conta *</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger className="border-border-divider bg-surface-card rounded-xl">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(acc => (
                  <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Tipo de Risco *</Label>
              <Select value={riskType} onValueChange={setRiskType}>
                <SelectTrigger className="border-border-divider bg-surface-card rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="churn">Churn</SelectItem>
                  <SelectItem value="downgrade">Downgrade</SelectItem>
                  <SelectItem value="adoption">Adoção</SelectItem>
                  <SelectItem value="relationship">Relacionamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Severidade *</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="border-border-divider bg-surface-card rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixo</SelectItem>
                  <SelectItem value="medium">Médio</SelectItem>
                  <SelectItem value="high">Alto</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Descrição *</Label>
            <Textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="border-border-divider bg-surface-card rounded-xl resize-none"
              rows={3}
              placeholder="Descreva o risco identificado..."
            />
          </div>

          <div className="space-y-2">
            <Label className={cn("text-[10px] font-black uppercase tracking-widest flex items-center gap-2", severity === 'critical' ? 'text-red-500' : 'text-content-secondary')}>
              Plano de Ação {severity === 'critical' && '*'}
            </Label>
            <Textarea
              value={actionPlan}
              onChange={e => setActionPlan(e.target.value)}
              className={cn("border-border-divider bg-surface-card rounded-xl resize-none", severity === 'critical' && (!actionPlan.trim() ? "border-red-500/50" : ""))}
              rows={3}
              placeholder={severity === 'critical' ? "Obrigatório para riscos críticos" : "Opcional"}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-divider">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            className="border-border-divider text-[10px] font-black uppercase tracking-widest rounded-xl"
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Risco
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
