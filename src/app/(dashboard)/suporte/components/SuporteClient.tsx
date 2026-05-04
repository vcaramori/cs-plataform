'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Account, SupportTicket } from '@/lib/supabase/types'
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
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { StatusBadgeGuard } from '@/components/shared/guardians/StatusBadgeGuard'

const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
  open: { label: 'Aberto', color: 'text-destructive', bg: 'bg-destructive/10' },
  'in-progress': { label: 'Em Progresso', color: 'text-accent', bg: 'bg-accent/10' },
  resolved: { label: 'Resolvido', color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  closed: { label: 'Fechado', color: 'text-content-secondary', bg: 'bg-surface-background/50' },
}

const priorityConfig: Record<string, { label: string, color: string, bg: string }> = {
  critical: { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive/10' },
  high: { label: 'Alto', color: 'text-accent', bg: 'bg-accent/10' },
  medium: { label: 'Médio', color: 'text-secondary', bg: 'bg-secondary/10' },
  low: { label: 'Baixo', color: 'text-content-secondary', bg: 'bg-surface-background/50' },
}

const csvExample = `account_name,title,description,status,priority
ACME Corp,Erro no Relatório,Erro ao processar PDF,open,high`

const textExample = `De: suporte@cliente.com
Assunto: Lentidão no Dashboard
Olá time, estamos percebendo lentidão ao carregar os dados de NPS desde ontem.`

function sortTickets(tickets: any[]) {
  const priorityMap: any = { critical: 0, high: 1, medium: 2, low: 3 }
  const slaMap: any = { vencido: 0, atencao: 1, no_prazo: 2 }
  
  return [...tickets].sort((a, b) => {
    // 1. SLA Status (Resolution)
    const slaA = slaMap[a.sla_status_resolution] ?? 99
    const slaB = slaMap[b.sla_status_resolution] ?? 99
    if (slaA !== slaB) return slaA - slaB
    
    // 2. Priority
    const pA = priorityMap[a.priority] ?? 99
    const pB = priorityMap[b.priority] ?? 99
    if (pA !== pB) return pA - pB
    
    // 3. Date
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

export function SuporteClient({
  accounts,
  initialTickets,
}: {
  accounts: Pick<Account, 'id' | 'name'>[]
  initialTickets: SupportTicket[]
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
  const [tickets, setTickets] = useState<SupportTicket[]>(initialTickets)

  const handleIngest = async () => {
    setIsSubmitting(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('format', format)
      formData.append('accountId', selectedAccountId)
      
      if (format === 'pdf' && pdfFile) {
        formData.append('file', pdfFile)
      } else {
        formData.append('content', content)
      }

      const res = await fetch('/api/support-tickets/ingest', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error(await res.text())
      
      const data = await res.json()
      setResult(data)
      toast.success(`${data.created} chamados criados!`)
      if (data.created > 0) {
        router.refresh()
      }
    } catch (err: any) {
      toast.error('Erro na ingestão: ' + err.message)
      setResult({ created: 0, errors: [err.message] })
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
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* KPI Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCardPremium
          title="Abertos"
          value={openTickets.length}
          icon={TicketCheck}
          colorVariant="sop"
        />
        <StatCardPremium
          title="SLA Vencido"
          value={breachedCount}
          icon={AlertTriangle}
          colorVariant="destructive"
        />
        <StatCardPremium
          title="SLA Atenção"
          value={attentionCount}
          icon={AlertTriangle}
          colorVariant="orange"
        />
        <StatCardPremium
          title="Histórico Total"
          value={tickets.length}
          icon={CheckCircle2}
          colorVariant="ds"
        />
      </div>

      {/* Analytics Shortcut */}
      <div className="flex justify-end pr-2">
        <Link 
          href="/suporte/dashboard" 
          className="text-[10px] font-black uppercase tracking-[0.2em] text-plannera-primary hover:text-plannera-orange transition-all flex items-center gap-2 group"
        >
          <LayoutDashboard className="w-4 h-4 transition-transform group-hover:scale-110" />
          Analytics & Control Tower
        </Link>
      </div>

      {/* Tabs */}
      <div className="flex justify-between items-center border-b border-border-divider/50 pb-6">
        <div className="flex bg-surface-card border border-border-divider p-1.5 rounded-2xl shadow-inner">
          {(['list', 'import'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all relative z-10",
                activeTab === tab ? "text-white" : "text-content-secondary hover:text-content-primary"
              )}
            >
              {tab === 'list' ? `Fila Ativa (${tickets.length})` : 'Ingestão Inteligente'}
              {activeTab === tab && (
                <motion.div 
                  layoutId="active-tab-support"
                  className="absolute inset-0 bg-plannera-primary rounded-xl -z-10 shadow-lg shadow-plannera-primary/20"
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
            className="bg-plannera-orange hover:bg-plannera-orange/90 text-white rounded-xl h-11 px-6 shadow-lg shadow-plannera-orange/20"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4 mr-2" />
            )}
            Sincronizar E-mails
          </Button>
        )}
      </div>

      {activeTab === 'list' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex gap-4 items-center flex-wrap bg-surface-card border border-border-divider p-5 rounded-[1.5rem] shadow-xl">
            <div className="flex items-center gap-3 pl-2 pr-4 border-r border-border-divider/50 shrink-0">
              <Filter className="w-4 h-4 text-plannera-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-content-primary">Filtros</span>
            </div>
            <SearchableSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              className="h-10 w-44 rounded-xl border-border-divider shadow-sm text-[10px] font-bold uppercase tracking-tight"
              options={[
                { label: 'Todos os Status', value: 'all' },
                ...Object.entries(statusConfig).map(([value, conf]) => ({ label: conf.label, value }))
              ]}
            />
            <SearchableSelect
              value={filterPriority}
              onValueChange={setFilterPriority}
              className="h-10 w-48 rounded-xl border-border-divider shadow-sm text-[10px] font-bold uppercase tracking-tight"
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
                className="text-[10px] font-black uppercase tracking-widest text-plannera-primary hover:bg-plannera-primary/5 transition-all"
              >
                Limpar Busca
              </Button>
            )}
          </div>

          <div className="bg-surface-card border border-border-divider rounded-2xl shadow-2xl overflow-hidden backdrop-blur-md">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-surface-background/50">
                  <TableRow className="hover:bg-transparent border-b border-border-divider">
                    <TableHead className="pl-10 h-16 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">LOGO / Cliente</TableHead>
                    <TableHead className="h-16 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Título do Chamado</TableHead>
                    <TableHead className="h-16 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary text-center">Status</TableHead>
                    <TableHead className="h-16 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary text-center">Prioridade</TableHead>
                    <TableHead className="h-16 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary text-center">SLA Resolução</TableHead>
                    <TableHead className="pr-10 h-16 text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary text-right">Abertura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <AnimatePresence mode='popLayout'>
                    {filteredTickets.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-64 text-center">
                          <div className="flex flex-col items-center justify-center opacity-30 grayscale">
                            <TicketCheck className="w-12 h-12 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum chamado pendente</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTickets.map((t, index) => (
                        <motion.tr 
                          key={t.id} 
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.02 }}
                          onClick={() => router.push(`/suporte/${t.id}`)}
                          className="group border-b border-border-divider hover:bg-white/5 transition-all cursor-pointer h-20"
                        >
                          <TableCell className="pl-10">
                            <span className="text-[11px] font-black uppercase tracking-tight text-content-primary opacity-60 group-hover:opacity-100 transition-opacity">
                              {t.accounts?.name ?? '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <span className="text-xs font-black text-content-primary line-clamp-1 group-hover:text-plannera-primary transition-colors">
                                {t.title}
                              </span>
                              <span className="text-[9px] font-bold uppercase tracking-widest text-content-secondary opacity-40">
                                {t.category || 'Incidente Geral'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadgeGuard 
                              label={statusConfig[t.status]?.label || t.status} 
                              type={t.status as any} 
                              className="mx-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            <StatusBadgeGuard 
                              label={priorityConfig[t.priority]?.label || t.priority} 
                              type={t.priority as any} 
                              className="mx-auto"
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {t.sla_status_resolution
                              ? <SLABadge status={t.sla_status_resolution as any} />
                              : <span className="text-[9px] font-black uppercase tracking-widest opacity-20">—</span>}
                          </TableCell>
                          <TableCell className="pr-10 text-right">
                            <span className="text-content-secondary font-black text-[10px] tracking-widest opacity-60">
                              {formatDate(new Date(t.created_at), 'dd/MM/yyyy')}
                            </span>
                          </TableCell>
                        </motion.tr>
                      ))
                    )}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </div>
          </div>
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
                        "px-6 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all",
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
                         className="bg-accent/30 border-border/50 text-foreground file:bg-primary file:text-primary-foreground file:border-none file:font-extrabold file:uppercase file:text-[10px] file:px-6 file:h-full file:mr-4 h-14 rounded-xl cursor-pointer shadow-inner pr-4" 
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
                      <span className="text-foreground text-lg font-extrabold tracking-tighter uppercase">
                        {result.created ?? 0} Incidentes Catalogados
                      </span>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <div className="space-y-2 mt-2 border-t border-border/50 pt-4">
                        {result.errors.map((e: string, i: number) => (
                          <div key={i} className="flex gap-3 text-destructive text-[11px] font-extrabold uppercase tracking-tight leading-none">• {e}</div>
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

