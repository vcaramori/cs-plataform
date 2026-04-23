import * as React from "react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}

/**
 * Cabeçalho padronizado de seção. Substitui o padrão manual de
 * `<div className="flex ..."><h2 className="h2-section">...</h2></div>`
 * espalhado pelas telas.
 *
 * @example
 * <SectionHeader title="Contratos" subtitle="3 ativos" action={<Button>Novo</Button>} />
 */
function SectionHeader({ title, subtitle, action, className }: SectionHeaderProps) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="flex flex-col gap-0.5">
        <h2 className="h2-section">{title}</h2>
        {subtitle && (
          <p className="text-[11px] text-content-secondary">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export { SectionHeader }
export type { SectionHeaderProps }
