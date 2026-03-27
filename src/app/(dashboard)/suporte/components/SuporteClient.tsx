'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TicketCheck, Upload, Loader2, AlertTriangle, CheckCircle2, Filter } from 'lucide-react'
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
  const [format, setFormat] = useState<'csv' | 'text'>('csv')
  const [content, setContent] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)

  async function handleIngest() {
    if (!content.trim()) { toast.error('Cole o conteúdo antes de importar'); return }
    setIsSubmitting(true)
    setResult(null)

    try {
      const res = await fetch('/api/support-tickets/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          content,
          account_id: selectedAccountId || undefined,
        }),
      })

      const data = await res.json()
      setResult(data)

      if (data.created > 0) {
        toast.success(`${data.created} ticket(s) importado(s)`)
        setContent('')
        router.refresh()
      } else {
        toast.error('Nenhum ticket foi importado')
      }
    } catch {
      toast.error('Erro na importação')
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredTickets = tickets.filter((t) => {
    if (filterStatus && t.status !== filterStatus) return false
    if (filterPriority && t.priority !== filterPriority) return false
    return true
  })

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800">
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
                <SelectItem value="" className="text-white text-xs">Todos os status</SelectItem>
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
                <SelectItem value="" className="text-white text-xs">Todas as prioridades</SelectItem>
                {Object.entries(priorityLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v} className="text-white text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {(filterStatus || filterPriority) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setFilterStatus(''); setFilterPriority('') }}
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
                        <tr key={t.id} className="hover:bg-slate-800/30 transition-colors">
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
                <div className="flex gap-3">
                  {(['csv', 'text'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => { setFormat(f); setContent('') }}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        format === f
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {f === 'csv' ? 'CSV' : 'Texto livre'}
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
                    <Label className="text-slate-300 text-sm">Conteúdo</Label>
                    <button
                      onClick={() => setContent(format === 'csv' ? csvExample : textExample)}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Usar exemplo
                    </button>
                  </div>
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
                </div>

                <Button
                  onClick={handleIngest}
                  disabled={isSubmitting || !content.trim()}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  {isSubmitting
                    ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Importando e vetorizando...</>
                    : 'Importar Tickets'}
                </Button>

                {result && (
                  <div className={`p-4 rounded-lg border ${
                    result.created > 0 ? 'bg-emerald-900/20 border-emerald-800' : 'bg-red-900/20 border-red-800'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      {result.created > 0
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        : <AlertTriangle className="w-4 h-4 text-red-400" />}
                      <span className="text-white text-sm font-medium">
                        {result.created} ticket(s) importado(s)
                      </span>
                    </div>
                    {result.errors.length > 0 && (
                      <ul className="space-y-1">
                        {result.errors.map((e, i) => (
                          <li key={i} className="text-red-300 text-xs">• {e}</li>
                        ))}
                      </ul>
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
                <CardTitle className="text-white text-sm">Formato {format === 'csv' ? 'CSV' : 'Texto'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-slate-400">
                {format === 'csv' ? (
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
                    <p>Um ticket por bloco, separados por linha em branco.</p>
                    <p>Campos suportados:</p>
                    <ul className="space-y-1">
                      <li><span className="text-indigo-300 font-mono">Conta:</span> nome da empresa</li>
                      <li><span className="text-indigo-300 font-mono">Título:</span> título do chamado</li>
                      <li><span className="text-indigo-300 font-mono">Descrição:</span> detalhe do problema</li>
                      <li><span className="text-indigo-300 font-mono">Status:</span> aberto / em andamento</li>
                      <li><span className="text-indigo-300 font-mono">Prioridade:</span> baixa / media / alta / critico</li>
                      <li><span className="text-indigo-300 font-mono">Data:</span> YYYY-MM-DD</li>
                    </ul>
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
