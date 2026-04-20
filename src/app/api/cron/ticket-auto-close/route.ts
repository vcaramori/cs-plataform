import { NextResponse } from 'next/server'
import { runAutoClose } from '@/lib/support/auto-close'

export async function POST(request: Request) {
  const secret = request.headers.get('x-api-secret')
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { closed } = await runAutoClose()
  return NextResponse.json({ closed, ran_at: new Date().toISOString() })
}
