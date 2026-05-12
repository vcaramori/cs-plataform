import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BlockSchema = z.object({
  id: z.string(),
  type: z.string(),
  position: z.object({ x: z.number(), y: z.number() }),
  config: z.record(z.string(), z.unknown()).optional(),
})

const ConnectionSchema = z.object({
  from: z.string(),
  to: z.string(),
})

const PlaybookFlowSchema = z.object({
  id: z.string().uuid().optional(),
  blocks: z.array(BlockSchema),
  connections: z.array(ConnectionSchema),
  metadata: z.object({
    name: z.string(),
    description: z.string().optional(),
    trigger: z.enum(['manual', 'cron', 'webhook']),
  }),
})

type PlaybookFlow = z.infer<typeof PlaybookFlowSchema>

export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Validate flow structure
    const parsed = PlaybookFlowSchema.safeParse(body)
    if (!parsed.success) {
      console.error('[playbooks/save] Validation Error:', parsed.error.format())
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const flow = parsed.data

    // Validate flow: must have Start and End blocks
    const hasStart = flow.blocks.some(b => b.type === 'start')
    const hasEnd = flow.blocks.some(b => b.type === 'end')
    const hasOrphanBlocks = flow.blocks.some(b => {
      const connectedFrom = flow.connections.some(c => c.to === b.id)
      const connectedTo = flow.connections.some(c => c.from === b.id)
      return !connectedFrom && !connectedTo && b.type !== 'start' && b.type !== 'end'
    })

    if (!hasStart || !hasEnd) {
      return NextResponse.json(
        { error: 'Playbook must have Start and End blocks' },
        { status: 400 }
      )
    }

    if (hasOrphanBlocks) {
      return NextResponse.json(
        { error: 'Playbook has orphaned blocks without connections' },
        { status: 400 }
      )
    }

    // Insert or Update playbook template
    const payload = {
      name: flow.metadata.name,
      description: flow.metadata.description || '',
      trigger_condition: flow.metadata.trigger,
      is_active: true, // Default to active for now
      graph_json: flow,
    }

    let result;
    if (flow.id) {
      result = await supabase
        .from('playbook_templates')
        .update(payload)
        .eq('id', flow.id)
        .select()
        .single()
    } else {
      result = await supabase
        .from('playbook_templates')
        .insert(payload)
        .select()
        .single()
    }

    const { data, error } = result

    if (error) {
      console.error('[playbooks/save] DB Error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: flow.id ? 200 : 201 })
  } catch (error) {
    console.error('[playbooks/save] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
