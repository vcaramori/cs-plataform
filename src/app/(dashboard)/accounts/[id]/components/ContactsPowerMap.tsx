'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { User, ShieldCheck, Crown, ShieldAlert } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface Contact {
  id: string
  name: string
  role: string
  influence_level: 'Champion' | 'Neutral' | 'Detractor' | 'Blocker' | string
  decision_maker: boolean
}

const influenceConfig: Record<string, { color: string, icon: any }> = {
  Champion: { color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: Crown },
  Detractor: { color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: ShieldAlert },
  Neutral: { color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: User },
  Blocker: { color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', icon: ShieldAlert },
}

export function ContactsPowerMap({ contacts }: { contacts: Contact[], accountId: string }) {
  return (
    <div className="space-y-3">
      {contacts.length === 0 ? (
        <p className="text-slate-600 text-xs text-center py-4 italic">Nenhum stakeholder mapeado.</p>
      ) : (
        contacts.slice(0, 5).map(c => {
          const config = influenceConfig[c.influence_level] || influenceConfig.Neutral
          const InfluenceIcon = config.icon
          const Initials = c.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

          return (
            <div 
              key={c.id} 
              className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800/50 hover:bg-slate-900 transition-colors group"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <Avatar className="w-10 h-10 border-2 border-slate-800 group-hover:border-indigo-500/50 transition-colors">
                  <AvatarFallback className="bg-slate-900 text-indigo-400 font-bold text-xs">{Initials}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-sm font-bold truncate">{c.name}</span>
                    {c.decision_maker && <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" title="Tomador de Decisão" />}
                  </div>
                  <span className="text-[10px] text-slate-500 font-black uppercase truncate">{c.role}</span>
                </div>
              </div>
              <Badge className={`text-[9px] font-black uppercase tracking-tighter ${config.color} border-none`}>
                <InfluenceIcon className="w-3 h-3 mr-1" />
                {c.influence_level}
              </Badge>
            </div>
          )
        })
      )}
    </div>
  )
}
