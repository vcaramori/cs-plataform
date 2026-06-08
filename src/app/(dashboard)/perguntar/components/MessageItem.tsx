'use client'

import { motion } from 'framer-motion'
import { Sparkles, User, FileText, TicketCheck, Zap, Rocket, Handshake, Star } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

type SourceType = 'interaction' | 'support_ticket' | 'nps_response' | 'onboarding' | 'negotiation'

type Source = {
  type: SourceType
  source_id: string
  account_name: string
  title: string
  date: string
  excerpt: string
  similarity: number
}

const SOURCE_META: Record<SourceType, { label: string; Icon: typeof FileText }> = {
  interaction: { label: 'Interação', Icon: FileText },
  support_ticket: { label: 'Chamado', Icon: TicketCheck },
  nps_response: { label: 'NPS', Icon: Star },
  onboarding: { label: 'Onboarding', Icon: Rocket },
  negotiation: { label: 'Negociação', Icon: Handshake },
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: Source[]
  error?: boolean
}

interface MessageItemProps {
  msg: Message
  idx: number
}

export function MessageItem({ msg, idx }: MessageItemProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex gap-2",
        msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div className={cn(
        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm border mt-0.5",
        msg.role === 'assistant'
          ? "bg-surface-card border-border-divider"
          : "bg-plannera-orange border-plannera-orange shadow-plannera-orange/20"
      )}>
        {msg.role === 'assistant' ? (
          <Sparkles className="w-3.5 h-3.5 text-plannera-orange" />
        ) : (
          <User className="w-3.5 h-3.5 text-white" />
        )}
      </div>

      {/* Content Container */}
      <div className={cn(
        "flex flex-col gap-2 min-w-0 flex-1",
        msg.role === 'user' ? 'items-end' : 'items-start'
      )}>
        <div className={cn(
          "rounded-xl px-3 py-2.5 text-xs leading-normal border transition-all shadow-sm",
          msg.role === 'user'
            ? 'bg-plannera-primary text-white border-plannera-primary rounded-tr-sm font-medium'
            : msg.error
              ? 'bg-red-500/5 border-red-500/20 text-red-500 rounded-tl-sm'
              : 'bg-surface-card border-border-divider text-content-primary rounded-tl-sm'
        )}>
          {msg.role === 'assistant' ? (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-heading prose-headings:font-bold prose-headings:text-content-primary prose-strong:text-content-primary prose-strong:font-semibold prose-p:text-content-primary/90 prose-p:my-1 prose-li:text-content-primary/80 prose-li:my-0 prose-ul:my-1 prose-ol:my-1 prose-headings:mb-1 prose-headings:mt-2">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
          ) : (
            <span className="font-medium tracking-tight">{msg.content}</span>
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
              {msg.sources.map((s, si) => {
                const meta = SOURCE_META[s.type] ?? SOURCE_META.support_ticket
                const Icon = meta.Icon
                return (
                <div
                  key={si}
                  className="group/src flex flex-col gap-2 bg-surface-card border border-border-divider/50 rounded-2xl p-4 transition-all shadow-sm hover:shadow-md border-l-2 hover:border-l-plannera-orange"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="text-[9px] font-black uppercase tracking-tight text-content-secondary truncate">{meta.label}</span>
                    </div>
                    <span className="text-[9px] font-bold text-indigo-500 px-1.5 py-0.5 bg-indigo-500/5 rounded-md">{Math.round(s.similarity * 100)}% Match</span>
                  </div>
                  <p className="text-content-primary text-[11px] font-black uppercase tracking-tight leading-tight line-clamp-1 group-hover/src:text-plannera-orange transition-colors">{s.title}</p>
                  <p className="text-content-secondary text-[10px] font-bold uppercase tracking-widest opacity-60 truncate">{s.account_name}</p>
                </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  )
}
