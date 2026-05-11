'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
  Handle,
  Position,
  BackgroundVariant,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  type NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import {
  Play, Mail, CheckSquare, AlertTriangle, BarChart2,
  GitBranch, Flag, Save, Loader2, Trash2, ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ─── Node type definitions ───────────────────────────────────────────────────

const NODE_DEFS = {
  start: {
    label: 'Início', icon: Play,
    colors: 'bg-emerald-500/10 border-emerald-500',
    textColor: 'text-emerald-600',
    group: 'trigger',
  },
  send_email: {
    label: 'Enviar E-mail', icon: Mail,
    colors: 'bg-blue-500/10 border-blue-500',
    textColor: 'text-blue-600',
    group: 'action',
  },
  create_task: {
    label: 'Criar Tarefa', icon: CheckSquare,
    colors: 'bg-indigo-500/10 border-indigo-500',
    textColor: 'text-indigo-600',
    group: 'action',
  },
  fire_alert: {
    label: 'Disparar Alerta', icon: AlertTriangle,
    colors: 'bg-orange-500/10 border-orange-500',
    textColor: 'text-orange-600',
    group: 'action',
  },
  change_status: {
    label: 'Alterar Status', icon: BarChart2,
    colors: 'bg-purple-500/10 border-purple-500',
    textColor: 'text-purple-600',
    group: 'action',
  },
  condition: {
    label: 'Condição', icon: GitBranch,
    colors: 'bg-amber-500/10 border-amber-500',
    textColor: 'text-amber-600',
    group: 'condition',
  },
  end: {
    label: 'Fim', icon: Flag,
    colors: 'bg-red-500/10 border-red-500',
    textColor: 'text-red-600',
    group: 'end',
  },
} as const

type NodeDef = keyof typeof NODE_DEFS

const SIDEBAR_GROUPS = [
  { label: 'Gatilho', items: ['start'] as NodeDef[] },
  { label: 'Ações', items: ['send_email', 'create_task', 'fire_alert', 'change_status'] as NodeDef[] },
  { label: 'Lógica', items: ['condition'] as NodeDef[] },
  { label: 'Fim', items: ['end'] as NodeDef[] },
]

// ─── Custom node component ────────────────────────────────────────────────────

function PlaybookNode({ data, selected }: NodeProps) {
  const def = NODE_DEFS[data.nodeType as NodeDef] ?? NODE_DEFS.send_email
  const Icon = def.icon
  const isStart = data.nodeType === 'start'
  const isEnd = data.nodeType === 'end'

  return (
    <div className={cn(
      'px-4 py-3 rounded-xl border-2 min-w-[160px] shadow-sm transition-shadow',
      'bg-surface-card dark:bg-surface-card',
      def.colors,
      selected && 'ring-2 ring-plannera-orange ring-offset-1 shadow-md',
    )}>
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-border-divider !border-2 !border-surface-card"
        />
      )}
      <div className="flex items-center gap-2">
        <Icon className={cn('w-4 h-4 shrink-0', def.textColor)} />
        <span className="text-[11px] font-bold text-content-primary whitespace-nowrap">
          {data.label}
        </span>
      </div>
      {!isEnd && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-border-divider !border-2 !border-surface-card"
        />
      )}
    </div>
  )
}

// ─── Initial canvas state ─────────────────────────────────────────────────────

const INITIAL_NODES: Node[] = [
  {
    id: 'start-1',
    type: 'playbookNode',
    position: { x: 250, y: 80 },
    data: { label: 'Início', nodeType: 'start' },
  },
  {
    id: 'end-1',
    type: 'playbookNode',
    position: { x: 250, y: 380 },
    data: { label: 'Fim', nodeType: 'end' },
  },
]

const INITIAL_EDGES: Edge[] = []

// ─── Save dialog ──────────────────────────────────────────────────────────────

interface SaveDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: (name: string, description: string, trigger: string) => void
  saving: boolean
}

function SaveDialog({ open, onClose, onConfirm, saving }: SaveDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [trigger, setTrigger] = useState('manual')

  return (
    <Dialog open={open} onOpenChange={o => !o && onClose()}>
      <DialogContent className="bg-surface-card border border-border-divider max-w-md rounded-2xl shadow-2xl">
        <DialogHeader className="pb-4 border-b border-border-divider">
          <DialogTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
            <Save className="w-4 h-4 text-plannera-orange" />
            Salvar Playbook
          </DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Nome *</label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Onboarding Week 1"
              className="h-9 text-[11px] bg-surface-background/50 border-border-divider rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Descrição</label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Descreva o objetivo do playbook"
              className="h-9 text-[11px] bg-surface-background/50 border-border-divider rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Gatilho</label>
            <Select value={trigger} onValueChange={setTrigger}>
              <SelectTrigger className="h-9 text-[11px] bg-surface-background/50 border-border-divider rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-card border-border-divider">
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="cron">Agendado (Cron)</SelectItem>
                <SelectItem value="webhook">Webhook</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border-divider">
          <Button variant="ghost" onClick={onClose} className="h-9 rounded-xl text-[10px] font-black uppercase">
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm(name, description, trigger)}
            disabled={!name.trim() || saving}
            className="h-9 rounded-xl bg-plannera-orange hover:bg-plannera-orange/90 text-white text-[10px] font-black uppercase px-5"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main canvas (inner, uses useReactFlow) ───────────────────────────────────

function BuilderCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()
  const [nodes, setNodes, onNodesChange] = useNodesState(INITIAL_NODES)
  const [edges, setEdges, onEdgesChange] = useEdgesState(INITIAL_EDGES)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const nodeTypes: NodeTypes = useMemo(() => ({ playbookNode: PlaybookNode }), [])

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  )

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/reactflow') as NodeDef
      if (!nodeType || !NODE_DEFS[nodeType]) return

      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
      const def = NODE_DEFS[nodeType]
      setNodes(nds => [
        ...nds,
        {
          id: `${nodeType}-${Date.now()}`,
          type: 'playbookNode',
          position,
          data: { label: def.label, nodeType },
        },
      ])
    },
    [screenToFlowPosition, setNodes],
  )

  const deleteSelected = useCallback(() => {
    setNodes(nds => nds.filter(n => !n.selected || n.data.nodeType === 'start' || n.data.nodeType === 'end'))
    setEdges(eds => eds.filter(e => !e.selected))
  }, [setNodes, setEdges])

  async function handleSave(name: string, description: string, trigger: string) {
    const hasStart = nodes.some(n => n.data.nodeType === 'start')
    const hasEnd = nodes.some(n => n.data.nodeType === 'end')
    if (!hasStart || !hasEnd) {
      toast.error('O playbook precisa de um bloco de Início e um de Fim')
      return
    }

    setSaving(true)
    try {
      const body = {
        blocks: nodes.map(n => ({
          id: n.id,
          type: n.data.nodeType,
          position: n.position,
          config: n.data.config ?? {},
        })),
        connections: edges.map(e => ({ from: e.source, to: e.target })),
        metadata: { name, description, trigger },
      }

      const res = await fetch('/api/playbooks/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        toast.success('Playbook salvo com sucesso!')
        setSaveOpen(false)
      } else {
        const err = await res.json()
        toast.error(err?.error ?? 'Erro ao salvar playbook')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-180px)] gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <Link href="/playbooks">
          <Button variant="ghost" size="sm" className="gap-2 text-[10px] font-black uppercase rounded-xl border border-border-divider h-9">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={deleteSelected}
            className="gap-2 text-[10px] font-black uppercase rounded-xl border border-border-divider h-9 hover:border-red-500/40 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Remover selecionado
          </Button>
          <Button
            size="sm"
            onClick={() => setSaveOpen(true)}
            className="gap-2 text-[10px] font-black uppercase rounded-xl bg-plannera-orange hover:bg-plannera-orange/90 text-white h-9 px-5 shadow-lg"
          >
            <Save className="w-3.5 h-3.5" />
            Salvar
          </Button>
        </div>
      </div>

      {/* Builder layout */}
      <div className="flex flex-1 gap-4 min-h-0">
        {/* Sidebar */}
        <aside className="w-52 shrink-0 bg-surface-card border border-border-divider rounded-2xl p-4 space-y-5 overflow-y-auto">
          {SIDEBAR_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-[8px] font-black uppercase tracking-[0.2em] text-content-secondary/60 mb-2">{group.label}</p>
              <div className="space-y-2">
                {group.items.map(type => {
                  const def = NODE_DEFS[type]
                  const Icon = def.icon
                  return (
                    <div
                      key={type}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData('application/reactflow', type)
                        e.dataTransfer.effectAllowed = 'move'
                      }}
                      className={cn(
                        'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border-2 cursor-grab active:cursor-grabbing select-none transition-all hover:shadow-sm',
                        def.colors,
                      )}
                    >
                      <Icon className={cn('w-3.5 h-3.5 shrink-0', def.textColor)} />
                      <span className={cn('text-[10px] font-bold whitespace-nowrap', def.textColor)}>
                        {def.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
          <div className="pt-3 border-t border-border-divider">
            <p className="text-[8px] text-content-secondary/40 leading-relaxed">
              Arraste blocos para o canvas. Conecte saídas (↓) a entradas (↑) para criar o fluxo.
            </p>
          </div>
        </aside>

        {/* Canvas */}
        <div
          ref={reactFlowWrapper}
          className="flex-1 bg-surface-background border border-border-divider rounded-2xl overflow-hidden"
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[16, 16]}
            defaultEdgeOptions={{ animated: true, style: { strokeWidth: 2 } }}
            className="[&_.react-flow__background]:bg-surface-background"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="var(--border-divider)"
            />
            <Controls className="[&_button]:bg-surface-card [&_button]:border-border-divider [&_button]:text-content-primary" />
            <MiniMap
              nodeColor={n => {
                const def = NODE_DEFS[n.data?.nodeType as NodeDef]
                return def ? def.colors.split(' ')[0].replace('bg-', '').replace('/10', '') : '#888'
              }}
              className="bg-surface-card border border-border-divider rounded-xl"
            />
          </ReactFlow>
        </div>
      </div>

      <SaveDialog
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        onConfirm={handleSave}
        saving={saving}
      />
    </div>
  )
}

// ─── Export: wraps with ReactFlowProvider ─────────────────────────────────────

export function PlaybookBuilderClient() {
  return (
    <PageContainer className="max-w-[1600px]">
      <ModuleHeader
        title="Playbook Builder"
        subtitle="Canvas drag-and-drop para criar playbooks automatizados"
        iconName="ListChecks"
      />
      <div className="mt-6">
        <ReactFlowProvider>
          <BuilderCanvas />
        </ReactFlowProvider>
      </div>
    </PageContainer>
  )
}
