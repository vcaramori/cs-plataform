import { env } from '@/lib/env'

export interface TeamsAlertPayload {
  alert_id: string
  alert_type: string
  severity: string
  message: string
  csm_email: string
  account_id: string
}

export async function notifyTeamsWebhook(alerts: TeamsAlertPayload[]): Promise<void> {
  const url = env.alerts.teamsWebhookUrl
  if (!url || alerts.length === 0) return

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(alerts),
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      console.error(`[Teams Notifier] Falha ao enviar para o Power Automate. HTTP ${res.status} ${res.statusText}`)
    }
  } catch (err: any) {
    console.error('[Teams Notifier] Erro ao enviar alertas para o Teams:', err?.message)
  }
}
