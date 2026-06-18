'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Loader2, Video, CheckCircle2, Link2, Unlink } from 'lucide-react'

/**
 * Conexão pessoal do agente com o Read.ai via OAuth. O Read.ai não tem token estático,
 * então o CSM clica "Conectar", faz login no Read.ai UMA vez, e o sistema renova o acesso
 * e sincroniza as reuniões (histórico + futuras) em background, vinculando às contas.
 */
export function ReadAiConnectCard() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)

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

  // Resultado do retorno OAuth (?readai=connected|error&reason=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const status = params.get('readai')
    if (!status) return
    if (status === 'connected') { toast.success('Read.ai conectado! Suas reuniões serão sincronizadas.'); load() }
    else if (status === 'error') toast.error(`Falha ao conectar Read.ai: ${params.get('reason') || 'erro desconhecido'}`)
    // limpa a query da URL
    const url = new URL(window.location.href)
    url.searchParams.delete('readai'); url.searchParams.delete('reason')
    window.history.replaceState({}, '', url.toString())
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
            <CheckCircle2 className="w-4 h-4" /> Conectado — suas reuniões são sincronizadas automaticamente.
          </div>
          <Button variant="outline" size="sm" onClick={disconnect} disabled={busy} className="gap-2 w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlink className="w-4 h-4" />} Desconectar
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Button onClick={connect} disabled={busy} className="bg-plannera-orange hover:bg-plannera-orange/90 gap-2 w-full">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />} Conectar Read.ai
          </Button>
          <p className="text-[9px] text-content-secondary/70">
            Você conecta o Read.ai uma vez (login no navegador); suas reuniões — passadas e novas — entram sozinhas na timeline da conta.
          </p>
        </div>
      )}
    </Card>
  )
}
