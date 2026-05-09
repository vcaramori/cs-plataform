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
    <div className="px-6 pb-10 pt-4 z-30 bg-gradient-to-t from-surface-background via-surface-background/80 to-transparent">
      <div className="max-w-5xl mx-auto relative">
        {/* Glass Input Box */}
        <div className="relative group transition-all duration-500">
          <div className="absolute -inset-4 bg-gradient-to-r from-plannera-orange/10 via-plannera-sop/10 to-plannera-orange/10 rounded-2xl blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none" />
          
          <div className="relative flex items-end gap-3 bg-surface-card border border-border-divider rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.15)] focus-within:shadow-[0_20px_60px_rgba(var(--plannera-orange-rgb),0.1)] focus-within:border-plannera-orange/40 transition-all duration-300">
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
  )
}
