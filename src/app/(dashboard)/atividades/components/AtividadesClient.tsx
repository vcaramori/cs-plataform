'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AtividadesListView } from './AtividadesListView'
import { AtividadesKanbanView } from './AtividadesKanbanView'
import { CreateTaskModal } from './CreateTaskModal'
import { List, LayoutGrid, Plus, Users, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CsmTask, CsmTaskStatus } from '@/lib/supabase/types'

interface Props {
  userId: string
  canViewTeam: boolean
}

type ViewMode = 'list' | 'kanban'
type TeamFilter = 'mine' | 'team'

export function AtividadesClient({ userId, canViewTeam }: Props) {
  const supabase = getSupabaseBrowserClient()
  const [tasks, setTasks] = useState<CsmTask[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('mine')
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<CsmTask | null>(null)

  const db = supabase as any

  const loadTasks = useCallback(async () => {
    setLoading(true)
    let query = db
      .from('csm_tasks')
      .select('*, accounts(name)')
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    if (teamFilter === 'mine') {
      query = query.eq('csm_id', userId)
    }

    const { data } = await query
    setTasks((data as CsmTask[]) ?? [])
    setLoading(false)
  }, [db, userId, teamFilter])

  useEffect(() => {
    loadTasks()
  }, [loadTasks])

  // Realtime: canal diferente dependendo do filtro (bug do Supabase RT com filter)
  useEffect(() => {
    const channelName = `csm_tasks_${teamFilter}`
    const filter = teamFilter === 'mine' ? `csm_id=eq.${userId}` : undefined

    const channel = (supabase as any)
      .channel(channelName)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'csm_tasks',
        ...(filter ? { filter } : {}),
      }, () => {
        loadTasks()
      })
      .subscribe()

    return () => { (supabase as any).removeChannel(channel) }
  }, [supabase, userId, teamFilter, loadTasks])

  async function handleStatusChange(id: string, status: CsmTaskStatus) {
    const payload: Record<string, any> = { status }
    if (status === 'completed') payload.completed_at = new Date().toISOString()
    if (status !== 'completed') payload.completed_at = null

    await (supabase as any).from('csm_tasks').update(payload).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...payload } : t))
  }

  async function handleDelete(id: string) {
    await (supabase as any).from('csm_tasks').delete().eq('id', id)
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  function handleEdit(task: CsmTask) {
    setEditTask(task)
    setModalOpen(true)
  }

  function handleSaved(task: CsmTask) {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === task.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = task
        return next
      }
      return [task, ...prev]
    })
    setEditTask(null)
  }

  const suggestedCount = tasks.filter(t => t.status === 'suggested').length

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 w-7 p-0 rounded-lg', viewMode === 'list' && 'bg-surface-card shadow-sm')}
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn('h-7 w-7 p-0 rounded-lg', viewMode === 'kanban' && 'bg-surface-card shadow-sm')}
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
          </div>

          {/* Team filter — só visível para quem tem view_team */}
          {canViewTeam && (
            <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-7 gap-1.5 px-2 rounded-lg text-[10px] font-black uppercase', teamFilter === 'mine' && 'bg-surface-card shadow-sm')}
                onClick={() => setTeamFilter('mine')}
              >
                <User className="w-3 h-3" />
                Minhas
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-7 gap-1.5 px-2 rounded-lg text-[10px] font-black uppercase', teamFilter === 'team' && 'bg-surface-card shadow-sm')}
                onClick={() => setTeamFilter('team')}
              >
                <Users className="w-3 h-3" />
                Equipe
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {suggestedCount > 0 && (
            <span className="text-[10px] font-black text-accent bg-accent/10 border border-accent/20 px-3 py-1.5 rounded-full">
              {suggestedCount} sugest{suggestedCount === 1 ? 'ão' : 'ões'} da IA
            </span>
          )}
          <Button
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => { setEditTask(null); setModalOpen(true) }}
          >
            <Plus className="w-4 h-4" />
            Nova
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <AtividadesListView
          tasks={tasks}
          onEdit={handleEdit}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      ) : (
        <AtividadesKanbanView
          tasks={tasks}
          onEdit={handleEdit}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
        />
      )}

      <CreateTaskModal
        open={modalOpen}
        onOpenChange={open => { setModalOpen(open); if (!open) setEditTask(null) }}
        onSaved={handleSaved}
        editTask={editTask}
      />
    </div>
  )
}
