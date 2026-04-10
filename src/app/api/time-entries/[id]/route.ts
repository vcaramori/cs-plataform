import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const UpdateSchema = z.object({
  account_id: z.string().uuid().optional(),
  activity_type: z.string().optional(),
  parsed_hours: z.number().positive().optional(),
  date: z.string().optional(),
  parsed_description: z.string().optional(),
})

// Tipos que devem gerar interação automática
const CLIENT_FACING_TYPES = ['meeting', 'onboarding', 'qbr']

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // 1. Atualizar o esforço
  const { data: updatedEntry, error: entryError } = await supabase
    .from('time_entries')
    .update(parsed.data)
    .eq('id', params.id)
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
    .eq('time_entry_id', params.id)
    .single()

  if (existingInteraction) {
    if (isClientFacing) {
      // Atualizar interação existente
      await supabase
        .from('interactions')
        .update({
          account_id: updatedEntry.account_id,
          type: updatedEntry.activity_type,
          title: `Esforço Integrado: ${updatedEntry.activity_type}`,
          date: updatedEntry.date,
          direct_hours: updatedEntry.parsed_hours,
          raw_transcript: updatedEntry.parsed_description,
        })
        .eq('id', existingInteraction.id)
    } else {
      // Deletar interação se o tipo mudou para interno
      await supabase
        .from('interactions')
        .delete()
        .eq('id', existingInteraction.id)
    }
  } else if (isClientFacing) {
    // Criar nova interação se o tipo mudou de interno para cliente
    await supabase
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
        time_entry_id: updatedEntry.id
      })
  }

  return NextResponse.json(updatedEntry)
}
