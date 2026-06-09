'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Target, FileDown } from 'lucide-react'

type Account = { id: string; name: string }

interface ScopeSelectorBarProps {
  accounts: Account[]
  selectedAccountId: string
  setSelectedAccountId: (id: string) => void
  selectedAccount: Account | undefined
  onExport: () => void
  hasMessages: boolean
}

export function ScopeSelectorBar({
  accounts,
  selectedAccountId,
  setSelectedAccountId,
  selectedAccount,
  onExport,
  hasMessages,
}: ScopeSelectorBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 z-20">
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
