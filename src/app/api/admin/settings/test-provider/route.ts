import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getAdapter } from '@/lib/llm/providers'
import type { LLMProvider } from '@/lib/llm/providers/types'

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role ?? '')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { provider, apiKey, model } = await request.json() as {
    provider: LLMProvider
    apiKey: string
    model?: string
  }

  if (!provider || !apiKey) {
    return NextResponse.json({ error: 'provider and apiKey are required' }, { status: 400 })
  }

  try {
    const adapter = getAdapter(provider)
    const testModel = model || adapter.defaultTextModel

    const result = await Promise.race([
      adapter.generateText('Say "OK" in one word.', apiKey, testModel, {
        maxOutputTokens: 10,
        temperature: 0,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout (10s)')), 10_000)
      ),
    ])

    return NextResponse.json({
      ok: true,
      provider,
      model: testModel,
      response: result.slice(0, 50),
    })
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      provider,
      error: err.message || 'Unknown error',
    }, { status: 400 })
  }
}
