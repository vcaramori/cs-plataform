'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SectionHeader } from '@/components/ui/section-header'
import { toast } from 'sonner'
import { Loader2, TestTube2, RotateCcw, Sparkles, MessageSquare, TicketCheck, Brain, Mail, User, Zap, CheckCircle2, XCircle, AlertTriangle, Key, RefreshCw, ShieldCheck, Info } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Provider Definitions ───────────────────────────────────────────────────

type LLMProvider = 'gemini' | 'claude' | 'openai' | 'groq' | 'openrouter' | 'nvidia'

interface ProviderDef {
  id: LLMProvider
  label: string
  supportsEmbeddings: boolean
  textModels: { id: string; label: string }[]
  embeddingModels: { id: string; label: string; dimensions: number }[]
}

const PROVIDERS: ProviderDef[] = [
  {
    id: 'gemini',
    label: 'Google Gemini',
    supportsEmbeddings: true,
    textModels: [
      { id: 'gemini-flash-latest', label: 'Gemini Flash (latest — auto-atualiza)' },
      { id: 'gemini-pro-latest', label: 'Gemini Pro (latest — auto-atualiza)' },
      { id: 'gemini-3-pro', label: 'Gemini 3 Pro' },
      { id: 'gemini-3-flash', label: 'Gemini 3 Flash' },
      { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido)' },
      { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
      { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Legado)' },
    ],
    embeddingModels: [
      { id: 'gemini-embedding-001', label: 'gemini-embedding-001 (1536d)', dimensions: 1536 },
    ],
  },
  {
    id: 'claude',
    label: 'Anthropic Claude',
    supportsEmbeddings: false,
    textModels: [
      { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Rápido, econômico)' },
      { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanceado)' },
      { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 (Máxima capacidade)' },
    ],
    embeddingModels: [],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    supportsEmbeddings: true,
    textModels: [
      { id: 'gpt-4o', label: 'GPT-4o (Avançado)' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido, econômico)' },
      { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (Novo)' },
      { id: 'o3-mini', label: 'o3-mini (Raciocínio)' },
    ],
    embeddingModels: [
      { id: 'text-embedding-3-small', label: 'text-embedding-3-small (1536d)', dimensions: 1536 },
      { id: 'text-embedding-3-large', label: 'text-embedding-3-large (3072d)', dimensions: 3072 },
    ],
  },
  {
    id: 'groq',
    label: 'Groq',
    supportsEmbeddings: false,
    textModels: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B Versatile ⭐ (Free tier — recomendado)' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant (Ultra-rápido, free tier)' },
      { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (32K contexto)' },
      { id: 'gemma2-9b-it', label: 'Gemma 2 9B (Google)' },
    ],
    embeddingModels: [],
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    supportsEmbeddings: false,
    textModels: [
      { id: 'google/gemini-2.5-flash:free', label: 'Gemini 2.5 Flash (Free)' },
      { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B Instruct (Free)' },
      { id: 'moonshotai/kimi-k2.6:free', label: 'Kimi 2.6 (Free)' },
      { id: 'qwen/qwen-2.5-72b-instruct:free', label: 'Qwen 2.5 72B Instruct (Free)' },
      { id: 'deepseek/deepseek-chat:free', label: 'DeepSeek Chat (Free)' },
      { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron Nano 30B (Free)' },
      { id: 'openrouter/auto', label: 'OpenRouter Auto (Best Free/Cheap)' },
    ],
    embeddingModels: [],
  },
  {
    id: 'nvidia',
    label: 'NVIDIA NIM',
    supportsEmbeddings: true,
    textModels: [
      { id: 'moonshotai/kimi-k2.6', label: 'Kimi 2.6' },
      { id: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B Instruct' },
      { id: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B Instruct' },
    ],
    embeddingModels: [
      { id: 'nvidia/nv-embedqa-e5-v5', label: 'nv-embedqa-e5-v5 (1024d)', dimensions: 1024 },
      { id: 'snowflake/arctic-embed-l', label: 'arctic-embed-l (1024d)', dimensions: 1024 },
    ],
  },
]

const EMBEDDING_PROVIDERS = PROVIDERS.filter(p => p.supportsEmbeddings)

// ─── Defaults dos parâmetros do modelo ───────────────────────────────────────

interface AIValues {
  text_provider: LLMProvider
  text_model: string
  fallback_text_provider: LLMProvider | 'none'
  fallback_text_model: string
  embedding_provider: LLMProvider
  embedding_model: string
  fallback_embedding_provider: LLMProvider | 'none'
  fallback_embedding_model: string
  embedding_dimensions: number
  rag_top_k: number
  rag_confidence_threshold: number
  rag_cache_ttl_hours: number
  chunk_size: number
  chunk_overlap: number
  max_tokens_response: number
  temperature: number
}

const DEFAULT_AI: AIValues = {
  text_provider: 'gemini',
  text_model: 'gemini-2.5-flash',
  fallback_text_provider: 'none',
  fallback_text_model: '',
  embedding_provider: 'gemini',
  embedding_model: 'gemini-embedding-001',
  fallback_embedding_provider: 'none',
  fallback_embedding_model: '',
  embedding_dimensions: 1536,
  rag_top_k: 5,
  rag_confidence_threshold: 0.7,
  rag_cache_ttl_hours: 24,
  chunk_size: 1024,
  chunk_overlap: 128,
  max_tokens_response: 2048,
  temperature: 0.1,
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function AISettingsTab() {
  const [aiValues, setAiValues] = useState<AIValues>(DEFAULT_AI)
  const [apiKeys, setApiKeys] = useState<Record<LLMProvider, string>>({
    gemini: '', claude: '', openai: '', groq: '', openrouter: '', nvidia: '',
  })
  const [savedKeys, setSavedKeys] = useState<Record<LLMProvider, boolean>>({
    gemini: false, claude: false, openai: false, groq: false, openrouter: false, nvidia: false,
  })
  const [testingProvider, setTestingProvider] = useState<LLMProvider | null>(null)
  const [testResults, setTestResults] = useState<Record<LLMProvider, 'ok' | 'fail' | null>>({
    gemini: null, claude: null, openai: null, groq: null, openrouter: null, nvidia: null,
  })

  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reindexing, setReindexing] = useState(false)
  const [reembedding, setReembedding] = useState(false)
  const [initialEmbeddingProvider, setInitialEmbeddingProvider] = useState<string>('gemini')
  const [initialEmbeddingModel, setInitialEmbeddingModel] = useState<string>('text-embedding-004')

  const textProvider = useMemo(() => PROVIDERS.find(p => p.id === aiValues.text_provider)!, [aiValues.text_provider])
  const embeddingProvider = useMemo(() => EMBEDDING_PROVIDERS.find(p => p.id === aiValues.embedding_provider)!, [aiValues.embedding_provider])

  const embeddingChanged = aiValues.embedding_provider !== initialEmbeddingProvider ||
    aiValues.embedding_model !== initialEmbeddingModel

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.rag_ai_settings && typeof data.rag_ai_settings === 'object') {
          setAiValues(v => ({ ...v, ...data.rag_ai_settings }))
          setInitialEmbeddingProvider(data.rag_ai_settings.embedding_provider ?? 'gemini')
          setInitialEmbeddingModel(data.rag_ai_settings.embedding_model ?? 'text-embedding-004')
        }
        if (data.llm_provider_keys && typeof data.llm_provider_keys === 'object') {
          const keys = data.llm_provider_keys as Record<string, string>
          setSavedKeys({
            gemini: !!keys.gemini, claude: !!keys.claude,
            openai: !!keys.openai, groq: !!keys.groq,
            openrouter: !!keys.openrouter, nvidia: !!keys.nvidia,
          })
        }

      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  function setAi<K extends keyof AIValues>(key: K, val: AIValues[K]) {
    setAiValues(v => {
      const next = { ...v, [key]: val }
      // Auto-select first model when provider changes
      if (key === 'text_provider') {
        const p = PROVIDERS.find(p => p.id === val)
        if (p) next.text_model = p.textModels[0]?.id ?? ''
      }
      if (key === 'embedding_provider') {
        const p = EMBEDDING_PROVIDERS.find(p => p.id === val)
        if (p && p.embeddingModels[0]) {
          next.embedding_model = p.embeddingModels[0].id
          next.embedding_dimensions = p.embeddingModels[0].dimensions
        }
      }
      if (key === 'embedding_model') {
        const p = EMBEDDING_PROVIDERS.find(p => p.id === next.embedding_provider)
        const model = p?.embeddingModels.find(m => m.id === val)
        if (model) next.embedding_dimensions = model.dimensions
      }
      if (key === 'fallback_text_provider') {
        if (val !== 'none') {
          const p = PROVIDERS.find(p => p.id === val)
          if (p) next.fallback_text_model = p.textModels[0]?.id ?? ''
        } else {
          next.fallback_text_model = ''
        }
      }
      if (key === 'fallback_embedding_provider') {
        if (val !== 'none') {
          const p = EMBEDDING_PROVIDERS.find(p => p.id === val)
          if (p && p.embeddingModels[0]) {
            next.fallback_embedding_model = p.embeddingModels[0].id
          }
        } else {
          next.fallback_embedding_model = ''
        }
      }
      return next
    })
  }

  async function handleTestProvider(provider: LLMProvider) {
    const key = apiKeys[provider]
    if (!key && !savedKeys[provider]) {
      toast.error('Insira a API Key antes de testar')
      return
    }

    setTestingProvider(provider)
    setTestResults(v => ({ ...v, [provider]: null }))

    try {
      const res = await fetch('/api/admin/settings/test-provider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          apiKey: key || 'USE_SAVED',
          model: provider === aiValues.text_provider ? aiValues.text_model : undefined,
        }),
      })
      const data = await res.json()
      setTestResults(v => ({ ...v, [provider]: data.ok ? 'ok' : 'fail' }))
      if (data.ok) toast.success(`${provider} — Conexão OK`)
      else toast.error(`${provider} — ${data.error}`)
    } catch {
      setTestResults(v => ({ ...v, [provider]: 'fail' }))
      toast.error(`${provider} — Erro de conexão`)
    } finally {
      setTestingProvider(null)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const llmKeys: Record<string, string> = {}
      for (const p of ['gemini', 'claude', 'openai', 'groq', 'openrouter', 'nvidia'] as LLMProvider[]) {
        if (apiKeys[p].trim()) llmKeys[p] = apiKeys[p]
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'ai',
          settings: {
            ...aiValues,

            ...(Object.keys(llmKeys).length > 0 ? { llm_keys: llmKeys } : {}),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Update saved keys state
      for (const p of ['gemini', 'claude', 'openai', 'groq', 'openrouter', 'nvidia'] as LLMProvider[]) {
        if (apiKeys[p].trim()) {
          setSavedKeys(v => ({ ...v, [p]: true }))
          setApiKeys(v => ({ ...v, [p]: '' }))
        }
      }

      setInitialEmbeddingProvider(aiValues.embedding_provider)
      setInitialEmbeddingModel(aiValues.embedding_model)

      toast.success('Configurações de IA salvas com sucesso')

      if (data.reindexTriggered) {
        toast.warning('Provider de embedding alterado — re-indexação necessária.', {
          action: {
            label: 'Re-indexar agora',
            onClick: handleReindex,
          },
          duration: 10000,
        })
      }
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  async function handleReindex() {
    setReindexing(true)
    try {
      const res = await fetch('/api/admin/settings/reindex-embeddings', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success(data.message || 'Re-indexação iniciada')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar re-indexação')
    } finally {
      setReindexing(false)
    }
  }

  async function handleReembed() {
    setReembedding(true)
    try {
      const res = await fetch('/api/admin/reembed-missing', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limitPerType: 500 }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const s = (data.stats ?? {}) as Record<string, { missing: number; processed: number; failed: number }>
      const proc = Object.values(s).reduce((a, b) => a + (b.processed || 0), 0)
      const fail = Object.values(s).reduce((a, b) => a + (b.failed || 0), 0)
      toast.success(`RAG reprocessado: ${proc} item(ns) indexado(s)${fail ? `, ${fail} falha(s)` : ''}.`)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao reprocessar embeddings')
    } finally {
      setReembedding(false)
    }
  }

  return (
    <div className="space-y-8">
      <SectionHeader title="IA & RAG — Configurações do Motor" />

      {loading ? (
        <div className="flex items-center gap-2 text-content-secondary text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando configurações...
        </div>
      ) : (
        <>
          {/* ═══ Provider Configuration ═══ */}
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Key className="w-5 h-5 text-plannera-orange" />
              <h3 className="font-bold text-content-primary text-sm uppercase tracking-widest">Configuração de Providers</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Text Provider */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Provider de Texto (LLM)</Label>
                  <Select value={aiValues.text_provider} onValueChange={v => setAi('text_provider', v as LLMProvider)}>
                    <SelectTrigger className="bg-surface-background/50 border-border-divider rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-divider">
                      {PROVIDERS.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Modelo de Texto</Label>
                  <Input
                    list="ai-text-models"
                    value={aiValues.text_model}
                    onChange={e => setAi('text_model', e.target.value)}
                    placeholder="ex.: gemini-2.5-flash, gemini-flash-latest, gemini-3-pro"
                    className="bg-surface-background/50 border-border-divider rounded-xl"
                  />
                  <datalist id="ai-text-models">
                    {textProvider?.textModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </datalist>
                  <p className="text-[9px] text-content-secondary/60">Campo livre: digite qualquer modelo suportado pelo provider (inclui futuros, ex.: Gemini 3/3.5).</p>
                </div>
              </div>

              {/* Embedding Provider */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Provider de Embeddings</Label>
                  <Select value={aiValues.embedding_provider} onValueChange={v => setAi('embedding_provider', v as LLMProvider)}>
                    <SelectTrigger className="bg-surface-background/50 border-border-divider rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-divider">
                      {EMBEDDING_PROVIDERS.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Modelo de Embedding</Label>
                  <Input
                    list="ai-embedding-models"
                    value={aiValues.embedding_model}
                    onChange={e => setAi('embedding_model', e.target.value)}
                    placeholder="ex.: gemini-embedding-001"
                    className="bg-surface-background/50 border-border-divider rounded-xl"
                  />
                  <datalist id="ai-embedding-models">
                    {embeddingProvider?.embeddingModels.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </datalist>
                  <p className="text-[9px] text-content-secondary/60">Trocar o modelo de embedding pode exigir re-indexação (dimensão do vetor).</p>
                </div>

                <div className="flex items-center gap-2 text-[10px] text-content-secondary">
                  <span className="font-bold">Dimensões:</span>
                  <span className="font-mono font-black">{aiValues.embedding_dimensions}</span>
                </div>
              </div>
            </div>

            {/* Embedding change warning */}
            {embeddingChanged && (
              <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    Alterar o provider ou modelo de embeddings requer re-indexação completa.
                  </p>
                  <p className="text-[10px] text-content-secondary mt-1">
                    Todos os vetores existentes serão removidos e recriados com o novo modelo.
                    Isso pode levar vários minutos dependendo do volume de dados.
                  </p>
                </div>
              </div>
            )}

            {/* API Keys */}
            <div className="space-y-3 pt-2 border-t border-border-divider">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-content-secondary">API Keys dos Providers</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TooltipProvider delayDuration={300}>
                {PROVIDERS.map(p => (
                  <div key={p.id} className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">
                        {p.label}
                      </Label>
                      <div className="flex items-center gap-2">
                        {savedKeys[p.id] && !apiKeys[p.id] && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="flex items-center gap-1 text-[9px] font-bold text-success cursor-help">
                                <ShieldCheck className="w-3 h-3" /> Configurada
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[240px] text-center text-[11px]">
                              <p className="font-semibold mb-1">🔐 Chave encriptada com AES-256</p>
                              <p className="text-content-secondary leading-relaxed">
                                Por segurança, a chave real nunca é retornada ao browser.
                                Para substituir, cole a nova chave no campo e salve.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {testResults[p.id] === 'ok' && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-success">
                            <CheckCircle2 className="w-3 h-3" /> OK
                          </span>
                        )}
                        {testResults[p.id] === 'fail' && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-destructive">
                            <XCircle className="w-3 h-3" /> Falhou
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type="password"
                          value={apiKeys[p.id]}
                          onChange={e => setApiKeys(v => ({ ...v, [p.id]: e.target.value }))}
                          placeholder={savedKeys[p.id] ? '••••••••••••' : 'Cole a API Key aqui'}
                          className="bg-surface-background/50 border-border-divider rounded-xl text-xs font-mono w-full"
                        />
                        {savedKeys[p.id] && !apiKeys[p.id] && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-help">
                                <Info className="w-3 h-3 text-content-secondary/50 hover:text-content-secondary transition-colors" />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-[240px] text-center text-[11px]">
                              <p className="font-semibold mb-1">🔐 Campo protegido</p>
                              <p className="text-content-secondary leading-relaxed">
                                A chave está salva e encriptada no servidor.
                                Ela nunca é exibida por segurança.
                                Cole uma nova chave aqui para substituí-la.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestProvider(p.id)}
                        disabled={testingProvider === p.id || (!apiKeys[p.id] && !savedKeys[p.id])}
                        className="gap-1.5 flex-shrink-0 h-9"
                      >
                        {testingProvider === p.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <TestTube2 className="w-3.5 h-3.5" />
                        )}
                        <span className="text-[10px]">Testar</span>
                      </Button>
                    </div>
                  </div>
                ))}
                </TooltipProvider>
              </div>
            </div>
          </Card>

          {/* ═══ Fallback Configuration ═══ */}
          <Card className="p-6 space-y-6">
            <div>
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-indigo-500" />
                <h3 className="font-bold text-content-primary text-sm uppercase tracking-widest">Configuração de Contingência (Fallback)</h3>
              </div>
              <p className="text-[11px] text-content-secondary mt-1">Se o provedor principal falhar, o sistema tentará automaticamente utilizar a contingência.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Fallback Text Provider */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Provider de Texto (Contingência)</Label>
                  <Select value={aiValues.fallback_text_provider} onValueChange={v => setAi('fallback_text_provider', v as LLMProvider | 'none')}>
                    <SelectTrigger className="bg-surface-background/50 border-border-divider rounded-xl">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-divider">
                      <SelectItem value="none">Nenhum</SelectItem>
                      {PROVIDERS.map(p => (
                        <SelectItem key={p.id} value={p.id} disabled={p.id === aiValues.text_provider}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {aiValues.fallback_text_provider !== 'none' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Modelo de Texto (Contingência)</Label>
                    <Select value={aiValues.fallback_text_model} onValueChange={v => setAi('fallback_text_model', v)}>
                      <SelectTrigger className="bg-surface-background/50 border-border-divider rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-card border-border-divider">
                        {PROVIDERS.find(p => p.id === aiValues.fallback_text_provider)?.textModels.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Fallback Embedding Provider */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Provider de Embeddings (Contingência)</Label>
                  <Select value={aiValues.fallback_embedding_provider} onValueChange={v => setAi('fallback_embedding_provider', v as LLMProvider | 'none')}>
                    <SelectTrigger className="bg-surface-background/50 border-border-divider rounded-xl">
                      <SelectValue placeholder="Nenhum" />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-divider">
                      <SelectItem value="none">Nenhum</SelectItem>
                      {EMBEDDING_PROVIDERS.map(p => (
                        <SelectItem key={p.id} value={p.id} disabled={p.id === aiValues.embedding_provider}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {aiValues.fallback_embedding_provider !== 'none' && (
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Modelo de Embedding (Contingência)</Label>
                    <Select value={aiValues.fallback_embedding_model} onValueChange={v => setAi('fallback_embedding_model', v)}>
                      <SelectTrigger className="bg-surface-background/50 border-border-divider rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-card border-border-divider">
                        {EMBEDDING_PROVIDERS.find(p => p.id === aiValues.fallback_embedding_provider)?.embeddingModels.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* ═══ RAG & Model Parameters ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-5">
              <h3 className="font-bold text-content-primary text-sm">Parâmetros do Modelo</h3>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Temperatura</Label>
                  <span className="text-[10px] font-black">{aiValues.temperature}</span>
                </div>
                <input type="range" min={0} max={1} step={0.05} value={aiValues.temperature}
                  onChange={e => setAi('temperature', Number(e.target.value))}
                  className="w-full accent-plannera-orange" />
                <p className="text-[10px] text-content-secondary">0 = determinístico, 1 = criativo</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Tokens máximos por resposta</Label>
                <Input type="number" min={256} max={8192} step={256} value={aiValues.max_tokens_response}
                  onChange={e => setAi('max_tokens_response', Number(e.target.value))}
                  className="bg-surface-background/50 border-border-divider rounded-xl" />
              </div>
            </Card>

            <Card className="p-6 space-y-5">
              <h3 className="font-bold text-content-primary text-sm">Parâmetros RAG</h3>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Top-K resultados para contexto</Label>
                <Input type="number" min={1} max={20} value={aiValues.rag_top_k}
                  onChange={e => setAi('rag_top_k', Number(e.target.value))}
                  className="bg-surface-background/50 border-border-divider rounded-xl" />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Confiança mínima</Label>
                  <span className="text-[10px] font-black">{Math.round(aiValues.rag_confidence_threshold * 100)}%</span>
                </div>
                <input type="range" min={0.4} max={0.99} step={0.05} value={aiValues.rag_confidence_threshold}
                  onChange={e => setAi('rag_confidence_threshold', Number(e.target.value))}
                  className="w-full accent-plannera-orange" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Cache TTL (horas)</Label>
                <Input type="number" min={1} max={168} value={aiValues.rag_cache_ttl_hours}
                  onChange={e => setAi('rag_cache_ttl_hours', Number(e.target.value))}
                  className="bg-surface-background/50 border-border-divider rounded-xl" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Tamanho do chunk (tokens)</Label>
                  <Input type="number" min={128} max={2048} step={64} value={aiValues.chunk_size}
                    onChange={e => setAi('chunk_size', Number(e.target.value))}
                    className="bg-surface-background/50 border-border-divider rounded-xl" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Sobreposição (tokens)</Label>
                  <Input type="number" min={0} max={512} step={16} value={aiValues.chunk_overlap}
                    onChange={e => setAi('chunk_overlap', Number(e.target.value))}
                    className="bg-surface-background/50 border-border-divider rounded-xl" />
                </div>
              </div>
              <p className="text-[10px] text-content-secondary -mt-3">
                Mantenha o chunk ≤ 2048 (teto do embedding Gemini). Reuniões longas são fatiadas em vários chunks automaticamente. Após mudar, rode &quot;Re-indexar todos os embeddings&quot; para regenerar.
              </p>

              {/* Manutenção do RAG */}
              <div className="pt-3 border-t border-border-divider space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReembed}
                  disabled={reembedding}
                  className="gap-2 text-[10px] w-full"
                >
                  {reembedding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Reprocessar RAG (itens faltantes)
                </Button>
                <p className="text-[9px] text-content-secondary/60">Indexa o que ficou de fora (ex.: falha por falta de créditos). Seguro re-rodar.</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReindex}
                  disabled={reindexing}
                  className="gap-2 text-[10px] w-full"
                >
                  Re-indexar todos os embeddings
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}

      <div className="flex justify-between items-center pt-4 border-t border-border-divider">
        <div className="text-[9px] text-content-secondary">
          Provider: <span className="font-bold">{textProvider?.label}</span> · Embedding: <span className="font-bold">{embeddingProvider?.label} ({aiValues.embedding_dimensions}d)</span>
        </div>
        <Button onClick={handleSave} disabled={saving || loading} className="bg-plannera-orange hover:bg-plannera-orange/90 gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}
