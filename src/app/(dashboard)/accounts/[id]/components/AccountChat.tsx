'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MessageSquareText, Send, Sparkles, X, Loader2, Bot } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import ReactMarkdown from 'react-markdown'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export function AccountChat({ accountId, accountName }: { accountId: string; accountName: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (open) scrollToBottom()
  }, [messages, open])

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = { role: 'user', content: input }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          context: { accountId, accountName },
          history: messages,
        }),
      })

      if (!response.ok) throw new Error('Falha ao obter resposta')
      const data = await response.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating Button triggers the Drawer */}
      <Button 
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] border-none z-40 transition-all hover:scale-110 group"
      >
        <MessageSquareText className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="fixed right-0 top-0 h-full w-full sm:max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl p-0 translate-x-0 animate-in slide-in-from-right duration-300 sm:rounded-none">
          <div className="flex flex-col h-full bg-slate-950">
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-white text-sm font-black uppercase tracking-tighter">Ask Cloud-IA</h3>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">{accountName}</p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setOpen(false)}
                className="text-slate-500 hover:text-white"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50 px-6">
                  <Sparkles className="w-12 h-12 text-indigo-500 animate-pulse" />
                  <div className="space-y-1">
                    <p className="text-white text-sm font-bold">Como posso ajudar hoje?</p>
                    <p className="text-xs text-slate-400 italic font-medium leading-relaxed">
                      Pergunte sobre contratos, tickets abertos ou insights de saúde deste cliente.
                    </p>
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                    m.role === 'user' 
                      ? 'bg-indigo-600 text-white font-medium' 
                      : 'bg-slate-900 border border-slate-800 text-slate-200'
                  }`}>
                    <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
                    <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50">
              <form onSubmit={handleSend} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask anything..."
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 h-10"
                />
                <Button 
                  type="submit" 
                  disabled={loading || !input.trim()}
                  className="bg-indigo-600 hover:bg-indigo-500 h-10 w-10 p-0"
                >
                  <Send className="w-4 h-4 text-white" />
                </Button>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
