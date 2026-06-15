'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AtividadesListView } from './AtividadesListView'
import { AtividadesKanbanView } from './AtividadesKanbanView'
import { CreateTaskModal } from './CreateTaskModal'
import { TaskDetailSheet } from './TaskDetailSheet'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { List, LayoutGrid, Plus, Trash2, RotateCcw, Users, Building2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CsmTask, CsmTaskStatus } from '@/lib/supabase/types'

interface Props {
  userId: string
  canViewTeam: boolean
}

type ViewMode = 'list' | 'kanban'
/** Escopo: 'mine' = minhas; 'all' = toda a equipe; ou um csm_id específico. */
type Scope = string

export function AtividadesClient({ userId, canViewTeam }: Props) {
  const supabase = getSupabaseBrowserClient()
  const searchParams = useSearchParams()
  const router = useRouter()
  const [tasks, setTasks] = useState<CsmTask[]>([])
  const [deletedTasks, setDeletedTasks] = useState<CsmTask[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [scope, setScope] = useState<Scope>('mine')
  const [csms, setCsms] = useState<{ id: string; full_name: string }[]>([])
  const [accountFilter, setAccountFilter] = useState<string | null>(() => searchParams.get('account'))
  const [accountName, setAccountName] = useState<string | null>(null)
  const [showTrash, setShowTrash] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<CsmTask | null>(null)
  const [detailTask, setDetailTask] = useState<CsmTask | null>(null)

  const db = supabase as any // TECH_DEBT #8: schema/tipos ainda divergem neste arquivo

  // Lista de CSMs para o filtro (só liderança escolhe outro CSM)
  useEffect(() => {
    if (!canViewTeam) return
    db.from('profiles').select('id, full_name').in('role', ['csm', 'csm_senior']).eq('is_active', true).order('full_name')
      .then(({ data }: any) => { if (data) setCsms(data.map((c: any) => ({ id: c.id, full_name: c.full_name ?? 'CSM' }))) })
  }, [db, canViewTeam])

  // Mantém o filtro em sincronia com a URL (?account=) ao navegar entre contas
  useEffect(() => { setAccountFilter(searchParams.get('account')) }, [searchParams])

  // Nome da conta filtrada (vinda de ?account= no link "Ver todas" do detalhe do cliente)
  useEffect(() => {
    if (!accountFilter) { setAccountName(null); return }
    db.from('accounts').select('name').eq('id', accountFilter).maybeSingle()
      .then(({ data }: any) => setAccountName(data?.name ?? null))
  }, [db, accountFilter])

  function clearAccountFilter() {
    setAccountFilter(null)
    router.replace('/atividades')
  }

  /** Aplica escopo (dono) + filtro de conta a uma query de csm_tasks. */
  const applyFilters = useCallback((q: any) => {
    let r = scope === 'all' ? q : q.eq('csm_id', scope === 'mine' ? userId : scope)
    if (accountFilter) r = r.eq('account_id', accountFilter)
    return r
  }, [scope, userId, accountFilter])

  const loadDeletedTasks = useCallback(async () => {
    const { data } = await applyFilters(
      db.from('csm_tasks').select('*, accounts(name)').not('deleted_at', 'is', null)
    ).order('deleted_at', { ascending: false }).limit(50)
    setDeletedTasks((data as CsmTask[]) ?? [])
  }, [db, applyFilters])

  const loadActiveTasks = useCallback(async () => {
    setLoading(true)
    const { data } = await applyFilters(
      db.from('csm_tasks').select('*, accounts(name)').is('deleted_at', null)
    ).order('due_date', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false })
    setTasks((data as CsmTask[]) ?? [])
    setLoading(false)
  }, [db, applyFilters])

  useEffect(() => {
    loadActiveTasks()
    loadDeletedTasks()
  }, [loadActiveTasks, loadDeletedTasks])

  // Realtime
  useEffect(() => {
    const targetId = scope === 'all' ? null : (scope === 'mine' ? userId : scope)
    const filter = targetId ? `csm_id=eq.${targetId}` : undefined

    const channel = (supabase as any)
      .channel(`csm_tasks_${scope}`)
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
  }, [supabase, userId, scope, loadActiveTasks, loadDeletedTasks])

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
      {/* Toolbar (fixa no topo ao rolar) */}
      <div className="sticky top-0 z-20 -mx-1 px-1 py-2 bg-background/85 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3 flex-wrap rounded-2xl border border-border-divider bg-surface-card/70 shadow-premium px-3 py-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle — só visível fora da lixeira */}
            {!showTrash && (
              <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
                <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0 rounded-lg', viewMode === 'list' && 'bg-surface-card shadow-sm')} onClick={() => setViewMode('list')}>
                  <List className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className={cn('h-7 w-7 p-0 rounded-lg', viewMode === 'kanban' && 'bg-surface-card shadow-sm')} onClick={() => setViewMode('kanban')}>
                  <LayoutGrid className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Filtro de CSM (só liderança escolhe outro) */}
            {canViewTeam && !showTrash && (
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-content-secondary" />
                <div className="w-52">
                  <SearchableSelect
                    value={scope}
                    onValueChange={setScope}
                    options={[
                      { label: 'Minhas atividades', value: 'mine' },
                      { label: 'Toda a equipe', value: 'all' },
                      ...csms.map(c => ({ label: c.full_name, value: c.id })),
                    ]}
                    placeholder="Filtrar por CSM"
                  />
                </div>
              </div>
            )}

            {/* Filtro de conta (vindo de ?account= no detalhe do cliente) */}
            {accountFilter && !showTrash && (
              <span className="flex items-center gap-1.5 h-7 px-2.5 rounded-xl bg-accent/10 border border-accent/30 text-accent text-[10px] font-black uppercase">
                <Building2 className="w-3 h-3" />
                {accountName ?? 'Conta'}
                <button onClick={clearAccountFilter} className="ml-0.5 hover:text-content-primary" aria-label="Remover filtro de conta">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {/* Lixeira toggle */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'h-7 gap-1.5 px-3 rounded-xl text-[10px] font-black uppercase',
                showTrash ? 'bg-destructive/10 text-destructive border border-destructive/20' : 'text-content-secondary hover:text-content-primary'
              )}
              onClick={() => setShowTrash(v => !v)}
            >
              <Trash2 className="w-3 h-3" />
              Lixeira
              {deletedTasks.length > 0 && (
                <span className={cn('ml-1 px-1.5 py-0 rounded-full text-[9px] font-black', showTrash ? 'bg-destructive/20' : 'bg-muted')}>
                  {deletedTasks.length}
                </span>
              )}
            </Button>
          </div>

          {!showTrash && (
            <Button size="sm" className="gap-1.5 h-9" onClick={() => { setEditTask(null); setModalOpen(true) }}>
              <Plus className="w-4 h-4" />
              Nova
            </Button>
          )}
        </div>
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
