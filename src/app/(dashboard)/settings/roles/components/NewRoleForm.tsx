'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { makeDefaultPermissions } from '@/lib/auth/modules'

interface NewRoleFormProps {
  onRoleCreated: (id: string) => void
}

export function NewRoleForm({ onRoleCreated }: NewRoleFormProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/custom-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, permissions: makeDefaultPermissions() }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao criar perfil')
      }

      const newRole = await res.json()
      toast.success('Perfil de acesso criado!')
      setName('')
      setDescription('')
      onRoleCreated(newRole.id)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card className="border border-border-divider bg-surface-card shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xs font-black uppercase tracking-widest text-content-primary">Novo Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Nome do Perfil"
            required
            className="h-9 text-xs bg-surface-background border-border-divider rounded-xl"
          />
          <Input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descricao (Opcional)"
            className="h-9 text-xs bg-surface-background border-border-divider rounded-xl"
          />
          <Button
            type="submit"
            disabled={creating}
            className="w-full h-9 bg-primary hover:bg-primary/95 text-white text-xs font-bold uppercase tracking-widest rounded-xl gap-1.5"
          >
            {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Criar Perfil
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
