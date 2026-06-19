'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { toast } from 'sonner'
import { Loader2, CalendarDays, CheckCircle2, AlertCircle, Users, Copy, Check } from 'lucide-react'

interface Status {
  config: { client_id: string; tenant_id: string; has_client_secret: boolean }
  redirect_uri: string
  connected_users: number
}

export function MicrosoftSettingsTab() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [clientId, setClientId] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [copied, setCopied] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/microsoft-settings')
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Falha')
      setStatus(j)
      setClientId(j?.config?.client_id ?? '')
      setTenantId(j?.config?.tenant_id ?? '')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao carregar status')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function copyRedirect() {
    if (!status?.redirect_uri) return
    try {
      await navigator.clipboard.writeText(status.redirect_uri)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  async function save() {
    setBusy(true)
    try {
      const r = await fetch('/api/admin/microsoft-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_config', client_id: clientId, tenant_id: tenantId, client_secret: clientSecret }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Falha')
      toast.success('Configuração salva')
      setClientSecret('')
      load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-content-secondary" /></div>

  const configured = !!status?.config.client_id && !!status?.config.has_client_secret

  return (
    <div className="space-y-8">
      <SectionHeader title="Calendário (Microsoft 365)" subtitle="Conecta a agenda do Outlook/Teams de cada CSM na home" />

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-plannera-orange" />
          <h3 className="font-bold text-content-primary text-sm">Como funciona</h3>
          <span className={`ml-auto inline-flex items-center gap-1 text-[11px] ${configured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {configured ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
            {configured ? 'App configurado' : 'App não configurado'}
          </span>
        </div>
        <p className="text-xs text-content-secondary">
          Registre um app no <strong>Azure AD</strong> (Entra ID) com a permissão <span className="font-mono">Calendars.Read</span> e o redirect abaixo. Cole aqui o Client ID/Secret — guardados <strong>no banco</strong> (nada em env). Depois cada CSM clica &quot;Conectar Calendário&quot; na home (login uma vez) e a agenda do dia aparece.
        </p>
        <div className="flex items-center gap-2 text-xs text-content-secondary">
          <Users className="w-4 h-4" /> {status?.connected_users ?? 0} CSM(s) com calendário conectado
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="font-bold text-content-primary text-sm">App Azure AD (Entra ID)</h3>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Redirect URI (registre no Azure → Authentication)</Label>
          <div className="flex gap-2">
            <Input readOnly value={status?.redirect_uri ?? ''} className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={copyRedirect} className="shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Client ID (Application ID)</Label>
            <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="UUID do app" className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Tenant ID</Label>
            <Input value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder="common, organizations ou GUID do tenant" className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">
            Client Secret {status?.config.has_client_secret && <span className="text-emerald-600 dark:text-emerald-400 normal-case font-normal">(já salvo — preencha só para trocar)</span>}
          </Label>
          <Input value={clientSecret} onChange={e => setClientSecret(e.target.value)} type="password" placeholder={status?.config.has_client_secret ? '•••••••• (mantém o atual)' : 'valor do client secret'} className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
        </div>

        <Button onClick={save} disabled={busy || !clientId} className="bg-plannera-orange hover:bg-plannera-orange/90 gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} Salvar configuração
        </Button>
      </Card>
    </div>
  )
}
