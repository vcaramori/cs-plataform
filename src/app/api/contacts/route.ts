import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const ContactSchema = z.object({
  account_id: z.string().uuid(),
  name: z.string().min(2),
  role: z.string().min(1),
  seniority: z.enum(['C-Level', 'VP', 'Director', 'Manager', 'IC']),
  influence_level: z.enum(['Champion', 'Neutral', 'Detractor', 'Blocker']),
  decision_maker: z.boolean().default(false),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  linkedin_url: z.string().url().optional().or(z.literal('')),
  photo_url: z.string().url().optional().or(z.literal('')),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = ContactSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('contacts')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
