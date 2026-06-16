'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { toast } from 'sonner'
import { Loader2, KeyRound, Copy, RefreshCw, Play, CheckCircle2, AlertCircle } from 'lucide-react'

interface Status {
  config: { enabled: boolean; fallback_account_id: string; has_secret: boolean }
  token: { present: boolean; refreshed_at: string | null; expires_in_days: number | null }
  sync_state: { historical_done?: boolean; last_sync_at?: string } | null
}

export function HelpDeskSettingsTab() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [tokenInput, setTokenInput] = useState('')
  const [fallback, setFallback] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/helpdesk-settings')
      const j = await r.json()
      setStatus(j)
      setFallback(j?.config?.fallback_account_id ?? '')
    } catch {
      toast.error('Erro ao carregar status')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => { load() }, [])

  async function action(payload: Record<string, unknown>, label: string) {
    setBusy(label)
    try {
      const r = await fetch('/api/admin/helpdesk-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Falha')
      return j
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha')
      return null
    } finally {
      setBusy(null)
    }
  }

  async function rotateSecret() {
    if (status?.config.has_secret && !confirm('Rotacionar o segredo invalida o atual. O GitHub Actions precisará ser atualizado. Continuar?')) return
    const j = await action({ action: 'rotate_secret' }, 'secret')
    if (j?.secret) { setNewSecret(j.secret); toast.success('Segredo gerado — copie agora!'); load() }
  }

  async function saveToken() {
    if (tokenInput.trim().length < 20) { toast.error('Cole um token válido'); return }
    const j = await action({ action: 'set_token', access_token: tokenInput.trim() }, 'token')
    if (j?.success) { setTokenInput(''); toast.success('Token salvo'); load() }
  }

  async function saveConfig(enabled: boolean) {
    const j = await action({ action: 'save_config', enabled, fallback_account_id: fallback }, 'config')
    if (j?.success) { toast.success('Configuração salva'); load() }
  }

  async function runSync() {
    toast.info('Sincronizando… pode levar ~1 min')
    const j = await action({ action: 'run_sync' }, 'sync')
    if (j?.success) {
      const r = j.result
      const errCount = r.errors?.length ?? 0
      toast.success(`Sync ${r.mode}: ${r.scanned} lidos · ${r.created} novos · ${r.updated} atualizados · ${r.csat} CSAT · ${r.skipped} pulados${errCount ? ` · ${errCount} erros` : ''}`)
      // Surfacing dos erros (antes ficavam invisíveis e a falha parecia "0 processados").
      if (errCount) toast.error(`${errCount} erro(s). Ex.: ${r.errors[0]}`, { duration: 8000 })
      load()
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-content-secondary" /></div>

  return (
    <div className="space-y-8">
      <SectionHeader title="Integração HelpDesk" subtitle="Segredo de API, token e sincronização de chamados" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Segredo */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-plannera-orange" /><h3 className="font-bold text-content-primary text-sm">Segredo da API</h3></div>
          <p className="text-xs text-content-secondary">Usado pelo GitHub Actions para autenticar nos endpoints (header <code>x-api-secret</code>). Guardado no banco — não depende de env do Vercel.</p>
          <div className="flex items-center gap-2 text-xs">
            {status?.config.has_secret
              ? <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Segredo configurado</>
              : <><AlertCircle className="w-4 h-4 text-amber-500" /> Nenhum segredo ainda</>}
          </div>
          {newSecret && (
            <div className="space-y-1.5">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-amber-500">Copie agora — não será exibido novamente</Label>
              <div className="flex gap-2">
                <Input readOnly value={newSecret} className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
                <Button variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(newSecret); toast.success('Copiado') }}><Copy className="w-4 h-4" /></Button>
              </div>
              <p className="text-[11px] text-content-secondary">Cole em GitHub → Settings → Secrets → <code>HELPDESK_API_SECRET</code>.</p>
            </div>
          )}
          <Button onClick={rotateSecret} disabled={busy === 'secret'} variant="outline" className="gap-2">
            {busy === 'secret' ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {status?.config.has_secret ? 'Rotacionar segredo' : 'Gerar segredo'}
          </Button>
        </Card>

        {/* Token */}
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2"><KeyRound className="w-4 h-4 text-plannera-orange" /><h3 className="font-bold text-content-primary text-sm">Token do HelpDesk</h3></div>
          <div className="flex items-center gap-2 text-xs">
            {status?.token.present
              ? <><CheckCircle2 className="w-4 h-4 text-emerald-500" /> Token ativo{status.token.expires_in_days != null ? ` (expira em ~${status.token.expires_in_days}d)` : ''}</>
              : <><AlertCircle className="w-4 h-4 text-amber-500" /> Sem token</>}
          </div>
          {status?.token.refreshed_at && <p className="text-[11px] text-content-secondary">Atualizado: {new Date(status.token.refreshed_at).toLocaleString('pt-BR')}</p>}
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Colar token manualmente</Label>
            <Input value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="us-south1:..." className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
          </div>
          <Button onClick={saveToken} disabled={busy === 'token'} variant="outline" className="gap-2">
            {busy === 'token' && <Loader2 className="w-4 h-4 animate-spin" />} Salvar token
          </Button>
        </Card>
      </div>

      {/* Config + ações */}
      <Card className="p-6 space-y-5">
        <h3 className="font-bold text-content-primary text-sm">Parâmetros & Execução</h3>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Conta padrão (UUID) — usada quando não há correspondência</Label>
          <Input value={fallback} onChange={e => setFallback(e.target.value)} placeholder="(opcional) UUID de uma account" className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
        </div>
        <div className="flex items-center justify-between p-3 bg-surface-background rounded-xl border border-border-divider">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Integração habilitada</Label>
          <button
            onClick={() => saveConfig(!status?.config.enabled)}
            disabled={busy === 'config'}
            className={`relative w-10 h-5 rounded-full transition-colors ${status?.config.enabled ? 'bg-plannera-orange' : 'bg-border-divider'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${status?.config.enabled ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        {status?.sync_state?.last_sync_at && (
          <p className="text-[11px] text-content-secondary">
            Última sincronização: {new Date(status.sync_state.last_sync_at).toLocaleString('pt-BR')}
            {status.sync_state.historical_done ? ' · carga histórica concluída' : ''}
          </p>
        )}
        <div className="flex justify-between items-center pt-4 border-t border-border-divider">
          <Button onClick={() => saveConfig(status?.config.enabled ?? false)} disabled={busy === 'config'} variant="outline" className="gap-2">
            {busy === 'config' && <Loader2 className="w-4 h-4 animate-spin" />} Salvar conta padrão
          </Button>
          <Button onClick={runSync} disabled={busy === 'sync'} className="bg-plannera-orange hover:bg-plannera-orange/90 gap-2">
            {busy === 'sync' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />} Rodar sincronização agora
          </Button>
        </div>
      </Card>
    </div>
  )
}
