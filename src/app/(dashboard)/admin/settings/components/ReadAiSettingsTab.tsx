'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { SectionHeader } from '@/components/ui/section-header'
import { toast } from 'sonner'
import { Loader2, Video, Play, CheckCircle2, AlertCircle, Users } from 'lucide-react'

interface Status {
  config: { enabled: boolean; fallback_account_id: string; store_unmatched: boolean; has_oauth_client: boolean }
  registered: boolean
  metadata_discovered: boolean
  connected_users: number
  sync_state: { historical_done?: boolean; last_sync_at?: string } | null
}

export function ReadAiSettingsTab() {
  const [status, setStatus] = useState<Status | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [fallback, setFallback] = useState('')
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await fetch('/api/admin/readai-settings')
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
          O Read.ai usa OAuth (sem token estático). Cada CSM conecta o próprio Read.ai na tela inicial (card &quot;Read.ai&quot; → &quot;Conectar&quot;, login no navegador uma vez).
          Depois, o job horário traz as reuniões — passadas e novas — com transcrição completa, cria o esforço e indexa no RAG. A plataforma se auto-registra no Read.ai (dynamic client registration); só preencha o app OAuth manual abaixo se preferir gerenciar você mesmo.
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
