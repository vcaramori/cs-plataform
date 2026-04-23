'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { TicketCheck, Upload, Loader2, AlertTriangle, CheckCircle2, Filter, Mail, Sparkles, LayoutDashboard } from 'lucide-react'
import { SLABadge } from '@/components/support/SLABadge'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format as formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
  open: { label: 'Aberto', color: 'text-destructive', bg: 'bg-destructive/10' },
  'in-progress': { label: 'Em Progresso', color: 'text-accent', bg: 'bg-accent/10' },
  resolved: { label: 'Resolvido', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  closed: { label: 'Fechado', color: 'text-content-secondary', bg: 'bg-slate-500/10' },
}

const priorityConfig: Record<string, { label: string, color: string, bg: string }> = {
  critical: { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive/10' },
  high: { label: 'Alto', color: 'text-accent', bg: 'bg-accent/10' },
  medium: { label: 'Médio', color: 'text-secondary', bg: 'bg-secondary/10' },
  low: { label: 'Baixo', color: 'text-content-secondary', bg: 'bg-slate-500/10' },
}

type Account = { id: string; name: string }
type Ticket = {
  id: string
  account_id: string
  title: string
  description: string
  status: string
  priority: string
  internal_level?: string | null
  category: string | null
  opened_at: string
  created_at: string
  resolved_at: string | null
  thread_content: string | null
  accounts: { name: string } | null
  sla_status_resolution?: string | null
  sla_status_first_response?: string | null
  resolution_deadline?: string | null
}

const SLA_SORT_ORDER: Record<string, number> = { vencido: 0, atencao: 1, no_prazo: 2, cumprido: 3, violado: 4 }
const LEVEL_SORT_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }

function sortTickets(tickets: Ticket[]) {
  return [...tickets].sort((a, b) => {
    const aStatus = a.sla_status_resolution ?? 'no_prazo'
    const bStatus = b.sla_status_resolution ?? 'no_prazo'
    if (aStatus !== bStatus) return (SLA_SORT_ORDER[aStatus] ?? 5) - (SLA_SORT_ORDER[bStatus] ?? 5)
    const aLevel = a.internal_level ?? 'low'
    const bLevel = b.internal_level ?? 'low'
    if (aLevel !== bLevel) return (LEVEL_SORT_ORDER[aLevel] ?? 4) - (LEVEL_SORT_ORDER[bLevel] ?? 4)
    return new Date(a.opened_at).getTime() - new Date(b.opened_at).getTime()
  })
}

const csvExample = `account_name,title,description,status,priority,category,opened_at
Empresa X,Erro no login,Usuário não consegue autenticar após atualização,open,high,auth,2026-03-15
Empresa Y,Lentidão no dashboard,Dashboard demora mais de 30s para carregar,in-progress,medium,performance,2026-03-20`

const textExample = `LOGO: Empresa X
Título: Falha na integração de pagamento
Descrição: Webhook não está sendo disparado após a confirmação do pagamento
Status: open
Prioridade: critical
Categoria: integração
Data: 2026-03-25

LOGO: Empresa Y
Título: Relatório com dados desatualizados
Descrição: O relatório mensal está mostrando dados do mês anterior
Status: in-progress
Prioridade: medium
Data: 2026-03-22`

export function SuporteClient({
  accounts,
  initialTickets,
}: {
  accounts: Account[]
  initialTickets: Ticket[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'list' | 'import'>('list')
  const [format, setFormat] = useState<'csv' | 'text' | 'pdf'>('csv')
  const [content, setContent] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterPriority, setFilterPriority] = useState('all')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)

  async function handleIngest() {
    if (format !== 'pdf' && !content.trim()) { toast.error('Cole o conteúdo antes de importar'); return }
    if (format === 'pdf' && !pdfFile) { toast.error('Selecione um arquivo PDF antes de importar'); return }
    
    setIsSubmitting(true)
    setResult(null)

    try {
      let res;
      if (format === 'pdf') {
        // PDF → rota dedicada com parse binário
        const formData = new FormData()
        formData.append('file', pdfFile!)
        if (selectedAccountId && selectedAccountId !== 'all') {
          formData.append('account_id', selectedAccountId)
        }
        res = await fetch('/api/support-tickets/pdf', {
          method: 'POST',
          body: formData,
        })
      } else if (format === 'text') {
        // Texto livre → IA (Gemini) interpreta o conteúdo copiado
        res = await fetch('/api/support-tickets/ingest-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content,
            account_id: selectedAccountId !== 'all' ? selectedAccountId : undefined,
          }),
        })
      } else {
        // CSV → parser estruturado sem IA
        res = await fetch('/api/support-tickets/ingest', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            format,
            content,
            account_id: selectedAccountId !== 'all' ? selectedAccountId : undefined,
          }),
        })
      }

      const data = await res.json()
      setResult(data)

      if (data.created > 0) {
        toast.success(`${data.created} ticket(s) importado(s)`)
        setContent('')
        router.refresh()
      } else {
        toast.error(data.error || 'Nenhum ticket foi importado')
      }
    } catch {
      toast.error('Erro na importação')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredTickets = sortTickets(tickets.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    return true
  }))

  const openTickets = tickets.filter(t => ['open', 'in-progress', 'reopened'].includes(t.status))
  const breachedCount = openTickets.filter(t => t.sla_status_resolution === 'vencido' || t.sla_status_first_response === 'vencido').length
  const attentionCount = openTickets.filter(t => t.sla_status_resolution === 'atencao' || t.sla_status_first_response === 'atencao').length

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Abertos', value: openTickets.length, color: 'text-primary', icon: TicketCheck },
          { label: 'SLA Vencido', value: breachedCount, color: 'text-destructive', icon: AlertTriangle },
          { label: 'SLA Atenção', value: attentionCount, color: 'text-amber-500', icon: AlertTriangle },
          { label: 'Histórico Total', value: tickets.length, color: 'text-muted-foreground', icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <Card key={label} className="bg-surface-card border border-border-divider shadow-sm p-4 flex items-center gap-4">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", color.replace('text-', 'bg-').replace('-500', '/10').replace('primary', 'primary/10').replace('destructive', 'destructive/10'), color.replace('text-', 'border-').replace('-500', '/20').replace('primary', 'primary/20').replace('destructive', 'destructive/20'))}>
              <Icon className={cn("w-5 h-5", color)} />
            </div>
            <div>
              <p className="label-premium mb-0.5 !text-[#5c5b5b] dark:!text-slate-400">{label}</p>
              <p className={cn("text-2xl font-black tracking-tighter", color)}>{value}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* Link para Dashboard executivo */}
      <div className="flex justify-end">
        <Link href="/suporte/dashboard" className="label-premium text-primary hover:opacity-80 transition-opacity flex items-center gap-2">
          <LayoutDashboard className="w-3.5 h-3.5" />
          Analytics de Atendimento
        </Link>
      </div>

      {/* Premium Tabs */}
      <div className="flex justify-between items-center border-b border-border/50 pb-2">
        <div className="flex bg-slate-100 p-1 rounded-xl border border-border-divider">
          {(['list', 'import'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all relative z-10",
                activeTab === tab ? "text-white shadow-lg" : "text-[#5c5b5b] hover:text-primary dark:text-slate-500 dark:hover:text-white"
              )}
            >
              {tab === 'list' ? `Fila de Chamados (${tickets.length})` : 'Ingestão Inteligente'}
              {activeTab === tab && (
                <motion.div 
                  layoutId="active-tab"
                  className="absolute inset-0 bg-primary rounded-lg -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
        
        {activeTab === 'list' && (
          <Button 
            variant="premium" 
            size="sm"
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true)
              toast.info('Sincronizando com Power Automate...', { duration: 3000 })
              try {
                const res = await fetch('/api/support-tickets/email-sync', { method: 'POST' })
                const data = await res.json()
                if (data.created > 0) {
                  toast.success(`${data.created} novos chamados!`)
                  router.refresh()
                } else {
                   toast.info(data.message || 'Tudo atualizado.')
                }
              } catch (e) {
                 toast.error('Erro de conexão.')
              } finally {
                setIsSubmitting(false)
              }
            }}
            className="rounded-xl h-9 gap-2 shadow-lg hover:scale-105"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Sincronizar E-mails
          </Button>
        )}
      </div>

      {/* Lista */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-4 items-center flex-wrap bg-surface-background border border-border-divider p-4 rounded-2xl">
            <div className="flex items-center gap-2 pl-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-primary" />
              <span className="label-premium">Filtrar Visão:</span>
            </div>
            <SearchableSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              className="h-9 w-44 rounded-xl border-border/50 shadow-sm"
              options={[
                { label: 'Todos os Status', value: 'all' },
                ...Object.entries(statusConfig).map(([value, conf]) => ({ label: conf.label, value }))
              ]}
            />
            <SearchableSelect
              value={filterPriority}
              onValueChange={setFilterPriority}
              className="h-9 w-48 rounded-xl border-border/50 shadow-sm"
              options={[
                { label: 'Todas as Prioridades', value: 'all' },
                ...Object.entries(priorityConfig).map(([value, conf]) => ({ label: conf.label, value }))
              ]}
            />
            {(filterStatus !== 'all' || filterPriority !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterStatus('all'); setFilterPriority('all') }}
                className="label-premium text-primary hover:bg-primary/10 transition-all"
              >
                Limpar Busca
              </Button>
            )}
          </div>

          <Card className="border-border-divider shadow-2xl overflow-hidden bg-surface-card">
            <CardContent className="p-0">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-24 border-dashed border-2 border-border/50 m-4 rounded-3xl">
                  <TicketCheck className="w-12 h-12 mx-auto mb-4 text-muted-foreground/20" />
                  <p className="label-premium opacity-40">Nenhum chamado pendente nesta visão</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="pl-8 text-[11px]">Ticket</TableHead>
                        <TableHead className="text-[11px]">Categoria</TableHead>
                        <TableHead className="text-[11px]">Responsável</TableHead>
                        <TableHead className="text-[11px]">Prioridade</TableHead>
                        <TableHead className="text-[11px]">Status</TableHead>
                        <TableHead className="text-[11px]">SLA Resolução</TableHead>
                        <TableHead className="pr-8 text-right text-[11px]">Abertura</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence mode='popLayout'>
                        {filteredTickets.map((t, index) => {
                          const sConf = statusConfig[t.status] || statusConfig.open
                          const pConf = priorityConfig[t.priority] || priorityConfig.low
                          return (
                            <motion.tr 
                              key={t.id} 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              onClick={() => router.push(`/suporte/${t.id}`)}
                              className="group border-b border-border-divider hover:bg-muted/40 transition-all cursor-pointer h-16"
                            >
                              <TableCell className="p-4 pl-8 whitespace-nowrap">
                                <span className="text-[11px] font-black uppercase tracking-tight text-content-primary">
                                  {t.accounts?.name ?? '—'}
                                </span>
                              </TableCell>
                              <TableCell className="pl-8 py-4">
                                <span className="text-content-primary text-[13px] font-black tracking-tight line-clamp-1">{t.title}</span>
                              </TableCell>
                              <TableCell>
                                <span className="text-[11px] font-black uppercase tracking-widest text-content-secondary line-clamp-1">
                                  {t.category || 'Incidente Geral'}
                                </span>
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border border-current/10 shadow-sm", sConf.bg, sConf.color)}>
                                  {sConf.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-widest border border-current/10 shadow-sm", pConf.bg, pConf.color)}>
                                  {pConf.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                {t.sla_status_resolution
                                  ? <SLABadge status={t.sla_status_resolution as any} />
                                  : <span className="text-muted-foreground/30 text-xs">—</span>}
                              </TableCell>
                              <TableCell className="pr-8 text-right">
                                <span className="text-content-secondary font-black text-[11px] tracking-widest">
                                  {formatDate(new Date(t.created_at), 'dd/MM/yyyy')}
                                </span>
                              </TableCell>
                            </motion.tr>
                          )
                        })}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      )}

      {/* Importar */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-border-divider shadow-xl bg-surface-card">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                    <Upload className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="h2-section !text-lg !text-foreground">Portal de Ingestão Inteligente</h2>
                    <p className="label-premium mt-1 opacity-60">Processamento de incidentes via Gemini Pro & RAG</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex bg-accent/30 p-1 rounded-xl border border-border/50 w-fit">
                  {(['csv', 'text', 'pdf'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setFormat(f); setContent(''); setPdfFile(null) }}
                      className={cn(
                        "px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                        format === f 
                          ? "bg-primary text-primary-foreground shadow-lg" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {f === 'csv' ? 'Dataset CSV' : f === 'text' ? 'Texto Livre' : 'Escaneamento PDF'}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  <Label className="label-premium ml-1">Atribuir ao LOGO (Opcional)</Label>
                  <SearchableSelect
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                    className="h-11 rounded-xl bg-accent/30 border-border/50 shadow-inner"
                    options={[
                      { label: 'AUTO-MAPEAR POR CONTEXTO IA', value: 'all' },
                      ...accounts.map(a => ({ label: a.name.toUpperCase(), value: a.id }))
                    ]}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="label-premium">{format === 'pdf' ? 'Arquivo Digital' : 'Estrutura de Dados'}</Label>
                    {format !== 'pdf' && (
                      <button
                        onClick={() => setContent(format === 'csv' ? csvExample : textExample)}
                        className="label-premium text-primary hover:opacity-80 transition-opacity"
                      >
                        Carregar Exemplo
                      </button>
                    )}
                  </div>
                  
                  {format === 'pdf' ? (
                    <div className="relative group">
                       <Input 
                         type="file" 
                         accept="application/pdf"
                         onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPdfFile(e.target.files ? e.target.files[0] : null)}
                         className="bg-accent/30 border-border/50 text-foreground file:bg-primary file:text-primary-foreground file:border-none file:font-black file:uppercase file:text-[10px] file:px-6 file:h-full file:mr-4 h-14 rounded-xl cursor-pointer shadow-inner pr-4" 
                       />
                       <p className="label-premium mt-4 leading-relaxed opacity-50 px-2 italic font-medium normal-case tracking-tight">
                         O motor de IA analisará o layout, identificará conversas e sugerirá ações automáticas baseadas no histórico.
                       </p>
                    </div>
                  ) : (
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={
                        format === 'csv'
                          ? 'logo, titulo, descricao, status...'
                          : 'Cole aqui logs de e-mail, transcrições ou textos extraídos...'
                      }
                      rows={12}
                      className="bg-accent/30 border-border/50 text-foreground placeholder:text-muted-foreground/30 font-mono text-sm rounded-2xl focus-visible:ring-primary shadow-inner p-5"
                    />
                  )}
                </div>

                <Button
                  onClick={handleIngest}
                  disabled={isSubmitting || (format === 'pdf' ? !pdfFile : !content.trim())}
                  variant="premium"
                  className="w-full h-14 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  {isSubmitting
                    ? <><Loader2 className="w-5 h-5 animate-spin mr-3" />Processando Redes Neurais...</>
                    : 'Ingerir e Treinar RAG'}
                </Button>

                {result && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={cn(
                      "p-6 rounded-2xl border-2 flex flex-col gap-4 shadow-lg",
                      (result.created ?? 0) > 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-destructive/5 border-destructive/10'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn("p-2 rounded-xl border", (result.created ?? 0) > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-destructive/10 border-destructive/20')}>
                        {(result.created ?? 0) > 0
                          ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          : <AlertTriangle className="w-6 h-6 text-destructive" />}
                      </div>
                      <span className="text-foreground text-lg font-black tracking-tighter uppercase">
                        {result.created ?? 0} Incidentes Catalogados
                      </span>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <div className="space-y-2 mt-2 border-t border-border/50 pt-4">
                        {result.errors.map((e: string, i: number) => (
                          <div key={i} className="flex gap-3 text-destructive text-[11px] font-black uppercase tracking-tight leading-none">• {e}</div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Guia de formatos */}
          <div className="space-y-6">
            <Card className="border-border-divider shadow-lg bg-surface-card">
              <CardHeader className="p-8 pb-4">
                <h3 className="h2-section flex items-center gap-2">
                   <Sparkles className="w-4 h-4 text-primary" />
                   Protocolo IA
                </h3>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="space-y-6">
                  {format === 'pdf' ? (
                    <div className="space-y-6">
                      <p className="label-premium normal-case text-foreground opacity-80 leading-relaxed">Capacidades do Agente Gemini:</p>
                      <ul className="space-y-4">
                        {[
                          'Visão Computacional p/ OCR',
                          'Análise de Sentimento Recurrente',
                          'Mapeamento de Entidades CRM',
                          'Sugestão de Resolução p/ CS'
                        ].map(item => (
                          <li key={item} className="flex items-center gap-3 label-premium !text-foreground/60">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : format === 'csv' ? (
                    <div className="space-y-6">
                      <p className="label-premium normal-case text-foreground opacity-80 leading-relaxed">Estrutura Requerida:</p>
                      <div className="bg-accent/40 p-4 rounded-xl border border-border/50 font-mono text-[10px] break-all opacity-70 shadow-inner">
                        account_name, title, desc, status, priority
                      </div>
                      <p className="label-premium !text-[9px] italic opacity-40">Encoding: UTF-8 / RFC 4180</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <p className="label-premium normal-case text-foreground opacity-80 leading-relaxed">Gen-AI Pipeline:</p>
                      <ul className="space-y-4">
                        {[
                          'Deduplicação Inteligente',
                          'Identificação de Contas por Contexto',
                          'Criação de Thread Histórica',
                          'Priorização Automática (SLA)'
                        ].map(item => (
                          <li key={item} className="flex items-center gap-3 label-premium !text-foreground/60">
                            <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

