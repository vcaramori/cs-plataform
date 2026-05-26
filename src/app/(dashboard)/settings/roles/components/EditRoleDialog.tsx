'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { PermissionRow } from '@/lib/auth/modules'

type CustomRole = {
  id: string
  name: string
  description: string | null
  permissions: PermissionRow[]
  created_at: string
}

interface EditRoleDialogProps {
  role: CustomRole | null
  onClose: () => void
  onSaved: (id: string) => void
}

export function EditRoleDialog({ role, onClose, onSaved }: EditRoleDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (role) {
      setName(role.name)
      setDescription(role.description || '')
    }
  }, [role])

  async function handleSave() {
    if (!role) return

    try {
      const res = await fetch('/api/custom-roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: role.id, name, description }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao atualizar perfil')
      }

      toast.success('Perfil atualizado!')
      onSaved(role.id)
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return (
    <Dialog open={!!role} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-xs font-black uppercase tracking-widest">Editar Perfil</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Nome</Label>
            <Input value={name} onChange={e => setName(e.target.value)} className="h-9 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Descricao</Label>
            <Input value={description} onChange={e => setDescription(e.target.value)} className="h-9 text-xs" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs font-bold uppercase">Cancelar</Button>
          <Button size="sm" onClick={handleSave} className="bg-primary text-white text-xs font-bold uppercase">Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
