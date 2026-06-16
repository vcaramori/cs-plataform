import { NextResponse } from 'next/server'
import { runHelpDeskSync } from '@/lib/integrations/helpdesk/sync'
import { verifyHelpDeskRequest } from '@/lib/integrations/helpdesk/auth'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Cron horário: sincroniza chamados do HelpDesk para o Suporte.
 *
 * Autenticação: segredo da integração (gerido na tela de Configurações),
 * com fallback para API_SECRET (env) e Bearer CRON_SECRET (Vercel Cron).
 */
async function handle(request: Request) {
  if (!(await verifyHelpDeskRequest(request))) {
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
