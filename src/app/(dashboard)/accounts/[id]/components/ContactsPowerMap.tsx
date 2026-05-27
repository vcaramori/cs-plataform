'use client'

import { useState } from 'react'
import type { ElementType } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Crown, ShieldAlert, User, ShieldCheck, UserPlus, Mail, Phone, Link2, ExternalLink, UserX, AlertTriangle } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AddContactModal } from './AddContactModal'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

interface Contact {
  id: string
  name: string
  role: string
  seniority: string
  influence_level: 'Champion' | 'Neutral' | 'Detractor' | 'Blocker' | string
  decision_maker: boolean
  departed_at?: string | null
  departure_reason?: string | null
  email?: string | null
  phone?: string | null
  linkedin_url?: string | null
  photo_url?: string | null
}

/** Extrai o username do LinkedIn e constrói a URL do avatar via unavatar.io */
function linkedinPhoto(url?: string | null): string | undefined {
  if (!url) return undefined
  const match = url.match(/linkedin\.com\/in\/([^/?#]+)/i)
  return match ? `https://unavatar.io/linkedin/${match[1]}` : undefined
}

const influenceConfig: Record<string, { label: string; color: string; bg: string; ring: string; icon: any }> = {
  Champion:  { label: 'Campeão',    color: 'text-plannera-ds',      bg: 'bg-plannera-ds/10',      ring: 'ring-plannera-ds/20',      icon: Crown },
  Detractor: { label: 'Detrator',   color: 'text-plannera-demand',  bg: 'bg-plannera-demand/10',  ring: 'ring-plannera-demand/20',  icon: ShieldAlert },
  Blocker:   { label: 'Bloqueador', color: 'text-plannera-orange',  bg: 'bg-plannera-orange/10',  ring: 'ring-plannera-orange/20',  icon: ShieldAlert },
  Neutral:   { label: 'Neutro',     color: 'text-content-secondary', bg: 'bg-surface-background', ring: 'ring-border-divider',      icon: User },
}

// Papéis que geram RISCO ALTO ao se desligarem
const HIGH_RISK_ROLES = ['champion', 'campeão']
const HIGH_RISK_SENIORITIES = ['c-level', 'vp', 'director']

function isDepartureHighRisk(contact: Contact): boolean {
  const influence = contact.influence_level?.toLowerCase() ?? ''
  const seniority = contact.seniority?.toLowerCase() ?? ''
  return (
    HIGH_RISK_ROLES.includes(influence) ||
    HIGH_RISK_SENIORITIES.includes(seniority) ||
    contact.decision_maker
  )
}

function DepartureDialog({
  contact,
  open,
  onClose,
  onSuccess,
}: {
  contact: Contact
  open: boolean
  onClose: () => void
  onSuccess: (id: string, reason: string) => void
}) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const isHighRisk = isDepartureHighRisk(contact)

  async function handleConfirm() {
    setLoading(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departed_at: new Date().toISOString(),
          departure_reason: reason || null,
        }),
      })
      if (!res.ok) throw new Error('Erro ao registrar desligamento')
      toast.success('Desligamento registrado')
      onSuccess(contact.id, reason)
      onClose()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <UserX className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <DialogTitle className="text-base font-black uppercase tracking-tight text-foreground">
                Registrar Desligamento
              </DialogTitle>
              <DialogDescription className="text-xs text-content-secondary mt-0.5">
                {contact.name} · {contact.role}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {isHighRisk && (
            <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-xs font-bold text-red-500 uppercase tracking-wide leading-relaxed">
                Risco Alto — este stakeholder é {contact.influence_level === 'Champion' ? 'Campeão' : 'decisor/gestor sênior'}. O desligamento representa um risco crítico para a conta.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-[10px] font-black text-content-secondary uppercase tracking-widest">
              Motivo do desligamento <span className="opacity-50 normal-case font-medium">(opcional)</span>
            </Label>
            <Textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: saiu da empresa, mudou de cargo, deixou o projeto..."
              className="rounded-xl resize-none h-20 text-sm"
            />
          </div>
        </div>

        <div className="p-4 border-t border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50 flex gap-3 justify-end">
          <Button variant="ghost" onClick={onClose} className="rounded-xl font-bold text-content-secondary">
            Cancelar
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={loading}
            className="rounded-xl bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest text-[10px] px-5 gap-2"
          >
            <UserX className="w-3.5 h-3.5" />
            Confirmar Desligamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function ContactsPowerMap({ contacts: initialContacts, accountId }: { contacts: Contact[]; accountId: string }) {
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [addOpen, setAddOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [departureTarget, setDepartureTarget] = useState<Contact | null>(null)

  const visible = expanded ? contacts : contacts.slice(0, 4)

  function handleDepartureSuccess(id: string, reason: string) {
    setContacts(prev => prev.map(c =>
      c.id === id ? { ...c, departed_at: new Date().toISOString(), departure_reason: reason } : c
    ))
  }

  return (
    <>
      <AddContactModal open={addOpen} onClose={() => setAddOpen(false)} accountId={accountId} />
      {departureTarget && (
        <DepartureDialog
          contact={departureTarget}
          open={!!departureTarget}
          onClose={() => setDepartureTarget(null)}
          onSuccess={handleDepartureSuccess}
        />
      )}

      <div className="space-y-3">
        {contacts.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-8 rounded-2xl border border-dashed border-border-divider text-center"
          >
            <User className="w-8 h-8 text-content-secondary mx-auto mb-3" />
            <p className="text-content-secondary text-xs font-bold uppercase tracking-wide leading-none mb-4">
              Nenhum stakeholder mapeado
            </p>
            <button
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-plannera-orange/10 border border-plannera-orange/20 text-plannera-orange text-[10px] font-bold uppercase tracking-wide hover:bg-plannera-orange/20 transition-all"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Adicionar primeiro stakeholder
            </button>
          </motion.div>
        ) : (
          <>
            <AnimatePresence mode="popLayout">
              {visible.map((c, idx) => {
                const config = influenceConfig[c.influence_level] ?? influenceConfig.Neutral
                const InfluenceIcon = (config?.icon ?? User) as ElementType
                const initials = c.name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2)
                const photoSrc = c.photo_url || linkedinPhoto(c.linkedin_url)
                const isDeparted = !!c.departed_at
                const isHighRisk = isDeparted && isDepartureHighRisk(c)

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className={cn(
                      'group transition-all duration-200 overflow-hidden',
                      isDeparted
                        ? isHighRisk
                          ? 'border-red-500/30 bg-red-500/5'
                          : 'opacity-60 grayscale'
                        : 'hover:bg-surface-background'
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <Avatar className={cn(
                              'w-11 h-11 border-2 transition-all shadow-lg',
                              isDeparted ? 'border-red-500/30' : 'border-border-divider group-hover:border-plannera-sop/30'
                            )}>
                              <AvatarImage src={photoSrc} alt={c.name} />
                              <AvatarFallback className="bg-surface-card text-plannera-sop font-bold text-sm">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {c.decision_maker && !isDeparted && (
                              <div
                                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-plannera-orange border-2 border-surface-background flex items-center justify-center shadow"
                                title="Tomador de decisão"
                              >
                                <ShieldCheck className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                            {isDeparted && (
                              <div
                                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-red-500 border-2 border-surface-background flex items-center justify-center shadow"
                                title="Stakeholder desligado"
                              >
                                <UserX className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Dados */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className={cn(
                                'text-content-primary text-sm font-bold uppercase tracking-tight truncate transition-colors',
                                isDeparted ? 'line-through text-content-secondary' : 'group-hover:text-plannera-orange'
                              )}>
                                {c.name}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isDeparted ? (
                                  <span className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset',
                                    isHighRisk
                                      ? 'bg-red-500/10 text-red-500 ring-red-500/30'
                                      : 'bg-surface-card text-content-secondary ring-border-divider'
                                  )}>
                                    <UserX className="w-2.5 h-2.5" />
                                    {isHighRisk ? 'Risco Alto' : 'Desligado'}
                                  </span>
                                ) : (
                                  <span className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset',
                                    config.bg, config.color, config.ring
                                  )}>
                                    <InfluenceIcon className="w-2.5 h-2.5" />
                                    {config.label}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-content-secondary text-[10px] font-bold uppercase tracking-wide truncate">
                              {c.role}
                              {c.seniority && <span className="opacity-70"> · {c.seniority}</span>}
                            </p>

                            {isDeparted && c.departure_reason && (
                              <p className="text-[10px] text-content-secondary italic">
                                {c.departure_reason}
                              </p>
                            )}

                            {!isDeparted && (c.email || c.phone || c.linkedin_url) && (
                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                {c.email && (
                                  <a
                                    href={`mailto:${c.email}`}
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[9px] font-bold text-content-secondary hover:text-plannera-ds transition-colors uppercase tracking-wide"
                                    title={c.email}
                                  >
                                    <Mail className="w-3 h-3" />
                                    <span className="max-w-[90px] truncate">{c.email}</span>
                                  </a>
                                )}
                                {c.phone && (
                                  <a
                                    href={`tel:${c.phone}`}
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[9px] font-bold text-content-secondary hover:text-plannera-ds transition-colors uppercase tracking-wide"
                                  >
                                    <Phone className="w-3 h-3" />
                                    <span>{c.phone}</span>
                                  </a>
                                )}
                                {c.linkedin_url && (
                                  <a
                                    href={c.linkedin_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={e => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 text-[9px] font-bold text-content-secondary hover:text-plannera-sop transition-colors uppercase tracking-wide"
                                  >
                                    <Link2 className="w-3 h-3" />
                                    LinkedIn
                                    <ExternalLink className="w-2.5 h-2.5" />
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Botão desligar — só para ativos */}
                            {!isDeparted && (
                              <button
                                onClick={() => setDepartureTarget(c)}
                                className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-bold text-content-secondary hover:text-red-500 transition-colors uppercase tracking-wide opacity-0 group-hover:opacity-100"
                              >
                                <UserX className="w-3 h-3" />
                                Registrar desligamento
                              </button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            <div className="flex items-center gap-2 pt-1">
              {contacts.length > 4 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex-1 py-2.5 rounded-xl border border-border-divider bg-surface-background hover:bg-surface-card text-content-secondary hover:text-content-primary transition-all text-[10px] font-bold uppercase tracking-wide"
                >
                  {expanded ? 'Recolher' : `Ver mais ${contacts.length - 4} stakeholders`}
                </button>
              )}
              <button
                onClick={() => setAddOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-plannera-orange/10 border border-plannera-orange/20 text-plannera-orange hover:bg-plannera-orange/20 transition-all text-[10px] font-bold uppercase tracking-wide whitespace-nowrap"
              >
                <UserPlus className="w-3.5 h-3.5" />
                Adicionar
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )
}
