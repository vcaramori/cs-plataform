'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { History, FileText, Trash2, Loader2 } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EditContractDialog } from './EditContractDialog'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

type Contract = {
  id: string
  contract_type: string | null
  service_type: string | null
  mrr: number
  start_date: string | null
  renewal_date: string | null
  status: string
  notes: string | null
}

export function ContractHistoryDialog({ contractId, contractName }: { contractId: string, contractName: string }) {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (open) {
      setLoading(true)
      fetch(`/api/contracts/${contractId}/history`)
        .then(res => res.json())
        .then(data => {
          setHistory(data)
          setLoading(false)
        })
        .catch(err => {
          console.error(err)
          setLoading(false)
        })
    }
  }, [open, contractId])

  async function handleDelete(id: string) {
    if (!confirm('Tem certeza que deseja excluir este registro de histórico? Esta ação não pode ser desfeita.')) return
    
    setDeletingId(id)
    try {
      // Usaremos a rota de contracts, mas ideal seria uma rota especifica para contract_history se quisermos deletar o historico.
      // Vou focar apenas na exclusão de vigências indevidas. Se precisar, podemos criar DELETE /api/history.
      // Por agora, o usuário principal edita o atual. Excluir historico não é tão critico, mas vamos deixar inativo por segurança.
      toast.info('Função de exclusão de revisão desabilitada nesta versão.')
    } finally {
      setDeletingId(null)
    }
  }

  const typeLabels: Record<string, string> = {
    initial: 'Inicial',
    additive: 'Aditivo',
    migration: 'Migração',
    renewal: 'Renovação',
  }

  const statusColors: Record<string, string> = {
    active: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'at-risk': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    churned: 'bg-red-500/20 text-red-300 border-red-500/30',
    'in-negotiation': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white gap-2">
          <History className="w-4 h-4" /> Histórico de Vigências
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <DialogTitle>Histórico de Vigências: {contractName}</DialogTitle>
          </div>
          <DialogDescription className="text-slate-400">
            Revisões passadas deste produto (Aditivos e Renovações).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Data Início</TableHead>
                  <TableHead className="text-slate-400">Data Fim</TableHead>
                  <TableHead className="text-slate-400">Ação Relatada</TableHead>
                  <TableHead className="text-slate-400">Plano</TableHead>
                  <TableHead className="text-slate-400">MRR</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400 text-right">Data Modificação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((c) => (
                  <TableRow key={c.id} className="border-slate-800 hover:bg-slate-800/30 group">
                    <TableCell className="text-slate-300">
                      {c.start_date ? new Date(c.start_date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-slate-400 italic">
                      {c.end_date ? new Date(c.end_date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-slate-700 bg-slate-800/50">
                        {typeLabels[c.contract_type ?? 'initial'] ?? c.contract_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">{c.service_type}</TableCell>
                    <TableCell className="font-medium text-white">
                      R$ {Number(c.mrr).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] border ${statusColors[c.status] ?? ''}`}>
                        Antigo
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-slate-500 text-xs">
                       {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-slate-500 italic">
                      Nenhuma versão anterior encontrada para este contrato.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
