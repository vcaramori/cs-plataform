import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'
import { validateIcsUrl, saveIcsUrl, deleteIcsUrl, getIcsUrl } from '@/lib/calendar/ics'

export const dynamic = 'force-dynamic'

/** Indica se o usuário logado já tem um feed ICS configurado (sem expor o link). */
export async function GET() {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth
  const url = await getIcsUrl(auth.user.id)
  return NextResponse.json({ configured: !!url })
}

/** Salva o feed ICS do PRÓPRIO usuário (valida antes de gravar). */
export async function POST(request: Request) {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  const body = await request.json().catch(() => ({}))
  const url = typeof body.url === 'string' ? body.url.trim() : ''
  if (!url) return NextResponse.json({ error: 'Informe o link do calendário (.ics).' }, { status: 400 })

  try {
    await validateIcsUrl(url)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Link inválido' }, { status: 400 })
  }

  await saveIcsUrl(auth.user.id, url)
  return NextResponse.json({ success: true })
}

/** Remove o feed ICS do próprio usuário. */
export async function DELETE() {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth
  await deleteIcsUrl(auth.user.id)
  return NextResponse.json({ success: true })
}
