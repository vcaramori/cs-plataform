'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Plus,
  Trash2,
  List,
  AlertCircle,
  User,
  CheckCircle,
  Star,
  Clock,
  Zap,
  Filter,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { SavedViewResponseSchema } from '@/lib/schemas/savedView.schema'
import { ViewCreationPopover } from './ViewCreationPopover'
import { z } from 'zod'

type SavedView = z.infer<typeof SavedViewResponseSchema>

const DEFAULT_VIEWS = [
  { id: 'all-tickets', name: 'Todos', icon: 'list' as const },
  { id: 'my-tickets', name: 'Meus tickets', icon: 'user' as const },
  { id: 'sla-at-risk', name: 'SLA em risco', icon: 'alert' as const },
  { id: 'unassigned', name: 'Não atribuídos', icon: 'clock' as const },
]

const ICON_MAP = {
  list: List,
  alert: AlertCircle,
  user: User,
  checkmark: CheckCircle,
  star: Star,
  clock: Clock,
  zap: Zap,
  filter: Filter,
}

interface SavedViewSidebarProps {
  savedViews: SavedView[]
  userId: string
  tickets: any[]
}

export function SavedViewSidebar({
  savedViews,
  userId,
  tickets,
}: SavedViewSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showAllViews, setShowAllViews] = useState(false)

  const activeViewId = searchParams.get('view') ?? 'all-tickets'

  const calculateCount = (viewId: string): number => {
    switch (viewId) {
      case 'all-tickets':
        return tickets.length
      case 'my-tickets':
        return tickets.filter((t) => t.assigned_to === userId).length
      case 'sla-at-risk':
        return tickets.filter((t) =>
          ['atencao', 'vencido'].includes(t.sla_status)
        ).length
      case 'unassigned':
        return tickets.filter((t) => !t.assigned_to).length
      default:
        return 0
    }
  }

  const handleSelectView = (viewId: string) => {
    router.push(`/suporte?view=${viewId}`)
  }

  const handleDeleteView = async (viewId: string) => {
    setIsDeleting(viewId)
    try {
      const response = await fetch(`/api/saved-views/${viewId}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        router.refresh()
        if (activeViewId === viewId) {
          router.push('/suporte?view=all-tickets')
        }
      }
    } catch (err) {
      console.error('Failed to delete view:', err)
    } finally {
      setIsDeleting(null)
    }
  }

  const visibleSavedViews = showAllViews ? savedViews : savedViews.slice(0, 8)
  const hasMoreViews = savedViews.length > 8

  return (
    <div
      className={`bg-surface-card border-r border-border-divider flex flex-col sticky top-14 md:top-0 h-[calc(100vh-3.5rem)] md:h-screen transition-all duration-300 ${
        isCollapsed ? 'w-14' : 'w-56'
      }`}
    >
      {/* Header with Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-border-divider/50 flex-shrink-0">
        {!isCollapsed && (
          <label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">
            Views
          </label>
        )}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-surface-background rounded transition-colors ml-auto"
          title={isCollapsed ? 'Expandir' : 'Colapsar'}
        >
          {isCollapsed ? (
            <ChevronRight className="w-4 h-4 text-content-secondary" />
          ) : (
            <ChevronLeft className="w-4 h-4 text-content-secondary" />
          )}
        </button>
      </div>

      {/* Content with Independent Scroll */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Default Views */}
        <div className="space-y-1 mb-4">
          {DEFAULT_VIEWS.map((view) => {
            const Icon = ICON_MAP[view.icon]
            const isActive = activeViewId === view.id
            const count = calculateCount(view.id)

            return (
              <button
                key={view.id}
                onClick={() => handleSelectView(view.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all group relative",
                  isActive
                    ? "bg-[#101623] border border-border/40 text-white shadow-lg"
                    : "text-content-secondary hover:bg-surface-background0/5 hover:text-content-primary"
                )}
                title={isCollapsed ? view.name : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                {!isCollapsed && (
                  <>
                    <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-left">{view.name}</span>
                    <span className="text-[10px] font-black text-content-secondary/60">
                      {count}
                    </span>
                  </>
                )}
              </button>
            )
          })}
        </div>

        {/* Divider */}
        {savedViews.length > 0 && !isCollapsed && (
          <div className="h-px bg-border-divider my-3" />
        )}

        {/* Saved Views */}
        {!isCollapsed && visibleSavedViews.length > 0 && (
          <div className="space-y-1">
            {visibleSavedViews.map((view) => {
              const Icon = ICON_MAP[view.icon as keyof typeof ICON_MAP]
              const isActive = activeViewId === view.id
              const count = tickets.filter((t) => {
                // Simple in-memory filter for MVP — counts tickets matching view filters
                // Full filtering logic will be in SuporteClient
                return true
              }).length

              return (
                <div
                  key={view.id}
                  className="group flex items-center gap-2 px-3 py-2"
                >
                  <button
                    onClick={() => handleSelectView(view.id)}
                    className={cn(
                      "flex-1 flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
                      isActive
                        ? "bg-[#101623] border border-border/40 text-white shadow-lg"
                        : "text-content-secondary hover:bg-surface-background0/5"
                    )}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="flex-1 text-[10px] font-black uppercase tracking-widest text-left truncate">
                      {view.name}
                    </span>
                    <span className="text-[10px] font-black text-content-secondary/60 flex-shrink-0">
                      {count}
                    </span>
                  </button>
                  <button
                    onClick={() => handleDeleteView(view.id)}
                    disabled={isDeleting === view.id}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/10 hover:text-destructive rounded transition-all disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* See All Views */}
        {!isCollapsed && hasMoreViews && !showAllViews && (
          <button
            onClick={() => setShowAllViews(true)}
            className="w-full mt-2 text-[11px] font-semibold text-content-secondary hover:text-content-primary px-3 py-1 rounded transition-colors"
          >
            Ver todas ({savedViews.length})
          </button>
        )}
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border-divider p-4 space-y-2 flex-shrink-0">
        {!isCollapsed && (
          <ViewCreationPopover
            open={isCreating}
            onOpenChange={setIsCreating}
          >
            <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface-background0/5 text-content-secondary hover:text-content-primary hover:bg-surface-background0/10 transition-all text-[10px] font-black uppercase tracking-widest border border-border/20">
              <Plus className="w-4 h-4" />
              Nova view
            </button>
          </ViewCreationPopover>
        )}
        {isCollapsed && (
          <ViewCreationPopover
            open={isCreating}
            onOpenChange={setIsCreating}
          >
            <button
              className="w-full flex items-center justify-center p-2 rounded-md text-content-secondary hover:text-content-primary hover:bg-surface-background transition-colors"
              title="Nova view"
            >
              <Plus className="w-4 h-4" />
            </button>
          </ViewCreationPopover>
        )}
      </div>
    </div>
  )
}
