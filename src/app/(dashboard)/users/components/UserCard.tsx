'use client'

import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
}

interface UserCardProps {
  user: User
  roleOptions: { label: string; value: string }[]
  currentUserRole: UserRole
  currentUserId: string
  isEdited: boolean
  editedRole?: string
  onRoleChange: (userId: string, newRole: string) => void
  onToggleActive: (userId: string, currentStatus: boolean) => void
}

export function UserCard({
  user,
  roleOptions,
  currentUserRole,
  currentUserId,
  isEdited,
  editedRole,
  onRoleChange,
  onToggleActive,
}: UserCardProps) {
  const displayRole = editedRole || user.role
  const canEdit = canManageUser(currentUserRole, user.role as UserRole) && user.id !== currentUserId
  const isSuperAdmin = user.role === 'super_admin'
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
        {user.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatar_url}
            alt={user.full_name}
            className={cn(
              'w-10 h-10 rounded-xl object-cover shrink-0 border',
              isSuperAdmin ? 'border-amber-500/30' : 'border-primary/20'
            )}
          />
        ) : (
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0',
            isSuperAdmin
              ? 'bg-amber-500/15 border border-amber-500/30 text-amber-500'
              : 'bg-primary/10 border border-primary/20 text-primary'
          )}>
            {initials}
          </div>
        )}
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

      {/* Right: Active toggle */}
      <div className="flex items-center justify-end gap-4 shrink-0">
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
