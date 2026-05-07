'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  FileText,
  DollarSign,
  CalendarDays,
  Clock,
  Percent,
  AlertCircle,
  CheckCircle,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { EditContractDialog } from './EditContractDialog'

interface ContractDetailModalProps {
  contract: any | null
  onOpenChange: (open: boolean) => void
}

export function ContractDetailModal({ contract, onOpenChange }: ContractDetailModalProps) {
  const [editOpen, setEditOpen] = useState(false)

  if (!contract) return null

  // Calcular dias até renovação
  const daysUntilRenewal = contract.renewal_date
    ? Math.ceil((new Date(contract.renewal_date).getTime() - Date.now()) / 86400000)
    : null

  const statusLabels: Record<string, string> = {
    active: 'Ativo',
    'at-risk': 'Em Risco',
    churned: 'Churn',
    'in-negotiation': 'Em Negociação',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-500 border-emerald-100 dark:border-emerald-500/20',
    'at-risk': 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-500 border-amber-100 dark:border-amber-500/20',
    churned: 'bg-red-50 dark:bg-destructive/10 text-red-700 dark:text-destructive border-red-100 dark:border-destructive/20',
    'in-negotiation': 'bg-indigo-50 dark:bg-primary/10 text-brand-primary dark:text-primary border-indigo-100 dark:border-primary/20',
  }

  const renewalColor =
    daysUntilRenewal === null
      ? 'text-content-secondary'
      : daysUntilRenewal < 0
        ? 'text-destructive font-bold'
        : daysUntilRenewal < 30
          ? 'text-destructive font-bold'
          : daysUntilRenewal < 90
            ? 'text-amber-500 font-bold'
            : 'text-emerald-500 font-bold'

  return (
    <Dialog open={!!contract} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-2xl rounded-2xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-indigo-50 dark:bg-primary/10 border border-indigo-100 dark:border-primary/20">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-xl font-black uppercase tracking-tighter text-[#2d3558] dark:text-white">
                  {contract.description || contract.service_type || 'Contrato sem descrição'}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-1">
                  Detalhes do evento de contrato na timeline
                </DialogDescription>
              </div>
            </div>
            <Badge
              variant="neutral"
              className={cn(
                'text-[9px] font-black uppercase tracking-widest border shrink-0',
                statusColors[contract.status] ?? 'bg-accent/30 text-muted-foreground'
              )}
            >
              {statusLabels[contract.status] ?? contract.status}
            </Badge>
          </div>
        </DialogHeader>

        <div className="px-8 py-8 space-y-6 overflow-y-auto max-h-[65vh]">
          {/* Seção Financeira */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-500" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wide text-slate-700 dark:text-slate-300">
                Informações Financeiras
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card variant="glass" className="p-4 rounded-xl">
                <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                  MRR Base
                </div>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-500">
                  {formatCurrency(contract.mrr || 0)}
                </p>
              </Card>
              {contract.contracted_hours_monthly > 0 && (
                <Card variant="glass" className="p-4 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                    Horas Contratadas
                  </div>
                  <p className="text-lg font-black text-indigo-600 dark:text-indigo-500">
                    {contract.contracted_hours_monthly}h / Mês
                  </p>
                </Card>
              )}
            </div>
          </section>

          {/* Seção de Datas */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                <CalendarDays className="w-4 h-4 text-amber-600 dark:text-amber-500" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wide text-slate-700 dark:text-slate-300">
                Timeline Contratual
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {contract.start_date && (
                <Card variant="glass" className="p-4 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                    Data de Início
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {new Date(contract.start_date).toLocaleDateString('pt-BR')}
                  </p>
                </Card>
              )}
              {contract.renewal_date && (
                <Card variant="glass" className="p-4 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                    Renovação
                  </div>
                  <div className="space-y-1">
                    <p className={cn('text-sm font-bold', renewalColor)}>
                      {new Date(contract.renewal_date).toLocaleDateString('pt-BR')}
                    </p>
                    {daysUntilRenewal !== null && (
                      <p className="text-[10px] font-medium text-content-secondary">
                        {daysUntilRenewal < 0
                          ? `${Math.abs(daysUntilRenewal)}d expirado`
                          : daysUntilRenewal === 0
                            ? 'Hoje'
                            : `T-minus ${daysUntilRenewal}d`}
                      </p>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </section>

          {/* Seção de Termos */}
          <section className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-primary/10">
                <Percent className="w-4 h-4 text-primary" />
              </div>
              <h3 className="font-bold text-sm uppercase tracking-wide text-slate-700 dark:text-slate-300">
                Termos do Contrato
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {contract.contract_type && (
                <Card variant="glass" className="p-4 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                    Tipo
                  </div>
                  <p className="text-sm font-bold capitalize text-slate-700 dark:text-slate-300">
                    {contract.contract_type === 'initial'
                      ? 'Inicial'
                      : contract.contract_type === 'additive'
                        ? 'Aditivo'
                        : contract.contract_type === 'migration'
                          ? 'Migração'
                          : 'Renovação'}
                  </p>
                </Card>
              )}
              {contract.service_type && (
                <Card variant="glass" className="p-4 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                    Plano
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {contract.service_type}
                  </p>
                </Card>
              )}
              {contract.fidelity_months > 0 && (
                <Card variant="glass" className="p-4 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                    Fidelidade
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    {contract.fidelity_months} meses
                  </p>
                </Card>
              )}
              {contract.fine_amount > 0 && (
                <Card variant="glass" className="p-4 rounded-xl">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-content-secondary mb-2">
                    Multa Rescisória
                  </div>
                  <p className="text-sm font-bold text-red-600 dark:text-red-500">
                    {formatCurrency(contract.fine_amount)}
                  </p>
                </Card>
              )}
            </div>
          </section>

          {/* Notas Estratégicas */}
          {contract.notes && (
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
                  <AlertCircle className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Notas Estratégicas
                </h3>
              </div>
              <Card variant="glass" className="p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/20">
                <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-300">
                  {contract.notes}
                </p>
              </Card>
            </section>
          )}

          {/* Descontos Progressivos */}
          {contract.progressive_discounts && contract.progressive_discounts.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10">
                  <Percent className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                </div>
                <h3 className="font-bold text-sm uppercase tracking-wide text-slate-700 dark:text-slate-300">
                  Descontos Progressivos
                </h3>
              </div>
              <div className="space-y-2">
                {contract.progressive_discounts.map((discount: any, idx: number) => (
                  <Card key={idx} variant="glass" className="p-3 rounded-xl flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {discount.label}
                    </span>
                    <Badge variant="outline" className="font-bold text-amber-600 dark:text-amber-500 border-amber-200 dark:border-amber-500/30">
                      {discount.discount}{discount.type === 'percentage' ? '%' : ' R$'}
                    </Badge>
                  </Card>
                ))}
              </div>
            </section>
          )}
        </div>

        <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between rounded-b-2xl">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:text-[#2d3558] dark:hover:text-white"
          >
            Fechar
          </Button>
          <EditContractDialog contract={contract} triggerText="Editar Contrato" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
