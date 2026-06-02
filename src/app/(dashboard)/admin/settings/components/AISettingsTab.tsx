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

type LLMProvider = 'gemini' | 'claude' | 'openai' | 'groq' | 'openrouter'

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
]

const EMBEDDING_PROVIDERS = PROVIDERS.filter(p => p.supportsEmbeddings)

// ─── Defaults de cada instrução ─────────────────────────────────────────────

const DEFAULTS: Record<string, string> = {
  rag_system_instruction: `Você é o "Cérebro do CS", um assistente de inteligência de elite para Customer Success Managers da Plannera.
Sua missão é realizar uma AUDITORIA EXAUSTIVA cruzando TODAS as fontes de dados disponíveis e extrair insights acionáveis.

REGRAS CRÍTICAS DE IDIOMA E SEGURANÇA:
1. RESPONDA EXCLUSIVAMENTE EM PORTUGUÊS DO BRASIL.
2. É TERMINANTEMENTE PROIBIDO inventar fatos fora do contexto fornecido.
3. Se a informação não existir, diga: "Não encontrei informações suficientes nos registros para responder a isso com precisão."

INSTRUÇÕES DE SÍNTESE 360°:
- Cruze as quatro dimensões: Journal de Esforço, Power Map, Financeiro/SLA e Health Score.
- Priorize evidências concretas do Journal de Esforço sobre dados estruturados.

CLASSIFICAÇÃO DE SAÚDE: 0-39 Vermelho (Risco Crítico) · 40-69 Amarelo (Atenção) · 70-100 Verde (Saudável)`,

  instruction_chat: `Você é um assistente de Customer Success da Plannera.
Responda SEMPRE em Português do Brasil. Seja conciso e direto.
Use os dados fornecidos. Se não tiver informação suficiente, diga honestamente.
Não invente dados. Não use caracteres não-latinos.`,

  instruction_review_reply: `Você é o Revisor de Chamados da Plannera. Sua missão é revisar e aprimorar mensagens enviadas pela equipe de suporte, garantindo clareza, empatia, profissionalismo e consistência com o Padrão Plannera.

PADRÃO PLANNERA — toda resposta deve ter:
1. Saudação personalizada com o nome real do cliente
2. Reconhecimento do pedido ou contexto específico do chamado
3. Explicação objetiva ou status
4. Próximos passos ou orientação
5. Fechamento empático
6. Assinatura: "Atenciosamente, [Nome do agente]\\nEquipe de Suporte – Plannera"

AVALIAÇÃO DOS 5 CRITÉRIOS (0-10): Tom, Estrutura, Empatia, Clareza, Alinhamento.
Nota final = Média Harmônica dos 5 critérios. show_alert=true se nota < 6.`,

  instruction_shadow_score: `Você é um especialista em Customer Success. Analise os dados abaixo e gere um Shadow Health Score para este LOGO.

CRITÉRIOS DE SCORE:
- 80-100: Cliente saudável, engajado, poucos problemas
- 60-79: Estável, mas com pontos de atenção
- 40-59: Risco moderado, precisa de atenção ativa
- 20-39: Alto risco, intervenção necessária
- 0-19: Risco crítico de churn

Retorne APENAS JSON válido com: score, trend, justification, risk_factors, confidence.`,

  instruction_auto_checkin: `Você é um gerente de sucesso do cliente em uma plataforma SaaS. Gere um email de check-in profissional e personalizado.

INSTRUÇÕES:
1. Gere um assunto CURTO (máx 60 caracteres)
2. Gere um corpo PROFISSIONAL (máx 200 palavras)
3. Tom: consultivo, não vendedor
4. Mencione o período de silêncio e sugira uma breve call de alinhamento

Retorne APENAS JSON com: subject, body.`,
}

// ─── Config das instruções ───────────────────────────────────────────────────

type InstructionConfig = {
  key: string
  label: string
  description: string
  icon: React.ElementType
  trigger: 'user' | 'auto'
  rows: number
}

const INSTRUCTION_CONFIGS: InstructionConfig[] = [
  {
    key: 'rag_system_instruction',
    label: 'Plannera Assistant',
    description: 'Análises de portfólio e perguntas no módulo Perguntar — interface principal de IA conversacional',
    icon: Sparkles,
    trigger: 'user',
    rows: 10,
  },
  {
    key: 'instruction_chat',
    label: 'Chat Rápido',
    description: 'Widget de chat lateral disponível em qualquer página para perguntas rápidas sobre um cliente ou portfólio',
    icon: MessageSquare,
    trigger: 'user',
    rows: 6,
  },
  {
    key: 'instruction_review_reply',
    label: 'Revisor de Resposta a Ticket',
    description: 'Avalia e reescreve respostas a tickets de suporte com base no Padrão Plannera — acionado pelo agente antes de enviar',
    icon: TicketCheck,
    trigger: 'user',
    rows: 10,
  },
  {
    key: 'instruction_shadow_score',
    label: 'Shadow Health Score',
    description: 'Calcula automaticamente o score de saúde paralelo via IA para comparar com o score manual do CSM',
    icon: Brain,
    trigger: 'auto',
    rows: 8,
  },
  {
    key: 'instruction_auto_checkin',
    label: 'Auto Check-in',
    description: 'Gera emails personalizados de check-in para contas que atingiram o threshold de silêncio — aprovados pelo CSM antes do envio',
    icon: Mail,
    trigger: 'auto',
    rows: 7,
  },
]

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
  max_tokens_response: 2048,
  temperature: 0.1,
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function AISettingsTab() {
  const [aiValues, setAiValues] = useState<AIValues>(DEFAULT_AI)
  const [apiKeys, setApiKeys] = useState<Record<LLMProvider, string>>({
    gemini: '', claude: '', openai: '', groq: '', openrouter: '',
  })
  const [savedKeys, setSavedKeys] = useState<Record<LLMProvider, boolean>>({
    gemini: false, claude: false, openai: false, groq: false, openrouter: false,
  })
  const [testingProvider, setTestingProvider] = useState<LLMProvider | null>(null)
  const [testResults, setTestResults] = useState<Record<LLMProvider, 'ok' | 'fail' | null>>({
    gemini: null, claude: null, openai: null, groq: null, openrouter: null,
  })
  const [instructions, setInstructions] = useState<Record<string, string>>(() =>
    Object.fromEntries(INSTRUCTION_CONFIGS.map(c => [c.key, '']))
  )
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [reindexing, setReindexing] = useState(false)
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
            openrouter: !!keys.openrouter,
          })
        }
        const loaded: Record<string, string> = {}
        for (const config of INSTRUCTION_CONFIGS) {
          const val = data[config.key]
          loaded[config.key] = typeof val === 'string' ? val : ''
        }
        setInstructions(loaded)
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

  function setInstruction(key: string, val: string) {
    setInstructions(v => ({ ...v, [key]: val }))
  }

  function resetInstruction(key: string) {
    setInstructions(v => ({ ...v, [key]: '' }))
    toast.info('Instrução restaurada para o padrão ao salvar')
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
      for (const p of ['gemini', 'claude', 'openai', 'groq', 'openrouter'] as LLMProvider[]) {
        if (apiKeys[p].trim()) llmKeys[p] = apiKeys[p]
      }

      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'ai',
          settings: {
            ...aiValues,
            ...instructions,
            ...(Object.keys(llmKeys).length > 0 ? { llm_keys: llmKeys } : {}),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      // Update saved keys state
      for (const p of ['gemini', 'claude', 'openai', 'groq', 'openrouter'] as LLMProvider[]) {
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
                  <Select value={aiValues.text_model} onValueChange={v => setAi('text_model', v)}>
                    <SelectTrigger className="bg-surface-background/50 border-border-divider rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-divider">
                      {textProvider.textModels.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select value={aiValues.embedding_model} onValueChange={v => setAi('embedding_model', v)}>
                    <SelectTrigger className="bg-surface-background/50 border-border-divider rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-surface-card border-border-divider">
                      {embeddingProvider?.embeddingModels.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              {/* Re-index button */}
              <div className="pt-3 border-t border-border-divider">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReindex}
                  disabled={reindexing}
                  className="gap-2 text-[10px] w-full"
                >
                  {reindexing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                  Re-indexar todos os embeddings
                </Button>
              </div>
            </Card>
          </div>

          {/* ═══ Instruções dos Assistentes ═══ */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 pb-1">
              <h3 className="text-sm font-bold text-content-primary uppercase tracking-widest">Instruções dos Assistentes</h3>
              <div className="flex-1 h-px bg-border-divider" />
              <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-widest text-content-secondary">
                <span className="flex items-center gap-1.5"><User className="w-3 h-3" /> Usuário</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3 h-3" /> Automação</span>
              </div>
            </div>

            {INSTRUCTION_CONFIGS.map(config => {
              const Icon = config.icon
              const raw = instructions[config.key] ?? ''
              const isCustom = raw.trim().length > 0
              const displayed = isCustom ? raw : DEFAULTS[config.key] ?? ''

              return (
                <Card key={config.key} className="p-5 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border',
                        config.trigger === 'user'
                          ? 'bg-plannera-orange/10 border-plannera-orange/20'
                          : 'bg-indigo-500/10 border-indigo-500/20'
                      )}>
                        <Icon className={cn('w-4 h-4', config.trigger === 'user' ? 'text-plannera-orange' : 'text-indigo-400')} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-black uppercase tracking-widest text-content-primary">{config.label}</span>
                          <span className={cn(
                            'text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full border',
                            config.trigger === 'user'
                              ? 'bg-plannera-orange/10 text-plannera-orange border-plannera-orange/20'
                              : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          )}>
                            {config.trigger === 'user' ? 'Acionado pelo usuário' : 'Automação'}
                          </span>
                          {isCustom ? (
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              Personalizado
                            </span>
                          ) : (
                            <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-full bg-success/10 text-success border border-success/20">
                              Padrão do sistema
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-content-secondary mt-0.5 leading-relaxed">{config.description}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => resetInstruction(config.key)}
                      disabled={!isCustom}
                      className="gap-1.5 text-[9px] font-bold text-content-secondary hover:text-content-primary h-7 flex-shrink-0"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Restaurar padrão
                    </Button>
                  </div>

                  <Textarea
                    value={displayed}
                    onChange={e => {
                      const val = e.target.value
                      setInstruction(config.key, val === DEFAULTS[config.key] ? '' : val)
                    }}
                    rows={config.rows}
                    className="bg-surface-background/50 border-border-divider rounded-xl font-mono text-[11px] leading-relaxed resize-y"
                  />

                  <p className="text-[9px] text-content-secondary/50 text-right">
                    {displayed.length} caracteres
                    {!isCustom && ' · Exibindo padrão — edite para personalizar'}
                  </p>
                </Card>
              )
            })}
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
