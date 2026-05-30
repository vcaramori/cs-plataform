'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/ui/section-header'
import {
  Plus, Workflow, Play, Pause, Trash2, Stamp, CheckCircle2, ArrowRight, Loader2, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { WORKFLOW_TEMPLATES } from '@/lib/workflows/templates'
import { createWorkflow, createFromTemplate, setEnabled, deleteWorkflow, decideApproval } from '../actions'

interface WF { id: string; name: string; description: string | null; status: string; is_enabled: boolean; category: string; runs: { total: number; running: number } }
interface Approval { id: string; title: string; description: string | null; account_id: string | null; created_at: string; accounts?: { name: string } | null }
interface HumanTask { id: string; title: string; due_date: string | null; account_id: string | null; accounts?: { name: string } | null }

const STATUS = {
  draft: { label: 'Rascunho', cls: 'bg-content-secondary/15 text-content-secondary' },
  published: { label: 'Publicado', cls: 'bg-emerald-500/15 text-emerald-500' },
  archived: { label: 'Arquivado', cls: 'bg-content-secondary/15 text-content-secondary' },
} as const

export function FluxosListClient({ workflows, approvals, humanTasks }: { workflows: WF[]; approvals: Approval[]; humanTasks: HumanTask[] }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  const onCreate = () => start(async () => { const id = await createWorkflow('Novo fluxo'); router.push(`/fluxos/${id}`) })
  const onTemplate = (key: string) => start(async () => { const id = await createFromTemplate(key); router.push(`/fluxos/${id}`) })
  const onToggle = (w: WF) => start(async () => { setBusyId(w.id); await setEnabled(w.id, !w.is_enabled); setBusyId(null); router.refresh() })
  const onDelete = (id: string) => { if (confirm('Excluir este fluxo?')) start(async () => { await deleteWorkflow(id); router.refresh() }) }
  const onDecide = (id: string, d: 'approved' | 'rejected') => start(async () => { setBusyId(id); await decideApproval(id, d); setBusyId(null); router.refresh() })

  return (
    <div className="space-y-8">
      {/* Inbox de pendências humanas */}
      {(approvals.length > 0 || humanTasks.length > 0) && (
        <div className="space-y-3">
          <SectionHeader title="Aguardando você" subtitle="Aprovações e tarefas que pausaram fluxos" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {approvals.map(a => (
              <Card key={a.id}><CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-plannera-soe/10 border border-plannera-soe/20 flex items-center justify-center shrink-0">
                  <Stamp className="w-4 h-4 text-plannera-soe" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-content-primary truncate">{a.title}</p>
                  <p className="text-[10px] text-content-secondary uppercase tracking-wide">{a.accounts?.name ?? 'Portfólio'} · Aprovação</p>
                </div>
                <Button size="sm" className="h-7 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px]" disabled={pending && busyId === a.id} onClick={() => onDecide(a.id, 'approved')}>Aprovar</Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" disabled={pending && busyId === a.id} onClick={() => onDecide(a.id, 'rejected')}>Rejeitar</Button>
              </CardContent></Card>
            ))}
            {humanTasks.map(t => (
              <Link key={t.id} href="/atividades"><Card className="hover:border-plannera-primary/40 transition-colors"><CardContent className="p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-plannera-primary/10 border border-plannera-primary/20 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-plannera-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-content-primary truncate">{t.title}</p>
                  <p className="text-[10px] text-content-secondary uppercase tracking-wide">{t.accounts?.name ?? 'Conta'} · Tarefa do fluxo</p>
                </div>
                <ArrowRight className="w-4 h-4 text-content-secondary/40" />
              </CardContent></Card></Link>
            ))}
          </div>
        </div>
      )}

      {/* Meus fluxos */}
      <div className="space-y-3">
        <SectionHeader title="Meus Fluxos" subtitle={`${workflows.length} ${workflows.length === 1 ? 'fluxo' : 'fluxos'}`}
          action={<Button onClick={onCreate} disabled={pending} className="gap-2"><Plus className="w-4 h-4" /> Novo fluxo</Button>} />
        {workflows.length === 0 ? (
          <Card><CardContent className="py-12 text-center">
            <Workflow className="w-8 h-8 text-content-secondary/30 mx-auto mb-3" />
            <p className="text-sm font-bold text-content-primary">Nenhum fluxo ainda</p>
            <p className="text-xs text-content-secondary mt-1">Crie do zero ou use um template da biblioteca abaixo.</p>
          </CardContent></Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {workflows.map(w => {
              const st = STATUS[w.status as keyof typeof STATUS] ?? STATUS.draft
              return (
                <Card key={w.id} className="group relative overflow-hidden">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link href={`/fluxos/${w.id}`} className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-content-primary truncate group-hover:text-plannera-primary transition-colors">{w.name}</p>
                        <p className="text-xs text-content-secondary line-clamp-2 mt-0.5">{w.description || 'Sem descrição'}</p>
                      </Link>
                      <Badge className={cn('border-none text-[9px] font-black uppercase shrink-0', st.cls)}>{st.label}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-content-secondary uppercase tracking-wide">{w.runs.total} exec · {w.runs.running} ativas</span>
                      <div className="flex items-center gap-1">
                        <Button size="icon" variant="ghost" className="w-7 h-7" title={w.is_enabled ? 'Desativar' : 'Ativar'}
                          disabled={pending && busyId === w.id} onClick={() => onToggle(w)}>
                          {pending && busyId === w.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : w.is_enabled ? <Pause className="w-3.5 h-3.5 text-amber-500" /> : <Play className="w-3.5 h-3.5 text-emerald-500" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="w-7 h-7 text-destructive" title="Excluir" disabled={pending} onClick={() => onDelete(w.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                        <Link href={`/fluxos/${w.id}`}><Button size="icon" variant="ghost" className="w-7 h-7"><ArrowRight className="w-4 h-4" /></Button></Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Biblioteca de Playbooks (templates) */}
      <div className="space-y-3">
        <SectionHeader title="Biblioteca de Playbooks" subtitle="Processos ongoing prontos para usar" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {WORKFLOW_TEMPLATES.map(t => (
            <Card key={t.key} className="group">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-accent" />
                  </div>
                  <p className="text-sm font-bold text-content-primary">{t.name}</p>
                </div>
                <p className="text-xs text-content-secondary line-clamp-3 min-h-[3rem]">{t.description}</p>
                <Button size="sm" variant="outline" className="w-full gap-2" disabled={pending} onClick={() => onTemplate(t.key)}>
                  <Plus className="w-3.5 h-3.5" /> Usar template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
