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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { TicketCheck, Upload, Loader2, AlertTriangle, CheckCircle2, Filter, Mail, Calendar, Tag, AlertCircle, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { format as formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
  open: { label: 'Aberto', color: 'text-plannera-demand', bg: 'bg-plannera-demand/10' },
  'in-progress': { label: 'Em Progresso', color: 'text-plannera-orange', bg: 'bg-plannera-orange/10' },
  resolved: { label: 'Resolvido', color: 'text-plannera-ds', bg: 'bg-plannera-ds/10' },
  closed: { label: 'Fechado', color: 'text-slate-400', bg: 'bg-slate-500/10' },
}

const priorityConfig: Record<string, { label: string, color: string, bg: string }> = {
  critical: { label: 'Crítico', color: 'text-plannera-demand', bg: 'bg-plannera-demand/10' },
  high: { label: 'Alto', color: 'text-plannera-orange', bg: 'bg-plannera-orange/10' },
  medium: { label: 'Médio', color: 'text-plannera-operations', bg: 'bg-plannera-operations/10' },
  low: { label: 'Baixo', color: 'text-slate-400', bg: 'bg-slate-500/10' },
}

type Account = { id: string; name: string }
type Ticket = {
  id: string
  account_id: string
  title: string
  description: string
  status: string
  priority: string
  category: string | null
  opened_at: string
  resolved_at: string | null
  thread_content: string | null
  accounts: { name: string } | null
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
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null)

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

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus !== 'all' && t.status !== filterStatus) return false
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Tabs */}
      {/* Premium Tabs */}
      <div className="flex justify-between items-center border-b border-white/5 pb-2">
        <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
          {(['list', 'import'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "px-6 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all relative",
                activeTab === tab ? "text-white shadow-lg" : "text-slate-500 hover:text-white"
              )}
            >
              {tab === 'list' ? `Tickets (${tickets.length})` : 'Ingestão IA'}
              {activeTab === tab && (
                <motion.div 
                  layoutId="active-tab"
                  className="absolute inset-0 bg-plannera-orange rounded-lg -z-10"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}
            </button>
          ))}
        </div>
        
        {activeTab === 'list' && (
          <Button 
            variant="ghost" 
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
            className="bg-plannera-ds/10 text-plannera-ds hover:bg-plannera-ds/20 hover:text-white border border-plannera-ds/20 rounded-xl h-9 gap-2 font-bold uppercase tracking-tighter text-[10px]"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mail className="w-4 h-4" />
            )}
            Sync E-mails
          </Button>
        )}
      </div>

      {/* Lista */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-3 items-center flex-wrap bg-slate-900/40 p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2 pl-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-plannera-orange" />
              <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wide">Filtros:</span>
            </div>
            <SearchableSelect
              value={filterStatus}
              onValueChange={setFilterStatus}
              className="h-8 w-40"
              options={[
                { label: 'Todos os Status', value: 'all' },
                ...Object.entries(statusConfig).map(([value, conf]) => ({ label: conf.label, value }))
              ]}
            />
            <SearchableSelect
              value={filterPriority}
              onValueChange={setFilterPriority}
              className="h-8 w-44"
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
                className="text-plannera-orange hover:text-white h-9 text-[10px] font-bold uppercase tracking-widest"
              >
                Limpar Busca
              </Button>
            )}
          </div>

          <Card className="glass-card border-none shadow-2xl overflow-hidden">
            <CardContent className="p-0">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-24 opacity-20">
                  <TicketCheck className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-xs font-black uppercase tracking-widest">Nenhum ticket encontrado</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        <TableHead className="text-slate-500 font-bold uppercase tracking-widest text-[10px] pl-8">Cliente / LOGO</TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Título do Chamado</TableHead>
                        <TableHead className="text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">Status</TableHead>
                        <TableHead className="text-center text-slate-500 font-bold uppercase tracking-widest text-[10px]">Prioridade</TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Categoria</TableHead>
                        <TableHead className="text-slate-500 font-bold uppercase tracking-widest text-[10px] pr-8 text-right">Abertura</TableHead>
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
                              onClick={() => setSelectedTicket(t)}
                              className="group border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer"
                            >
                              <TableCell className="p-4 pl-8 whitespace-nowrap">
                                <span className="text-white font-black text-sm tracking-tight group-hover:text-indigo-400 transition-colors uppercase">
                                  {t.accounts?.name ?? '—'}
                                </span>
                              </TableCell>
                              <TableCell className="py-4">
                                <div className="flex flex-col">
                                  <span className="text-slate-200 text-sm font-bold tracking-tight line-clamp-1">{t.title}</span>
                                  <span className="text-slate-500 text-[10px] font-medium uppercase tracking-widest line-clamp-1">{t.category || 'Suporte Geral'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", sConf.bg, sConf.color)}>
                                  {sConf.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-center whitespace-nowrap">
                                <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", pConf.bg, pConf.color)}>
                                  {pConf.label}
                                </span>
                              </TableCell>
                              <TableCell className="text-slate-500 text-xs font-bold uppercase tracking-tighter">
                                {t.category ?? '—'}
                              </TableCell>
                              <TableCell className="pr-8 text-right">
                                <span className="text-slate-400 text-[10px] font-black font-mono">
                                  {formatDate(new Date(t.opened_at + 'T12:00:00'), 'dd/MM/yyyy')}
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

          {/* Modal de Detalhes do Ticket */}
          <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
            <DialogContent className="glass-card border-none text-white max-w-2xl backdrop-blur-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)]">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-4">
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", statusConfig[selectedTicket?.status ?? '']?.bg, statusConfig[selectedTicket?.status ?? '']?.color)}>
                    {statusConfig[selectedTicket?.status ?? '']?.label}
                  </span>
                  <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide", priorityConfig[selectedTicket?.priority ?? '']?.bg, priorityConfig[selectedTicket?.priority ?? '']?.color)}>
                    {priorityConfig[selectedTicket?.priority ?? '']?.label}
                  </span>
                </div>
                <DialogTitle className="text-2xl font-heading font-extrabold text-white tracking-tight uppercase mb-1">
                  {selectedTicket?.title}
                </DialogTitle>
                <DialogDescription className="text-plannera-orange font-bold text-[10px] uppercase tracking-[0.2em] opacity-70">
                   {selectedTicket?.accounts?.name || 'Cliente Corporativo'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Metadados Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="w-4 h-4 text-plannera-orange" />
                    <span>Aberto em: <strong>{selectedTicket?.opened_at ? formatDate(new Date(selectedTicket.opened_at + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Tag className="w-4 h-4 text-plannera-orange" />
                    <span>Categoria: <strong>{selectedTicket?.category ?? '—'}</strong></span>
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                {/* Descrição */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <AlertCircle className="w-4 h-4 text-plannera-orange" />
                    Histórico da Conversa
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
                    {selectedTicket?.thread_content || selectedTicket?.description || 'Nenhuma descrição detalhada fornecida.'}
                  </div>
                </div>

                {/* Ações / Rodapé */}
                <div className="flex justify-end pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedTicket(null)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Importar */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card className="glass-card border-none shadow-xl">
              <CardHeader className="pb-6 pt-8 px-8">
                <CardTitle className="text-white text-lg font-heading font-extrabold uppercase tracking-tight flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-plannera-sop/10 border border-plannera-sop/20">
                    <Upload className="w-5 h-5 text-plannera-orange" />
                  </div>
                  Portal de Ingestão Inteligente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-8 px-8 pb-8">
                <div className="flex bg-black/20 p-1 rounded-xl border border-white/5 w-fit">
                  {(['csv', 'text', 'pdf'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setFormat(f); setContent(''); setPdfFile(null) }}
                      className={cn(
                        "px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all",
                        format === f 
                          ? "bg-plannera-orange text-white shadow-lg" 
                          : "text-slate-500 hover:text-white"
                      )}
                    >
                      {f === 'csv' ? 'CSV Estático' : f === 'text' ? 'Texto Livre' : 'PDF Assistido (IA)'}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400 text-[10px] font-black uppercase tracking-widest ml-1">
                    Atribuir ao LOGO <span className="text-slate-600 italic">(Opcional)</span>
                  </Label>
                  <SearchableSelect
                    value={selectedAccountId}
                    onValueChange={setSelectedAccountId}
                    options={[
                      { label: 'MAPEAR AUTOMATICAMENTE POR IA', value: 'all' },
                      ...accounts.map(a => ({ label: a.name.toUpperCase(), value: a.id }))
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{format === 'pdf' ? 'Arquivo PDF' : 'Conteúdo para Análise'}</Label>
                    {format !== 'pdf' && (
                      <button
                        onClick={() => setContent(format === 'csv' ? csvExample : textExample)}
                        className="text-[9px] font-bold text-plannera-orange hover:text-white uppercase tracking-widest"
                      >
                        Carregar Template
                      </button>
                    )}
                  </div>
                  
                  {format === 'pdf' ? (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="relative group"
                    >
                       <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                       <Input 
                         type="file" 
                         accept="application/pdf"
                         onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPdfFile(e.target.files ? e.target.files[0] : null)}
                         className="relative bg-black/40 border-white/5 text-slate-300 file:bg-indigo-600 file:text-white file:border-none file:font-black file:uppercase file:text-[10px] file:px-4 file:h-10 file:mr-4 h-12 rounded-xl cursor-pointer" 
                       />
                       <p className="text-slate-600 text-[10px] font-medium mt-3 leading-relaxed uppercase tracking-tight">
                         A IA processará o documento, extrairá threads de conversa e categorizará o risco automaticamente.
                       </p>
                    </motion.div>
                  ) : (
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={
                        format === 'csv'
                          ? 'nome_logo,titulo,descricao,status,prioridade...'
                          : 'Cole aqui o histórico do e-mail ou chat...'
                      }
                      rows={10}
                      className="bg-black/40 border-white/5 text-slate-200 placeholder:text-slate-700 font-mono text-xs rounded-xl focus-visible:ring-indigo-500 p-4"
                    />
                  )}
                </div>

                <Button
                  onClick={handleIngest}
                  disabled={isSubmitting || (format === 'pdf' ? !pdfFile : !content.trim())}
                  className="w-full bg-plannera-orange hover:bg-plannera-orange/90 text-white font-bold uppercase tracking-[0.2em] h-12 shadow-[0_0_20px_rgba(247,148,30,0.3)] transition-all active:scale-95"
                >
                  {isSubmitting
                    ? <><Loader2 className="w-5 h-5 animate-spin mr-3 text-white" />Processando Inteligência...</>
                    : 'Processar e Vetorizar'}
                </Button>

                {result && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "p-5 rounded-2xl border flex flex-col gap-3",
                      (result.created ?? 0) > 0 ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {(result.created ?? 0) > 0
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        : <AlertTriangle className="w-5 h-5 text-red-500" />}
                      <span className="text-white text-xs font-black uppercase tracking-widest">
                        {result.created ?? 0} Tickets Ingeridos com Sucesso
                      </span>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <div className="space-y-1 mt-1 border-t border-white/5 pt-3">
                        {result.errors.map((e: string, i: number) => (
                          <div key={i} className="flex gap-2 text-red-400 text-[10px] font-bold uppercase tracking-tight">• {e}</div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Guia de formatos */}
          <div className="space-y-4">
            <Card className="glass-card border-none shadow-lg">
              <CardHeader className="pb-4 pt-8 px-8">
                <CardTitle className="text-white text-sm font-black uppercase tracking-widest flex items-center gap-2">
                   <Sparkles className="w-4 h-4 text-indigo-400" />
                   Protocolo de Dados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 px-8 pb-8">
                <div className="space-y-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                  {format === 'pdf' ? (
                    <div className="space-y-4">
                      <p className="text-plannera-orange/80">O processador <strong className="text-white">Gemini IA</strong> realiza:</p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-plannera-orange rounded-full" /> OCR e Leitura Estruturada</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-plannera-orange rounded-full" /> Segmentação de Eventos</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-plannera-orange rounded-full" /> Inferência de Sentimento</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-plannera-orange rounded-full" /> Linkage Automático de CRM</li>
                      </ul>
                    </div>
                  ) : format === 'csv' ? (
                    <div className="space-y-4">
                      <p className="text-indigo-400/80">Esquema Requerido:</p>
                      <div className="bg-black/20 p-3 rounded-lg border border-white/5 font-mono text-[9px] lowercase opacity-70">
                        account_name, title, description, status, priority, date
                      </div>
                      <p className="text-[9px] italic opacity-50">UTF-8 Encoding Recomendado</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-plannera-orange/80">Capacidades Gen-AI:</p>
                      <ul className="space-y-2">
                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-plannera-orange rounded-full" /> Limpeza de Ruído de Texto</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-plannera-orange rounded-full" /> Identificação de Entidades</li>
                        <li className="flex items-center gap-2"><div className="w-1 h-1 bg-plannera-orange rounded-full" /> Sumarização de Tickets</li>
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
