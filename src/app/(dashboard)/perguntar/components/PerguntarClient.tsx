'use client'

import { useState, useRef, useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { ScopeSelectorBar, type RAGMode } from './ScopeSelectorBar'
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
  const [ragMode, setRagMode] = useState<RAGMode>('balanced')
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
          rag_mode: ragMode,
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

  function handleExport() {
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Conversa IA — ${selectedAccount?.name ?? 'Portfólio'}</title><style>body{font-family:sans-serif;max-width:800px;margin:40px auto;padding:0 20px;color:#111;}h1{font-size:18px;border-bottom:2px solid #eee;padding-bottom:8px;}.msg{margin:16px 0;padding:12px 16px;border-radius:8px;}.user{background:#f0f0f0;}.assistant{background:#fff;border:1px solid #e5e7eb;}.role{font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;}.user .role{color:#6b7280;}.assistant .role{color:#f7941e;}.sources{margin-top:8px;font-size:11px;color:#6b7280;}@media print{body{margin:20px;}}</style></head><body><h1>Conversa IA — ${selectedAccount?.name ?? 'Portfólio Completo'}</h1><p style="font-size:11px;color:#9ca3af;">Modo: ${ragMode} · ${new Date().toLocaleString('pt-BR')}</p>${messages.map(m => `<div class="msg ${m.role}"><div class="role">${m.role === 'user' ? 'Você' : 'IA Assistente'}</div><div>${m.content.replace(/\n/g, '<br/>')}</div>${m.sources?.length ? `<div class="sources">Fontes: ${m.sources.map(s => s.title).join(', ')}</div>` : ''}</div>`).join('')}</body></html>`
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.print()
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-full relative w-full">
      <div className="px-4 md:px-8 flex-none z-10 relative">
        <ScopeSelectorBar
          accounts={accounts}
          selectedAccountId={selectedAccountId}
          setSelectedAccountId={setSelectedAccountId}
          selectedAccount={selectedAccount}
          ragMode={ragMode}
          setRagMode={setRagMode}
          onExport={handleExport}
          hasMessages={messages.length > 0}
        />
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col px-4 md:px-8 py-4 scroll-smooth min-h-0 w-full relative">
        <AnimatePresence mode="popLayout">
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-4xl mx-auto w-full gap-8">
              <EmptyState setInput={setInput} exampleQuestions={exampleQuestions} />
              <div className="w-full">
                <InputConsole
                  input={input}
                  setInput={setInput}
                  handleSend={handleSend}
                  handleKeyDown={handleKeyDown}
                  isLoading={isLoading}
                  emptyMode={true}
                />
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto w-full space-y-6">
              {messages.map((msg, idx) => (
                <MessageItem key={idx} msg={msg} idx={idx} />
              ))}
            </div>
          )}
        </AnimatePresence>

        {isLoading && !isEmpty && (
          <div className="max-w-4xl mx-auto w-full flex gap-4 md:gap-8 justify-start py-4">
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
        {!isEmpty && <div ref={bottomRef} className="h-40 flex-shrink-0" />}
      </div>

      {/* Floating Input Console for Active State */}
      {!isEmpty && (
        <div className="absolute bottom-0 left-0 w-full z-20">
          <InputConsole
            input={input}
            setInput={setInput}
            handleSend={handleSend}
            handleKeyDown={handleKeyDown}
            isLoading={isLoading}
            emptyMode={false}
          />
        </div>
      )}
    </div>
  )
}
