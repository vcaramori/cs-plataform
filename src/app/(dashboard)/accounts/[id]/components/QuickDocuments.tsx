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
      <div className="p-5 rounded-2xl border border-dashed border-border-divider space-y-3 text-center">
        <FolderOpen className="w-8 h-8 text-content-secondary mx-auto opacity-40" />
        <div>
          <p className="text-content-secondary text-xs font-bold uppercase tracking-wide">SharePoint não configurado</p>
          <p className="text-content-secondary text-[10px] mt-1 leading-relaxed opacity-60">
            Defina <code className="opacity-80">NEXT_PUBLIC_SHAREPOINT_BASE_URL</code> no <code className="opacity-80">.env.local</code> para habilitar
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
          "flex items-center justify-between p-4 rounded-2xl border border-border-divider",
          "bg-plannera-sop/5 hover:bg-plannera-sop/10 hover:border-plannera-sop/20 transition-all group"
        )}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-plannera-sop/10 border border-plannera-sop/20 flex items-center justify-center shrink-0">
            <FolderOpen className="w-4 h-4 text-plannera-sop" />
          </div>
          <div className="min-w-0">
            <p className="text-content-primary text-xs font-bold uppercase tracking-tight truncate group-hover:text-plannera-sop transition-colors">
              {accountName}
            </p>
            <p className="text-content-secondary text-[9px] font-bold uppercase tracking-wide">Pasta do cliente · SharePoint</p>
          </div>
        </div>
        <ExternalLink className="w-4 h-4 text-content-secondary group-hover:text-plannera-sop transition-colors shrink-0" />
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
          className="flex items-center justify-between px-4 py-3 rounded-xl border border-border-divider bg-surface-background hover:bg-surface-card hover:border-border-divider transition-all group"
        >
          <div className="flex items-center gap-2.5">
            <Icon className="w-3.5 h-3.5 text-content-secondary group-hover:text-content-primary transition-colors" />
            <span className="text-content-secondary text-[10px] font-bold uppercase tracking-wide group-hover:text-content-primary transition-colors">
              {label}
            </span>
          </div>
          <ExternalLink className="w-3 h-3 text-content-secondary opacity-40 group-hover:opacity-100 transition-opacity" />
        </a>
      ))}

      {/* Nota de segurança */}
      <div className="flex items-center gap-2 px-2 pt-1 opacity-40">
        <Shield className="w-3 h-3 text-content-secondary shrink-0" />
        <span className="text-[9px] text-content-secondary font-bold uppercase tracking-wide">Protocolo de segurança Microsoft 365 ativo</span>
      </div>
    </div>
  )
}
