'use client'

import { useEffect, useState, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Video, CheckCircle2, Link2, Unlink, DownloadCloud } from 'lucide-react'

/**
 * Conexão pessoal do agente com o Read.ai via OAuth. Ao conectar, o sistema importa o
 * HISTÓRICO completo de reuniões na hora; depois o cron traz o incremento. O CSM também
 * pode reimportar manualmente. Reuniões já lançadas como esforço são mescladas (não duplicadas).
 */
export function ReadAiConnectCard() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [importing, setImporting] = useState(false)
  const autoRan = useRef(false)

  async function load() {
    try {
      const r = await fetch('/api/integrations/readai')
      const j = await r.json()
      setConnected(!!j.connected)
    } catch {
      setConnected(false)
    }
  }
  useEffect(() => { load() }, [])

  async function runImport(source: 'connect' | 'manual') {
    setImporting(true)
    if (source === 'manual') toast.info('Importando suas reuniões… pode levar um pouco no histórico.')
    try {
      const r = await fetch('/api/integrations/readai/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, force: true }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Falha na importação')
      const x = j.result ?? {}
      const errCount = x.errors?.length ?? 0
      toast.success(`Reuniões: ${x.created ?? 0} novas · ${x.merged ?? 0} mescladas · ${x.updated ?? 0} atualizadas · ${x.skipped ?? 0} puladas${x.possibleDuplicates ? ` · ${x.possibleDuplicates} possíveis duplicatas` : ''}`)
      if (errCount) toast.error(`${errCount} erro(s). Ex.: ${x.errors[0]}`, { duration: 9000 })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha na importação')
    } finally {
      setImporting(false)
    }
  }

  // Resultado do retorno OAuth (?readai=connected|error&reason=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('readai')
    if (!status) return
    if (status === 'connected' && !autoRan.current) {
      autoRan.current = true
      toast.success('Read.ai conectado! Buscando seu histórico de reuniões…')
      setConnected(true)
      runImport('connect')
    } else if (status === 'error') {
      toast.error(`Falha ao conectar Read.ai: ${params.get('reason') || 'erro desconhecido'}`)
    }
    const url = new URL(window.location.href)
    url.searchParams.delete('readai'); url.searchParams.delete('reason')
    window.history.replaceState({}, '', url.toString())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function connect() {
    setBusy(true)
    window.location.href = '/api/integrations/readai/connect'
  }

  async function disconnect() {
    setBusy(true)
    try {
      await fetch('/api/integrations/readai', { method: 'DELETE' })
      setConnected(false)
      toast.success('Read.ai desconectado')
    } finally { setBusy(false) }
  }

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
          <Video className="w-4 h-4 text-plannera-orange" />
        </div>
        <div>
          <h3 className="font-bold text-content-primary text-sm leading-tight">Read.ai</h3>
          <p className="text-[10px] text-content-secondary">Reuniões dos clientes na timeline da conta</p>
        </div>
      </div>

      {connected === null ? (
        <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-content-secondary" /></div>
      ) : connected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-4 h-4" /> Conectado — reuniões importadas automaticamente.
          </div>
          <Button onClick={() => runImport('manual')} disabled={importing} size="sm" className="bg-plannera-orange hover:bg-plannera-orange/90 gap-2 w-full">
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />} Importar minhas reuniões
          </Button>
          <Button variant="outline" size="sm" onClick={disconnect} disabled={busy || importing} className="gap-2 w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />} Desconectar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button onClick={connect} disabled={busy} className="bg-plannera-orange hover:bg-plannera-orange/90 gap-2 w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Conectar Read.ai
          </Button>
          <p className="text-[9px] text-content-secondary/70">
            Você conecta o Read.ai uma vez (login no navegador); o histórico entra na hora e as novas reuniões depois — direto na timeline da conta.
          </p>
        </div>
      )}
    </Card>
  )
}
