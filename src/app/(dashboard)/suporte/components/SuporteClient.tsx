'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { TicketCheck, Upload, Loader2, AlertTriangle, CheckCircle2, Filter, Mail, ExternalLink, Calendar, Tag, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { format as formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const statusColors: Record<string, string> = {
  open: 'bg-red-500/20 text-red-300',
  'in-progress': 'bg-yellow-500/20 text-yellow-300',
  resolved: 'bg-emerald-500/20 text-emerald-300',
  closed: 'bg-slate-500/20 text-slate-300',
}
const statusLabels: Record<string, string> = {
  open: 'Aberto', 'in-progress': 'Em andamento', resolved: 'Resolvido', closed: 'Fechado',
}
const priorityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300',
  high: 'bg-orange-500/20 text-orange-300',
  medium: 'bg-yellow-500/20 text-yellow-300',
  low: 'bg-slate-500/20 text-slate-300',
}
const priorityLabels: Record<string, string> = {
  critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo',
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
  accounts: { name: string } | null
}

const csvExample = `account_name,title,description,status,priority,category,opened_at
Empresa X,Erro no login,Usuário não consegue autenticar após atualização,open,high,auth,2026-03-15
Empresa Y,Lentidão no dashboard,Dashboard demora mais de 30s para carregar,in-progress,medium,performance,2026-03-20`

const textExample = `Conta: Empresa X
Título: Falha na integração de pagamento
Descrição: Webhook não está sendo disparado após a confirmação do pagamento
Status: open
Prioridade: critical
Categoria: integração
Data: 2026-03-25

Conta: Empresa Y
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
      <div className="flex justify-between items-center border-b border-slate-800">
        <div className="flex gap-2">
          {(['list', 'import'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'list' ? `Tickets (${tickets.length})` : 'Importar'}
            </button>
          ))}
        </div>
        
        {/* Botão Sincronizar E-mails */}
        {activeTab === 'list' && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={async () => {
              toast.info('Buscando e-mails na caixa invisível...')
              try {
                const res = await fetch('/api/support-tickets/email-sync', { method: 'POST' })
                const data = await res.json()
                if (data.created > 0) {
                  toast.success(`${data.created} chamado(s) criados a partir de e-mails!`)
                  router.refresh()
                } else if (data.message) {
                  toast.info(data.message)
                } else {
                   toast.error(data.error || 'Erro ao sincronizar e-mails.')
                }
              } catch (e) {
                 toast.error('Erro de conexão com servidor IMAP.')
              }
            }}
            className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 gap-2 mb-1"
          >
            <Mail className="w-4 h-4" />
            Sincronizar E-mails
          </Button>
        )}
      </div>

      {/* Lista */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 text-sm">Filtros:</span>
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 w-40 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white text-xs">Todos os status</SelectItem>
                {Object.entries(statusLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v} className="text-white text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-8 w-40 text-xs">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="all" className="text-white text-xs">Todas as prioridades</SelectItem>
                {Object.entries(priorityLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v} className="text-white text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterStatus || filterPriority) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterStatus('all'); setFilterPriority('all') }}
                className="text-slate-400 hover:text-white h-8 text-xs"
              >
                Limpar
              </Button>
            )}
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-0">
              {filteredTickets.length === 0 ? (
                <div className="text-center py-12">
                  <TicketCheck className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-400 text-sm">Nenhum ticket encontrado</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveTab('import')}
                    className="text-indigo-400 hover:text-indigo-300 mt-2 text-xs"
                  >
                    Importar tickets
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800">
                        <th className="text-left text-slate-400 font-medium p-4 pr-3">Conta</th>
                        <th className="text-left text-slate-400 font-medium py-4 pr-3">Título</th>
                        <th className="text-center text-slate-400 font-medium py-4 pr-3">Status</th>
                        <th className="text-center text-slate-400 font-medium py-4 pr-3">Prioridade</th>
                        <th className="text-left text-slate-400 font-medium py-4 pr-3">Categoria</th>
                        <th className="text-left text-slate-400 font-medium py-4">Abertura</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {filteredTickets.map((t) => (
                        <tr 
                          key={t.id} 
                          onClick={() => setSelectedTicket(t)}
                          className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                        >
                          <td className="p-4 pr-3 text-white font-medium whitespace-nowrap">
                            {t.accounts?.name ?? '—'}
                          </td>
                          <td className="py-4 pr-3 text-slate-300 max-w-xs">
                            <div className="truncate">{t.title}</div>
                            {t.description && (
                              <div className="text-slate-500 text-xs truncate mt-0.5">{t.description}</div>
                            )}
                          </td>
                          <td className="py-4 pr-3 text-center">
                            <Badge className={`text-xs ${statusColors[t.status] ?? ''}`}>
                              {statusLabels[t.status] ?? t.status}
                            </Badge>
                          </td>
                          <td className="py-4 pr-3 text-center">
                            <Badge className={`text-xs ${priorityColors[t.priority] ?? ''}`}>
                              {priorityLabels[t.priority] ?? t.priority}
                            </Badge>
                          </td>
                          <td className="py-4 pr-3 text-slate-400 text-xs">{t.category ?? '—'}</td>
                          <td className="py-4 text-slate-400 text-xs whitespace-nowrap">
                            {formatDate(new Date(t.opened_at + 'T12:00:00'), 'dd MMM yyyy', { locale: ptBR })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Modal de Detalhes do Ticket */}
          <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
            <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={`text-xs ${statusColors[selectedTicket?.status ?? ''] ?? ''}`}>
                    {statusLabels[selectedTicket?.status ?? ''] ?? selectedTicket?.status}
                  </Badge>
                  <Badge className={`text-xs ${priorityColors[selectedTicket?.priority ?? ''] ?? ''}`}>
                    {priorityLabels[selectedTicket?.priority ?? ''] ?? selectedTicket?.priority}
                  </Badge>
                </div>
                <DialogTitle className="text-xl font-bold text-white leading-tight">
                  {selectedTicket?.title}
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium">
                  {selectedTicket?.accounts?.name ?? 'Conta não identificada'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Metadados Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="w-4 h-4 text-indigo-400" />
                    <span>Aberto em: <strong>{selectedTicket?.opened_at ? formatDate(new Date(selectedTicket.opened_at + 'T12:00:00'), 'dd/MM/yyyy') : '—'}</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Tag className="w-4 h-4 text-indigo-400" />
                    <span>Categoria: <strong>{selectedTicket?.category ?? '—'}</strong></span>
                  </div>
                </div>

                <Separator className="bg-slate-800" />

                {/* Descrição */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                    <AlertCircle className="w-4 h-4 text-indigo-400" />
                    Descrição Completa
                  </div>
                  <div className="bg-slate-950/50 p-4 rounded-lg border border-slate-800/50 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedTicket?.description || 'Nenhuma descrição detalhada fornecida.'}
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
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Upload className="w-4 h-4 text-indigo-400" />
                  Importar Chamados
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3 flex-wrap">
                  {(['csv', 'text', 'pdf'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setFormat(f); setContent(''); setPdfFile(null) }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        format === f
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f === 'csv' ? 'CSV' : f === 'text' ? 'Texto livre' : 'PDF Inteligente (IA)'}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">
                    Conta padrão <span className="text-slate-500">(opcional — pode vir no conteúdo)</span>
                  </Label>
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                      <SelectValue placeholder="Selecionar conta..." />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
                      <SelectItem value="all" className="text-white hover:bg-slate-700">
                        Selecionar conta...
                      </SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-white hover:bg-slate-700">
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-slate-300 text-sm">{format === 'pdf' ? 'Arquivo' : 'Conteúdo'}</Label>
                    {format !== 'pdf' && (
                      <button
                        onClick={() => setContent(format === 'csv' ? csvExample : textExample)}
                        className="text-xs text-indigo-400 hover:text-indigo-300"
                      >
                        Usar exemplo
                      </button>
                    )}
                  </div>
                  
                  {format === 'pdf' ? (
                    <div className="relative pt-2">
                       <Input 
                         type="file" 
                         accept="application/pdf"
                         onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPdfFile(e.target.files ? e.target.files[0] : null)}
                         className="bg-slate-800 border-slate-700 text-slate-300 file:text-indigo-400 file:bg-slate-900 file:border-none cursor-pointer" 
                       />
                       <p className="text-slate-500 text-xs mt-2">Envie o histórico completo do ticket ou e-mail exportado em PDF. A IA extrairá os dados e o associará automaticamente a uma Conta, se não informada acima.</p>
                    </div>
                  ) : (
                    <Textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder={
                        format === 'csv'
                          ? 'account_name,title,description,status,priority,category,opened_at\n...'
                          : 'Conta: Empresa X\nTítulo: ...\nDescrição: ...\nStatus: open\nPrioridade: high\nData: 2026-03-01'
                      }
                      rows={12}
                      className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-600 font-mono text-xs resize-none"
                    />
                  )}
                </div>

                <Button
                  onClick={handleIngest}
                  disabled={isSubmitting || (format === 'pdf' ? !pdfFile : !content.trim())}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {isSubmitting
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importando e vetorizando...</>
                    : 'Importar Tickets'}
                </Button>

                {result && (
                  <div className={`p-4 rounded-lg border ${
                    (result.created ?? 0) > 0 ? 'bg-emerald-900/20 border-emerald-800' : 'bg-red-900/20 border-red-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {(result.created ?? 0) > 0
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        : <AlertTriangle className="w-4 h-4 text-red-400" />}
                      <span className="text-white text-sm font-medium">
                        {result.created ?? 0} ticket(s) importado(s)
                      </span>
                    </div>
                    {result.errors && result.errors.length > 0 && (
                      <ul className="space-y-1">
                        {result.errors.map((e: string, i: number) => (
                          <li key={i} className="text-red-300 text-xs">• {e}</li>
                        ))}
                      </ul>
                    )}
                    {!result.errors && (result as any).error && (
                       <p className="text-red-300 text-xs">• {(result as any).error}</p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Guia de formatos */}
          <div className="space-y-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">Formato {format === 'csv' ? 'CSV' : format === 'text' ? 'Texto' : 'PDF (IA Inteligente)'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-400">
                {format === 'pdf' ? (
                  <>
                    <p>O processamento via <strong className="text-indigo-400">Gemini IA</strong> irá:</p>
                    <ul className="space-y-1">
                      <li>• Ler todo o PDF;</li>
                      <li>• Segmentar múltiplos tickets no mesmo documento;</li>
                      <li>• Inferir Categoria, Prioridade e Status da intenção original;</li>
                      <li>• Relacionar com Contas existentes automaticamente.</li>
                    </ul>
                  </>
                ) : format === 'csv' ? (
                  <>
                    <p>Colunas suportadas:</p>
                    <ul className="space-y-1 font-mono">
                      <li><span className="text-indigo-300">account_name</span> — nome da conta</li>
                      <li><span className="text-indigo-300">title</span> — título do chamado</li>
                      <li><span className="text-indigo-300">description</span> — descrição</li>
                      <li><span className="text-indigo-300">status</span> — open / in-progress / resolved / closed</li>
                      <li><span className="text-indigo-300">priority</span> — low / medium / high / critical</li>
                      <li><span className="text-indigo-300">category</span> — categoria (opcional)</li>
                      <li><span className="text-indigo-300">opened_at</span> — YYYY-MM-DD</li>
                    </ul>
                    <p className="text-slate-500">Também aceita variações em português (titulo, descricao, etc.)</p>
                  </>
                ) : (
                  <>
                    <p>Cole qualquer texto livre: e-mail copiado, thread de suporte, histórico de conversa.</p>
                    <p className="mt-2">O <strong className="text-indigo-400">Gemini IA</strong> irá:</p>
                    <ul className="space-y-1 mt-1">
                      <li>• Ignorar assinaturas, notificações automáticas e eventos de sistema;</li>
                      <li>• Identificar quantos chamados reais existem no texto;</li>
                      <li>• Extrair título, descrição, status, prioridade e categoria;</li>
                      <li>• Detectar a data de abertura e o nome da conta automaticamente.</li>
                    </ul>
                    <p className="text-slate-500 mt-2">Selecione uma conta padrão acima caso o texto não identifique o cliente.</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
