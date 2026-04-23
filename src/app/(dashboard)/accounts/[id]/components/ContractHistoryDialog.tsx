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
        <Button size="sm" variant="ghost" className="text-content-secondary hover:text-content-primary gap-2">
          <History className="w-4 h-4" /> Histórico de Vigências
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-surface-card border-border-divider text-content-primary max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-400" />
            <DialogTitle>Histórico de Vigências: {contractName}</DialogTitle>
          </div>
          <DialogDescription className="text-content-secondary">
            Revisões passadas deste produto (Aditivos e Renovações).
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-400" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-border-divider hover:bg-transparent">
                  <TableHead className="text-content-secondary">Data Início</TableHead>
                  <TableHead className="text-content-secondary">Data Fim</TableHead>
                  <TableHead className="text-content-secondary">Ação Relatada</TableHead>
                  <TableHead className="text-content-secondary">Plano</TableHead>
                  <TableHead className="text-content-secondary">MRR</TableHead>
                  <TableHead className="text-content-secondary">Status</TableHead>
                  <TableHead className="text-content-secondary text-right">Data Modificação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((c) => (
                  <TableRow key={c.id} className="border-border-divider hover:bg-surface-background group">
                    <TableCell className="text-content-primary">
                      {c.start_date ? new Date(c.start_date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell className="text-content-secondary italic">
                      {c.end_date ? new Date(c.end_date).toLocaleDateString('pt-BR') : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-wider border-border-divider bg-surface-background">
                        {typeLabels[c.contract_type ?? 'initial'] ?? c.contract_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-content-primary">{c.service_type}</TableCell>
                    <TableCell className="font-medium text-content-primary">
                      R$ {Number(c.mrr).toLocaleString('pt-BR')}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] border ${statusColors[c.status] ?? ''}`}>
                        Antigo
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-content-secondary text-xs">
                       {new Date(c.created_at).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))}
                {history.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-content-secondary italic">
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
