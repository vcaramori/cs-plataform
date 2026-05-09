import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { AlertCircle, AlertTriangle, ArrowDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UrgencyBadgeProps {
  score: 'high' | 'medium' | 'low' | null
  reasoning?: any // jsonb from postgres
  className?: string
}

/**
 * Renders a premium urgency badge with AI reasoning in a tooltip.
 * Aligns with the Guardians design system.
 */
export const UrgencyBadge: React.FC<UrgencyBadgeProps> = ({ score, reasoning, className }) => {
  if (!score) return null

  const config = {
    high: {
      color: 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20',
      icon: <AlertCircle className="w-3.5 h-3.5 mr-1" />,
      label: 'Urgência Alta'
    },
    medium: {
      color: 'bg-warning/10 text-warning border-warning-500/20 hover:bg-warning/20',
      icon: <AlertTriangle className="w-3.5 h-3.5 mr-1" />,
      label: 'Urgência Média'
    },
    low: {
      color: 'bg-success/10 text-success border-success-500/20 hover:bg-success/20',
      icon: <ArrowDown className="w-3.5 h-3.5 mr-1" />,
      label: 'Urgência Baixa'
    }
  }

  const { color, icon, label } = config[score]
  const reasoningText = typeof reasoning === 'object' ? reasoning?.text : reasoning

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={cn(
              "font-medium px-2.5 py-0.5 rounded-full transition-colors cursor-help border shadow-sm",
              color,
              className
            )}
          >
            {icon}
            {label}
          </Badge>
        </TooltipTrigger>
        {reasoningText && (
          <TooltipContent side="top" align="center" className="max-w-xs bg-slate-900 text-slate-100 border-slate-800 p-3 shadow-xl">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Análise da IA</p>
              <p className="text-xs leading-relaxed italic">"{reasoningText}"</p>
            </div>
          </TooltipContent>
        )}
      </Tooltip>
    </TooltipProvider>
  )
}
