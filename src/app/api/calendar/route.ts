import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'
import { isLeadershipRole } from '@/lib/auth/roles'
import { getUserAccessToken } from '@/lib/microsoft/auth'
import { getDailyEvents } from '@/lib/microsoft/calendar'
import { getIcsUrl, fetchIcsEvents } from '@/lib/calendar/ics'

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
    // 1) Microsoft 365 (Graph), se o usuário tiver conectado por OAuth.
    const accessToken = await getUserAccessToken(targetUserId)
    if (accessToken) {
      const events = await getDailyEvents(accessToken, date)
      return NextResponse.json({ status: 'connected', source: 'microsoft', events })
    }

    // 2) Fallback: feed ICS publicado (sem Azure/admin).
    const icsUrl = await getIcsUrl(targetUserId)
    if (icsUrl) {
      const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999)
      try {
        const events = await fetchIcsEvents(icsUrl, dayStart, dayEnd)
        return NextResponse.json({ status: 'connected', source: 'ics', events })
      } catch (e) {
        console.error('[Calendar API] ICS fetch error:', e)
        return NextResponse.json({ status: 'error', source: 'ics', events: [], error: 'Falha ao ler o feed ICS (link inválido ou indisponível).' })
      }
    }

    return NextResponse.json({ status: 'not_connected', events: [] })
  } catch (error) {
    console.error('[Calendar API] Error fetching events:', error)
    return NextResponse.json({ error: 'Erro ao buscar eventos do calendário' }, { status: 500 })
  }
}
