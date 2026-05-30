'use client'

import { useCallback, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ReactFlow, {
  Background, Controls, MiniMap, Handle, Position,
  useNodesState, useEdgesState, addEdge,
  type Node, type Edge, type Connection, type NodeProps,
} from 'reactflow'
import 'reactflow/dist/style.css'
import * as LucideIcons from 'lucide-react'
import { ArrowLeft, Save, Rocket, Play, Loader2, Plus, X, History } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { NODE_CATALOG, NODE_GROUPS, EXECUTION_FIELD_DEFS, CONDITION_OPS, type NodeDef, type FieldDef } from '@/lib/workflows/catalog'
import type { NodeType } from '@/lib/workflows/types'
import { saveGraph, publishWorkflow, runManual } from '../actions'

type DbNode = { node_id: string; node_type: string; label: string | null; position_x: number; position_y: number; config: any }
type DbEdge = { source_node_id: string; target_node_id: string; edge_label: string | null }

function Icon({ name, className }: { name: string; className?: string }) {
  const C = (LucideIcons as any)[name] ?? LucideIcons.Circle
  return <C className={className} />
}

// ─── Nó customizado ─────────────────────────────────────────────────────────
function WfNode({ data, selected }: NodeProps) {
  const def: NodeDef = NODE_CATALOG[data.node_type as NodeType] ?? NODE_CATALOG.action
  const outputs = def.outputs
  return (
    <div className={cn(
      'relative rounded-xl bg-surface-card border shadow-premium min-w-[170px] transition-all',
      selected ? 'border-plannera-primary ring-2 ring-plannera-primary/20' : 'border-border-divider'
    )}>
      <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-xl', def.accent)} />
      {def.type !== 'trigger' && <Handle type="target" position={Position.Top} className="!bg-content-secondary !w-2 !h-2" />}
      <div className="flex items-center gap-2 px-3 py-2.5 pl-4">
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center border', def.accent.replace('bg-', 'bg-') + '/10', def.color)}>
          <Icon name={def.icon} className={cn('w-4 h-4', def.color)} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-content-primary truncate leading-tight">{data.label || def.label}</p>
          <p className="text-[8px] uppercase tracking-widest text-content-secondary/60">{def.label}</p>
        </div>
      </div>
      {outputs.map((o, i) => (
        <Handle key={o.id} id={o.id} type="source" position={Position.Bottom}
          style={{ left: `${((i + 1) / (outputs.length + 1)) * 100}%`, background: '#94a3b8' }}
          className="!w-2 !h-2" />
      ))}
    </div>
  )
}
const nodeTypes = { wf: WfNode }

// ─── Editor de condições ────────────────────────────────────────────────────
function ConditionsEditor({ value, onChange }: { value: any[]; onChange: (v: any[]) => void }) {
  const list = Array.isArray(value) ? value : []
  const upd = (i: number, patch: any) => onChange(list.map((c, j) => j === i ? { ...c, ...patch } : c))
  return (
    <div className="space-y-2">
      {list.map((c, i) => (
        <div key={i} className="flex items-center gap-1">
          <Input value={c.left ?? ''} onChange={e => upd(i, { left: e.target.value })} placeholder="{{trigger.new_score}}" className="h-7 text-xs flex-1" />
          <select value={c.op ?? '=='} onChange={e => upd(i, { op: e.target.value })} className="h-7 text-xs rounded-md border border-border-divider bg-surface-background px-1">
            {CONDITION_OPS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <Input value={c.right ?? ''} onChange={e => upd(i, { right: e.target.value })} placeholder="valor" className="h-7 text-xs w-20" />
          <button onClick={() => onChange(list.filter((_, j) => j !== i))} className="text-destructive p-1"><X className="w-3 h-3" /></button>
        </div>
      ))}
      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onChange([...list, { left: '', op: '==', right: '' }])}>
        <Plus className="w-3 h-3" /> Condição
      </Button>
    </div>
  )
}

// ─── Painel de configuração ─────────────────────────────────────────────────
function ConfigField({ field, value, onChange }: { field: FieldDef; value: any; onChange: (v: any) => void }) {
  if (field.type === 'conditions') return <ConditionsEditor value={value} onChange={onChange} />
  if (field.type === 'textarea') return <textarea value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={field.placeholder} rows={3} className="w-full text-xs rounded-md border border-border-divider bg-surface-background p-2 resize-none" />
  if (field.type === 'select') return (
    <select value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full h-8 text-xs rounded-md border border-border-divider bg-surface-background px-2">
      <option value="">—</option>
      {field.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  )
  if (field.type === 'kv') {
    const obj = value && typeof value === 'object' ? value : {}
    const rows = Object.entries(obj)
    return (
      <div className="space-y-1">
        {rows.map(([k, v], i) => (
          <div key={i} className="flex gap-1">
            <Input defaultValue={k} onBlur={e => { const nk = e.target.value; const next: any = { ...obj }; delete next[k]; if (nk) next[nk] = v; onChange(next) }} placeholder="header" className="h-7 text-xs" />
            <Input defaultValue={String(v)} onChange={e => onChange({ ...obj, [k]: e.target.value })} placeholder="valor" className="h-7 text-xs" />
          </div>
        ))}
        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => onChange({ ...obj, '': '' })}><Plus className="w-3 h-3" /> Header</Button>
      </div>
    )
  }
  return <Input type={field.type === 'number' ? 'number' : 'text'} value={value ?? ''} onChange={e => onChange(field.type === 'number' ? e.target.value : e.target.value)} placeholder={field.placeholder} className="h-8 text-xs" />
}

function NodeConfigPanel({ node, onChange, onClose }: { node: Node; onChange: (cfg: any, label?: string) => void; onClose: () => void }) {
  const def = NODE_CATALOG[node.data.node_type as NodeType]
  const cfg = node.data.config ?? {}
  const setField = (key: string, v: any) => onChange({ ...cfg, [key]: v })
  const setExec = (key: string, v: any) => onChange({ ...cfg, execution: { ...(cfg.execution ?? {}), [key]: v } })
  const showExec = ['action', 'http', 'human_task', 'approval'].includes(node.data.node_type)
  return (
    <div className="w-80 border-l border-border-divider bg-surface-card flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border-divider flex items-center justify-between">
        <div className="flex items-center gap-2"><Icon name={def?.icon ?? 'Circle'} className={cn('w-4 h-4', def?.color)} /><span className="text-xs font-black uppercase tracking-widest">{def?.label}</span></div>
        <button onClick={onClose}><X className="w-4 h-4 text-content-secondary" /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Rótulo</label>
          <Input value={node.data.label ?? ''} onChange={e => onChange(cfg, e.target.value)} className="h-8 text-xs mt-1" />
        </div>
        {def?.fields.map(f => (
          <div key={f.key}>
            <label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">{f.label}</label>
            <div className="mt-1"><ConfigField field={f} value={cfg[f.key]} onChange={v => setField(f.key, v)} /></div>
            {f.help && <p className="text-[9px] text-content-secondary/60 mt-1">{f.help}</p>}
          </div>
        ))}
        {showExec && (
          <div className="pt-2 border-t border-border-divider space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary/70">Execução</p>
            {EXECUTION_FIELD_DEFS.map(f => (
              <div key={f.key}>
                <label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">{f.label}</label>
                <div className="mt-1"><ConfigField field={f} value={cfg.execution?.[f.key]} onChange={v => setExec(f.key, v)} /></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Editor principal ───────────────────────────────────────────────────────
export function FlowEditor({ definition, initialNodes, initialEdges, accounts, runs }: {
  definition: any; initialNodes: DbNode[]; initialEdges: DbEdge[]; accounts: { id: string; name: string }[]; runs: any[]
}) {
  const router = useRouter()
  const [name, setName] = useState(definition.name)
  const [description, setDescription] = useState(definition.description ?? '')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testAccount, setTestAccount] = useState<string>(accounts[0]?.id ?? '')
  const [showHistory, setShowHistory] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState(
    initialNodes.map(n => ({
      id: n.node_id, type: 'wf', position: { x: Number(n.position_x), y: Number(n.position_y) },
      data: { node_id: n.node_id, node_type: n.node_type, label: n.label, config: n.config ?? {} },
    }))
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    initialEdges.map((e, i) => ({
      id: `e${i}`, source: e.source_node_id, target: e.target_node_id,
      sourceHandle: e.edge_label ?? 'default', label: e.edge_label && e.edge_label !== 'default' ? e.edge_label : undefined,
    }))
  )

  const onConnect = useCallback((c: Connection) => setEdges(eds => addEdge({
    ...c, label: c.sourceHandle && c.sourceHandle !== 'default' ? c.sourceHandle : undefined,
  }, eds)), [setEdges])

  const addNode = (type: NodeType) => {
    const id = `n${Date.now().toString(36)}`
    const def = NODE_CATALOG[type]
    setNodes(nds => [...nds, {
      id, type: 'wf', position: { x: 120 + Math.random() * 240, y: 120 + Math.random() * 200 },
      data: { node_id: id, node_type: type, label: def.label, config: structuredClone(def.defaults ?? {}) },
    }])
  }

  const selected = useMemo(() => nodes.find(n => n.id === selectedId) ?? null, [nodes, selectedId])
  const updateSelected = (cfg: any, label?: string) => setNodes(nds => nds.map(n => n.id === selectedId ? { ...n, data: { ...n.data, config: cfg, ...(label !== undefined ? { label } : {}) } } : n))

  const doSave = async () => {
    setSaving(true)
    try {
      await saveGraph(definition.id, {
        name, description,
        nodes: nodes.map(n => ({ node_id: n.id, node_type: n.data.node_type, label: n.data.label ?? null, position_x: Math.round(n.position.x), position_y: Math.round(n.position.y), config: n.data.config ?? {} })),
        edges: edges.map(e => ({ source_node_id: e.source, target_node_id: e.target, edge_label: (e.sourceHandle as string) ?? null })),
      })
      toast.success('Fluxo salvo')
    } catch (e: any) { toast.error(e?.message ?? 'Erro ao salvar') } finally { setSaving(false) }
  }
  const doPublish = async () => {
    setPublishing(true)
    try { await doSave(); await publishWorkflow(definition.id); toast.success('Fluxo publicado e ativo'); router.refresh() }
    catch (e: any) { toast.error(e?.message ?? 'Erro ao publicar') } finally { setPublishing(false) }
  }
  const doTest = async () => {
    setTesting(true)
    try { await doSave(); await runManual(definition.id, testAccount || null); toast.success('Teste executado — veja o histórico'); setShowHistory(true); router.refresh() }
    catch (e: any) { toast.error(e?.message ?? 'Erro no teste') } finally { setTesting(false) }
  }

  return (
    <div className="fixed inset-0 md:left-20 lg:left-[280px] flex flex-col bg-surface-background">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-divider bg-surface-card">
        <Link href="/fluxos"><Button size="icon" variant="ghost" className="w-8 h-8"><ArrowLeft className="w-4 h-4" /></Button></Link>
        <Input value={name} onChange={e => setName(e.target.value)} className="h-8 text-sm font-bold max-w-xs" />
        <Badge className={cn('border-none text-[9px] font-black uppercase', definition.status === 'published' ? 'bg-emerald-500/15 text-emerald-500' : 'bg-content-secondary/15 text-content-secondary')}>{definition.status}</Badge>
        <div className="flex-1" />
        <select value={testAccount} onChange={e => setTestAccount(e.target.value)} className="h-8 text-xs rounded-md border border-border-divider bg-surface-background px-2 max-w-[160px]">
          <option value="">Conta p/ teste…</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={testing} onClick={doTest}>{testing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />} Testar</Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setShowHistory(s => !s)}><History className="w-3.5 h-3.5" /> Histórico</Button>
        <Button size="sm" variant="outline" className="gap-1.5" disabled={saving} onClick={doSave}>{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Salvar</Button>
        <Button size="sm" className="gap-1.5" disabled={publishing} onClick={doPublish}>{publishing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />} Publicar</Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Paleta */}
        <div className="w-44 border-r border-border-divider bg-surface-card overflow-y-auto p-2 space-y-3">
          {NODE_GROUPS.map(group => (
            <div key={group}>
              <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary/50 px-1 mb-1">{group}</p>
              <div className="space-y-1">
                {Object.values(NODE_CATALOG).filter(d => d.group === group).map(d => (
                  <button key={d.type} onClick={() => addNode(d.type)} className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 text-left">
                    <Icon name={d.icon} className={cn('w-3.5 h-3.5 shrink-0', d.color)} />
                    <span className="text-[11px] font-medium text-content-primary truncate">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes} edges={edges} nodeTypes={nodeTypes}
            onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
            onNodeClick={(_, n) => setSelectedId(n.id)} onPaneClick={() => setSelectedId(null)}
            fitView proOptions={{ hideAttribution: true }}
          >
            <Background />
            <Controls />
            <MiniMap pannable zoomable className="!bg-surface-card" />
          </ReactFlow>
        </div>

        {/* Config panel */}
        {selected && <NodeConfigPanel node={selected} onChange={updateSelected} onClose={() => setSelectedId(null)} />}

        {/* Histórico */}
        {showHistory && (
          <div className="w-80 border-l border-border-divider bg-surface-card flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-border-divider flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-widest">Histórico</span>
              <button onClick={() => setShowHistory(false)}><X className="w-4 h-4 text-content-secondary" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {runs.length === 0 && <p className="text-xs text-content-secondary text-center py-6">Sem execuções ainda.</p>}
              {runs.map((r: any) => (
                <div key={r.id} className="rounded-lg border border-border-divider p-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-content-primary">{r.accounts?.name ?? 'Conta'}</span>
                    <Badge className={cn('border-none text-[8px] font-black uppercase',
                      r.status === 'success' ? 'bg-emerald-500/15 text-emerald-500' : r.status === 'failed' ? 'bg-red-500/15 text-red-500' : r.status === 'waiting' ? 'bg-amber-500/15 text-amber-500' : 'bg-content-secondary/15 text-content-secondary')}>{r.status}</Badge>
                  </div>
                  <p className="text-[9px] text-content-secondary mt-0.5">{r.triggered_by} · {new Date(r.started_at).toLocaleString('pt-BR')}</p>
                  <div className="mt-1.5 space-y-0.5">
                    {(r.workflow_run_steps ?? []).map((s: any, i: number) => (
                      <div key={i} className="flex items-center gap-1.5 text-[9px]">
                        <span className={cn('w-1.5 h-1.5 rounded-full', s.status === 'success' ? 'bg-emerald-500' : s.status === 'failed' ? 'bg-red-500' : s.status === 'waiting' ? 'bg-amber-500' : 'bg-content-secondary/40')} />
                        <span className="text-content-secondary truncate">{s.node_id} · {s.node_type} · {s.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
