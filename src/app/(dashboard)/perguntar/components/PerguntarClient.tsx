'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Sparkles, Loader2, FileText, TicketCheck, Send, Globe, ChevronRight, Zap, Target } from 'lucide-react'
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
  'Quais foram os principais temas discutidos nas reuniões?',
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
  }, [messages])

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
    } catch {
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
    <div className="flex flex-col h-[calc(100vh-200px)] gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Scope Selector */}
      <div className="flex items-center gap-4 flex-wrap bg-slate-900/40 p-3 rounded-2xl border border-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2 pl-2">
          <Target className="w-4 h-4 text-plannera-orange" />
          <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Escopo da I.A:</span>
        </div>
        <div className="w-72">
          <SearchableSelect
            value={selectedAccountId}
            onValueChange={setSelectedAccountId}
            options={[
              { label: 'TODO O PORTFÓLIO (GLOBAL)', value: 'all' },
              ...accounts.map(a => ({ label: a.name.toUpperCase(), value: a.id }))
            ]}
          />
        </div>
        {selectedAccount && (
          <Badge className="bg-plannera-orange/10 text-plannera-orange border border-plannera-orange/20 px-3 py-1 font-bold uppercase tracking-widest text-[9px]">
            Filtrando Ativos: {selectedAccount.name}
          </Badge>
        )}
      </div>

      {/* Main Container */}
      <Card className="glass-card flex-1 overflow-hidden flex flex-col relative border-none shadow-2xl">
        {/* Subtle background glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-plannera-orange/[0.02] to-transparent pointer-events-none" />
        
        <CardContent className="flex-1 overflow-y-auto p-4 lg:p-10 space-y-10 relative z-10 scrollbar-thin scrollbar-thumb-white/5 scrollbar-track-transparent">
          <AnimatePresence mode="popLayout">
            {messages.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-full gap-8 py-12"
              >
                <div className="w-20 h-20 rounded-3xl bg-plannera-primary border border-white/5 flex items-center justify-center relative group">
                  <div className="absolute inset-0 bg-plannera-orange/20 blur-2xl rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Sparkles className="w-10 h-10 text-plannera-orange relative z-10" />
                </div>
                
                <div className="text-center space-y-2">
                  <h2 className="text-2xl font-heading font-extrabold text-white uppercase tracking-tight">Agente de Inteligência</h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em] max-w-[400px] leading-relaxed opacity-70">
                    Acesso Estratégico ao Conhecimento do Portfólio
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-2xl px-4">
                  {exampleQuestions.map((q, idx) => (
                    <motion.button
                      key={q}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      onClick={() => setInput(q)}
                      className="group flex items-center justify-between text-left text-[10px] text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 p-4 rounded-xl border border-white/5 transition-all"
                    >
                      <span className="font-bold uppercase tracking-widest leading-relaxed line-clamp-1">{q}</span>
                      <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all text-plannera-orange" />
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : (
              <div className="space-y-10">
                {messages.map((msg, idx) => (
                  <motion.div 
                    key={idx} 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex gap-6 group",
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-10 h-10 rounded-xl bg-plannera-sop border border-white/5 flex items-center justify-center flex-shrink-0 mt-2 shadow-lg">
                        <Sparkles className="w-5 h-5 text-plannera-orange" />
                      </div>
                    )}

                    <div className={cn(
                      "max-w-3xl flex flex-col gap-4",
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    )}>
                      <div className={cn(
                        "rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-xl",
                        msg.role === 'user'
                          ? 'bg-plannera-orange text-white rounded-tr-sm font-bold tracking-tight'
                          : msg.error
                            ? 'bg-plannera-demand/30 border border-plannera-demand/50 text-white rounded-tl-sm'
                            : 'bg-white/5 border border-white/5 text-slate-100 rounded-tl-sm backdrop-blur-md'
                      )}>
                        {msg.role === 'assistant' ? (
                          <div className="prose prose-invert prose-sm max-w-none prose-headings:font-heading prose-headings:font-bold prose-headings:text-plannera-orange prose-strong:text-plannera-orange prose-p:text-slate-200">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>
                        ) : (
                          msg.content
                        )}
                      </div>

                      {/* Sources Section */}
                      {msg.sources && msg.sources.length > 0 && (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                          className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full"
                        >
                          <div className="col-span-full flex items-center gap-2 mb-1">
                             <Zap className="w-3 h-3 text-plannera-orange" />
                             <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Grounding / Evidências Corporativas</span>
                          </div>
                          {msg.sources.slice(0, 4).map((s, si) => (
                            <div key={si} className="group/src flex items-start gap-4 bg-black/20 hover:bg-white/5 border border-white/5 rounded-xl px-4 py-3 transition-all cursor-default relative overflow-hidden">
                              <div className="absolute right-0 top-0 p-2 opacity-5">
                                 {s.type === 'interaction' ? <FileText className="w-10 h-10" /> : <TicketCheck className="w-10 h-10" />}
                              </div>
                              <div className="flex-shrink-0 mt-1">
                                {s.type === 'interaction'
                                  ? <FileText className="w-4 h-4 text-plannera-ds" />
                                  : <TicketCheck className="w-4 h-4 text-plannera-orange" />}
                              </div>
                              <div className="min-w-0 flex-1 relative z-10">
                                <p className="text-white text-[11px] font-bold uppercase tracking-tight truncate mb-1 group-hover/src:text-plannera-orange transition-colors">{s.title}</p>
                                <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-widest text-slate-500">
                                  <span className="truncate max-w-[80px]">{s.account_name}</span>
                                  <span className="opacity-30">•</span>
                                  <span>{s.date}</span>
                                  <span className="ml-auto text-plannera-ds/80">{Math.round(s.similarity * 100)}% Match</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </div>
                    
                    {msg.role === 'user' && (
                       <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center flex-shrink-0 mt-2">
                          <User className="w-5 h-5 text-slate-400" />
                       </div>
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-6 justify-start py-4"
            >
              <div className="w-10 h-10 rounded-xl bg-plannera-sop border border-white/5 flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
                <Sparkles className="w-5 h-5 text-plannera-orange" />
              </div>
              <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-6 py-4 backdrop-blur-md">
                <div className="flex gap-2">
                  <span className="w-2 h-2 bg-plannera-orange rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-2 h-2 bg-plannera-orange rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-2 h-2 bg-plannera-orange rounded-full animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </motion.div>
          )}
          <div ref={bottomRef} className="h-4" />
        </CardContent>

        {/* Action Bar / Input Area */}
        <div className="p-6 lg:p-10 border-t border-white/5 bg-black/40 relative z-20 backdrop-blur-xl">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-plannera-orange to-plannera-sop rounded-2xl blur opacity-10 group-focus-within:opacity-20 transition-opacity pointer-events-none" />
            
            <div className="relative flex items-end gap-2 bg-slate-900 border border-white/10 rounded-2xl p-2 transition-all focus-within:border-plannera-orange/50 shadow-2xl">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Consulte o conhecimento estratégico do portfólio..."
                rows={1}
                disabled={isLoading}
                className="flex-1 bg-transparent border-none text-white placeholder:text-slate-700 resize-none px-4 py-3 min-h-[56px] focus-visible:ring-0 focus-visible:ring-offset-0 font-bold tracking-tight text-base"
                style={{ height: 'auto', minHeight: '56px' }}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-plannera-orange hover:bg-plannera-orange/90 text-white h-12 w-12 rounded-xl flex-shrink-0 transition-all active:scale-95 shadow-[0_0_20px_rgba(247,148,30,0.4)]"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 opacity-50">
             <div className="flex items-center gap-1.5 ">
                <span className="text-[8px] font-bold uppercase text-slate-500 tracking-[0.2em]">Contexto: {selectedAccountId === 'all' ? 'Portfólio Global' : selectedAccount?.name}</span>
             </div>
             <p className="text-slate-600 text-[9px] font-bold uppercase tracking-widest hidden lg:block">
               Shift+Enter pular linha · Enter processar
             </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

function User(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
