'use client'

import { useRef, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Camera, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { canManageUser } from '@/lib/auth/permissions'
import type { UserRole } from '@/lib/supabase/types'

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  full_name: string
  role: string
  is_active: boolean
  user_type: string
  avatar_url?: string | null
  is_super_admin?: boolean
  default_onboarding_effort?: boolean
}

interface UserCardProps {
  user: User
  roleOptions: { label: string; value: string }[]
  currentUserRole: UserRole
  currentUserId: string
  currentUserIsSuperAdmin: boolean
  isEdited: boolean
  editedRole?: string
  onRoleChange: (userId: string, newRole: string) => void
  onToggleActive: (userId: string, currentStatus: boolean) => void
  onToggleSuperAdmin: (userId: string, current: boolean) => void
  onToggleOnboardingEffort: (userId: string, current: boolean) => void
  onAvatarChange?: (userId: string, url: string) => void
}

export function UserCard({
  user,
  roleOptions,
  currentUserRole,
  currentUserId,
  currentUserIsSuperAdmin,
  isEdited,
  editedRole,
  onRoleChange,
  onToggleActive,
  onToggleSuperAdmin,
  onToggleOnboardingEffort,
  onAvatarChange,
}: UserCardProps) {
  const displayRole = editedRole || user.role
  const isSelf = user.id === currentUserId
  const canEdit = canManageUser(currentUserRole, user.role as UserRole, currentUserIsSuperAdmin) && !isSelf
  // "Acesso Total" só pode ser concedido/removido por quem já tem Acesso Total (e não no próprio card).
  const canGrantSuperAdmin = currentUserIsSuperAdmin && !isSelf
  // Foto: qualquer um edita a PRÓPRIA; ou quem pode gerenciar o usuário.
  const canEditAvatar = isSelf || canEdit
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  async function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.includes('image/')) { toast.error('Selecione uma imagem.'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('Imagem excede 2MB.'); return }
    setUploadingPhoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('bucket', 'client-logos')
      const up = await fetch('/api/storage/upload', { method: 'POST', body: fd })
      const upData = await up.json()
      if (!up.ok) throw new Error(upData.error || 'Falha no upload')
      // Próprio perfil → /api/users/me (não exige manage:users); outros → /api/users (PUT)
      const res = isSelf
        ? await fetch('/api/users/me', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ avatar_url: upData.url }),
          })
        : await fetch('/api/users', {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id, avatar_url: upData.url }),
          })
      if (!res.ok) throw new Error((await res.json()).error || 'Falha ao salvar foto')
      onAvatarChange?.(user.id, upData.url)
      toast.success('Foto atualizada!')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setUploadingPhoto(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }
  // Visual "Acesso Total" passa a refletir a flag (override), não o role legado.
  const isSuperAdmin = !!user.is_super_admin
  const isOnboardingEffort = !!user.default_onboarding_effort
  const initials = user.full_name !== 'N/A'
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : user.email[0].toUpperCase()

  return (
    <div
      className={cn(
        'group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all shadow-sm gap-4 bg-surface-background hover:bg-surface-background/80',
        !user.is_active && 'border-red-200/50 bg-red-50/10 opacity-75',
        isEdited && 'border-plannera-orange/50 ring-1 ring-plannera-orange/20',
        !isEdited && user.is_active && 'border-border-divider'
      )}
    >
      {/* Left: Avatar + Info */}
      <div className="flex items-center gap-4 min-w-0">
        <div className="relative shrink-0 group/avatar">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className={cn(
                'w-10 h-10 rounded-xl object-cover border',
                isSuperAdmin ? 'border-amber-500/30' : 'border-primary/20'
              )}
            />
          ) : (
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold',
              isSuperAdmin
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500'
                : 'bg-primary/10 border border-primary/20 text-primary'
            )}>
              {initials}
            </div>
          )}
          {canEditAvatar && (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingPhoto}
                title="Trocar foto"
                className="absolute inset-0 rounded-xl bg-black/55 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center text-white"
              >
                {uploadingPhoto ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
            </>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-content-primary text-sm font-bold tracking-tight uppercase truncate">
              {user.full_name !== 'N/A' ? user.full_name : user.email}
            </p>
            {!user.is_active && (
              <span className="text-[8px] font-bold uppercase tracking-widest bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full dark:bg-red-900/30 dark:text-red-400">
                Inativo
              </span>
            )}
            {user.user_type === 'external' && (
              <span className="text-[8px] font-bold uppercase tracking-widest bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full dark:bg-blue-900/30 dark:text-blue-400">
                Externo
              </span>
            )}
            {isSuperAdmin && (
              <span className="text-[8px] font-bold uppercase tracking-widest bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full dark:bg-amber-900/30 dark:text-amber-400">
                Acesso Total
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {/* Role badge / selector */}
            {canEdit ? (
              <Select value={displayRole} onValueChange={val => onRoleChange(user.id, val)}>
                <SelectTrigger className="h-7 w-44 text-[9px] font-extrabold uppercase tracking-widest rounded-lg bg-surface-card border-border-divider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roleOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <span className={cn(
                'text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-lg',
                isSuperAdmin
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-primary/10 text-primary'
              )}>
                {user.role}
              </span>
            )}
            <span className="text-content-secondary/40 text-[9px]">|</span>
            <p className="text-content-secondary text-[9px] font-bold uppercase tracking-widest opacity-60">
              {user.last_sign_in_at
                ? `Atividade: ${new Date(user.last_sign_in_at).toLocaleDateString('pt-BR')}`
                : 'Credenciais Pendentes'}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Acesso Total + Active toggle */}
      <div className="flex items-center justify-end gap-4 shrink-0">
        {canGrantSuperAdmin && (
          <div className="flex items-center gap-2 border-l border-border-divider/50 pl-4 h-8">
            <span className={cn(
              'text-[9px] font-bold uppercase tracking-wider',
              isSuperAdmin ? 'text-amber-500' : 'text-content-secondary/60'
            )}>
              Acesso Total
            </span>
            <Switch
              checked={isSuperAdmin}
              onCheckedChange={() => onToggleSuperAdmin(user.id, isSuperAdmin)}
              className="scale-90"
            />
          </div>
        )}
        {canEdit && (
          <div className="flex items-center gap-2 border-l border-border-divider/50 pl-4 h-8">
            <span className={cn(
              'text-[9px] font-bold uppercase tracking-wider',
              isOnboardingEffort ? 'text-indigo-500' : 'text-content-secondary/60'
            )} title="Esforço gerado por integrações será classificado como Implantação automaticamente.">
              Onboarding
            </span>
            <Switch
              checked={isOnboardingEffort}
              onCheckedChange={() => onToggleOnboardingEffort(user.id, isOnboardingEffort)}
              className="scale-90"
            />
          </div>
        )}
        {canEdit && (
          <div className="flex items-center gap-2 border-l border-border-divider/50 pl-4 h-8">
            <span className={cn(
              'text-[9px] font-bold uppercase tracking-wider',
              user.is_active ? 'text-emerald-500' : 'text-content-secondary/60'
            )}>
              {user.is_active ? 'Ativo' : 'Bloqueado'}
            </span>
            <Switch
              checked={user.is_active}
              onCheckedChange={() => onToggleActive(user.id, user.is_active)}
              className="scale-90"
            />
          </div>
        )}
      </div>
    </div>
  )
}
