'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Globe, CheckCircle2, XCircle, Loader2, Mail, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PortalInviteDialogProps {
  open: boolean
  onClose: () => void
  contact: {
    id: string
    name: string
    role: string
    email?: string | null
  }
  accountId: string
  existingInvite?: {
    id: string
    status: string
    invited_at: string
  } | null
  onSuccess: (invite: any) => void
}

export function PortalInviteDialog({
  open, onClose, contact, accountId, existingInvite, onSuccess
}: PortalInviteDialogProps) {
  const [loading, setLoading] = useState(false)
  const [rejectNotes, setRejectNotes] = useState('')
  const [view, setView] = useState<'invite' | 'approve'>('invite')
  
  const [copyingLink, setCopyingLink] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generatedLink, setGeneratedLink] = useState('')

  const isPending = existingInvite?.status === 'pending'

  async function handleInvite() {
    if (!contact.email) {
      toast.error('Este stakeholder não tem e-mail cadastrado')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/portal/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          contact_id: contact.id,
          email: contact.email,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao enviar convite')
      toast.success(`Convite enviado para ${contact.email}`)
      onSuccess(data)
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(action: 'approved' | 'rejected') {
    if (!existingInvite) return
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/invites/${existingInvite.id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, notes: rejectNotes || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao processar convite')
      
      toast.success(action === 'approved' ? 'Acesso aprovado com sucesso!' : 'Convite rejeitado.')
      onSuccess({ ...existingInvite, status: action })
      
      // Se aprovado, mantém aberto para que o usuário possa copiar o link manual
      if (action !== 'approved') {
        onClose()
      }
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopyManualLink() {
    if (!existingInvite) return
    setCopyingLink(true)
    try {
      const res = await fetch(`/api/portal/invites/${existingInvite.id}/link`, {
        method: 'POST',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar link')
      
      setGeneratedLink(data.link)
      await navigator.clipboard.writeText(data.link)
      setCopied(true)
      toast.success('Link de acesso copiado para a área de transferência!')
      setTimeout(() => setCopied(false), 3000)
    } catch (e: any) {
      toast.error(e.message ?? 'Não foi possível gerar/copiar o link')
    } finally {
      setCopyingLink(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-border-divider p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border-divider bg-surface-background dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-plannera-ds/10 border border-plannera-ds/20 flex items-center justify-center">
              <Globe className="w-5 h-5 text-plannera-ds" />
            </div>
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-tight text-foreground">
                Portal do Cliente
              </DialogTitle>
              <DialogDescription className="text-xs text-content-secondary mt-0.5">
                {contact.name} · {contact.role}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {/* Sem e-mail */}
          {!contact.email && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <Mail className="w-4 h-4 text-amber-500 shrink-0" />
              <p className="text-xs font-bold text-amber-600">
                Este stakeholder não tem e-mail cadastrado. Adicione o e-mail antes de convidar.
              </p>
            </div>
          )}

          {/* Convite pendente — aprovação */}
          {isPending && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-plannera-ds/5 border border-plannera-ds/20">
                <p className="text-xs font-bold text-plannera-ds uppercase tracking-wide mb-1">Aprovação Pendente</p>
                <p className="text-sm text-content-secondary">
                  <strong>{contact.name}</strong> solicitou acesso ao portal em{' '}
                  {existingInvite?.invited_at
                    ? new Date(existingInvite.invited_at).toLocaleDateString('pt-BR')
                    : '—'}.
                </p>
                <p className="text-xs text-content-secondary mt-1">E-mail: <strong>{contact.email}</strong></p>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">
                  Motivo da rejeição <span className="opacity-50 normal-case font-medium">(opcional)</span>
                </Label>
                <Textarea
                  value={rejectNotes}
                  onChange={e => setRejectNotes(e.target.value)}
                  placeholder="Motivo para informar ao cliente..."
                  className="rounded-xl resize-none h-20 text-sm"
                />
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={() => handleApprove('rejected')}
                  disabled={loading}
                  variant="outline"
                  className="flex-1 rounded-xl border-red-500/30 text-red-500 hover:bg-red-500/5 font-black uppercase tracking-widest text-[10px] gap-2"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />}
                  Rejeitar
                </Button>
                <Button
                  onClick={() => handleApprove('approved')}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-plannera-ds hover:bg-plannera-ds/90 text-white font-black uppercase tracking-widest text-[10px] gap-2"
                >
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Aprovar Acesso
                </Button>
              </div>
            </div>
          )}

          {/* Sem convite — enviar convite */}
          {!existingInvite && contact.email && (
            <div className="space-y-4">
              <p className="text-sm text-content-secondary">
                Envie um convite de acesso ao portal para{' '}
                <strong className="text-foreground">{contact.name}</strong>.
                Ele receberá um e-mail com instruções para criar sua senha.
              </p>
              <div className="p-3 rounded-xl bg-surface-background border border-border-divider">
                <p className="text-[10px] font-black text-content-secondary uppercase tracking-widest">E-mail do convite</p>
                <p className="text-sm font-bold text-foreground mt-0.5">{contact.email}</p>
              </div>
              <Button
                onClick={handleInvite}
                disabled={loading}
                className="w-full rounded-xl bg-plannera-ds hover:bg-plannera-ds/90 text-white font-black uppercase tracking-widest text-xs gap-2 h-11"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                Enviar Convite de Acesso
              </Button>
            </div>
          )}

          {/* Já aprovado */}
          {existingInvite?.status === 'approved' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-emerald-600">Acesso ativo</p>
                  <p className="text-xs text-content-secondary mt-0.5">
                    <strong>{contact.name}</strong> já está com o acesso aprovado no portal.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border-divider bg-surface-background/50 space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-plannera-orange/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Globe className="w-4 h-4 text-plannera-orange" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wide">Link de Primeiro Acesso</h4>
                    <p className="text-[11px] text-content-secondary mt-0.5 leading-relaxed">
                      Caso o e-mail de convite tenha sido retido por filtros de spam, você pode copiar o link de ativação manual e enviá-lo diretamente ao stakeholder.
                    </p>
                  </div>
                </div>

                {generatedLink && (
                  <div className="space-y-1.5 pt-1.5">
                    <Label className="text-[9px] font-black uppercase tracking-widest text-content-secondary">
                      Link gerado
                    </Label>
                    <textarea
                      readOnly
                      value={generatedLink}
                      onClick={e => (e.target as any).select()}
                      className="w-full text-xs font-mono p-2.5 rounded-lg border border-border-divider bg-white dark:bg-slate-900 resize-none h-16 text-content-secondary focus:outline-none"
                    />
                  </div>
                )}

                <Button
                  onClick={handleCopyManualLink}
                  disabled={copyingLink}
                  className="w-full rounded-xl bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-widest text-[10px] gap-2 h-10 shadow-sm"
                >
                  {copyingLink ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : copied ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  {copied ? 'Copiado para área de transferência!' : 'Gerar e Copiar Link Manual'}
                </Button>
              </div>
            </div>
          )}

          {/* Rejeitado */}
          {existingInvite?.status === 'rejected' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
                <XCircle className="w-5 h-5 text-red-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold text-red-500">Convite rejeitado</p>
                  <p className="text-xs text-content-secondary mt-0.5">Você pode reenviar um novo convite.</p>
                </div>
              </div>
              {contact.email && (
                <Button
                  onClick={handleInvite}
                  disabled={loading}
                  className="w-full rounded-xl bg-plannera-ds hover:bg-plannera-ds/90 text-white font-black uppercase tracking-widest text-xs gap-2 h-11"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
                  Reenviar Convite
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Footer cancel */}
        <div className="px-6 pb-6">
          <Button variant="ghost" onClick={onClose} className="w-full rounded-xl font-bold text-content-secondary">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
