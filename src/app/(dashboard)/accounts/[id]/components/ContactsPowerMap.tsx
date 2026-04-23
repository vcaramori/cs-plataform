'use client'

import { useState } from 'react'
import type { ElementType } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Crown, ShieldAlert, User, ShieldCheck, UserPlus, Mail, Phone, Link2, ExternalLink } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { AddContactModal } from './AddContactModal'

interface Contact {
  id: string
  name: string
  role: string
  seniority: string
  influence_level: 'Champion' | 'Neutral' | 'Detractor' | 'Blocker' | string
  decision_maker: boolean
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

export function ContactsPowerMap({ contacts, accountId }: { contacts: Contact[]; accountId: string }) {
  const [addOpen, setAddOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const visible = expanded ? contacts : contacts.slice(0, 4)

  return (
    <>
      <AddContactModal open={addOpen} onClose={() => setAddOpen(false)} accountId={accountId} />

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
                // photo_url manual tem prioridade; senão deriva do LinkedIn via unavatar.io
                const photoSrc = c.photo_url || linkedinPhoto(c.linkedin_url)

                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="group hover:bg-surface-background transition-all duration-200 overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          {/* Avatar */}
                          <div className="relative shrink-0">
                            <Avatar className="w-11 h-11 border-2 border-border-divider group-hover:border-plannera-sop/30 transition-all shadow-lg">
                              <AvatarImage src={photoSrc} alt={c.name} />
                              <AvatarFallback className="bg-surface-card text-plannera-sop font-bold text-sm">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            {c.decision_maker && (
                              <div
                                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-plannera-orange border-2 border-surface-background flex items-center justify-center shadow"
                                title="Tomador de decisão"
                              >
                                <ShieldCheck className="w-2.5 h-2.5 text-white" />
                              </div>
                            )}
                          </div>

                          {/* Dados */}
                          <div className="flex-1 min-w-0 space-y-1">
                            {/* Nome + badge influência */}
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-content-primary text-sm font-bold uppercase tracking-tight truncate group-hover:text-plannera-orange transition-colors">
                                {c.name}
                              </span>
                              <span className={cn(
                                "shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide ring-1 ring-inset",
                                config.bg, config.color, config.ring
                              )}>
                                <InfluenceIcon className="w-2.5 h-2.5" />
                                {config.label}
                              </span>
                            </div>

                            {/* Cargo + senioridade */}
                            <p className="text-content-secondary text-[10px] font-bold uppercase tracking-wide truncate">
                              {c.role}
                              {c.seniority && (
                                <span className="opacity-70"> · {c.seniority}</span>
                              )}
                            </p>

                            {/* Contatos: e-mail, telefone, LinkedIn */}
                            {(c.email || c.phone || c.linkedin_url) && (
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
                                    title={c.phone}
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
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </AnimatePresence>

            {/* Botões: expandir + adicionar */}
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
