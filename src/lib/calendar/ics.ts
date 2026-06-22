import * as ical from 'node-ical'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { encrypt, decrypt } from '@/lib/crypto/encryption'
import type { Office365Event } from '@/lib/microsoft/calendar'

/**
 * Calendário via feed ICS (iCalendar) publicado pelo Outlook — caminho SEM Azure/admin.
 * O CSM publica o calendário e cola o link `.ics`; guardamos por usuário, CRIPTOGRAFADO
 * (o link contém um token privado), em user_integrations (provider='ics_calendar').
 *
 * Eventos recorrentes (standups/syncs) são expandidos via node-ical (RRULE + EXDATE +
 * overrides). Como o Outlook atualiza o ICS com atraso (horas), a agenda pode não ser
 * instantânea — é a limitação aceita deste caminho.
 */

const PROVIDER = 'ics_calendar'

const toStr = (v: unknown): string => {
  if (v == null) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'object' && 'val' in (v as Record<string, unknown>)) {
    return String((v as { val?: unknown }).val ?? '')
  }
  return String(v)
}

const ONLINE_RE = /(teams\.microsoft\.com|teams\.live\.com|zoom\.us|meet\.google\.com|webex\.com|whereby\.com)/i
const URL_RE = /https?:\/\/[^\s>"'<]+/g

function extractMeeting(text: string): { isOnline: boolean; link: string } {
  const urls = text.match(URL_RE) ?? []
  const join = urls.find((u) => ONLINE_RE.test(u))
  return { isOnline: !!join || ONLINE_RE.test(text), link: join ?? '' }
}

/** webcal:// → https:// e trim. */
export function normalizeIcsUrl(url: string): string {
  return url.trim().replace(/^webcal:\/\//i, 'https://')
}

/** Busca e expande os eventos do feed ICS no intervalo [dayStart, dayEnd]. */
export async function fetchIcsEvents(icsUrl: string, dayStart: Date, dayEnd: Date): Promise<Office365Event[]> {
  const url = normalizeIcsUrl(icsUrl)
  const res = await fetch(url, {
    signal: AbortSignal.timeout(45000),
    headers: { Accept: 'text/calendar, text/plain, */*' },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`ICS HTTP ${res.status}`)
  const text = await res.text()
  const data = await ical.async.parseICS(text)

  const out: Office365Event[] = []
  for (const key of Object.keys(data)) {
    const comp = data[key] as { type?: string } | undefined
    if (!comp || comp.type !== 'VEVENT') continue
    let instances: ReturnType<typeof ical.expandRecurringEvent>
    try {
      instances = ical.expandRecurringEvent(comp as never, { from: dayStart, to: dayEnd })
    } catch {
      continue // evento malformado — pula
    }
    for (const inst of instances) {
      const ev = (inst.event ?? comp) as Record<string, unknown>
      const subject = toStr(inst.summary) || toStr(ev.summary) || '(sem título)'
      const blob = `${toStr(ev.location)} ${toStr(ev.description)} ${toStr(ev.url)}`
      const { isOnline, link } = extractMeeting(blob)
      const start = new Date(inst.start)
      const end = new Date(inst.end)
      out.push({
        id: `${key}-${start.getTime()}`,
        subject,
        start: start.toISOString(),
        end: end.toISOString(),
        webLink: link || toStr(ev.url) || '',
        isOnlineMeeting: isOnline,
        isAllDay: !!inst.isFullDay,
      })
    }
  }
  out.sort((a, b) => a.start.localeCompare(b.start))
  return out
}

/** Valida que a URL é HTTPS/webcal e que o conteúdo parseia como ICS. Lança em erro. */
export async function validateIcsUrl(icsUrl: string): Promise<void> {
  const url = normalizeIcsUrl(icsUrl)
  if (!/^https:\/\//i.test(url)) throw new Error('O link precisa ser HTTPS (ou webcal://).')
  const res = await fetch(url, { signal: AbortSignal.timeout(45000), headers: { Accept: 'text/calendar, */*' }, cache: 'no-store' })
  if (!res.ok) throw new Error(`O link respondeu HTTP ${res.status}. Confirme se está público.`)
  const text = await res.text()
  if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error('O link não retornou um calendário iCalendar (.ics) válido.')
}

// ---------------------------------------------------------------------------
// Persistência do link ICS por usuário (criptografado).
// ---------------------------------------------------------------------------
export async function saveIcsUrl(userId: string, icsUrl: string): Promise<void> {
  const admin = getSupabaseAdminClient() as any
  await admin.from('user_integrations').upsert(
    {
      user_id: userId,
      provider: PROVIDER,
      access_token: await encrypt(normalizeIcsUrl(icsUrl)),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,provider' }
  )
}

export async function getIcsUrl(userId: string): Promise<string | null> {
  const admin = getSupabaseAdminClient() as any
  const { data } = await admin
    .from('user_integrations')
    .select('access_token')
    .eq('user_id', userId)
    .eq('provider', PROVIDER)
    .maybeSingle()
  if (!data?.access_token) return null
  try { return await decrypt(data.access_token) } catch { return null }
}

export async function deleteIcsUrl(userId: string): Promise<void> {
  const admin = getSupabaseAdminClient() as any
  await admin.from('user_integrations').delete().eq('user_id', userId).eq('provider', PROVIDER)
}
