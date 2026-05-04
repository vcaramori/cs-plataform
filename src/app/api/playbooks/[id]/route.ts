import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseServerClient()
  const { id } = await params

  try {
    const body = await request.json()
    const { status, account_id, title, description } = body

    if (status === 'completed') {
      // 1. Atualiza o playbook
      const { error: playbookError } = await supabase
        .from('account_playbooks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', id)

      if (playbookError) throw playbookError

      // 2. Cria a interação na timeline
      const { data: { user } } = await supabase.auth.getUser()
      let csmId = user?.id

      if (!csmId) {
        const { data: account } = await supabase
          .from('accounts')
          .select('csm_id')
          .eq('id', account_id)
          .single()
        csmId = account?.csm_id
      }
      
      const { error: interactionError } = await supabase
        .from('interactions')
        .insert({
          account_id,
          csm_id: csmId,
          type: 'playbook',
          title: `Playbook Concluído: ${title}`,
          raw_transcript: description || 'Todas as tarefas do playbook foram finalizadas com sucesso.',
          date: new Date().toISOString().split('T')[0],
          source: 'manual'
        })

      if (interactionError) throw interactionError
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[Playbook API] Erro:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
