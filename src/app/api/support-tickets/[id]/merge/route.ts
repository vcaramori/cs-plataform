import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/support-tickets/[id]/merge
 * Mescla o ticket atual (secundário) em outro ticket (principal).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const { id: secondaryTicketId } = await params
    const body = await req.json()
    const { primaryTicketId, reason } = body

    if (!primaryTicketId || secondaryTicketId === primaryTicketId) {
      return NextResponse.json({ error: 'ID do ticket principal inválido' }, { status: 400 })
    }

    // 1. Buscar ambos os tickets para validar conta e status
    const { data: tickets, error: fetchError } = await supabase
      .from('support_tickets')
      .select('id, account_id, status, merge_count')
      .in('id', [secondaryTicketId, primaryTicketId])

    if (fetchError || !tickets || tickets.length !== 2) {
      return NextResponse.json({ error: 'Um ou ambos os tickets não foram encontrados ou você não tem acesso' }, { status: 404 })
    }

    const secondary = tickets.find(t => t.id === secondaryTicketId)!
    const primary = tickets.find(t => t.id === primaryTicketId)!

    if (secondary.account_id !== primary.account_id) {
      return NextResponse.json({ error: 'Os tickets devem pertencer à mesma conta' }, { status: 400 })
    }

    // 2. Executar mesclagem
    
    // A. Fechar o ticket secundário e marcar para onde foi mesclado
    const { error: updateSecondaryError } = await supabase
      .from('support_tickets')
      .update({
        status: 'closed',
        merged_into: primaryTicketId,
        merged_at: new Date().toISOString()
      })
      .eq('id', secondaryTicketId)

    if (updateSecondaryError) throw updateSecondaryError

    // B. Incrementar merge_count no ticket principal (via RPC para atomicidade)
    const { error: rpcError } = await supabase.rpc('increment_ticket_merge_count', {
      ticket_id: primaryTicketId
    })
    
    // Fallback se o RPC falhar por qualquer motivo (ex: permissão ou não existe)
    if (rpcError) {
      console.warn('[Merge API] RPC increment failed, falling back to manual update:', rpcError)
      await supabase
        .from('support_tickets')
        .update({ merge_count: (primary.merge_count || 0) + 1 })
        .eq('id', primaryTicketId)
    }

    // C. Registrar no histórico de auditoria
    const { error: historyError } = await supabase
      .from('ticket_merge_history')
      .insert({
        primary_ticket_id: primaryTicketId,
        secondary_ticket_id: secondaryTicketId,
        merged_by: user.id,
        reason: reason || 'Ticket duplicado',
        account_id: primary.account_id
      })

    if (historyError) throw historyError

    // D. Registrar evento no ticket principal
    await supabase.from('ticket_events').insert({
      ticket_id: primaryTicketId,
      event_type: 'ticket_merged_in',
      payload: { secondary_ticket_id: secondaryTicketId, reason },
      triggered_by: user.id
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Merge API] Error:', err)
    return NextResponse.json({ 
      error: err.message || 'Erro interno no servidor' 
    }, { status: 500 })
  }
}
