import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { deleteEffortCascade, reevaluateEffortOnEdit } from '@/lib/effort/effort-cascade'

const UpdateSchema = z.object({
  account_id: z.string().uuid().optional(),
  activity_type: z.string().optional(),
  parsed_hours: z.number().positive().optional(),
  date: z.string().optional(),
  parsed_description: z.string().optional(),
  file_urls: z.array(z.string()).optional(),
})

// Tipos que devem gerar interação automática
const CLIENT_FACING_TYPES = ['meeting', 'onboarding', 'qbr']

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Estado anterior — para detectar troca de conta e manter os derivados coerentes.
  const { data: before } = await supabase
    .from('time_entries')
    .select('account_id')
    .eq('id', id)
    .eq('csm_id', user.id)
    .single()
  const oldAccountId: string | null = before?.account_id ?? null

  // 1. Atualizar o esforço
  const { data: updatedEntry, error: entryError } = await supabase
    .from('time_entries')
    .update(parsed.data)
    .eq('id', id)
    .eq('csm_id', user.id)
    .select('*, accounts(name)')
    .single()

  if (entryError) return NextResponse.json({ error: entryError.message }, { status: 500 })

  // 2. Sincronizar com Interações
  const isClientFacing = CLIENT_FACING_TYPES.includes(updatedEntry.activity_type)

  // Verificar se já existe uma interação vinculada
  const { data: existingInteraction } = await supabase
    .from('interactions')
    .select('id')
    .eq('time_entry_id', id)
    .single()

  let interactionId: string | null = existingInteraction?.id ?? null

  if (existingInteraction) {
    if (isClientFacing) {
      // Atualizar interação existente
      await supabase
        .from('interactions')
        .update({
          account_id: updatedEntry.account_id,
          type: updatedEntry.activity_type,
          title: `SYNC: ${updatedEntry.activity_type.toUpperCase()}`,
          date: updatedEntry.date,
          direct_hours: updatedEntry.parsed_hours,
          raw_transcript: updatedEntry.parsed_description,
          file_urls: updatedEntry.file_urls,
        })
        .eq('id', existingInteraction.id)
    } else {
      // Deletar interação se o tipo mudou para interno
      await supabase
        .from('interactions')
        .delete()
        .eq('id', existingInteraction.id)
      interactionId = null
    }
  } else if (isClientFacing) {
    // Criar nova interação se o tipo mudou de interno para cliente
    const { data: newInt } = await supabase
      .from('interactions')
      .insert({
        account_id: updatedEntry.account_id,
        csm_id: user.id,
        type: updatedEntry.activity_type,
        title: `Esforço Integrado: ${updatedEntry.activity_type}`,
        date: updatedEntry.date,
        direct_hours: updatedEntry.parsed_hours,
        raw_transcript: updatedEntry.parsed_description,
        source: 'effort_sync',
        time_entry_id: updatedEntry.id,
        file_urls: updatedEntry.file_urls,
      })
      .select('id')
      .single()
    interactionId = newInt?.id ?? null
  }

  // 3. Reavaliação dos derivados (re-vetoriza RAG; realoca wishlist se a conta mudou). Best-effort.
  try {
    await reevaluateEffortOnEdit({
      timeEntryId: id,
      interactionId,
      accountId: updatedEntry.account_id,
      oldAccountId,
      accountName: updatedEntry.accounts?.name ?? 'Conta',
      date: updatedEntry.date,
      activityType: updatedEntry.activity_type,
      text: updatedEntry.parsed_description ?? '',
    })
  } catch (e) {
    console.error('[time-entries PATCH] reevaluate error:', e)
  }

  return NextResponse.json(updatedEntry)
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Gate de propriedade: só o autor do esforço pode excluí-lo (consistente com a página de Esforço).
  const { data: owned } = await supabase
    .from('time_entries')
    .select('id')
    .eq('id', id)
    .eq('csm_id', user.id)
    .single()
  if (!owned) return NextResponse.json({ error: 'Esforço não encontrado ou sem acesso.' }, { status: 404 })

  // Exclusão em cascata: limpa TODOS os derivados (wishlist, RAG, tarefas sugeridas,
  // interações espelho) + recalcula demanda + reavalia saúde/risco. SEM órfãos.
  try {
    const result = await deleteEffortCascade(id, user.id)
    return NextResponse.json({ ok: true, ...result })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Falha ao excluir o esforço.' }, { status: 500 })
  }
}
