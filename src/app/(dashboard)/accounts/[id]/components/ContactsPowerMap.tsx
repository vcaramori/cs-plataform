'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users, Plus, Mail, Crown, Shield, UserX, AlertOctagon } from 'lucide-react'
import type { Contact } from '@/lib/supabase/types'
import { AddContactModal } from './AddContactModal'

const influenceConfig = {
  Champion: { color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', icon: Crown },
  Neutral: { color: 'bg-slate-500/20 text-slate-300 border-slate-500/30', icon: Shield },
  Detractor: { color: 'bg-orange-500/20 text-orange-300 border-orange-500/30', icon: UserX },
  Blocker: { color: 'bg-red-500/20 text-red-300 border-red-500/30', icon: AlertOctagon },
}

export function ContactsPowerMap({ contacts, accountId }: { contacts: Contact[], accountId: string }) {
  const [open, setOpen] = useState(false)

  const sorted = [...contacts].sort((a, b) => {
    const order = ['Champion', 'Neutral', 'Detractor', 'Blocker']
    return order.indexOf(a.influence_level) - order.indexOf(b.influence_level)
  })

  return (
    <>
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" /> Power Map
              <span className="text-slate-500 text-xs font-normal">({contacts.length})</span>
            </CardTitle>
            <Button size="sm" variant="ghost"
              onClick={() => setOpen(true)}
              className="text-slate-400 hover:text-white h-7 gap-1 text-xs">
              <Plus className="w-3 h-3" /> Adicionar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {sorted.length === 0 ? (
            <div className="text-center py-6">
              <Users className="w-8 h-8 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Nenhum contato mapeado</p>
              <Button size="sm" variant="ghost" onClick={() => setOpen(true)}
                className="text-indigo-400 hover:text-indigo-300 mt-2 text-xs">
                Adicionar contato
              </Button>
            </div>
          ) : (
            sorted.map(contact => {
              const cfg = influenceConfig[contact.influence_level]
              const Icon = cfg.icon
              return (
                <div key={contact.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors">
                  <div className={`p-1.5 rounded-md ${cfg.color.split(' ').slice(0, 1).join(' ')}`}>
                    <Icon className={`w-3.5 h-3.5 ${cfg.color.split(' ').slice(1, 2).join(' ')}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-white text-sm font-medium">{contact.name}</span>
                      {contact.decision_maker && (
                        <span className="text-yellow-400 text-xs">★</span>
                      )}
                    </div>
                    <p className="text-slate-400 text-xs">{contact.role}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge className={`text-xs border py-0 px-1.5 ${cfg.color}`}>{contact.influence_level}</Badge>
                      <span className="text-slate-600 text-xs">{contact.seniority}</span>
                    </div>
                  </div>
                  {contact.email && (
                    <a href={`mailto:${contact.email}`} className="text-slate-500 hover:text-indigo-400 mt-1">
                      <Mail className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
      <AddContactModal open={open} onClose={() => setOpen(false)} accountId={accountId} />
    </>
  )
}
