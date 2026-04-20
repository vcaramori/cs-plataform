import { redirect, notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { TicketDetailClient } from './components/TicketDetailClient'

export default async function TicketDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: ticket },
    { data: events },
    { data: csatResponse },
    { data: messages },
  ] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('*, accounts!inner(id, name)')
      .eq('id', id)
      .single(),
    supabase
      .from('sla_events')
      .select('*')
      .eq('ticket_id', id)
      .order('occurred_at', { ascending: true }),
    supabase
      .from('csat_responses')
      .select('score, comment, answered_at')
      .eq('ticket_id', id)
      .maybeSingle(),
    supabase
      .from('support_ticket_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true }),
  ])

  if (!ticket) notFound()

  const admin = getSupabaseAdminClient() as any
  let agents: { id: string; email: string }[] = []
  try {
    const { data: usersData } = await admin.auth.admin.listUsers({ perPage: 200 })
    agents = (usersData?.users ?? []).map((u: any) => ({ id: u.id, email: u.email ?? '' }))
  } catch {
    // Non-fatal
  }

  return (
    // Escape the dashboard padding container and fill the entire available area
    <div className="-m-4 md:-m-6 lg:-m-8 flex flex-col overflow-hidden" style={{ height: '100vh' }}>
      <TicketDetailClient
        ticket={ticket as any}
        events={events ?? []}
        messages={messages ?? []}
        csatResponse={csatResponse ?? null}
        agents={agents}
        currentUserId={user.id}
      />
    </div>
  )
}
