import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { generateText } from '@/lib/llm/gateway'

async function analyzeSentiment(text: string): Promise<number> {
  try {
    const prompt = `Analise o sentimento desta transcrição de reunião de Customer Success.
      Retorne APENAS um número entre -1.0 (muito negativo) e 1.0 (muito positivo).
      Considere: reclamações, elogios, nível de engajamento, problemas mencionados, satisfação geral.
      Exemplos: cliente satisfeito = 0.7, neutro = 0.0, cliente insatisfeito = -0.6, churn risk = -0.9

      Transcrição: ${text.slice(0, 4000)}`

    const { result: raw, provider } = await generateText(prompt, { allowFallback: true })
    console.log(`[Sentiment] Analisado via ${provider}`)
    const score = parseFloat(raw.trim())
    return isNaN(score) ? 0.0 : Math.max(-1.0, Math.min(1.0, score))
  } catch {
    return 0.0
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Busca a interaction e valida ownership via csm_id
  const { data: interaction, error: fetchError } = await supabase
    .from('interactions')
    .select('id, account_id, raw_transcript, csm_id')
    .eq('id', id)
    .eq('csm_id', user.id)
    .single()

  if (fetchError || !interaction) {
    return NextResponse.json({ error: 'Interação não encontrada' }, { status: 404 })
  }

  if (!interaction.raw_transcript || interaction.raw_transcript.trim().length < 50) {
    return NextResponse.json({ error: 'Transcrição ausente ou muito curta para vetorizar' }, { status: 422 })
  }

  try {
    // Gera embeddings e salva no pgvector
    const chunksCount = await storeEmbeddings(
      interaction.account_id,
      'interaction',
      interaction.id,
      interaction.raw_transcript
    )

    // Analisa sentimento e atualiza a interaction
    const sentimentScore = await analyzeSentiment(interaction.raw_transcript)
    const alertTriggered = sentimentScore <= -0.4

    await supabase
      .from('interactions')
      .update({
        sentiment_score: sentimentScore,
        alert_triggered: alertTriggered,
      })
      .eq('id', id)

    return NextResponse.json({
      success: true,
      chunks_stored: chunksCount,
      sentiment_score: sentimentScore,
      alert_triggered: alertTriggered,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: `Falha na ingestão: ${message}` }, { status: 500 })
  }
}
