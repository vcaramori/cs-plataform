'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Target, FileDown, Zap, Scale, Compass } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RAGMode = 'precise' | 'balanced' | 'explorative'

type Account = { id: string; name: string }

interface ScopeSelectorBarProps {
  accounts: Account[]
  selectedAccountId: string
  setSelectedAccountId: (id: string) => void
  selectedAccount: Account | undefined
  ragMode: RAGMode
  setRagMode: (mode: RAGMode) => void
  onExport: () => void
  hasMessages: boolean
}

const RAG_MODES: { value: RAGMode; label: string; icon: typeof Zap; description: string }[] = [
  { value: 'precise', label: 'Preciso', icon: Zap, description: 'Respostas conservadoras com alta confiança' },
  { value: 'balanced', label: 'Balanceado', icon: Scale, description: 'Equilíbrio entre precisão e profundidade' },
  { value: 'explorative', label: 'Explorativo', icon: Compass, description: 'Busca ampla, mais contexto e criatividade' },
]

export function ScopeSelectorBar({
  accounts,
  selectedAccountId,
  setSelectedAccountId,
  selectedAccount,
  ragMode,
  setRagMode,
  onExport,
  hasMessages,
}: ScopeSelectorBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-card border-b border-border-divider px-4 py-2 z-20">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-plannera-orange/10 flex items-center justify-center border border-plannera-orange/20 shadow-inner">
            <Target className="w-4 h-4 text-plannera-orange" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-content-primary">Contexto de Análise</span>
            <span className="text-[9px] font-bold text-content-secondary uppercase opacity-60">IA Generativa de Portfólio</span>
          </div>
        </div>
        <div className="w-56">
          <SearchableSelect
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
            options={[
              { label: 'TODO O PORTFÓLIO', value: 'all' },
              ...accounts.map(a => ({ label: a.name.toUpperCase(), value: a.id }))
            ]}
          />
        </div>
        {selectedAccount && (
          <Badge className="bg-plannera-orange/10 text-plannera-orange border-plannera-orange/20 px-3 py-1 font-black uppercase tracking-widest text-[9px] animate-in fade-in slide-in-from-left-2 duration-300">
            {selectedAccount.name}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* RAG Mode Selector */}
        <div className="flex items-center bg-surface-background/50 border border-border-divider rounded-2xl p-1 gap-0.5">
          {RAG_MODES.map(mode => {
            const Icon = mode.icon
            return (
              <button
                key={mode.value}
                onClick={() => setRagMode(mode.value)}
                title={mode.description}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all',
                  ragMode === mode.value
                    ? 'bg-plannera-orange text-white shadow-lg shadow-plannera-orange/20'
                    : 'text-content-secondary hover:text-plannera-orange opacity-60 hover:opacity-100'
                )}
              >
                <Icon className="w-3 h-3" />
                {mode.label}
              </button>
            )
          })}
        </div>

        {/* Export PDF */}
        {hasMessages && (
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-9 px-3 text-[9px] font-black uppercase tracking-widest border-border-divider hover:bg-surface-card gap-1.5 rounded-xl"
          >
            <FileDown className="w-3.5 h-3.5" />
            Exportar
          </Button>
        )}
      </div>
    </div>
  )
}
