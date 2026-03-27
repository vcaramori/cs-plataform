'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { toast } from 'sonner'

const FormSchema = z.object({
  title: z.string().min(3, 'Título obrigatório'),
  type: z.enum(['meeting', 'qbr', 'onboarding', 'health-check', 'expansion', 'churn-risk', 'email']),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida'),
  raw_transcript: z.string().optional(),
})

type FormValues = z.infer<typeof FormSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  accountId: string
  contractId: string
}

const typeLabels = {
  meeting: 'Reunião', qbr: 'QBR', onboarding: 'Onboarding',
  'health-check': 'Health Check', expansion: 'Expansão',
  'churn-risk': 'Risco de Churn', email: 'Email',
}

export function TranscriptUploadModal({ open, onOpenChange, accountId, contractId }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<'form' | 'ingesting' | 'done'>('form')
  const [ingestResult, setIngestResult] = useState<{
    chunks: number; sentiment: number; alert: boolean
  } | null>(null)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      type: 'meeting',
      date: new Date().toISOString().slice(0, 10),
    },
  })

  const transcript = watch('raw_transcript')
  const wordCount = transcript ? transcript.trim().split(/\s+/).filter(Boolean).length : 0

  async function onSubmit(values: FormValues) {
    // 1. Cria a interaction
    const res = await fetch('/api/interactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        account_id: accountId,
        contract_id: contractId,
        type: values.type,
        title: values.title,
        date: values.date,
        raw_transcript: values.raw_transcript || null,
        source: values.raw_transcript ? 'readai' : 'manual',
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      toast.error(err.error ?? 'Erro ao criar interação')
      return
    }

    const interaction = await res.json()

    // 2. Se tem transcrição, dispara vectorização
    if (values.raw_transcript && values.raw_transcript.length > 50) {
      setStep('ingesting')

      const ingestRes = await fetch(`/api/interactions/${interaction.id}/ingest`, {
        method: 'POST',
      })

      if (ingestRes.ok) {
        const result = await ingestRes.json()
        setIngestResult({
          chunks: result.chunks_stored,
          sentiment: result.sentiment_score,
          alert: result.alert_triggered,
        })
        setStep('done')
      } else {
        // Interação criada mas vectorização falhou — não é bloqueante
        toast.warning('Interação salva, mas falha na vectorização da transcrição')
        finalize()
      }
    } else {
      toast.success('Interação registrada')
      finalize()
    }
  }

  function finalize() {
    reset()
    setStep('form')
    setIngestResult(null)
    onOpenChange(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!isSubmitting && step !== 'ingesting') onOpenChange(v) }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileText className="w-5 h-5 text-indigo-400" />
            Nova Interação
          </DialogTitle>
        </DialogHeader>

        {step === 'form' && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Título</Label>
                <Input
                  {...register('title')}
                  placeholder="Ex: QBR Q1 2026"
                  className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
                />
                {errors.title && <p className="text-red-400 text-xs">{errors.title.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Data</Label>
                <Input
                  type="date"
                  {...register('date')}
                  className="bg-slate-800 border-slate-700 text-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Tipo</Label>
              <Select
                defaultValue="meeting"
                onValueChange={(v) => setValue('type', v as FormValues['type'])}
              >
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {Object.entries(typeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value} className="text-white hover:bg-slate-700">
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 text-sm">
                  Transcrição <span className="text-slate-500">(opcional — cole o texto do Read.ai)</span>
                </Label>
                {wordCount > 0 && (
                  <span className="text-slate-500 text-xs">{wordCount.toLocaleString()} palavras</span>
                )}
              </div>
              <Textarea
                {...register('raw_transcript')}
                placeholder="Cole aqui a transcrição da reunião..."
                rows={8}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 font-mono text-xs resize-none"
              />
              {wordCount > 50 && (
                <p className="text-indigo-400 text-xs flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400" />
                  A transcrição será vetorizada e analisada pela IA
                </p>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="flex-1 text-slate-400 hover:text-white border border-slate-700"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Salvando...</>
                ) : (
                  'Registrar Interação'
                )}
              </Button>
            </div>
          </form>
        )}

        {step === 'ingesting' && (
          <div className="py-10 flex flex-col items-center gap-4 text-center">
            <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
            <div>
              <p className="text-white font-medium">Processando transcrição</p>
              <p className="text-slate-400 text-sm mt-1">
                Gerando embeddings e analisando sentimento...
              </p>
            </div>
          </div>
        )}

        {step === 'done' && ingestResult && (
          <div className="py-6 flex flex-col items-center gap-5 text-center">
            {ingestResult.alert ? (
              <AlertCircle className="w-12 h-12 text-orange-400" />
            ) : (
              <CheckCircle2 className="w-12 h-12 text-emerald-400" />
            )}

            <div>
              <p className="text-white font-medium text-lg">Interação processada</p>
              <p className="text-slate-400 text-sm mt-1">Transcrição vetorizada com sucesso</p>
            </div>

            <div className="flex gap-3 flex-wrap justify-center">
              <Badge className="bg-indigo-500/20 text-indigo-300">
                {ingestResult.chunks} chunks armazenados
              </Badge>
              <Badge className={
                ingestResult.sentiment >= 0.2 ? 'bg-emerald-500/20 text-emerald-300' :
                ingestResult.sentiment <= -0.2 ? 'bg-red-500/20 text-red-300' :
                'bg-yellow-500/20 text-yellow-300'
              }>
                Sentimento: {ingestResult.sentiment >= 0.2 ? 'Positivo' :
                  ingestResult.sentiment <= -0.2 ? 'Negativo' : 'Neutro'}
                {' '}({ingestResult.sentiment.toFixed(2)})
              </Badge>
              {ingestResult.alert && (
                <Badge className="bg-orange-500/20 text-orange-300">
                  Alerta de sentimento ativado
                </Badge>
              )}
            </div>

            <Button
              onClick={finalize}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-8"
            >
              Concluir
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
