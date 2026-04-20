import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// GET /api/nps/check?program_key=X&email=Y
// Endpoint público chamado pelo embed.js para decidir se exibe a pesquisa
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const programKey = searchParams.get('program_key')
  const email = searchParams.get('email')

  if (!programKey || !email) {
    return NextResponse.json({ should_show: false, reason: 'missing_params' })
  }

  const admin = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  // Busca o programa + questões ordenadas
  const { data: program } = await db
    .from('nps_programs')
    .select('*, nps_questions(id, order_index, type, title, options, required)')
    .eq('program_key', programKey)
    .eq('is_active', true)
    .single()

  if (!program) {
    return NextResponse.json({ should_show: false, reason: 'program_not_found' })
  }

  const questions = (program.nps_questions ?? []).sort(
    (a: any, b: any) => a.order_index - b.order_index
  )

  const programPayload = {
    question: program.question,
    open_question: program.open_question,
    tags: program.tags,
    questions,
  }

  // Modo de teste: ignora todas as travas e exibe sempre
  if (program.is_test_mode === true) {
    return NextResponse.json({ should_show: true, is_test: true, program: programPayload })
  }

  // Verifica período de vigência da pesquisa
  const now = new Date()
  if (program.active_from && now < new Date(program.active_from)) {
    return NextResponse.json({ should_show: false, reason: 'not_started_yet' })
  }
  if (program.active_until && now > new Date(program.active_until)) {
    return NextResponse.json({ should_show: false, reason: 'expired' })
  }

  // Regra 1: após responder, não exibir por recurrence_days (padrão 90d)
  const { data: lastResponse } = await db
    .from('nps_responses')
    .select('responded_at')
    .eq('program_key', programKey)
    .eq('user_email', email)
    .not('responded_at', 'is', null)
    .order('responded_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastResponse?.responded_at) {
    const diffDays = (now.getTime() - new Date(lastResponse.responded_at).getTime()) / 86400000
    if (diffDays < program.recurrence_days) {
      return NextResponse.json({
        should_show: false,
        reason: 'recently_responded',
        next_show_in_days: Math.ceil(program.recurrence_days - diffDays),
      })
    }
  }

  // Regra 2: após descartar, não exibir por dismiss_days (padrão 30d)
  const { data: lastDismiss } = await db
    .from('nps_responses')
    .select('dismissed_at')
    .eq('program_key', programKey)
    .eq('user_email', email)
    .eq('dismissed', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (lastDismiss?.dismissed_at) {
    const diffDays = (now.getTime() - new Date(lastDismiss.dismissed_at).getTime()) / 86400000
    if (diffDays < program.dismiss_days) {
      return NextResponse.json({
        should_show: false,
        reason: 'recently_dismissed',
        next_show_in_days: Math.ceil(program.dismiss_days - diffDays),
      })
    }
  }

  // Regra 3: máx 1 pesquisa por conta a cada account_recurrence_days (padrão 30d)
  if (program.account_id) {
    const { data: lastAccountResponse } = await db
      .from('nps_responses')
      .select('created_at')
      .eq('account_id', program.account_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (lastAccountResponse?.created_at) {
      const diffDays = (now.getTime() - new Date(lastAccountResponse.created_at).getTime()) / 86400000
      if (diffDays < program.account_recurrence_days) {
        return NextResponse.json({
          should_show: false,
          reason: 'account_rate_limit',
          next_show_in_days: Math.ceil(program.account_recurrence_days - diffDays),
        })
      }
    }
  }

  return NextResponse.json({ should_show: true, is_test: false, program: programPayload })
}
