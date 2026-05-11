'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionHeader } from '@/components/ui/section-header'
import { toast } from 'sonner'
import { Loader2, TestTube2 } from 'lucide-react'

const DEFAULT = {
  llm_model: 'claude-haiku-4-5-20251001',
  rag_top_k: 5,
  rag_confidence_threshold: 0.7,
  rag_cache_ttl_hours: 24,
  embedding_model: 'text-embedding-004',
  max_tokens_response: 2048,
  temperature: 0.1,
  auto_analysis_enabled: true,
}

const MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Rápido, econômico)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanceado)' },
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7 (Máxima capacidade)' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Google)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Google)' },
]

export function AISettingsTab() {
  const [values, setValues] = useState(DEFAULT)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  function set(key: keyof typeof DEFAULT, val: string | number | boolean) {
    setValues(v => ({ ...v, [key]: val }))
  }

  async function handleSave() {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'ai', settings: values }),
      })
      toast.success('Configurações de IA salvas')
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await fetch('/api/rag/query', {
        method: 'GET',
      })
      if (res.ok) toast.success('Conexão com IA OK')
      else toast.error('Falha na conexão com IA')
    } catch {
      toast.error('Erro ao testar conexão')
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader title="IA & RAG — Configurações do Motor" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 space-y-5">
          <h3 className="font-bold text-content-primary text-sm mb-2">Modelo de Linguagem</h3>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Modelo Principal (LLM)</Label>
            <Select value={values.llm_model} onValueChange={v => set('llm_model', v)}>
              <SelectTrigger className="bg-surface-background/50 border-border-divider rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-card border-border-divider">
                {MODELS.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Temperatura</Label>
              <span className="text-[10px] font-black">{values.temperature}</span>
            </div>
            <input type="range" min={0} max={1} step={0.05} value={values.temperature}
              onChange={e => set('temperature', Number(e.target.value))}
              className="w-full accent-plannera-orange" />
            <p className="text-[10px] text-content-secondary">0 = determinístico, 1 = criativo</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Tokens máximos por resposta</Label>
            <Input type="number" min={256} max={8192} step={256} value={values.max_tokens_response}
              onChange={e => set('max_tokens_response', Number(e.target.value))}
              className="bg-surface-background/50 border-border-divider rounded-xl" />
          </div>
        </Card>

        <Card className="p-6 space-y-5">
          <h3 className="font-bold text-content-primary text-sm mb-2">Parâmetros RAG</h3>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Modelo de Embeddings</Label>
            <Select value={values.embedding_model} onValueChange={v => set('embedding_model', v)}>
              <SelectTrigger className="bg-surface-background/50 border-border-divider rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-card border-border-divider">
                <SelectItem value="text-embedding-004">text-embedding-004 (Google)</SelectItem>
                <SelectItem value="text-embedding-3-small">text-embedding-3-small (OpenAI)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Top-K resultados para contexto</Label>
            <Input type="number" min={1} max={20} value={values.rag_top_k}
              onChange={e => set('rag_top_k', Number(e.target.value))}
              className="bg-surface-background/50 border-border-divider rounded-xl" />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between">
              <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Confiança mínima</Label>
              <span className="text-[10px] font-black">{Math.round(values.rag_confidence_threshold * 100)}%</span>
            </div>
            <input type="range" min={0.4} max={0.99} step={0.05} value={values.rag_confidence_threshold}
              onChange={e => set('rag_confidence_threshold', Number(e.target.value))}
              className="w-full accent-plannera-orange" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Cache TTL (horas)</Label>
            <Input type="number" min={1} max={168} value={values.rag_cache_ttl_hours}
              onChange={e => set('rag_cache_ttl_hours', Number(e.target.value))}
              className="bg-surface-background/50 border-border-divider rounded-xl" />
          </div>
        </Card>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-border-divider">
        <Button variant="outline" onClick={handleTest} disabled={testing} className="gap-2">
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
          Testar Conexão
        </Button>
        <Button onClick={handleSave} disabled={saving} className="bg-plannera-orange hover:bg-plannera-orange/90 gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}
