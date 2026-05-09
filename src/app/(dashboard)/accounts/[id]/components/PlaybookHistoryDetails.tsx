'use client'

import { Target, Clock } from 'lucide-react'

interface PlaybookHistoryDetailsProps {
  playbook: any
}

export function PlaybookHistoryDetails({ playbook }: PlaybookHistoryDetailsProps) {
  const trigger = playbook.template?.name || 'Jornada de Sucesso'

  return (
    <div className="space-y-10">
      {/* Execution Context */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-surface-background dark:bg-slate-800/50 p-6 rounded-2xl border border-border-divider dark:border-slate-800 space-y-2">
          <p className="flex items-center gap-2 text-[9px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-[0.2em] ml-1">
            <Target className="w-3.5 h-3.5 text-success" /> Gatilho de Origem
          </p>
          <p className="text-[#2d3558] dark:text-white text-sm font-black tracking-tight pl-1">{trigger}</p>
        </div>
        <div className="bg-surface-background dark:bg-slate-800/50 p-6 rounded-2xl border border-border-divider dark:border-slate-800 space-y-2">
          <p className="flex items-center gap-2 text-[9px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-[0.2em] ml-1">
            <Clock className="w-3.5 h-3.5 text-success" /> Data de Encerramento
          </p>
          <p className="text-[#2d3558] dark:text-white text-sm font-black tracking-tight pl-1">
            {playbook.date ? new Date(playbook.date).toLocaleDateString('pt-BR') : 'Recentemente'}
          </p>
        </div>
      </div>

      {/* Objetivo (if exists) */}
      {playbook.objective && (
        <div className="bg-emerald-50 dark:bg-success/10 p-6 rounded-2xl border border-success-200 dark:border-success-500/20 space-y-2">
          <p className="flex items-center gap-2 text-[9px] text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-[0.2em] ml-1">
            <Target className="w-3.5 h-3.5" /> Objetivo
          </p>
          <p className="text-[#2d3558] dark:text-white text-sm font-medium pl-1">{playbook.objective}</p>
          {playbook.success_criteria && (
            <p className="text-[9px] text-content-secondary dark:text-content-secondary pl-1 mt-2">
              <strong>Critério de Sucesso:</strong> {playbook.success_criteria}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
