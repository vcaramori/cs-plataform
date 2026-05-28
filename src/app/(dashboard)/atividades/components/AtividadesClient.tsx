'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AtividadesListView } from './AtividadesListView'
import { AtividadesKanbanView } from './AtividadesKanbanView'
import { CreateTaskModal } from './CreateTaskModal'
import { TaskDetailSheet } from './TaskDetailSheet'
import { List, LayoutGrid, Plus, Users, User, Trash2, RotateCcw } from 'lucide-react'
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
  const [deletedTasks, setDeletedTasks] = useState<CsmTask[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [teamFilter, setTeamFilter] = useState<TeamFilter>('mine')
  const [showTrash, setShowTrash] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<CsmTask | null>(null)
  const [detailTask, setDetailTask] = useState<CsmTask | null>(null)

  const db = supabase as any

  const loadTasks = useCallback(async () => {
    setLoading(true)

    let baseQuery = db
      .from('csm_tasks')
      .select('*, accounts(name)')

    if (teamFilter === 'mine') {
      baseQuery = baseQuery.eq('csm_id', userId)
    }

    // Tarefas ativas
    const { data: active } = await baseQuery
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false })

    // Tarefas excluídas (lixeira)
    const { data: deleted } = await db
      .from('csm_tasks')
      .select('*, accounts(name)')
      .not('deleted_at', 'is', null)
      .eq(teamFilter === 'mine' ? 'csm_id' : 'id', teamFilter === 'mine' ? userId : db.rpc)
      .order('deleted_at', { ascending: false })
      .limit(50)

    setTasks((active as CsmTask[]) ?? [])
    setDeletedTasks((deleted as CsmTask[]) ?? [])
    setLoading(false)
  }, [db, userId, teamFilter])

  // Query separada para lixeira respeitando filtro de equipe
  const loadDeletedTasks = useCallback(async () => {
    let query = db
      .from('csm_tasks')
      .select('*, accounts(name)')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(50)

    if (teamFilter === 'mine') {
      query = query.eq('csm_id', userId)
    }

    const { data } = await query
    setDeletedTasks((data as CsmTask[]) ?? [])
  }, [db, userId, teamFilter])

  const loadActiveTasks = useCallback(async () => {
    setLoading(true)
    let query = db
      .from('csm_tasks')
      .select('*, accounts(name)')
      .is('deleted_at', null)
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
    loadActiveTasks()
    loadDeletedTasks()
  }, [loadActiveTasks, loadDeletedTasks])

  // Realtime
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
        loadActiveTasks()
        loadDeletedTasks()
      })
      .subscribe()

    return () => { (supabase as any).removeChannel(channel) }
  }, [supabase, userId, teamFilter, loadActiveTasks, loadDeletedTasks])

  async function handleStatusChange(id: string, status: CsmTaskStatus) {
    const payload: Record<string, any> = { status }
    if (status === 'completed') payload.completed_at = new Date().toISOString()
    else payload.completed_at = null

    await db.from('csm_tasks').update(payload).eq('id', id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...payload } : t))
  }

  async function handleDelete(id: string) {
    const deleted_at = new Date().toISOString()
    await db.from('csm_tasks').update({ deleted_at }).eq('id', id)
    const task = tasks.find(t => t.id === id)
    setTasks(prev => prev.filter(t => t.id !== id))
    if (task) setDeletedTasks(prev => [{ ...task, deleted_at }, ...prev])
  }

  async function handleRestore(id: string) {
    await db.from('csm_tasks').update({ deleted_at: null }).eq('id', id)
    const task = deletedTasks.find(t => t.id === id)
    setDeletedTasks(prev => prev.filter(t => t.id !== id))
    if (task) setTasks(prev => [{ ...task, deleted_at: null }, ...prev])
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

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          {/* View toggle — só visível fora da lixeira */}
          {!showTrash && (
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
          )}

          {/* Team filter */}
          {canViewTeam && !showTrash && (
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

          {/* Lixeira toggle */}
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-7 gap-1.5 px-3 rounded-xl text-[10px] font-black uppercase',
              showTrash
                ? 'bg-destructive/10 text-destructive border border-destructive/20'
                : 'text-content-secondary hover:text-content-primary'
            )}
            onClick={() => setShowTrash(v => !v)}
          >
            <Trash2 className="w-3 h-3" />
            Lixeira
            {deletedTasks.length > 0 && (
              <span className={cn(
                'ml-1 px-1.5 py-0 rounded-full text-[9px] font-black',
                showTrash ? 'bg-destructive/20' : 'bg-muted'
              )}>
                {deletedTasks.length}
              </span>
            )}
          </Button>
        </div>

        {!showTrash && (
          <Button
            size="sm"
            className="gap-1.5 h-9"
            onClick={() => { setEditTask(null); setModalOpen(true) }}
          >
            <Plus className="w-4 h-4" />
            Nova
          </Button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : showTrash ? (
        <TrashView tasks={deletedTasks} onRestore={handleRestore} />
      ) : viewMode === 'list' ? (
        <AtividadesListView
          tasks={tasks}
          onEdit={handleEdit}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onOpenDetail={setDetailTask}
        />
      ) : (
        <AtividadesKanbanView
          tasks={tasks}
          onEdit={handleEdit}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onOpenDetail={setDetailTask}
        />
      )}

      <CreateTaskModal
        open={modalOpen}
        onOpenChange={open => { setModalOpen(open); if (!open) setEditTask(null) }}
        onSaved={handleSaved}
        editTask={editTask}
      />

      <TaskDetailSheet
        task={detailTask}
        open={!!detailTask}
        onOpenChange={open => { if (!open) setDetailTask(null) }}
        onEdit={task => { setDetailTask(null); handleEdit(task) }}
        onStatusChange={(id, status) => {
          handleStatusChange(id, status)
          if (detailTask?.id === id) setDetailTask(prev => prev ? { ...prev, status } : prev)
        }}
      />
    </div>
  )
}

function TrashView({ tasks, onRestore }: { tasks: CsmTask[]; onRestore: (id: string) => void }) {
  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-content-secondary">
        <Trash2 className="w-8 h-8 opacity-20 mb-3" />
        <p className="text-sm font-semibold">Lixeira vazia</p>
        <p className="text-xs mt-1 opacity-60">Atividades excluídas aparecem aqui.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-content-secondary mb-4">
        Atividades excluídas logicamente. Restaure qualquer uma para que ela volte ao fluxo normal.
      </p>
      {tasks.map(task => (
        <div
          key={task.id}
          className="flex items-center justify-between gap-3 bg-surface-card border border-border-divider rounded-2xl px-4 py-3 opacity-60 hover:opacity-100 transition-opacity"
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-content-primary truncate line-through">{task.title}</p>
            <p className="text-[10px] text-content-secondary mt-0.5">
              {task.accounts?.name && <span>{task.accounts.name} · </span>}
              Excluída em {new Date(task.deleted_at!).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-7 text-[10px] font-black uppercase flex-shrink-0"
            onClick={() => onRestore(task.id)}
          >
            <RotateCcw className="w-3 h-3" />
            Restaurar
          </Button>
        </div>
      ))}
    </div>
  )
}
