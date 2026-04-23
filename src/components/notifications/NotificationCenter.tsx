'use client'

import { useState, useEffect } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Bell, AlertTriangle, Clock, ChevronRight, Sparkles, Loader2, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

export function NotificationCenter({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    fetchNotifications()
  }, [])

  useEffect(() => {
    if (open) {
      fetchNotifications()
    }
  }, [open])

  async function fetchNotifications() {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch (err) {
      console.error('Error fetching notifications:', err)
    } finally {
      setLoading(false)
    }
  }

  const unreadCount = notifications.length

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className={cn(
            "relative group flex items-center transition-all rounded-xl h-11 w-full",
            isCollapsed ? "justify-center px-0" : "justify-start px-3 gap-3",
            "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
          )}
        >
          <div className="relative">
            <Bell className={cn(
               "w-5 h-5 transition-transform group-hover:scale-110",
               unreadCount > 0 ? "text-plannera-orange" : "text-slate-500 group-hover:text-white"
            )} />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-extrabold text-white ring-2 ring-slate-950 animate-pulse">
                {unreadCount}
              </span>
            )}
          </div>
          
          {!isCollapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-bold text-sm uppercase tracking-wide"
            >
              Alertas
            </motion.span>
          )}

          {unreadCount > 0 && !isCollapsed && (
            <div className="ml-auto w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="bg-slate-950/95 backdrop-blur-2xl border-l border-white/5 text-white sm:max-w-md p-0 overflow-hidden flex flex-col">
        <SheetHeader className="p-6 border-b border-white/5 bg-white/5">
          <SheetTitle className="text-xl font-extrabold uppercase tracking-tight flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-white">Central de Alertas</span>
              {unreadCount > 0 && (
                <Badge className="bg-plannera-orange text-white border-none font-extrabold text-[10px]">
                  {unreadCount} PENDENTES
                </Badge>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
              <p className="text-xs font-bold uppercase tracking-widest">Sincronizando pendências...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center">
                <Bell className="w-8 h-8 text-slate-700" />
              </div>
              <div>
                <p className="text-white font-bold text-sm">Tudo em dia!</p>
                <p className="text-slate-500 text-xs mt-1">Você não possui alertas ou pendências críticas no momento.</p>
              </div>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {notifications.map((n) => (
                <Link 
                  key={n.id} 
                  href={`/accounts/${n.account_id}`}
                  onClick={() => setOpen(false)}
                  className="block"
                >
                  <div className={cn(
                    "group p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/10 transition-all relative overflow-hidden",
                    n.severity === 'critical' ? "border-l-4 border-l-red-500" : "border-l-4 border-l-plannera-orange"
                  )}>
                    <div className="flex gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        n.type === 'stale_score' ? "bg-plannera-orange/10 text-plannera-orange" : 
                        n.type === 'new_ticket' ? "bg-blue-500/10 text-blue-500" :
                        "bg-red-500/10 text-red-500"
                      )}>
                        {n.type === 'stale_score' ? <Clock className="w-5 h-5" /> : 
                         n.type === 'new_ticket' ? <MessageSquare className="w-5 h-5" /> :
                         <AlertTriangle className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-slate-300 font-extrabold text-[10px] uppercase tracking-widest leading-none">
                            {n.type === 'stale_score' ? 'Health Score' : 
                             n.type === 'new_ticket' ? 'Suporte' :
                             'Discrepância IA'}
                          </p>
                          <ChevronRight className="w-3 h-3 text-slate-600 group-hover:text-white transition-all transform group-hover:translate-x-1" />
                        </div>
                        <h4 className="text-white font-bold text-sm truncate">{n.title}</h4>
                        <p className="text-slate-500 text-xs leading-relaxed mt-1">{n.description}</p>
                        
                        <div className="mt-3 flex items-center gap-2">
                          <Badge variant="outline" className="text-[9px] border-white/10 bg-black/40 text-slate-400 font-bold px-2 py-0">
                            CONTA: {n.account_name}
                          </Badge>
                          {n.type === 'discrepancy' && (
                             <Sparkles className="w-3 h-3 text-indigo-400" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-black/40">
          <Button variant="outline" className="w-full border-white/10 bg-white/5 text-slate-400 hover:text-white text-xs font-bold uppercase tracking-widest py-6 rounded-2xl">
            Ver tudos os logos pendentes
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
