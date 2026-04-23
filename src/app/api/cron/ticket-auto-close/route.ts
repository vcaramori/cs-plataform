import { NextResponse } from 'next/server'
import { runAutoClose } from '@/lib/support/auto-close'

export async function POST(request: Request) {
  const secret = request.headers.get('x-api-secret')
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runAutoClose()
  return NextResponse.json({ 
    success: true, 
    closed: result.closedCount,
    ran_at: new Date().toISOString() 
  })
}
