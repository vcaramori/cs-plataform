'use client'

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
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
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
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

  const searchParams = useSearchParams()
  const id = searchParams.get('id')

  useEffect(() => {
    if (id) {
      fetch(`/api/playbooks/${id}`)
        .then(res => res.json())
        .then(data => {
          if (data.graph_json) {
            setNodes(data.graph_json.blocks.map((b: any) => ({
              id: b.id,
              type: 'playbookNode',
              position: b.position,
              data: { label: NODE_DEFS[b.type as NodeDef]?.label, nodeType: b.type, config: b.config },
            })))
            setEdges(data.graph_json.connections.map((c: any) => ({
              id: `e-${c.from}-${c.to}`,
              source: c.from,
              target: c.to,
              animated: true,
            })))
          }
        })
        .catch(err => console.error('Error loading playbook:', err))
    }
  }, [id, setNodes, setEdges])
  const [saving, setSaving] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)

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
        id: id || undefined,
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
              <p className="text-xs font-black uppercase tracking-[0.1em] text-content-secondary/60 mb-2">{group.label}</p>
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
            <p className="text-xs text-content-secondary/40 leading-relaxed">
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
            onNodeClick={(_, node) => setSelectedNode(node)}
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

      <Sheet open={!!selectedNode} onOpenChange={(open) => !open && setSelectedNode(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] bg-surface-card border-l border-border-divider">
          <SheetHeader>
            <SheetTitle className="text-content-primary">
              Configurar {selectedNode && NODE_DEFS[selectedNode.data.nodeType as NodeDef]?.label}
            </SheetTitle>
          </SheetHeader>
          <div className="py-6">
            {selectedNode?.data.nodeType === 'start' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-content-primary">Tipo de Gatilho</Label>
                  <Select defaultValue="manual">
                    <SelectTrigger className="w-full h-10 rounded-xl border-border-divider bg-surface-background">
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-divider">
                      <SelectItem value="manual">Manual</SelectItem>
                      <SelectItem value="automatic">Baseado em Dados (Automático)</SelectItem>
                      <SelectItem value="scheduled">Agendado (Temporal)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2 border-t border-border-divider pt-4 mt-4">
                  <Label className="text-xs font-bold text-content-primary">Regras do Gatilho</Label>
                  <div className="grid grid-cols-3 gap-2">
                    <Select defaultValue="health_score">
                      <SelectTrigger className="h-9 rounded-xl border-border-divider bg-surface-background text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-card border-border-divider">
                        <SelectItem value="health_score">Health Score</SelectItem>
                        <SelectItem value="sentiment">Sentimento</SelectItem>
                        <SelectItem value="inactivity">Inatividade</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select defaultValue="lt">
                      <SelectTrigger className="h-9 rounded-xl border-border-divider bg-surface-background text-[10px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-card border-border-divider">
                        <SelectItem value="lt">Menor que</SelectItem>
                        <SelectItem value="gt">Maior que</SelectItem>
                        <SelectItem value="eq">Igual a</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Input defaultValue="50" className="h-9 rounded-xl border-border-divider bg-surface-background text-[10px]" />
                  </div>
                </div>
              </div>
            )}

            {selectedNode?.data.nodeType !== 'start' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-content-primary">Configurações da Ação</Label>
                  <p className="text-content-secondary text-xs">
                    Configure os parâmetros para a ação de {NODE_DEFS[selectedNode?.data.nodeType as NodeDef]?.label}.
                  </p>
                </div>
                
                {selectedNode?.data.nodeType === 'send_email' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-content-primary">Template de E-mail</Label>
                      <Select defaultValue="default">
                        <SelectTrigger className="w-full h-9 rounded-xl border-border-divider bg-surface-background text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-surface-card border-border-divider">
                          <SelectItem value="default">E-mail Padrão de Boas-vindas</SelectItem>
                          <SelectItem value="alert">Aviso de Queda de Saúde</SelectItem>
                          <SelectItem value="followup">Follow-up de Inatividade</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-content-primary">Assunto (Sobrescrita)</Label>
                      <Input placeholder="Assunto do e-mail..." className="h-9 rounded-xl border-border-divider bg-surface-background text-[10px]" />
                    </div>
                  </div>
                )}
                
                {selectedNode?.data.nodeType === 'create_task' && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-content-primary">Título da Tarefa</Label>
                      <Input placeholder="Ex: Ligar para o cliente" className="h-9 rounded-xl border-border-divider bg-surface-background text-[10px]" />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-bold text-content-primary">Prazo (Dias relativos)</Label>
                      <Input type="number" defaultValue="1" className="h-9 rounded-xl border-border-divider bg-surface-background text-[10px]" />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-border-divider">
            <Button variant="ghost" onClick={() => setSelectedNode(null)} className="h-9 rounded-xl text-[10px] font-black uppercase">
              Cancelar
            </Button>
            <Button
              onClick={() => {
                toast.success('Configuração salva com sucesso!')
                setSelectedNode(null)
              }}
              className="h-9 rounded-xl bg-plannera-orange hover:bg-plannera-orange/90 text-white text-[10px] font-black uppercase px-5"
            >
              Salvar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

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
