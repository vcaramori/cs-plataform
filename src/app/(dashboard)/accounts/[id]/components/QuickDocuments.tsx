'use client'

import { ExternalLink, FolderOpen, FileText, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

// A URL base do SharePoint é configurada via variável de ambiente.
// Ex: NEXT_PUBLIC_SHAREPOINT_BASE_URL=https://suaempresa.sharepoint.com/sites/Clientes
const SHAREPOINT_BASE = process.env.NEXT_PUBLIC_SHAREPOINT_BASE_URL ?? ''

interface Props {
  accountName: string
}

export function QuickDocuments({ accountName }: Props) {
  const folderUrl = SHAREPOINT_BASE
    ? `${SHAREPOINT_BASE.replace(/\/$/, '')}/${encodeURIComponent(accountName)}`
    : null

  if (!SHAREPOINT_BASE) {
    return (
      <div className="p-5 rounded-2xl border border-dashed border-white/10 space-y-3 text-center">
        <FolderOpen className="w-8 h-8 text-slate-700 mx-auto" />
        <div>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wide">SharePoint não configurado</p>
          <p className="text-slate-700 text-[10px] mt-1 leading-relaxed">
            Defina <code className="text-slate-500">NEXT_PUBLIC_SHAREPOINT_BASE_URL</code> no <code className="text-slate-500">.env.local</code> para habilitar
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Link para a pasta do cliente */}
      <a
        href={folderUrl!}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex items-center justify-between p-4 rounded-2xl border border-white/5",
          "bg-plannera-sop/5 hover:bg-plannera-sop/10 hover:border-plannera-sop/20 transition-all group"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-plannera-sop/10 border border-plannera-sop/20 flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4 text-plannera-sop" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-bold uppercase tracking-tight truncate group-hover:text-plannera-sop transition-colors">
              {accountName}
            </p>
            <p className="text-slate-600 text-[9px] font-bold uppercase tracking-wide">Pasta do cliente · SharePoint</p>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-slate-500 group-hover:text-plannera-sop transition-colors shrink-0" />
      </a>

      {/* Atalhos de tipos de documento */}
      {[
        { label: 'Contratos',  icon: FileText, path: 'Contratos' },
        { label: 'Propostas',  icon: FileText, path: 'Propostas' },
      ].map(({ label, icon: Icon, path }) => (
        <a
          key={path}
          href={`${folderUrl}/${path}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between px-4 py-3 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Icon className="w-3.5 h-3.5 text-slate-500 group-hover:text-white transition-colors" />
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wide group-hover:text-white transition-colors">
              {label}
            </span>
          </div>
          <ExternalLink className="w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
        </a>
      ))}

      {/* Nota de segurança */}
      <div className="flex items-center gap-2 px-2 pt-1 opacity-40">
        <Shield className="w-3 h-3 text-slate-500 shrink-0" />
        <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wide">Protocolo de segurança Microsoft 365 ativo</span>
      </div>
    </div>
  )
}
