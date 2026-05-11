'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface User {
  id: string
  email: string
  role: string
  created_at: string
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  head_cs: 'Head de CS',
  csm_senior: 'CSM Senior',
  csm: 'CSM',
  account_manager: 'Account Manager',
  report_viewer: 'Report Viewer',
  finance_auditor: 'Finance Auditor'
}

interface RoleAssignDialogProps {
  user: User
  availableRoles: string[]
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (userId: string, newRole: string) => Promise<void>
}

export function RoleAssignDialog({
  user,
  availableRoles,
  isOpen,
  onOpenChange,
  onConfirm
}: RoleAssignDialogProps) {
  const [selectedRole, setSelectedRole] = useState(user.role)
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    if (selectedRole === user.role) {
      onOpenChange(false)
      return
    }

    setLoading(true)
    try {
      await onConfirm(user.id, selectedRole)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-card border-border-divider text-foreground max-w-md">
        <DialogHeader>
          <DialogTitle>Atualizar Role</DialogTitle>
          <DialogDescription className="text-content-secondary">
            Alterar permissões para: <span className="font-mono text-content-primary">{user.email}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label className="text-content-secondary/60 text-[10px] font-bold uppercase tracking-widest ml-1">
              Novo Role
            </Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger className="bg-surface-background/50 border-border-divider rounded-xl">
                <SelectValue placeholder="Selecione um role" />
              </SelectTrigger>
              <SelectContent className="bg-surface-card border-border-divider">
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {roleLabels[role] || role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border-divider">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || selectedRole === user.role}
              onClick={handleConfirm}
            >
              {loading ? 'Salvando...' : 'Atualizar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
