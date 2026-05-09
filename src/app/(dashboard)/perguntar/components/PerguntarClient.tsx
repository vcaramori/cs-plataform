'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Textarea } from '@/components/ui/textarea'
import { 
  Sparkles, 
  Loader2, 
  FileText, 
  TicketCheck, 
  Send, 
  ChevronRight, 
  Zap, 
  Target, 
  User, 
  Info,
  History,
  Lightbulb
} from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type Account = { id: string; name: string }

type Source = {
  type: 'interaction' | 'support_ticket'
  source_id: string
  account_name: string
  title: string
  date: string
  excerpt: string
  similarity: number
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  error?: boolean
}

const exampleQuestions = [
  'Qual o maior problema técnico deste LOGO?',
  'Qual foi o sentimento geral nas últimas reuniões?',
  'Quais LOGOS têm tickets críticos em aberto?',
  'Principais temas discutidos nas reuniões?',
  'Há algum sinal de risco de churn no portfólio?',
]

export function PerguntarClient({ accounts }: { accounts: Account[] }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('all')
  const [isLoading, setIsLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function handleSend() {
    const question = input.trim()
    if (!question || isLoading) return

    const userMsg: Message = { role: 'user', content: question }
    setMessages((prev) => [...prev, userMsg])
    setInput('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          account_id: selectedAccountId === 'all' ? undefined : selectedAccountId,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.error ?? 'Erro ao processar a pergunta.',
          error: true,
        }])
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: data.answer,
          sources: data.sources,
        }])
      }
    } catch (err) {
      console.error('[PerguntarClient] Send error:', err)
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Erro de conexão. Tente novamente.',
        error: true,
      }])
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const selectedAccount = accounts.find((a) => a.id === selectedAccountId)

  return (
    <div className="flex flex-col h-full relative overflow-hidden bg-surface-background/30 rounded-2xl border border-border-divider/50 shadow-2xl backdrop-blur-sm">
      {/* Scope Selector Bar */}
      <div className="flex items-center justify-between gap-4 bg-surface-card/40 backdrop-blur-xl border-b border-border-divider/50 px-6 py-4 z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-plannera-orange/10 flex items-center justify-center border border-plannera-orange/20 shadow-inner">
              <Target className="w-4 h-4 text-plannera-orange" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-content-primary">Contexto de Análise</span>
              <span className="text-[9px] font-bold text-content-secondary uppercase opacity-60">IA Generativa de Portfólio</span>
            </div>
          </div>
          <div className="w-64">
            <SearchableSelect
              value={selectedAccountId}
              onValueChange={setSelectedAccountId}
              options={[
                { label: 'TODO O PORTFÓLIO', value: 'all' },
                ...accounts.map(a => ({ label: a.name.toUpperCase(), value: a.id }))
              ]}
            />
          </div>
          {selectedAccount && (
            <Badge className="bg-plannera-orange/10 text-plannera-orange border-plannera-orange/20 px-3 py-1 font-black uppercase tracking-widest text-[9px] animate-in fade-in slide-in-from-left-2 duration-300">
              {selectedAccount.name}
            </Badge>
          )}
        </div>
        
        <div className="hidden md:flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-surface-card border border-transparent hover:border-border-divider transition-all">
            <History className="w-4 h-4 text-content-secondary" />
          </Button>
          <Button variant="ghost" size="icon" className="w-9 h-9 rounded-xl hover:bg-surface-card border border-transparent hover:border-border-divider transition-all">
            <Info className="w-4 h-4 text-content-secondary" />
          </Button>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 py-10 space-y-10 scroll-smooth">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center min-h-[400px] max-w-5xl mx-auto w-full gap-12"
            >
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-plannera-orange blur-[50px] opacity-20 animate-pulse" />
                  <div className="w-20 h-20 rounded-2xl bg-surface-card border border-border-divider flex items-center justify-center relative shadow-2xl overflow-hidden group">
                    <Sparkles className="w-10 h-10 text-plannera-orange group-hover:scale-110 transition-transform duration-500" />
                  </div>
                </div>

                <div className="text-center space-y-3">
                  <h2 className="text-4xl font-heading font-black text-content-primary uppercase tracking-tight leading-none">
                    Como posso <span className="text-plannera-orange">ajudar</span> hoje?
                  </h2>
                  <p className="text-content-secondary text-[11px] font-bold uppercase tracking-[0.4em] opacity-50">
                    Sua IA de Portfólio Estratégico e Customer Success
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
                <div className="col-span-full flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-plannera-orange" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Sugestões de Análise</span>
                </div>
                {exampleQuestions.map((q, idx) => (
                  <motion.button
                    key={q}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => setInput(q)}
                    className="group flex flex-col justify-between text-left bg-surface-card/60 hover:bg-plannera-orange border border-border-divider hover:border-plannera-orange p-6 rounded-2xl transition-all shadow-sm hover:shadow-plannera-orange/20"
                  >
                    <span className="text-[12px] font-black uppercase tracking-tight leading-relaxed text-content-primary group-hover:text-white transition-colors">{q}</span>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[9px] font-bold text-content-secondary/40 group-hover:text-white/40 uppercase tracking-widest">Tentar</span>
                      <ChevronRight className="w-4 h-4 text-plannera-orange group-hover:text-white translate-x-0 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="max-w-6xl mx-auto w-full space-y-12">
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex gap-4 md:gap-8",
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  )}
                >
                  {/* Avatar */}
                  <div className={cn(
                    "w-10 h-10 md:w-12 md:h-12 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg border mt-1",
                    msg.role === 'assistant' 
                      ? "bg-surface-card border-border-divider" 
                      : "bg-plannera-orange border-plannera-orange shadow-plannera-orange/20"
                  )}>
                    {msg.role === 'assistant' ? (
                      <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-plannera-orange" />
                    ) : (
                      <User className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    )}
                  </div>

                  {/* Content Container */}
                  <div className={cn(
                    "flex flex-col gap-4 min-w-0 flex-1",
                    msg.role === 'user' ? 'items-end' : 'items-start'
                  )}>
                    <div className={cn(
                      "rounded-2xl px-6 md:px-8 py-5 md:py-6 text-sm md:text-base leading-relaxed border transition-all shadow-xl",
                      msg.role === 'user'
                        ? 'bg-plannera-primary text-white border-plannera-primary rounded-tr-sm font-medium'
                        : msg.error
                          ? 'bg-red-500/5 border-red-500/20 text-red-500 rounded-tl-sm'
                          : 'bg-surface-card border-border-divider text-content-primary rounded-tl-sm backdrop-blur-md'
                    )}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-headings:font-heading prose-headings:font-black prose-headings:text-plannera-orange prose-strong:text-plannera-orange prose-p:text-content-primary/90 prose-li:text-content-primary/80">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="font-semibold tracking-tight">{msg.content}</span>
                      )}
                    </div>

                    {/* Grounding / Sources */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-col gap-3 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="flex items-center gap-2 px-2">
                          <div className="w-4 h-4 rounded-full bg-plannera-orange/20 flex items-center justify-center">
                            <Zap className="w-2.5 h-2.5 text-plannera-orange" />
                          </div>
                          <span className="text-[10px] text-content-secondary font-black uppercase tracking-[0.2em] opacity-60">Grounding e Evidências</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {msg.sources.map((s, si) => (
                            <div 
                              key={si}
                              className="group/src flex flex-col gap-2 bg-surface-card/40 hover:bg-surface-card border border-border-divider/50 rounded-2xl p-4 transition-all shadow-sm hover:shadow-md border-l-2 hover:border-l-plannera-orange"
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {s.type === 'interaction'
                                    ? <FileText className="w-3.5 h-3.5 text-indigo-500" />
                                    : <TicketCheck className="w-3.5 h-3.5 text-plannera-orange" />}
                                  <span className="text-[9px] font-black uppercase tracking-tight text-content-secondary truncate">{s.type === 'interaction' ? 'Interação' : 'Chamado'}</span>
                                </div>
                                <span className="text-[9px] font-bold text-indigo-500 px-1.5 py-0.5 bg-indigo-500/5 rounded-md">{Math.round(s.similarity * 100)}% Match</span>
                              </div>
                              <p className="text-content-primary text-[11px] font-black uppercase tracking-tight leading-tight line-clamp-1 group-hover/src:text-plannera-orange transition-colors">{s.title}</p>
                              <p className="text-content-secondary text-[10px] font-bold uppercase tracking-widest opacity-60 truncate">{s.account_name}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="max-w-6xl mx-auto w-full flex gap-4 md:gap-8 justify-start py-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-surface-card border border-border-divider flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-plannera-orange" />
            </div>
            <div className="bg-surface-card/60 backdrop-blur-md border border-border-divider rounded-2xl rounded-tl-sm px-8 py-6 flex items-center gap-3">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-plannera-orange rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-plannera-orange rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-plannera-orange rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary opacity-60 animate-pulse ml-2">Pensando...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} className="h-4" />
      </div>

      {/* Input Console */}
      <div className="px-6 pb-10 pt-4 z-30 bg-gradient-to-t from-surface-background via-surface-background/80 to-transparent">
        <div className="max-w-5xl mx-auto relative">
          {/* Glass Input Box */}
          <div className="relative group transition-all duration-500">
            <div className="absolute -inset-4 bg-gradient-to-r from-plannera-orange/10 via-plannera-sop/10 to-plannera-orange/10 rounded-2xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="relative flex items-end gap-3 bg-surface-card/90 backdrop-blur-2xl border border-border-divider rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] focus-within:shadow-[0_20px_60px_rgba(var(--plannera-orange-rgb),0.1)] focus-within:border-plannera-orange/40 transition-all duration-300">
              <div className="flex-1 flex flex-col gap-1 min-w-0">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Solicite uma análise estratégica ou pergunte sobre o portfólio..."
                  rows={1}
                  disabled={isLoading}
                  className="w-full bg-transparent border-none text-content-primary placeholder:text-content-secondary/30 resize-none px-4 py-2 min-h-[50px] focus-visible:ring-0 focus-visible:ring-offset-0 font-bold tracking-tight text-base md:text-lg"
                  style={{ height: 'auto', minHeight: '50px' }}
                />
              </div>
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-plannera-orange hover:bg-plannera-orange/90 text-white h-12 w-12 md:h-14 md:w-14 rounded-2xl flex-shrink-0 transition-all active:scale-95 shadow-lg shadow-plannera-orange/30 flex items-center justify-center group/btn"
              >
                {isLoading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <Send className="w-5 h-5 md:w-6 md:h-6 group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 mt-4">
            <div className="flex items-center gap-4">
               <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 border border-success-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span className="text-[8px] font-black text-success uppercase tracking-widest">IA Conectada</span>
               </div>
            </div>
            <p className="text-content-secondary text-[9px] font-black uppercase tracking-[0.3em] opacity-60">
              ENTER ENVIAR · SHIFT + ENTER QUEBRA DE LINHA
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
