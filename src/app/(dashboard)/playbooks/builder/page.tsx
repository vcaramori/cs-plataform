'use client'

import React, { useState, useCallback, useRef } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { PageContainer } from '@/components/ui/page-container'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Save } from 'lucide-react'
import Link from 'next/link'

const initialNodes = [
  { id: '1', type: 'input', position: { x: 250, y: 5 }, data: { label: 'Início' } },
]

function Builder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { project } = useReactFlow()

  const onConnect = useCallback((params: any) => setEdges((eds) => addEdge(params, eds)), [setEdges])

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType)
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const type = event.dataTransfer.getData('application/reactflow')

      if (typeof type === 'undefined' || !type || !reactFlowBounds) {
        return
      }

      const position = project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      const newNode = {
        id: `node_${nodes.length + 1}`,
        type,
        position,
        data: { label: `${type.charAt(0).toUpperCase() + type.slice(1)}` },
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [project, nodes, setNodes]
  )

  const handleSave = async () => {
    const flow = { nodes, edges }
    console.log('Salvando fluxo:', flow)
    
    try {
      const response = await fetch('/api/playbooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Novo Playbook Visual',
          description: 'Criado via Playbook Builder',
          ui_flow_json: flow,
        }),
      })

      if (response.ok) {
        alert('Playbook salvo com sucesso!')
      } else {
        alert('Erro ao salvar playbook')
      }
    } catch (error) {
      console.error('Erro ao salvar:', error)
      alert('Erro ao salvar playbook')
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)] relative">
      {/* Barra Lateral */}
      <Card className="p-4 lg:col-span-1 bg-surface-background">
        <h2 className="text-lg font-bold mb-4">Blocos</h2>
        <div className="space-y-2">
          <div
            className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-border-divider cursor-move hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            draggable
            onDragStart={(event) => onDragStart(event, 'email')}
          >
            Enviar E-mail
          </div>
          <div
            className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-border-divider cursor-move hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            draggable
            onDragStart={(event) => onDragStart(event, 'task')}
          >
            Criar Tarefa
          </div>
          <div
            className="p-3 bg-white dark:bg-zinc-800 rounded-lg border border-border-divider cursor-move hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            draggable
            onDragStart={(event) => onDragStart(event, 'condition')}
          >
            Condição
          </div>
        </div>
      </Card>

      {/* Canvas */}
      <Card className="lg:col-span-3 h-full overflow-hidden" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          fitView
        >
          <Controls />
          <MiniMap />
          <Background gap={12} size={1} />
        </ReactFlow>
      </Card>

      <div className="absolute top-4 right-4">
        <Button onClick={handleSave} className="gap-2">
          <Save className="w-4 h-4" />
          Salvar Playbook
        </Button>
      </div>
    </div>
  )
}

export default function PlaybookBuilderPage() {
  return (
    <PageContainer>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/playbooks">
            <Button variant="outline" size="icon" className="w-10 h-10 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="h1-page">Playbook Builder</h1>
            <p className="label-premium text-content-secondary">
              Arraste e solte blocos para criar fluxos de automação.
            </p>
          </div>
        </div>
      </div>

      <ReactFlowProvider>
        <Builder />
      </ReactFlowProvider>
    </PageContainer>
  )
}
