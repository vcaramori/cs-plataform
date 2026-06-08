import { env } from '@/lib/env'

/**
 * Cliente da integração PSA — apontamento de horas de implantação.
 * Envia um time entry para a Edge Function pública `teams-bot` (modo estruturado).
 *
 * IMPORTANTE: a URL é o único segredo da integração — usar SOMENTE server-side.
 * Best-effort: nunca lança para fora; sempre retorna { status, message }.
 */

export type PsaResult = {
  status: 'success' | 'error' | 'skipped'
  message: string
  httpStatus?: number
}

export type PsaEffortInput = {
  userEmail: string
  projectName: string
  hours: number
  date: string // 'AAAA-MM-DD' | 'DD/MM/AAAA' | ISO 8601
  notes?: string
}

export function isPsaEnabled(): boolean {
  return env.psa.enabled && !!env.psa.teamsBotUrl
}

export async function postEffortToPSA(input: PsaEffortInput): Promise<PsaResult> {
  if (!isPsaEnabled()) {
    return { status: 'skipped', message: 'Integração PSA desativada (PSA_SYNC_ENABLED/URL).' }
  }
  if (!input.userEmail) {
    return { status: 'error', message: 'E-mail do usuário ausente — não foi possível apontar no PSA.' }
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), env.psa.timeoutMs)

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (env.psa.token) headers['Authorization'] = `Bearer ${env.psa.token}`

    const res = await fetch(env.psa.teamsBotUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_email: input.userEmail,
        project_name: input.projectName,
        hours: input.hours,
        date: input.date,
        notes: input.notes ?? undefined,
      }),
      signal: controller.signal,
    })

    let body: any = null
    try { body = await res.json() } catch { /* resposta não-JSON */ }

    const message: string = body?.message ?? (res.ok ? 'Apontamento enviado ao PSA.' : `PSA respondeu HTTP ${res.status}.`)
    const status: PsaResult['status'] = body?.status === 'success' || (res.ok && body?.status !== 'error') ? 'success' : 'error'

    return { status, message, httpStatus: res.status }
  } catch (err: any) {
    const aborted = err?.name === 'AbortError'
    return {
      status: 'error',
      message: aborted
        ? `Tempo esgotado ao contatar o PSA (>${env.psa.timeoutMs}ms).`
        : `Falha ao contatar o PSA: ${err?.message ?? 'erro desconhecido'}.`,
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
