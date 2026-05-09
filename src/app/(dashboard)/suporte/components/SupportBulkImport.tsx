'use client'

import { useState } from 'react'
import { Account } from '@/lib/supabase/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Upload, Loader2, AlertTriangle, CheckCircle2, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const csvExample = `account_name,title,description,status,priority
ACME Corp,Erro no Relatório,Erro ao processar PDF,open,high`

const textExample = `De: suporte@cliente.com
Assunto: Lentidão no Dashboard
Olá time, estamos percebendo lentidão ao carregar os dados de NPS desde ontem.`

interface SupportBulkImportProps {
  accounts: Pick<Account, 'id' | 'name'>[]
  onImported: () => void
}

export function SupportBulkImport({ accounts, onImported }: SupportBulkImportProps) {
  const [format, setFormat] = useState<'csv' | 'text' | 'pdf'>('csv')
  const [content, setContent] = useState('')
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [selectedAccountId, setSelectedAccountId] = useState('all')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null)

  const handleIngest = async () => {
    setIsSubmitting(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.append('format', format)
      formData.append('accountId', selectedAccountId)

      if (format === 'pdf' && pdfFile) {
        formData.append('file', pdfFile)
      } else {
        formData.append('content', content)
      }

      const res = await fetch('/api/support-tickets/ingest', {
        method: 'POST',
        body: formData
      })

      if (!res.ok) throw new Error(await res.text())

      const data = await res.json()
      setResult(data)
      toast.success(`${data.created} chamados criados!`)
      if (data.created > 0) {
        onImported()
      }
    } catch (err: any) {
      toast.error('Erro na ingestão: ' + err.message)
      setResult({ created: 0, errors: [err.message] })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card className="border-border-divider shadow-xl bg-surface-card">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="h2-section !text-lg !text-foreground">Portal de Ingestão Inteligente</h2>
                <p className="label-premium mt-1 opacity-60">Processamento de incidentes via Gemini Pro & RAG</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="flex bg-accent/30 p-1 rounded-xl border border-border/50 w-fit">
              {(['csv', 'text', 'pdf'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => { setFormat(f); setContent(''); setPdfFile(null) }}
                  className={cn(
                    "px-6 py-2 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all",
                    format === f
                      ? "bg-primary text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {f === 'csv' ? 'Dataset CSV' : f === 'text' ? 'Texto Livre' : 'Escaneamento PDF'}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              <Label className="label-premium ml-1">Atribuir ao LOGO (Opcional)</Label>
              <SearchableSelect
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
                className="h-11 rounded-xl bg-accent/30 border-border/50 shadow-inner"
                options={[
                  { label: 'AUTO-MAPEAR POR CONTEXTO IA', value: 'all' },
                  ...accounts.map(a => ({ label: a.name.toUpperCase(), value: a.id }))
                ]}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between ml-1">
                <Label className="label-premium">{format === 'pdf' ? 'Arquivo Digital' : 'Estrutura de Dados'}</Label>
                {format !== 'pdf' && (
                  <button
                    onClick={() => setContent(format === 'csv' ? csvExample : textExample)}
                    className="label-premium text-primary hover:opacity-80 transition-opacity"
                  >
                    Carregar Exemplo
                  </button>
                )}
              </div>

              {format === 'pdf' ? (
                <div className="relative group">
                  <Input
                    type="file"
                    accept="application/pdf"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPdfFile(e.target.files ? e.target.files[0] : null)}
                    className="bg-accent/30 border-border/50 text-foreground file:bg-primary file:text-primary-foreground file:border-none file:font-extrabold file:uppercase file:text-[10px] file:px-6 file:h-full file:mr-4 h-14 rounded-xl cursor-pointer shadow-inner pr-4"
                  />
                  <p className="label-premium mt-4 leading-relaxed opacity-50 px-2 italic font-medium normal-case tracking-tight">
                    O motor de IA analisará o layout, identificará conversas e sugerirá ações automáticas baseadas no histórico.
                  </p>
                </div>
              ) : (
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    format === 'csv'
                      ? 'logo, titulo, descricao, status...'
                      : 'Cole aqui logs de e-mail, transcrições ou textos extraídos...'
                  }
                  rows={12}
                  className="bg-accent/30 border-border/50 text-foreground placeholder:text-muted-foreground/30 font-mono text-sm rounded-2xl focus-visible:ring-primary shadow-inner p-5"
                />
              )}
            </div>

            <Button
              onClick={handleIngest}
              disabled={isSubmitting || (format === 'pdf' ? !pdfFile : !content.trim())}
              variant="premium"
              className="w-full h-14 rounded-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              {isSubmitting
                ? <><Loader2 className="w-5 h-5 animate-spin mr-3" />Processando Redes Neurais...</>
                : 'Ingerir e Treinar RAG'}
            </Button>

            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={cn(
                  "p-6 rounded-2xl border-2 flex flex-col gap-4 shadow-lg",
                  (result.created ?? 0) > 0 ? 'bg-emerald-500/5 border-emerald-500/10' : 'bg-destructive/5 border-destructive/10'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn("p-2 rounded-xl border", (result.created ?? 0) > 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-destructive/10 border-destructive/20')}>
                    {(result.created ?? 0) > 0
                      ? <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                      : <AlertTriangle className="w-6 h-6 text-destructive" />}
                  </div>
                  <span className="text-foreground text-lg font-extrabold tracking-tighter uppercase">
                    {result.created ?? 0} Incidentes Catalogados
                  </span>
                </div>
                {result.errors && result.errors.length > 0 && (
                  <div className="space-y-2 mt-2 border-t border-border/50 pt-4">
                    {result.errors.map((e: string, i: number) => (
                      <div key={i} className="flex gap-3 text-destructive text-[11px] font-extrabold uppercase tracking-tight leading-none">• {e}</div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Guide */}
      <div className="space-y-6">
        <Card className="border-border-divider shadow-lg bg-surface-card">
          <CardHeader className="p-8 pb-4">
            <h3 className="h2-section flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Protocolo IA
            </h3>
          </CardHeader>
          <CardContent className="p-8 space-y-8">
            <div className="space-y-6">
              {format === 'pdf' ? (
                <div className="space-y-6">
                  <p className="label-premium normal-case text-foreground opacity-80 leading-relaxed">Capacidades do Agente Gemini:</p>
                  <ul className="space-y-4">
                    {[
                      'Visão Computacional p/ OCR',
                      'Análise de Sentimento Recurrente',
                      'Mapeamento de Entidades CRM',
                      'Sugestão de Resolução p/ CS'
                    ].map(item => (
                      <li key={item} className="flex items-center gap-3 label-premium !text-foreground/60">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : format === 'csv' ? (
                <div className="space-y-6">
                  <p className="label-premium normal-case text-foreground opacity-80 leading-relaxed">Estrutura Requerida:</p>
                  <div className="bg-accent/40 p-4 rounded-xl border border-border/50 font-mono text-[10px] break-all opacity-70 shadow-inner">
                    account_name, title, desc, status, priority
                  </div>
                  <p className="label-premium !text-[9px] italic opacity-60">Encoding: UTF-8 / RFC 4180</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="label-premium normal-case text-foreground opacity-80 leading-relaxed">Gen-AI Pipeline:</p>
                  <ul className="space-y-4">
                    {[
                      'Deduplicação Inteligente',
                      'Identificação de Contas por Contexto',
                      'Criação de Thread Histórica',
                      'Priorização Automática (SLA)'
                    ].map(item => (
                      <li key={item} className="flex items-center gap-3 label-premium !text-foreground/60">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_8px_var(--primary)]" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
