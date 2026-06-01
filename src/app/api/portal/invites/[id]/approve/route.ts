import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { sendPortalAccessApprovedEmail, sendPortalAccessRejectedEmail } from '@/lib/email/portal-emails'

const ApproveSchema = z.object({
  action: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  const { id } = await params
  const body = await request.json()
  const parsed = ApproveSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { action, notes } = parsed.data
  const admin = getSupabaseAdminClient() as any

  // Busca convite
  const { data: invite } = await admin
    .from('portal_invites')
    .select('*')
    .eq('id', id)
    .single()

  if (!invite) return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 })
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: 'Convite já foi processado' }, { status: 409 })
  }

  // Atualiza status do convite
  await admin
    .from('portal_invites')
    .update({
      status: action,
      responded_at: new Date().toISOString(),
      notes: notes ?? null,
    })
    .eq('id', id)

  // Se aprovado, provisiona o usuário no Supabase Auth e vincula ao profile
  if (action === 'approved') {
    // Verifica se já existe auth user com este email
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(
      (u: any) => u.email?.toLowerCase() === invite.email.toLowerCase()
    )

    let userId: string

    if (existingUser) {
      userId = existingUser.id
    } else {
      const requestUrl = new URL(request.url)
      const protocol = request.headers.get('x-forwarded-proto') || 'http'
      const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host
      const appUrl = `${protocol}://${host}`

      // Cria usuário e envia e-mail de convite via Supabase Auth
      const { data: newUser, error: createErr } = await admin.auth.admin.inviteUserByEmail(
        invite.email,
        {
          redirectTo: `${appUrl}/portal/setup`,
          data: {
            portal_invite_id: invite.id,
            account_id: invite.account_id,
          },
        }
      )
      if (createErr) {
        return NextResponse.json({ error: createErr.message }, { status: 500 })
      }
      userId = newUser.user.id
    }

    // Cria ou atualiza profile como externo
    await admin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: null, // preenchido no setup
        user_type: 'external',
        account_id: invite.account_id,
        contact_id: invite.contact_id,
        portal_approved_at: new Date().toISOString(),
        portal_approved_by: auth.user.id,
      }, { onConflict: 'id' })
  }

  // Busca dados da conta para o e-mail
  const { data: accountRow } = await admin
    .from('accounts')
    .select('name')
    .eq('id', invite.account_id)
    .single()
  const accountName = accountRow?.name ?? 'sua conta'

  // Busca nome do contato para personalizar o e-mail
  const { data: contactRow } = await admin
    .from('contacts')
    .select('name')
    .eq('id', invite.contact_id)
    .single()
  const contactName = contactRow?.name ?? invite.email

  // Disparo de e-mails via SMTP locais comentados temporariamente para evitar falhas de autenticação de MFA corporativo.

  return NextResponse.json({ ok: true, action })
}
