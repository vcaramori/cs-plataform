import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getFlashModel } from '@/lib/gemini/client'

const InteractionSchema = z.object({
  account_id: z.string().uuid(),
  contract_id: z.string().uuid(),
  type: z.enum(['meeting', 'email', 'qbr', 'onboarding', 'health-check', 'expansion', 'churn-risk']),
  title: z.string().min(3),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  raw_transcript: z.string().optional(),
  source: z.enum(['readai', 'manual', 'csv']).default('manual'),
})

async function extractHoursFromTranscript(transcript: string): Promise<number> {
  try {
    const model = getFlashModel()
    const result = await model.generateContent(
      `Analise esta transcrição de reunião e estime a duração em horas (número decimal, ex: 1.5).
      Procure por timestamps, menções de horário de início/fim, ou duração explícita.
      Se não encontrar, estime pelo volume de texto (considere ~130 palavras por minuto de fala).
      Retorne APENAS o número, sem texto adicional.

      Transcrição: ${transcript.slice(0, 3000)}`
    )
    const hours = parseFloat(result.response.text().trim())
    return isNaN(hours) || hours <= 0 ? 1.0 : Math.min(hours, 8.0)
  } catch {
    return 1.0
  }
}

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')

  let query = supabase
    .from('interactions')
    .select('*')
    .eq('csm_id', user.id)
    .order('date', { ascending: false })
    .limit(50)

  if (accountId) query = query.eq('account_id', accountId)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = InteractionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Extrai horas diretas da transcrição via IA (se houver)
  let directHours = 1.0
  if (parsed.data.raw_transcript && parsed.data.raw_transcript.length > 100) {
    directHours = await extractHoursFromTranscript(parsed.data.raw_transcript)
  }

  const { data, error } = await supabase
    .from('interactions')
    .insert({
      account_id: parsed.data.account_id,
      contract_id: parsed.data.contract_id,
      csm_id: user.id,
      type: parsed.data.type,
      title: parsed.data.title,
      date: parsed.data.date,
      raw_transcript: parsed.data.raw_transcript ?? null,
      direct_hours: directHours,
      source: parsed.data.source,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
