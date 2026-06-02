'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Send } from 'lucide-react'

interface InputConsoleProps {
  input: string
  setInput: (input: string) => void
  handleSend: () => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  isLoading: boolean
}

export function InputConsole({
  input,
  setInput,
  handleSend,
  handleKeyDown,
  isLoading,
}: InputConsoleProps) {
  return (
    <div className="px-4 pb-3 pt-6 z-30 bg-gradient-to-t from-surface-background via-surface-background to-transparent">
      <div className="max-w-4xl mx-auto relative">
        <div className="relative group transition-all duration-500">
          <div className="absolute -inset-3 bg-gradient-to-r from-plannera-orange/10 via-plannera-sop/10 to-plannera-orange/10 rounded-2xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />

          <div className="relative flex items-end gap-2 bg-surface-card border border-border-divider rounded-2xl p-3 shadow-[0_10px_30px_rgba(0,0,0,0.1)] focus-within:shadow-[0_10px_40px_rgba(var(--plannera-orange-rgb),0.08)] focus-within:border-plannera-orange/40 transition-all duration-300">
            <div className="flex-1 flex flex-col gap-1 min-w-0">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Solicite uma análise estratégica ou pergunte sobre o portfólio..."
                rows={3}
                disabled={isLoading}
                className="w-full bg-transparent border-none text-content-primary placeholder:text-content-secondary/30 resize-none px-3 py-1 min-h-[64px] focus-visible:ring-0 focus-visible:ring-offset-0 font-normal tracking-tight text-sm"
                style={{ height: 'auto', minHeight: '64px' }}
              />
            </div>
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-plannera-orange hover:bg-plannera-orange/90 text-white h-10 w-10 rounded-xl flex-shrink-0 transition-all active:scale-95 shadow-md shadow-plannera-orange/20 flex items-center justify-center group/btn"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between px-3 mt-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 border border-success-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[8px] font-black text-success uppercase tracking-widest">IA Conectada</span>
          </div>
          <p className="text-content-secondary text-[8px] font-black uppercase tracking-[0.2em] opacity-50">
            ENTER ENVIAR · SHIFT + ENTER QUEBRA DE LINHA
          </p>
        </div>
      </div>
    </div>
  )
}
