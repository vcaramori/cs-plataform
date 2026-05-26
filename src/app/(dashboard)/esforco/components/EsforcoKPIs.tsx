'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Textarea } from '@/components/ui/textarea'
import { Zap, ChevronRight, Loader2, Sparkles } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { AttachmentsUploader } from '@/components/shared/AttachmentsUploader'

interface EsforcoKPIsProps {
  selectedAccountId: string
  onAccountChange: (id: string) => void
  accounts: any[]
  text: string
  onTextChange: (text: string) => void
  fileUrls: string[]
  onFileUrlsChange: (urls: string[]) => void
  onSubmit: () => void
  isSubmitting: boolean
}

export function EsforcoKPIs({
  selectedAccountId,
  onAccountChange,
  accounts,
  text,
  onTextChange,
  fileUrls,
  onFileUrlsChange,
  onSubmit,
  isSubmitting
}: EsforcoKPIsProps) {
  return (
    <Card variant="glass" className="border-border-divider shadow-2xl relative overflow-hidden group rounded-2xl bg-surface-card/80 backdrop-blur-xl">
      <div className="absolute inset-0 bg-gradient-to-br from-plannera-primary/[0.05] to-transparent pointer-events-none" />

      <CardHeader className="pb-4 pt-6 px-6">
        <CardTitle className="text-lg font-black uppercase tracking-tighter text-content-primary flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-plannera-primary/10 border border-plannera-primary/20 group-hover:scale-105 transition-transform shadow-lg shadow-plannera-primary/10">
            <Sparkles className="w-5 h-5 text-plannera-primary" />
          </div>
          Inteligência de Esforço
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-6 px-6 pb-6 relative z-10">
        <div className="space-y-3">
          <SearchableSelect
            value={selectedAccountId}
            onValueChange={onAccountChange}
            className="h-10 rounded-xl bg-surface-background/50 border-border-divider shadow-inner text-xs font-bold uppercase tracking-tight"
            options={[
              {
                label: 'IDENTIFICAR POR I.A (RECOMENDADO)',
                value: 'all',
                className: "bg-surface-card border-border-divider text-plannera-primary font-black"
              },
              ...accounts.map((a) => ({ label: a.name.toUpperCase(), value: a.id }))
            ]}
          />
        </div>

        <div className="space-y-3 relative">
          <div className="flex items-center justify-between mb-1 ml-1 group/label">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-plannera-orange" />
              <Label className="text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary">Relato de Atividade e Anexos</Label>
            </div>
          </div>

          <div className="relative group/input">
            <div className="absolute -inset-1 bg-gradient-to-r from-plannera-primary/20 to-plannera-orange/20 rounded-xl blur opacity-0 group-focus-within/input:opacity-100 transition-opacity pointer-events-none" />
            <Textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Descreva o que foi feito ou cole a transcrição da reunião..."
              rows={8}
              className="relative bg-surface-background/50 border-border-divider text-content-primary placeholder:text-content-secondary/40 font-bold tracking-tight text-sm p-4 rounded-xl focus-visible:ring-plannera-primary/20 resize-none transition-all shadow-inner border"
            />
          </div>
          
          <div className="pt-2">
            <AttachmentsUploader 
              onUploadComplete={(urls) => onFileUrlsChange([...fileUrls, ...urls])} 
            />
          </div>
        </div>

        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !text.trim()}
          className="w-full h-12 bg-plannera-orange hover:bg-plannera-orange/90 text-white shadow-lg shadow-plannera-orange/20 group active:scale-[0.98] rounded-xl font-black transition-all"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Processando Inteligência...</>
          ) : (
            <span className="flex items-center gap-3 text-[10px] tracking-[0.2em]">
              REGISTRAR PRODUÇÃO DE CS
              <ChevronRight className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition-transform" />
            </span>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
