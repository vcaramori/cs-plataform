import { getSupabaseServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building2, Plus, ChevronRight } from 'lucide-react'

export default async function AccountsPage() {
  const supabase = await getSupabaseServerClient()

  const { data: accounts } = await supabase
    .from('accounts')
    .select(`
      id, name, touch_model, account_status, health_score,
      clients ( name ),
      contracts ( mrr )
    `)
    .order('name', { ascending: true })

  const touchColors: Record<string, string> = {
    'High Touch': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Mid Touch':  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  }

  const statusColors: Record<string, string> = {
    active:   'bg-emerald-500/20 text-emerald-300',
    'Ativo':  'bg-emerald-500/20 text-emerald-300',
    churned:  'bg-red-500/20 text-red-300',
    'Inativo': 'bg-red-500/20 text-red-300',
    'at-risk': 'bg-yellow-500/20 text-yellow-300',
    inactive: 'bg-slate-500/20 text-slate-300',
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-indigo-500" /> LOGOS
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gerencie os clientes e seus LOGOS ativos
          </p>
        </div>
        <Link href="/accounts/new">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Novo LOGO
          </Button>
        </Link>
      </div>

      {/* Lista */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {!accounts || accounts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Building2 className="w-12 h-12 text-slate-700" />
            <p className="text-slate-400">Nenhum LOGO cadastrado ainda.</p>
            <Link href="/accounts/new">
              <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white mt-2 gap-2">
                <Plus className="w-4 h-4" /> Criar primeiro LOGO
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/40">
                  <th className="text-left text-slate-400 font-medium px-5 py-3">Cliente</th>
                  <th className="text-left text-slate-400 font-medium px-4 py-3">LOGO / Solução</th>
                  <th className="text-center text-slate-400 font-medium px-4 py-3">Health</th>
                  <th className="text-center text-slate-400 font-medium px-4 py-3">Status</th>
                  <th className="text-right text-slate-400 font-medium px-4 py-3">MRR</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {accounts.map((acc: any) => {
                  const contracts = Array.isArray(acc.contracts) ? acc.contracts : (acc.contracts ? [acc.contracts] : [])
                  const mrr = contracts[0]?.mrr ?? 0
                  const hs = acc.health_score ?? 0
                  const hsColor = hs >= 70 ? 'text-emerald-400' : hs >= 40 ? 'text-yellow-400' : 'text-red-400'
                  return (
                    <tr key={acc.id} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-5 py-4 text-slate-400 text-sm">
                        {acc.clients?.name ?? '—'}
                      </td>
                      <td className="px-4 py-4 font-medium text-white">
                        {acc.name}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`font-bold text-sm ${hsColor}`}>{hs > 0 ? hs : '—'}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <Badge className={`text-xs ${statusColors[acc.account_status] ?? 'bg-slate-700 text-slate-300'}`}>
                          {acc.account_status ?? '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-right text-white font-mono">
                        {mrr > 0 ? `R$ ${Number(mrr).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '—'}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/accounts/${acc.id}`}>
                          <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity gap-1">
                            Ver <ChevronRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
