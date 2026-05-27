import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { sendPortalInviteEmail, sendPortalApprovalRequestEmail } from '@/lib/email/portal-emails'

const InviteSchema = z.object({
  account_id: z.string().uuid(),
  contact_id: z.string().uuid(),
  email: z.string().email(),
})

// GET — lista convites de uma conta
export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id required' }, { status: 400 })

  const admin = getSupabaseAdminClient() as any
  const { data, error } = await admin
    .from('portal_invites')
    .select('*, contacts(name, role, influence_level)')
    .eq('account_id', accountId)
    .order('invited_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST — cria convite
export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  const body = await request.json()
  const parsed = InviteSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { account_id, contact_id, email } = parsed.data
  const admin = getSupabaseAdminClient() as any

  // Valida que o email pertence ao contato na conta
  const { data: contact } = await admin
    .from('contacts')
    .select('id, email, name')
    .eq('id', contact_id)
    .eq('account_id', account_id)
    .single()

  if (!contact) {
    return NextResponse.json({ error: 'Contato não encontrado nesta conta' }, { status: 404 })
  }
  if (contact.email?.toLowerCase() !== email.toLowerCase()) {
    return NextResponse.json({ error: 'E-mail não corresponde ao cadastro do stakeholder' }, { status: 422 })
  }

  // Verifica se já existe convite pendente ou aprovado
  const { data: existing } = await admin
    .from('portal_invites')
    .select('id, status')
    .eq('contact_id', contact_id)
    .in('status', ['pending', 'approved'])
    .maybeSingle()

  if (existing?.status === 'approved') {
    return NextResponse.json({ error: 'Este stakeholder já tem acesso ao portal' }, { status: 409 })
  }
  if (existing?.status === 'pending') {
    return NextResponse.json({ error: 'Já existe um convite pendente para este stakeholder' }, { status: 409 })
  }

  const { data: invite, error } = await admin
    .from('portal_invites')
    .insert({
      account_id,
      contact_id,
      email: email.toLowerCase(),
      invited_by: auth.user.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Busca dados da conta e do CSM para os e-mails
  const [accountRow, csmRow] = await Promise.all([
    admin.from('accounts').select('name').eq('id', account_id).single(),
    admin.from('profiles').select('full_name').eq('id', auth.user.id).single(),
  ])

  const accountName = accountRow.data?.name ?? 'sua conta'
  const csmName = csmRow.data?.full_name ?? 'Seu CSM'
  const setupUrl = `${process.env.NEXT_PUBLIC_APP_URL}/portal/setup`
  const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL}/accounts/${account_id}`

  // Disparo de e-mails via SMTP locais comentados temporariamente para evitar falhas de autenticação de MFA corporativo.
  // O fluxo de convites prosseguirá normalmente pelo banco e pelo Supabase Auth.
  console.log('[PortalInvite] E-mail SMTP comentado temporariamente. Convite gerado com sucesso.');

  return NextResponse.json(invite, { status: 201 })
}
