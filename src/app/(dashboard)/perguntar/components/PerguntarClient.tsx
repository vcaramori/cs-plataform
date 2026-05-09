'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ScopeSelectorBar } from './ScopeSelectorBar'
import { EmptyState } from './EmptyState'
import { MessageItem } from './MessageItem'
import { InputConsole } from './InputConsole'

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
    <div className="flex flex-col h-full relative overflow-hidden bg-surface-background/30 rounded-2xl border border-border-divider/50 shadow-2xl">
      {/* Scope Selector Bar */}
      <ScopeSelectorBar
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        setSelectedAccountId={setSelectedAccountId}
        selectedAccount={selectedAccount}
      />

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto px-4 md:px-8 lg:px-12 py-10 space-y-10 scroll-smooth">
        <AnimatePresence mode="popLayout">
          {messages.length === 0 ? (
            <EmptyState setInput={setInput} exampleQuestions={exampleQuestions} />
          ) : (
            <div className="max-w-6xl mx-auto w-full space-y-12">
              {messages.map((msg, idx) => (
                <MessageItem key={idx} msg={msg} idx={idx} />
              ))}
            </div>
          )}
        </AnimatePresence>

        {isLoading && (
          <div className="max-w-6xl mx-auto w-full flex gap-4 md:gap-8 justify-start py-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-surface-card border border-border-divider flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse">
              <Sparkles className="w-5 h-5 md:w-6 md:h-6 text-plannera-orange" />
            </div>
            <div className="bg-surface-card border border-border-divider rounded-2xl rounded-tl-sm px-8 py-6 flex items-center gap-3">
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
      <InputConsole
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        handleKeyDown={handleKeyDown}
        isLoading={isLoading}
      />
    </div>
  )
}
