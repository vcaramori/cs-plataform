'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Target, History, Info } from 'lucide-react'

type Account = { id: string; name: string }

interface ScopeSelectorBarProps {
  accounts: Account[]
  selectedAccountId: string
  setSelectedAccountId: (id: string) => void
  selectedAccount: Account | undefined
}

export function ScopeSelectorBar({
  accounts,
  selectedAccountId,
  setSelectedAccountId,
  selectedAccount,
}: ScopeSelectorBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 bg-surface-card border-b border-border-divider px-6 py-4 z-20">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-plannera-orange/10 flex items-center justify-center border border-plannera-orange/20 shadow-inner">
            <Target className="w-4 h-4 text-plannera-orange" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-content-primary">Contexto de Análise</span>
            <span className="text-[9px] font-bold text-content-secondary uppercase opacity-60">IA Generativa de Portfólio</span>
          </div>
        </div>
        <div className="w-64">
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
      
      <div className="hidden md:flex items-center gap-3">
        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-surface-card border border-transparent hover:border-border-divider transition-all">
          <History className="w-4 h-4 text-content-secondary" />
        </Button>
        <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-surface-card border border-transparent hover:border-border-divider transition-all">
          <Info className="w-4 h-4 text-content-secondary" />
        </Button>
      </div>
    </div>
  )
}
