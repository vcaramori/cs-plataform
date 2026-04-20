import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const CreateProgramSchema = z.object({
  account_id: z.string().uuid().nullable().optional(),
  name: z.string().optional(),
  question: z.string().optional(),
  open_question: z.string().optional(),
  tags: z.array(z.string()).optional(),
  recurrence_days: z.number().int().min(1).optional(),
  dismiss_days: z.number().int().min(1).optional(),
  account_recurrence_days: z.number().int().min(1).optional(),
  active_from: z.string().datetime({ offset: true }).nullable().optional(),
  active_until: z.string().datetime({ offset: true }).nullable().optional(),
})

const PatchProgramSchema = z.object({
  is_test_mode: z.boolean().optional(),
  is_default: z.boolean().optional(),
  is_active: z.boolean().optional(),
  name: z.string().optional(),
  active_from: z.string().datetime({ offset: true }).nullable().optional(),
  active_until: z.string().datetime({ offset: true }).nullable().optional(),
  recurrence_days: z.number().int().min(1).optional(),
  dismiss_days: z.number().int().min(1).optional(),
})

// GET /api/nps/programs
export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')

  const admin = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  let query = db
    .from('nps_programs')
    .select('*, accounts(name), nps_questions(id, order_index, type, title, options, required)')
    .eq('csm_owner_id', user.id)
    .order('created_at', { ascending: false })

  if (accountId) {
    query = db
      .from('nps_programs')
      .select('*, accounts(name), nps_questions(id, order_index, type, title, options, required)')
      .eq('csm_owner_id', user.id)
      .or(`account_id.eq.${accountId},account_id.is.null`)
      .order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const programs = (data ?? []).map((p: any) => ({
    ...p,
    nps_questions: (p.nps_questions ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
  }))

  // Conta respostas reais (não de teste) por program_key
  if (programs.length > 0) {
    const programKeys = programs.map((p: any) => p.program_key)
    const { data: responses } = await db
      .from('nps_responses')
      .select('program_key')
      .in('program_key', programKeys)
      .eq('is_test', false)

    const countMap: Record<string, number> = {}
    for (const r of responses ?? []) {
      countMap[r.program_key] = (countMap[r.program_key] || 0) + 1
    }

    programs.forEach((p: any) => {
      p.response_count = countMap[p.program_key] || 0
    })
  }

  return NextResponse.json(programs)
}

// POST /api/nps/programs
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = CreateProgramSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const accountId = parsed.data.account_id ?? null

  if (accountId) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', accountId)
      .eq('csm_owner_id', user.id)
      .single()
    if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('nps_programs')
    .insert({
      account_id: accountId,
      csm_owner_id: user.id,
      name: parsed.data.name ?? null,
      question: parsed.data.question ?? 'Qual a probabilidade de você recomendar o Plannera a um amigo ou colega?',
      open_question: parsed.data.open_question ?? 'Qual o motivo da sua nota?',
      tags: parsed.data.tags ?? [],
      recurrence_days: parsed.data.recurrence_days ?? 90,
      dismiss_days: parsed.data.dismiss_days ?? 30,
      account_recurrence_days: parsed.data.account_recurrence_days ?? 30,
      active_from: parsed.data.active_from ?? null,
      active_until: parsed.data.active_until ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

// PATCH /api/nps/programs?id=X
export async function PATCH(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const body = await request.json()
  const parsed = PatchProgramSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  // Busca somente colunas garantidas (migration 008+) para verificar ownership
  const { data: programBase, error: programBaseError } = await db
    .from('nps_programs')
    .select('id, csm_owner_id, program_key')
    .eq('id', id)
    .single()

  if (programBaseError) {
    console.error('[PATCH /api/nps/programs] lookup error:', programBaseError.message)
    return NextResponse.json({ error: 'Erro ao buscar programa', detail: programBaseError.message }, { status: 500 })
  }

  if (!programBase || programBase.csm_owner_id !== user.id) {
    return NextResponse.json({ error: 'Programa não encontrado ou sem permissão' }, { status: 404 })
  }

  // Tenta buscar colunas adicionadas na migration 009 (may not exist yet)
  const { data: programExtra } = await db
    .from('nps_programs')
    .select('is_default, is_test_mode')
    .eq('id', id)
    .single()

  const program = {
    ...programBase,
    is_default:   programExtra?.is_default   ?? false,
    is_test_mode: programExtra?.is_test_mode ?? false,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateFields: Record<string, any> = { updated_at: new Date().toISOString() }

  // Inativar: limpa is_default e is_test_mode automaticamente
  if (parsed.data.is_active === false) {
    updateFields.is_active = false
    if (program.is_default) {
      updateFields.is_default = false
    }
    if (program.is_test_mode) {
      updateFields.is_test_mode = false
      // Limpa respostas de teste do programa
      await db
        .from('nps_responses')
        .delete()
        .eq('program_key', program.program_key)
        .eq('is_test', true)
    }
  } else if (parsed.data.is_active === true) {
    updateFields.is_active = true
  }

  // is_test_mode: garante só um em teste por CSM; ao desativar, remove respostas de teste
  if ('is_test_mode' in parsed.data && parsed.data.is_active !== false) {
    if (parsed.data.is_test_mode === true) {
      await db
        .from('nps_programs')
        .update({ is_test_mode: false })
        .eq('csm_owner_id', user.id)
        .neq('id', id)
      updateFields.is_test_mode = true
    } else if (parsed.data.is_test_mode === false) {
      await db
        .from('nps_responses')
        .delete()
        .eq('program_key', program.program_key)
        .eq('is_test', true)
      updateFields.is_test_mode = false
    }
  }

  // is_default: garante só um default por CSM
  if (parsed.data.is_default === true) {
    await db
      .from('nps_programs')
      .update({ is_default: false })
      .eq('csm_owner_id', user.id)
      .neq('id', id)
    updateFields.is_default = true
  } else if (parsed.data.is_default === false) {
    updateFields.is_default = false
  }

  if ('name' in parsed.data)         updateFields.name         = parsed.data.name
  if ('active_from' in parsed.data)  updateFields.active_from  = parsed.data.active_from
  if ('active_until' in parsed.data) updateFields.active_until = parsed.data.active_until
  if ('recurrence_days' in parsed.data) updateFields.recurrence_days = parsed.data.recurrence_days
  if ('dismiss_days' in parsed.data)    updateFields.dismiss_days    = parsed.data.dismiss_days

  const { data, error } = await db
    .from('nps_programs')
    .update(updateFields)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Informa se o default foi limpo (para o frontend sugerir novo default)
  const defaultCleared = parsed.data.is_active === false && program.is_default === true

  return NextResponse.json({ ...data, _default_cleared: defaultCleared })
}

// DELETE /api/nps/programs?id=X
// Só é permitido se o programa não tiver respostas reais (não-teste)
export async function DELETE(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 })

  const admin = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: program } = await db
    .from('nps_programs')
    .select('id, csm_owner_id, program_key')
    .eq('id', id)
    .single()

  if (!program || program.csm_owner_id !== user.id) {
    return NextResponse.json({ error: 'Programa não encontrado' }, { status: 404 })
  }

  // Verifica se há respostas reais (não de teste)
  const { count } = await db
    .from('nps_responses')
    .select('id', { count: 'exact', head: true })
    .eq('program_key', program.program_key)
    .eq('is_test', false)

  if (count && count > 0) {
    return NextResponse.json(
      { error: `Este programa possui ${count} resposta(s) real(is). Para removê-lo do dashboard, inative-o.`, has_responses: true },
      { status: 409 }
    )
  }

  // Remove test responses e questions (cascade fará o resto via FK)
  await db.from('nps_responses').delete().eq('program_key', program.program_key)

  const { error } = await db.from('nps_programs').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ deleted: true })
}
