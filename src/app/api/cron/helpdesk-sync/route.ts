import { NextResponse } from 'next/server'
import { runHelpDeskSync } from '@/lib/integrations/helpdesk/sync'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Cron horário: sincroniza chamados solved/closed do HelpDesk para o Suporte.
 *
 * Autenticação (qualquer uma):
 *  - header `x-api-secret: <API_SECRET>` (mesmo padrão dos outros crons), ou
 *  - header `Authorization: Bearer <CRON_SECRET>` (Vercel Cron).
 */
function isAuthorized(request: Request): boolean {
  const apiSecret = request.headers.get('x-api-secret')
  if (apiSecret && apiSecret === process.env.API_SECRET) return true

  const auth = request.headers.get('authorization')
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true

  return false
}

async function handle(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runHelpDeskSync()
    return NextResponse.json({ success: true, ...result }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[HelpDesk Sync Cron] Falha:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// Vercel Cron dispara GET; mantemos POST para acionamento manual/integrações.
export const GET = handle
export const POST = handle
