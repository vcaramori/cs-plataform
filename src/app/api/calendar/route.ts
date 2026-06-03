import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'
import { isLeadershipRole } from '@/lib/auth/roles'
import { getUserAccessToken } from '@/lib/microsoft/auth'
import { getDailyEvents } from '@/lib/microsoft/calendar'

export async function GET(request: Request) {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  const url = new URL(request.url)
  const queryUserId = url.searchParams.get('userId')
  const queryDate = url.searchParams.get('date')

  const targetUserId = queryUserId || auth.user.id
  
  // Security check: if requesting someone else's calendar, must be leadership
  if (targetUserId !== auth.user.id && !isLeadershipRole(auth.role)) {
    return NextResponse.json({ error: 'Acesso negado para ver agenda de outros usuários' }, { status: 403 })
  }

  const date = queryDate ? new Date(queryDate) : new Date()

  try {
    const accessToken = await getUserAccessToken(targetUserId)
    
    if (!accessToken) {
      return NextResponse.json({ status: 'not_connected', events: [] })
    }

    const events = await getDailyEvents(accessToken, date)
    
    return NextResponse.json({ status: 'connected', events })
  } catch (error) {
    console.error('[Calendar API] Error fetching events:', error)
    return NextResponse.json({ error: 'Erro ao buscar eventos do Office 365' }, { status: 500 })
  }
}
