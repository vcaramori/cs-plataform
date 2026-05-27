import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  const { id } = await params
  const admin = getSupabaseAdminClient() as any

  // 1. Busca convite
  const { data: invite, error: fetchErr } = await admin
    .from('portal_invites')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !invite) {
    return NextResponse.json({ error: 'Convite não encontrado' }, { status: 404 })
  }

  try {
    const requestUrl = new URL(request.url)
    const protocol = request.headers.get('x-forwarded-proto') || 'http'
    const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || requestUrl.host
    const appUrl = `${protocol}://${host}`

    let setupLink = ''

    // Tenta gerar primeiro o link do tipo 'invite' (se o usuário for totalmente novo e não confirmado)
    const { data: inviteData, error: inviteErr } = await admin.auth.admin.generateLink({
      type: 'invite',
      email: invite.email,
      options: {
        redirectTo: `${appUrl}/portal/setup`
      }
    })

    if (inviteErr) {
      // Se der erro de já registrado, tenta gerar o link de 'recovery' (redefinição/setup de senha)
      if (inviteErr.message.toLowerCase().includes('already been registered') || inviteErr.message.toLowerCase().includes('already exists')) {
        const { data: recoveryData, error: recoveryErr } = await admin.auth.admin.generateLink({
          type: 'recovery',
          email: invite.email,
          options: {
            redirectTo: `${appUrl}/portal/setup`
          }
        })
        if (recoveryErr) throw recoveryErr
        setupLink = recoveryData.properties.action_link
      } else {
        throw inviteErr
      }
    } else {
      setupLink = inviteData.properties.action_link
    }

    // Garante que o redirect_to na URL aponte perfeitamente para /portal/setup
    if (setupLink && !setupLink.includes('/portal/setup')) {
      // Se o redirecionamento padrão do Supabase ignorou o path, nós podemos formatá-lo
      setupLink = setupLink.replace(/redirect_to=([^&]+)/, `redirect_to=${encodeURIComponent(appUrl + '/portal/setup')}`)
    }

    return NextResponse.json({ link: setupLink })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro ao gerar link' }, { status: 500 })
  }
}
