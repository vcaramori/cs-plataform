'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { X } from 'lucide-react'

interface BulkActionBarProps {
  selectedCount: number
  onClose: () => void
  onChangeStatus: () => void
  onAssign: () => void
  onBulkClose: () => void
}

export function BulkActionBar({
  selectedCount,
  onClose,
  onChangeStatus,
  onAssign,
  onBulkClose,
}: BulkActionBarProps) {
  const isVisible = selectedCount > 0

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-surface-card border-t border-border-divider px-6 py-4 shadow-2xl"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            {/* Counter */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-content-primary">
                {selectedCount}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-content-secondary">
                ticket{selectedCount !== 1 ? 's' : ''} selecionado{selectedCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onChangeStatus}
                className="text-[10px] font-bold uppercase tracking-widest"
              >
                Mudar Status
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={onAssign}
                className="text-[10px] font-bold uppercase tracking-widest"
              >
                Atribuir
              </Button>

              <Button
                size="sm"
                className="text-[10px] font-bold uppercase tracking-widest bg-destructive/10 text-destructive hover:bg-destructive/20"
                onClick={onBulkClose}
              >
                Fechar Tudo
              </Button>
            </div>

            {/* Close Button */}
            <Button
              size="sm"
              variant="ghost"
              onClick={onClose}
              className="ml-auto"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
