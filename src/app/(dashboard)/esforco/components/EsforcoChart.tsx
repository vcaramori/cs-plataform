'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Clock, BarChart3, Building2, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ParetoItem {
  name: string
  hours: number
  percentage: number
  cumulativePercentage: number
}

interface EsforcoChartProps {
  paretoData: ParetoItem[]
}

export function EsforcoChart({ paretoData }: EsforcoChartProps) {
  return (
    <Card variant="glass" className="border-border-divider shadow-2xl h-full flex flex-col rounded-2xl bg-surface-card overflow-hidden">
      <CardHeader className="pb-6 pt-12 px-10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-3 text-content-secondary">
            <BarChart3 className="w-5 h-5 text-plannera-primary" />
            Pareto / Eficiência
          </CardTitle>

          {paretoData.length > 5 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-plannera-primary/10 text-plannera-primary transition-all">
                  <Maximize2 className="w-5 h-5" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-surface-card border-border-divider max-w-2xl rounded-2xl shadow-2xl p-12">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-4">
                    <Building2 className="w-8 h-8 text-plannera-primary" />
                    Visão Pareto de Esforço
                  </DialogTitle>
                </DialogHeader>
                <div className="mt-10 space-y-6 max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
                  {paretoData.map((t, idx) => (
                    <div key={t.name} className="flex items-center gap-5 group">
                      <span className="w-8 text-[11px] font-black text-content-secondary/20 italic tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                      <div className="flex-1 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-content-primary text-xs font-black uppercase tracking-tight truncate max-w-[250px]">{t.name}</span>
                          <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest opacity-60">{t.percentage.toFixed(1)}%</span>
                            <span className="text-plannera-primary font-black text-lg tabular-nums">{t.hours.toFixed(1)}H</span>
                          </div>
                        </div>
                        <div className="w-full h-2.5 bg-surface-background rounded-full overflow-hidden shadow-inner border border-border-divider">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${t.percentage}%` }}
                            className="h-full bg-gradient-to-r from-plannera-primary to-plannera-orange shadow-[0_0_15px_rgba(var(--plannera-primary-rgb),0.3)]"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 px-8 pb-10 space-y-8 overflow-y-auto custom-scrollbar">
        <AnimatePresence mode='popLayout'>
          {paretoData.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-10 py-32">
              <Clock className="w-16 h-16 mb-6" />
              <p className="text-[10px] font-black uppercase tracking-[0.3em]">Sem métricas</p>
            </div>
          ) : (
            <div className="space-y-8">
              {paretoData.slice(0, 10).map((t, idx) => (
                <motion.div
                  key={t.name}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group flex flex-col space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-content-primary text-[10px] font-black uppercase tracking-tight truncate max-w-[140px] group-hover:text-plannera-primary transition-colors">{t.name}</span>
                    <span className="text-plannera-primary font-black text-sm tabular-nums">
                      {t.hours.toFixed(1)}H
                    </span>
                  </div>

                  <div className="relative h-2.5 w-full bg-surface-background rounded-full overflow-hidden shadow-inner border border-border-divider/50">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${t.percentage}%` }}
                      transition={{ duration: 1, delay: idx * 0.1 }}
                      className={idx < 3 ? "h-full rounded-full transition-all bg-plannera-primary shadow-[0_0_12px_rgba(var(--plannera-primary-rgb),0.4)]" : "h-full rounded-full transition-all bg-plannera-primary/30"}
                    />
                  </div>

                  <div className="flex justify-between items-center px-1">
                    <span className="text-[8px] font-black text-content-secondary/30 uppercase tracking-widest">Pareto</span>
                    <span className="text-[9px] font-black text-plannera-orange/60 tabular-nums">{t.cumulativePercentage.toFixed(0)}%</span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </CardContent>
      <div className="p-8 border-t border-border-divider bg-surface-background/50 text-center">
        <span className="text-[9px] font-black uppercase tracking-[0.25em] text-content-secondary/40">Análise Estratégica 80/20</span>
      </div>
    </Card>
  )
}
