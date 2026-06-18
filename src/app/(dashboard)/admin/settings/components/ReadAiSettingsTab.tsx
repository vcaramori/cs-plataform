'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { toast } from 'sonner'
import { Loader2, Video, Play, CheckCircle2, AlertCircle, Users, Webhook, Copy, Check } from 'lucide-react'

interface Status {
  config: {
    enabled: boolean
    fallback_account_id: string
    store_unmatched: boolean
    has_oauth_client: boolean
    oauth_audience: string
    oauth_metadata_url: string
    api_base_url: string
  }
  registered: boolean
  metadata_discovered: boolean
  connected_users: number
  sync_state: { historical_done?: boolean; last_sync_at?: string } | null
  oauth_debug: { at?: string; step?: string; reason?: string; cookiePresent?: boolean; stateMatches?: boolean; hasRefreshToken?: boolean; redirectUri?: string } | null
  webhook: { url: string; signing_keys_count: number; default_csm_id: string }
}

export function ReadAiSettingsTab() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [fallback, setFallback] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [signingKeys, setSigningKeys] = useState('')
  const [webhookCsm, setWebhookCsm] = useState('')
  const [copied, setCopied] = useState(false)
  const [audience, setAudience] = useState('')
  const [metadataUrl, setMetadataUrl] = useState('')
  const [apiBaseUrl, setApiBaseUrl] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/readai-settings')
      const j = await r.json()
      setStatus(j)
      setFallback(j?.config?.fallback_account_id ?? '')
      setWebhookCsm(j?.webhook?.default_csm_id ?? '')
      setAudience(j?.config?.oauth_audience ?? '')
      setMetadataUrl(j?.config?.oauth_metadata_url ?? '')
      setApiBaseUrl(j?.config?.api_base_url ?? '')
    } catch {
      toast.error('Erro ao carregar status')
    } finally {
      setLoading(false)
    }
  }

  async function copyWebhookUrl() {
    if (!status?.webhook?.url) return
    try {
      await navigator.clipboard.writeText(status.webhook.url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Não foi possível copiar')
    }
  }

  async function saveWebhook() {
    const j = await action(
      { action: 'save_webhook', webhook_signing_keys: signingKeys, webhook_default_csm_id: webhookCsm },
      'webhook'
    )
    if (j?.success) { toast.success('Webhook salvo'); setSigningKeys(''); load() }
  }
  useEffect(() => { load() }, [])

  async function action(payload: Record<string, unknown>, label: string) {
    setBusy(label)
    try {
      const r = await fetch('/api/admin/readai-settings', {
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

  async function saveConfig(patch: Record<string, unknown>) {
    const j = await action({ action: 'save_config', ...patch }, 'config')
    if (j?.success) { toast.success('Configuração salva'); setClientSecret(''); load() }
  }

  async function runSync() {
    toast.info('Sincronizando reuniões… pode levar alguns minutos no 1º backfill')
    const j = await action({ action: 'run_sync' }, 'sync')
    if (j?.success) {
      const r = j.result
      const errCount = r.errors?.length ?? 0
      toast.success(`Sync: ${r.users} CSM(s) · ${r.created} novas · ${r.updated} atualizadas · ${r.skipped} puladas${errCount ? ` · ${errCount} erros` : ''}`)
      if (errCount) toast.error(`${errCount} erro(s). Ex.: ${r.errors[0]}`, { duration: 8000 })
      load()
    }
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-content-secondary" /></div>

  return (
    <div className="space-y-8">
      <SectionHeader title="Integração Read.ai" subtitle="Importa reuniões (transcrição completa) → timeline, esforço e RAG" />

      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2"><Video className="w-4 h-4 text-plannera-orange" /><h3 className="font-bold text-content-primary text-sm">Como funciona</h3></div>
        <p className="text-xs text-content-secondary">
          Há dois caminhos. <strong>Webhooks (recomendado)</strong>: o Read.ai empurra cada reunião para a nossa URL assim que o relatório fica pronto — sem login, sem token expirando. Configure uma vez (abaixo).
          {' '}<strong>OAuth (opcional)</strong>: cada CSM conecta o próprio Read.ai na tela inicial (card &quot;Read.ai&quot; → &quot;Conectar&quot;) e o job horário puxa o histórico. Os dois alimentam timeline + esforço + RAG e deduplicam pela mesma reunião.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            {status?.metadata_discovered ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
            Metadata OAuth {status?.metadata_discovered ? 'descoberto' : 'pendente'}
          </div>
          <div className="flex items-center gap-2">
            {status?.registered || status?.config.has_oauth_client ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
            Client OAuth {status?.registered || status?.config.has_oauth_client ? 'pronto' : 'não registrado'}
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-content-secondary" /> {status?.connected_users ?? 0} CSM(s) conectado(s)
          </div>
        </div>
        {status?.oauth_debug && (
          <div className={`text-[11px] rounded-lg p-2.5 border ${status.oauth_debug.step === 'success' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400' : 'border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-400'}`}>
            <span className="font-bold">Último OAuth:</span> {status.oauth_debug.step}
            {status.oauth_debug.reason ? ` — ${status.oauth_debug.reason}` : ''}
            {status.oauth_debug.step === 'invalid_state' ? ` (cookie: ${status.oauth_debug.cookiePresent ? 'presente' : 'ausente'}, state confere: ${status.oauth_debug.stateMatches ? 'sim' : 'não'})` : ''}
            {status.oauth_debug.step === 'success' ? ` (refresh token: ${status.oauth_debug.hasRefreshToken ? 'sim' : 'NÃO'})` : ''}
            {status.oauth_debug.at ? ` · ${new Date(status.oauth_debug.at).toLocaleString('pt-BR')}` : ''}
          </div>
        )}
      </Card>

      {/* Webhooks (recomendado) */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Webhook className="w-4 h-4 text-plannera-orange" />
          <h3 className="font-bold text-content-primary text-sm">Webhooks (recomendado)</h3>
          {status && status.webhook.signing_keys_count > 0 && (
            <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> {status.webhook.signing_keys_count} signing key(s)
            </span>
          )}
        </div>
        <ol className="text-xs text-content-secondary list-decimal pl-4 space-y-1">
          <li>No Read.ai, abra <span className="font-mono">app.read.ai/analytics/integrations/webhooks</span> (aba <strong>Workspace</strong> para todo o time) e clique &quot;Create webhook&quot;.</li>
          <li>Cole a URL abaixo como destino e copie a <strong>signing key</strong> gerada.</li>
          <li>Cole a signing key aqui e salve. Use &quot;Send test request&quot; no Read.ai para validar.</li>
        </ol>

        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">URL do webhook (cole no Read.ai)</Label>
          <div className="flex gap-2">
            <Input readOnly value={status?.webhook.url ?? ''} className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={copyWebhookUrl} className="shrink-0">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Signing key(s) — uma por linha</Label>
            <textarea
              value={signingKeys}
              onChange={e => setSigningKeys(e.target.value)}
              placeholder="cole a signing key (base64) gerada no Read.ai"
              rows={2}
              className="w-full bg-surface-background/50 border border-border-divider rounded-xl font-mono text-xs p-2.5 resize-y"
            />
            <p className="text-[9px] text-content-secondary/70">Guardada no banco (não exibida depois). Várias linhas = rotação/múltiplos webhooks.</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">CSM padrão (UUID) — owner não identificado</Label>
            <Input value={webhookCsm} onChange={e => setWebhookCsm(e.target.value)} placeholder="(opcional) UUID de um usuário CSM" className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
            <p className="text-[9px] text-content-secondary/70">Usado quando o e-mail do dono da reunião não casa com nenhum usuário.</p>
          </div>
        </div>
        <Button onClick={saveWebhook} disabled={busy === 'webhook'} className="bg-plannera-orange hover:bg-plannera-orange/90 gap-2">
          {busy === 'webhook' && <Loader2 className="w-4 h-4 animate-spin" />} Salvar webhook
        </Button>
      </Card>

      {/* App OAuth manual (opcional) */}
      <Card className="p-6 space-y-4">
        <h3 className="font-bold text-content-primary text-sm">App OAuth manual (opcional)</h3>
        <p className="text-xs text-content-secondary">Deixe em branco para usar o registro automático. Preenchido → guardado no banco (não hardcoded).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Client ID</Label>
            <Input value={clientId} onChange={e => setClientId(e.target.value)} placeholder="(opcional)" className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Client Secret</Label>
            <Input value={clientSecret} onChange={e => setClientSecret(e.target.value)} placeholder="(opcional)" type="password" className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
          </div>
        </div>
        <Button onClick={() => saveConfig({ oauth_client_id: clientId, oauth_client_secret: clientSecret })} disabled={busy === 'config' || !clientId} variant="outline" className="gap-2">
          {busy === 'config' && <Loader2 className="w-4 h-4 animate-spin" />} Salvar app OAuth
        </Button>
      </Card>

      {/* Avançado (opcional) — overrides OAuth/REST, tudo no banco (nada em env) */}
      <Card className="p-6 space-y-4">
        <h3 className="font-bold text-content-primary text-sm">Avançado (opcional)</h3>
        <p className="text-xs text-content-secondary">
          Tudo guardado no banco — nada em variáveis de ambiente. Deixe em branco para usar os padrões corretos.
        </p>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">OAuth audience da REST API</Label>
          <Input value={audience} onChange={e => setAudience(e.target.value)} placeholder="só se /v1/meetings recusar o token — ex.: https://api.read.ai/v1/meetings" className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">OAuth metadata URL (.well-known)</Label>
            <Input value={metadataUrl} onChange={e => setMetadataUrl(e.target.value)} placeholder="(opcional) override do authorization server" className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">REST API base URL</Label>
            <Input value={apiBaseUrl} onChange={e => setApiBaseUrl(e.target.value)} placeholder="(opcional) default https://api.read.ai/v1" className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
          </div>
        </div>
        <Button onClick={() => saveConfig({ oauth_audience: audience, oauth_metadata_url: metadataUrl, api_base_url: apiBaseUrl })} disabled={busy === 'config'} variant="outline" className="gap-2">
          {busy === 'config' && <Loader2 className="w-4 h-4 animate-spin" />} Salvar avançado
        </Button>
      </Card>

      {/* Config + execução */}
      <Card className="p-6 space-y-5">
        <h3 className="font-bold text-content-primary text-sm">Parâmetros & Execução</h3>
        <div className="space-y-1.5">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Conta padrão (UUID) — reuniões sem conta resolvida</Label>
          <Input value={fallback} onChange={e => setFallback(e.target.value)} placeholder="(opcional) UUID de uma account" className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-xs" />
        </div>
        <div className="flex items-center justify-between p-3 bg-surface-background rounded-xl border border-border-divider">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Mandar não-resolvidas p/ conta padrão</Label>
          <button
            onClick={() => saveConfig({ store_unmatched: !status?.config.store_unmatched, fallback_account_id: fallback })}
            disabled={busy === 'config'}
            className={`relative w-10 h-5 rounded-full transition-colors ${status?.config.store_unmatched ? 'bg-plannera-orange' : 'bg-border-divider'}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${status?.config.store_unmatched ? 'translate-x-5' : ''}`} />
          </button>
        </div>
        <div className="flex items-center justify-between p-3 bg-surface-background rounded-xl border border-border-divider">
          <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Integração habilitada</Label>
          <button
            onClick={() => saveConfig({ enabled: !status?.config.enabled, fallback_account_id: fallback })}
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
          <Button onClick={() => saveConfig({ fallback_account_id: fallback })} disabled={busy === 'config'} variant="outline" className="gap-2">
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
