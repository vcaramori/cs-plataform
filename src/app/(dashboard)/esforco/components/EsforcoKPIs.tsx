'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Textarea } from '@/components/ui/textarea'
import { Target, Zap, ListFilter, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { Label } from '@/components/ui/label'

interface EsforcoKPIsProps {
  selectedAccountId: string
  onAccountChange: (id: string) => void
  accounts: any[]
  text: string
  onTextChange: (text: string) => void
  onSubmit: () => void
  isSubmitting: boolean
  examples: string[]
}

const activityLabels: Record<string, string> = {
  preparation: 'Preparação de material',
  'environment-analysis': 'Análise de ambiente',
  strategy: 'Estratégia',
  reporting: 'Relatório',
  'internal-meeting': 'Reunião interna',
  meeting: 'Reunião com cliente',
  onboarding: 'Implantação / Onboarding',
  qbr: 'QBR / Sucesso',
  other: 'Outro',
}

export function EsforcoKPIs({
  selectedAccountId,
  onAccountChange,
  accounts,
  text,
  onTextChange,
  onSubmit,
  isSubmitting,
  examples
}: EsforcoKPIsProps) {
  return (
    <Card variant="glass" className="border-border-divider shadow-2xl relative overflow-hidden group rounded-2xl bg-surface-card/80 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-plannera-primary/[0.05] to-transparent pointer-events-none" />

      <CardHeader className="pb-4 pt-12 px-12">
        <CardTitle className="text-2xl font-black uppercase tracking-tighter text-content-primary flex items-center gap-5">
          <div className="p-4 rounded-[1.25rem] bg-plannera-primary/10 border border-plannera-primary/20 group-hover:scale-105 transition-transform shadow-lg shadow-plannera-primary/10">
            <Sparkles className="w-6 h-6 text-plannera-primary" />
          </div>
          Inteligência de Esforço
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-12 px-12 pb-12 relative z-10">
        <div className="space-y-5">
          <div className="flex items-center gap-3 mb-1 ml-2">
            <Target className="w-4 h-4 text-plannera-primary" />
            <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary">Contexto do Cliente</Label>
          </div>
          <SearchableSelect
            value={selectedAccountId}
            onValueChange={onAccountChange}
            className="h-14 rounded-2xl bg-surface-background/50 border-border-divider shadow-inner text-sm font-bold uppercase tracking-tight"
            options={[
              {
                label: 'IDENTIFICAR POR I.A (RECOMENDADO)',
                value: 'all',
                className: "bg-surface-card border-border-divider text-plannera-primary font-black"
              },
              ...accounts.map((a) => ({ label: a.name.toUpperCase(), value: a.id }))
            ]}
          />
        </div>

        <div className="space-y-5 relative">
          <div className="flex items-center justify-between mb-1 ml-2 group/label">
            <div className="flex items-center gap-3">
              <Zap className="w-4 h-4 text-plannera-orange" />
              <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary">Relato de Atividade</Label>
            </div>
            <button
              type="button"
              onClick={() => onTextChange(examples[Math.floor(Math.random() * examples.length)])}
              className="text-[9px] font-black text-plannera-primary hover:text-plannera-orange uppercase tracking-[0.2em] opacity-0 group-hover/label:opacity-100 transition-all"
            >
              Sugestão Aleatória
            </button>
          </div>

          <div className="relative group/input">
            <div className="absolute -inset-1 bg-gradient-to-r from-plannera-primary/20 to-plannera-orange/20 rounded-2xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity pointer-events-none" />
            <Textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Descreva o que foi feito em liguagem natural... ex: 'Passei 45min em reunião de estratégia com a Empresa X'"
              rows={5}
              className="relative bg-surface-background/50 border-border-divider text-content-primary placeholder:text-content-secondary/20 font-bold tracking-tight text-lg p-8 rounded-2xl focus-visible:ring-plannera-primary/20 resize-none transition-all shadow-inner border-2"
            />
          </div>
        </div>

        {/* Smart Suggestions */}
        <div className="space-y-5">
          <div className="flex items-center gap-3 ml-2">
            <ListFilter className="w-4 h-4 text-content-secondary/30" />
            <span className="text-[9px] font-black uppercase tracking-[0.25em] text-content-secondary opacity-50">Explorações sugeridas:</span>
          </div>
          <div className="flex flex-wrap gap-3">
            {examples.map((ex, idx) => (
              <motion.button
                key={ex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                type="button"
                onClick={() => onTextChange(ex)}
                className="text-[9px] font-black text-content-secondary hover:text-plannera-primary bg-surface-background/30 hover:bg-white/5 px-5 py-2.5 rounded-xl border border-border-divider/50 transition-all text-left uppercase tracking-tight shadow-sm hover:scale-105 active:scale-95"
              >
                {ex.split(' ').slice(0, 4).join(' ')}...
              </motion.button>
            ))}
          </div>
        </div>

        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !text.trim()}
          className="w-full h-20 bg-plannera-orange hover:bg-plannera-orange/90 text-white shadow-2xl shadow-plannera-orange/20 group active:scale-[0.98] rounded-2xl font-black transition-all"
        >
          {isSubmitting ? (
            <><Loader2 className="w-6 h-6 animate-spin mr-3" /> Processando Inteligência...</>
          ) : (
            <span className="flex items-center gap-5 text-[11px] tracking-[0.3em]">
              REGISTRAR PRODUÇÃO DE CS
              <ChevronRight className="w-5 h-5 text-white/50 group-hover:translate-x-2 transition-transform" />
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
