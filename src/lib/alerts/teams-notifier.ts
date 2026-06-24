
export interface TeamsAlertPayload {
  alert_id: string
  alert_type: string
  severity: string
  message: string
  csm_email: string
  account_id: string
}

export async function notifyTeamsWebhook(supabase: any, alerts: TeamsAlertPayload[]): Promise<void> {
  if (alerts.length === 0) return

  try {
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'alerts_settings')
      .single()

    const url = data?.value?.teams_webhook_url
    if (!url) return

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
