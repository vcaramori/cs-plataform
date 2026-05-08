'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Plus,
  MessageSquare,
  Clock,
  HelpCircle,
  Zap
} from 'lucide-react'

export function QuickActionsFAB() {
  const [isOpen, setIsOpen] = useState(false)

  const actions = [
    {
      icon: MessageSquare,
      label: 'Registrar Interação',
      href: '/accounts', // Could be modal in future
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Zap,
      label: 'Abrir Ticket',
      href: '/suporte', // Could be modal in future
      color: 'from-orange-500 to-orange-600'
    },
    {
      icon: Clock,
      label: 'Lançar Horas',
      href: '/esforco',
      color: 'from-green-500 to-green-600'
    },
    {
      icon: HelpCircle,
      label: 'Perguntar ao RAG',
      href: '/perguntar',
      color: 'from-purple-500 to-purple-600'
    },
  ]

  return (
    <div className="fixed bottom-8 right-8 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 cursor-default"
          />
        )}
      </AnimatePresence>

      <div className="relative">
        {/* Main FAB button */}
        <motion.div
          initial={false}
          animate={{ scale: isOpen ? 1.1 : 1 }}
          onClick={() => setIsOpen(!isOpen)}
        >
          <Button
            size="lg"
            className="w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-shadow bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <motion.div
              animate={{ rotate: isOpen ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Plus className="w-6 h-6" />
            </motion.div>
          </Button>
        </motion.div>

        {/* Action items */}
        <AnimatePresence>
          {isOpen && (
            <motion.div className="absolute bottom-20 right-0 flex flex-col gap-3">
              {actions.map((action, idx) => {
                const Icon = action.icon
                return (
                  <motion.div
                    key={action.label}
                    initial={{ opacity: 0, y: 10, x: 20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 10, x: 20 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Link href={action.href}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-start gap-3 bg-surface-card hover:bg-surface-card/80 border-border-divider group"
                        onClick={() => setIsOpen(false)}
                      >
                        <div className={`bg-gradient-to-br ${action.color} p-2 rounded-lg text-white shadow-sm group-hover:shadow-md transition-shadow`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-xs font-bold uppercase tracking-tight">{action.label}</span>
                      </Button>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
