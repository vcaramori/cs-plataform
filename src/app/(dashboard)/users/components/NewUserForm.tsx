'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ImageUpload } from '@/components/ui/image-upload'
import { Loader2, Plus, UserPlus, Key } from 'lucide-react'
import { toast } from 'sonner'
import type { UserRole } from '@/lib/supabase/types'

type CustomRole = {
  id: string
  name: string
  description: string | null
  created_at: string
}

interface NewUserFormProps {
  roles: CustomRole[]
  currentUserRole: UserRole
  currentUserIsSuperAdmin: boolean
  onUserCreated: (user: any) => void
}

export function NewUserForm({ roles, currentUserRole, currentUserIsSuperAdmin, onUserCreated }: NewUserFormProps) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [selectedRole, setSelectedRole] = useState(
    roles.find(r => r.name.toLowerCase() === 'csm')?.name || roles[0]?.name || ''
  )
  const [grantSuperAdmin, setGrantSuperAdmin] = useState(false)
  const [creating, setCreating] = useState(false)

  // Perfil = somente custom roles. "Acesso Total" é flag separada (checkbox abaixo).
  const roleOptions = roles.map(r => ({ label: r.name, value: r.name }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          role: selectedRole,
          avatar_url: avatarUrl || null,
          is_super_admin: currentUserIsSuperAdmin ? grantSuperAdmin : false,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao criar usuario')
      }

      const newUser = await res.json()
      onUserCreated({ ...newUser, user_type: 'internal', avatar_url: avatarUrl || null, last_sign_in_at: null, created_at: new Date().toISOString() })
      setFullName('')
      setEmail('')
      setPassword('')
      setAvatarUrl('')
      setGrantSuperAdmin(false)
      toast.success('Membro cadastrado com sucesso!')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card className="relative overflow-hidden border border-border-divider shadow-md bg-surface-card">
      <div className="absolute top-0 right-0 w-24 h-24 bg-plannera-orange/5 blur-3xl pointer-events-none" />
      <CardHeader className="pb-6">
        <CardTitle className="flex items-center gap-2 text-md font-bold uppercase tracking-widest text-content-primary">
          <UserPlus className="w-4 h-4 text-primary" />
          Novo Integrante
        </CardTitle>
        <CardDescription className="text-[10px] text-content-secondary uppercase font-bold tracking-wider opacity-60">
          Expandir time de sucesso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-content-primary ml-1 uppercase tracking-widest">Foto do Integrante</Label>
            <ImageUpload value={avatarUrl} onChange={setAvatarUrl} bucket="avatars" disabled={creating} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-content-primary ml-1 uppercase tracking-widest">Nome Completo *</Label>
            <Input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Nome do integrante"
              className="transition-all focus:border-plannera-orange h-10 text-xs font-medium bg-surface-background rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-content-primary ml-1 uppercase tracking-widest">Email Corporativo *</Label>
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="csm@plannera.tech"
              className="transition-all focus:border-plannera-orange h-10 text-xs font-medium bg-surface-background rounded-xl"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-content-primary ml-1 uppercase tracking-widest">Senha de Acesso *</Label>
            <Input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Minimo 6 caracteres"
              className="transition-all focus:border-plannera-orange h-10 text-xs font-medium bg-surface-background rounded-xl"
              required
              minLength={6}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[10px] font-bold text-content-primary ml-1 uppercase tracking-widest">Perfil de Acesso *</Label>
            <SearchableSelect
              options={roleOptions}
              value={selectedRole}
              onValueChange={val => setSelectedRole(val)}
              placeholder="Escolha um Perfil..."
              size="sm"
            />
          </div>

          {currentUserIsSuperAdmin && (
            <label className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={grantSuperAdmin}
                onChange={e => setGrantSuperAdmin(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-amber-500"
              />
              <span className="space-y-0.5">
                <span className="block text-[10px] font-bold text-amber-600 uppercase tracking-widest">Acesso Total</span>
                <span className="block text-[10px] text-content-secondary leading-snug">
                  Ignora o perfil e libera ver/editar tudo de todos, sem restrição de escopo.
                </span>
              </span>
            </label>
          )}

          <Button
            type="submit"
            disabled={creating}
            className="w-full bg-plannera-orange hover:bg-plannera-orange/90 text-white font-bold uppercase tracking-widest h-11 rounded-xl shadow-lg transition-all active:scale-95 gap-2 text-xs"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {creating ? 'Cadastrando...' : 'Cadastrar Membro'}
          </Button>
        </form>

        <div className="mt-6 pt-5 border-t border-border-divider">
          <div className="flex items-center gap-2 opacity-60">
            <Key className="w-3.5 h-3.5 text-content-secondary" />
            <span className="text-[8px] font-bold text-content-secondary uppercase tracking-widest italic">
              O novo membro recebera acesso com o perfil selecionado
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
