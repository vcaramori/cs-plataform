import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { ingestNPSResponse } from '@/lib/rag/rag-pipeline'

const AnswerSchema = z.object({
  question_id: z.string().uuid(),
  text_value: z.string().optional().nullable(),
  selected_options: z.array(z.string()).optional().nullable(),
})

const ResponseSchema = z.object({
  program_key: z.string().min(1),
  user_email: z.string().email(),
  user_id: z.string().optional(),
  // Campos legados (compatibilidade com embed antigo sem questões)
  score: z.number().int().min(0).max(10).optional(),
  comment: z.string().optional(),
  tags: z.array(z.string()).optional(),
  dismissed: z.boolean().optional(),
  // Respostas do questionário
  answers: z.array(AnswerSchema).optional(),
  // Flag de teste (enviada pelo embed quando is_test=true no check)
  is_test: z.boolean().optional(),
})

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

// POST /api/nps/response — endpoint público chamado pelo embed
export async function POST(request: Request) {
  const body = await request.json()
  const parsed = ResponseSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400, headers: corsHeaders })
  }

  const { program_key, user_email, user_id, score, comment, tags, dismissed, answers, is_test } = parsed.data

  const admin = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  // Valida programa — em modo de teste is_active ainda deve ser true
  const { data: program } = await db
    .from('nps_programs')
    .select('id, account_id, is_active, is_test_mode')
    .eq('program_key', program_key)
    .eq('is_active', true)
    .single()

  if (!program) {
    return NextResponse.json({ error: 'Programa não encontrado ou inativo' }, { status: 404, headers: corsHeaders })
  }

  const now = new Date().toISOString()

  // Extrai NPS score das respostas do questionário (se houver pergunta do tipo nps_scale)
  let finalScore = score ?? null
  if (answers && answers.length > 0 && finalScore === null) {
    const { data: questions } = await db
      .from('nps_questions')
      .select('id, type')
      .eq('program_id', program.id)
      .in('id', answers.map((a: any) => a.question_id))

    const npsQuestion = (questions ?? []).find((q: any) => q.type === 'nps_scale')
    if (npsQuestion) {
      const npsAnswer = answers.find((a: any) => a.question_id === npsQuestion.id)
      if (npsAnswer?.text_value !== undefined && npsAnswer.text_value !== null) {
        const parsed = parseInt(npsAnswer.text_value, 10)
        if (!isNaN(parsed)) finalScore = parsed
      }
    }
  }

  // is_test: respeitamos o que o embed envia; se o programa está em test_mode, força true
  const isTestResponse = is_test === true || program.is_test_mode === true

  // Insere resposta principal
  const { data: responseRecord, error: responseError } = await db
    .from('nps_responses')
    .insert({
      account_id: program.account_id,
      program_key,
      user_email,
      user_id: user_id ?? null,
      score: finalScore,
      comment: comment ?? null,
      tags: tags ?? [],
      dismissed: dismissed ?? false,
      dismissed_at: dismissed ? now : null,
      responded_at: !dismissed ? now : null,
      is_test: isTestResponse,
    })
    .select()
    .single()

  if (responseError) {
    return NextResponse.json({ error: responseError.message }, { status: 500, headers: corsHeaders })
  }

  // DISPARO AUTOMÁTICO RAG: Ingestão em background (não aguardamos terminar para responder ao cliente/embed)
  if (responseRecord.comment) {
    // Disparamos sem await para não atrasar a resposta do embed público
    ingestNPSResponse(responseRecord.id).catch(err => {
      console.error('[RAG] Background fail:', err)
    })
  }

  // Insere respostas individuais por questão
  if (answers && answers.length > 0) {
    const answersToInsert = answers.map((a: any) => ({
      response_id: responseRecord.id,
      question_id: a.question_id,
      text_value: a.text_value ?? null,
      selected_options: a.selected_options ?? null,
    }))

    await db.from('nps_answers').insert(answersToInsert)
  }

  return NextResponse.json(responseRecord, { status: 201, headers: corsHeaders })
}
