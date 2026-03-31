'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Sparkles, Loader2, FileText, TicketCheck, Send, Globe } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

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
  'Qual o maior problema técnico desta conta?',
  'Qual foi o sentimento geral nas últimas reuniões?',
  'Quais contas têm tickets críticos em aberto?',
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
    <div className="flex flex-col h-[calc(100vh-200px)] gap-4">
      {/* Seletor de escopo */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 text-sm">Escopo:</span>
        </div>
        <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
          <SelectTrigger className="bg-slate-800 border-slate-700 text-white w-64">
            <SelectValue placeholder="Todo o portfólio" />
          </SelectTrigger>
          <SelectContent className="bg-slate-800 border-slate-700 max-h-60">
            <SelectItem value="all" className="text-white hover:bg-slate-700">
              <span className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-indigo-400" /> Todo o portfólio
              </span>
            </SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id} className="text-white hover:bg-slate-700">
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedAccount && (
          <Badge className="bg-indigo-500/20 text-indigo-300">
            Filtrando: {selectedAccount.name}
          </Badge>
        )}
      </div>

      {/* Chat area */}
      <Card className="bg-slate-900 border-slate-800 flex-1 overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-6">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
              <div className="w-14 h-14 rounded-2xl bg-indigo-900/40 border border-indigo-700/40 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-indigo-400" />
              </div>
              <div className="text-center">
                <p className="text-white font-medium">Pergunte sobre suas contas</p>
                <p className="text-slate-500 text-sm mt-1">
                  A IA busca nas transcrições e tickets para responder
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {exampleQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs text-slate-400 hover:text-indigo-300 bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors text-left"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                    </div>
                  )}

                  <div className={`max-w-2xl ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-indigo-600 text-white rounded-tr-sm'
                        : msg.error
                          ? 'bg-red-900/30 border border-red-800 text-red-300 rounded-tl-sm'
                          : 'bg-slate-800 text-slate-200 rounded-tl-sm'
                    }`}>
                      {msg.role === 'assistant' ? (
                        <div className="prose prose-invert prose-sm max-w-none">
                          <ReactMarkdown>{msg.content}</ReactMarkdown>
                        </div>
                      ) : (
                        msg.content
                      )}
                    </div>

                    {/* Fontes */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="space-y-1.5 w-full">
                        <p className="text-slate-500 text-xs px-1">Fontes consultadas:</p>
                        {msg.sources.slice(0, 4).map((s, si) => (
                          <div key={si} className="flex items-start gap-2 bg-slate-800/60 rounded-lg px-3 py-2">
                            {s.type === 'interaction'
                              ? <FileText className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                              : <TicketCheck className="w-3.5 h-3.5 text-orange-400 mt-0.5 flex-shrink-0" />}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-slate-300 text-xs font-medium">{s.title}</span>
                                <span className="text-slate-500 text-xs">{s.account_name}</span>
                                <span className="text-slate-600 text-xs">{s.date}</span>
                                <Badge className="text-xs px-1 py-0 bg-slate-700/60 text-slate-400">
                                  {Math.round(s.similarity * 100)}% similar
                                </Badge>
                              </div>
                              <p className="text-slate-500 text-xs mt-0.5 truncate">{s.excerpt}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-indigo-900/50 border border-indigo-700/50 flex items-center justify-center flex-shrink-0">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  </div>
                  <div className="bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </CardContent>

        {/* Input */}
        <div className="border-t border-slate-800 p-4">
          <div className="flex gap-3 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Digite sua pergunta... (Enter para enviar)"
              rows={2}
              disabled={isLoading}
              className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white h-[72px] px-4 flex-shrink-0"
            >
              {isLoading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Send className="w-4 h-4" />}
            </Button>
          </div>
          <p className="text-slate-600 text-xs mt-2 text-center">
            Shift+Enter para nova linha · Enter para enviar
          </p>
        </div>
      </Card>
    </div>
  )
}
