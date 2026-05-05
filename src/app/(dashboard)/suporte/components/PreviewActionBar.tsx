'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { 
  CheckCircle2, 
  Clock, 
  UserPlus, 
  MoreHorizontal,
  ExternalLink,
  Merge
} from 'lucide-react'
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

interface PreviewActionBarProps {
  ticketId: string
  status: string
  onStatusChange: (newStatus: string) => void
  onAssignMe: () => void
  onMerge: () => void
  isUpdating?: boolean
}

export const PreviewActionBar: React.FC<PreviewActionBarProps> = ({
  ticketId,
  status,
  onStatusChange,
  onAssignMe,
  onMerge,
  isUpdating = false
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-surface-border bg-surface-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-2">
        {status !== 'resolved' && status !== 'closed' ? (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-2 border-green-500/30 text-green-600 hover:bg-green-50"
            onClick={() => onStatusChange('resolved')}
            disabled={isUpdating}
          >
            <CheckCircle2 className="w-4 h-4" />
            Resolver
          </Button>
        ) : (
          <Button 
            variant="outline" 
            size="sm" 
            className="h-8 gap-2"
            onClick={() => onStatusChange('reopened')}
            disabled={isUpdating}
          >
            <Clock className="w-4 h-4" />
            Reabrir
          </Button>
        )}

        <Button 
          variant="ghost" 
          size="sm" 
          className="h-8 gap-2 text-muted-foreground"
          onClick={onAssignMe}
          disabled={isUpdating}
        >
          <UserPlus className="w-4 h-4" />
          Atribuir a mim
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Link href={`/suporte/${ticketId}`} passHref>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Abrir ticket completo">
            <ExternalLink className="w-4 h-4" />
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onStatusChange('in_progress')}>
              Marcar em progresso
            </DropdownMenuItem>
            
            {status !== 'closed' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onMerge} className="gap-2">
                  <Merge className="w-4 h-4" />
                  Mesclar Ticket
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Excluir Ticket
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
