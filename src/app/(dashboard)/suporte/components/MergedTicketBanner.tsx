'use client'

import React from 'react'
import { Link2, Info } from 'lucide-react'
import Link from 'next/link'

interface MergedTicketBannerProps {
  primaryTicketId: string
  mergedAt: string
}

export function MergedTicketBanner({ primaryTicketId, mergedAt }: MergedTicketBannerProps) {
  return (
    <div className="bg-amber-50 dark:bg-amber-950/20 border border-warning-200 dark:border-warning-900/50 rounded-2xl p-4 mb-6 flex gap-4 items-start shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
        <Link2 className="w-5 h-5 text-amber-600 dark:text-amber-400" />
      </div>
      <div className="flex-1 space-y-1">
        <h4 className="font-semibold text-amber-900 dark:text-amber-300 flex items-center gap-2">
          Ticket Mesclado
          <Info className="w-3 h-3 opacity-50" />
        </h4>
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Este ticket foi mesclado em outro chamado em {new Date(mergedAt).toLocaleDateString()} às {new Date(mergedAt).toLocaleTimeString()}.
        </p>
        <Link 
          href={`/suporte/${primaryTicketId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-800 dark:text-amber-200 hover:underline mt-2"
        >
          Ver Ticket Principal
          <Link2 className="w-3 h-3" />
        </Link>
      </div>
    </div>
  )
}
