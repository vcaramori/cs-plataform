'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SectionHeader } from '@/components/ui/section-header'
import { toast } from 'sonner'
import { Loader2, TestTube2, RotateCcw, Sparkles, MessageSquare, TicketCheck, Brain, Mail, User, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

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
6. Assinatura: "Atenciosamente, [Nome do agente]\nEquipe de Suporte – Plannera"

AVALIAÇÃO DOS 5 CRITÉRIOS (0-10): Tom, Estrutura, Empatia, Clareza, Alinhamento.
Nota final = Média Harmônica dos 5 critérios. show_alert=true se nota < 6.`,

  instruction_shadow_score: `Você é um especialista em Customer Success. Analise os dados abaixo e gere um Shadow Health Score para este LOGO.

CRITÉRIOS DE SCORE:
- 80-100: Cliente saudável, engajado, poucos problemas
- 60-79: Estável, mas com pontos de atenção
- 40-59: Risco moderado, precisa de atenção ativa
- 20-39: Alto risco, intervenção necessária
- 0-19: Risco crítico de churn

REGRAS ESPECIAIS:
- Tickets com internal_level "critical" pesam 2x mais negativamente
- Tickets com sla_breach_resolution = true adicionam "sla_breached" aos risk_factors

Retorne APENAS JSON válido com: score, trend, justification, risk_factors, confidence.`,

  instruction_auto_checkin: `Você é um gerente de sucesso do cliente em uma plataforma SaaS. Gere um email de check-in profissional e personalizado.

INSTRUÇÕES:
1. Gere um assunto CURTO (máx 60 caracteres)
2. Gere um corpo PROFISSIONAL (máx 200 palavras)
3. Tom: consultivo, não vendedor
4. Mencione o período de silêncio e sugira uma breve call de alinhamento
5. Não use placeholders — personalize de verdade com os dados fornecidos

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

const DEFAULT_AI = {
  llm_model: 'claude-haiku-4-5-20251001',
  rag_top_k: 5,
  rag_confidence_threshold: 0.7,
  rag_cache_ttl_hours: 24,
  embedding_model: 'text-embedding-004',
  max_tokens_response: 2048,
  temperature: 0.1,
}

const MODELS = [
  { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Rápido, econômico)' },
  { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanceado)' },
  { value: 'claude-opus-4-7', label: 'Claude Opus 4.7 (Máxima capacidade)' },
  { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Google)' },
  { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Google)' },
]

// ─── Componente ──────────────────────────────────────────────────────────────

export function AISettingsTab() {
  const [aiValues, setAiValues] = useState(DEFAULT_AI)
  const [instructions, setInstructions] = useState<Record<string, string>>(() =>
    Object.fromEntries(INSTRUCTION_CONFIGS.map(c => [c.key, '']))
  )
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(data => {
        if (data.rag_ai_settings && typeof data.rag_ai_settings === 'object') {
          setAiValues(v => ({ ...v, ...data.rag_ai_settings }))
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

  function setAi(key: keyof typeof DEFAULT_AI, val: string | number) {
    setAiValues(v => ({ ...v, [key]: val }))
  }

  function setInstruction(key: string, val: string) {
    setInstructions(v => ({ ...v, [key]: val }))
  }

  function resetInstruction(key: string) {
    setInstructions(v => ({ ...v, [key]: '' }))
    toast.info('Instrução restaurada para o padrão ao salvar')
  }

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module: 'ai',
          settings: { ...aiValues, ...instructions },
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Configurações de IA salvas com sucesso')
    } catch {
      toast.error('Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    try {
      const res = await fetch('/api/rag/query')
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

      {loading ? (
        <div className="flex items-center gap-2 text-content-secondary text-sm py-8">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando configurações...
        </div>
      ) : (
        <>
          {/* Parâmetros do modelo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-5">
              <h3 className="font-bold text-content-primary text-sm">Modelo de Linguagem</h3>

              <div className="space-y-1.5">
                <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Modelo Principal (LLM)</Label>
                <Select value={aiValues.llm_model} onValueChange={v => setAi('llm_model', v)}>
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
                <Label className="text-[10px] font-bold uppercase tracking-wider text-content-secondary">Modelo de Embeddings</Label>
                <Select value={aiValues.embedding_model} onValueChange={v => setAi('embedding_model', v)}>
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
            </Card>
          </div>

          {/* Instruções dos Assistentes */}
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
        <Button variant="outline" onClick={handleTest} disabled={testing || loading} className="gap-2">
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
          Testar Conexão
        </Button>
        <Button onClick={handleSave} disabled={saving || loading} className="bg-plannera-orange hover:bg-plannera-orange/90 gap-2">
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Salvar Configurações
        </Button>
      </div>
    </div>
  )
}
