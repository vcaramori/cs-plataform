import Link from 'next/link'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Lightbulb, ArrowRight } from 'lucide-react'

/**
 * Tie-in Wishlist → conta (Fase 3): mostra os pedidos de produto que ESTA conta levantou,
 * para o CSM ver sem sair da conta. Server component self-contained (query própria, aditivo).
 */
export async function AccountWishlistCard({ accountId }: { accountId: string }) {
  const db = getSupabaseAdminClient() as any
  const { data: signals } = await db
    .from('wishlist_signals')
    .select('id, summary, verbatim, area, kind, triage_outcome, item_id, created_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(60)
  const rows = (signals ?? []) as any[]
  if (rows.length === 0) return null

  const pending = rows.filter((r) => r.triage_outcome === 'pending').length
  const consolidated = rows.filter((r) => r.item_id).length
  const recent = rows.slice(0, 6)

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-plannera-primary" />
            <h3 className="text-sm font-bold">Pedidos de produto (Wishlist)</h3>
          </div>
          <Link href="/wishlist" className="inline-flex items-center gap-1 text-[11px] font-semibold text-plannera-primary hover:underline">
            Abrir Wishlist <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[11px]">
          <Badge variant="neutral">{rows.length} pedido(s)</Badge>
          {pending > 0 && <Badge variant="info">{pending} na triagem</Badge>}
          {consolidated > 0 && <Badge variant="secondary">{consolidated} em item</Badge>}
        </div>
        <ul className="space-y-1.5">
          {recent.map((r) => (
            <li key={r.id} className="text-xs text-content-secondary leading-snug flex items-start gap-2">
              <span className="text-content-secondary/40 mt-0.5">•</span>
              <span className="flex-1">
                {(r.summary ?? r.verbatim ?? '').toString().slice(0, 140)}
                {r.area && <span className="ml-1 text-[10px] text-plannera-primary/70">[{r.area}]</span>}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
