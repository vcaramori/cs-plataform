'use client'

import { Card, CardContent } from '@/components/ui/card'
import { FileText, Download, ExternalLink } from 'lucide-react'

interface Contract {
  id: string
  service_type: string
  status: string
  contract_type: string | null
}

export function QuickDocuments({ contracts }: { contracts: Contract[] }) {
  return (
    <div className="space-y-2">
      {contracts.length === 0 ? (
        <p className="text-slate-600 text-[10px] text-center py-4 italic">Nenhum documento disponível.</p>
      ) : (
        contracts.slice(0, 3).map(c => (
          <div 
            key={c.id} 
            className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800/50 hover:border-indigo-500/50 transition-colors group"
          >
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="p-1.5 rounded bg-slate-900 text-slate-400 group-hover:text-indigo-400 transition-colors">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-white text-xs font-bold truncate">Contrato_{c.service_type}</span>
                <span className="text-[9px] text-slate-500 uppercase font-black">{c.contract_type || 'Geral'}</span>
              </div>
            </div>
            <button className="text-slate-500 hover:text-white transition-colors">
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        ))
      )}
    </div>
  )
}
