'use client'

import { useState, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { hasPermission } from '@/lib/auth/permissions'
import type { UserRole } from '@/lib/supabase/types'
import { UserCard } from './UserCard'
import { NewUserForm } from './NewUserForm'
import { AnimatePresence, motion } from 'framer-motion'

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
}

type CustomRole = {
  id: string
  name: string
  description: string | null
  created_at: string
}

interface UsersClientProps {
  initialUsers: User[]
  roles: CustomRole[]
  currentUserRole: UserRole
  currentUserId: string
  currentUserIsSuperAdmin: boolean
}

export function UsersClient({ initialUsers, roles, currentUserRole, currentUserId, currentUserIsSuperAdmin }: UsersClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'internal' | 'external'>('internal')
  const [editedRoles, setEditedRoles] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const canManage = hasPermission(currentUserRole, 'manage:users')

  const counts = useMemo(() => ({
    internal: users.filter(u => u.user_type !== 'external').length,
    external: users.filter(u => u.user_type === 'external').length,
  }), [users])

  const filteredUsers = useMemo(() => {
    const byType = users.filter(u =>
      tab === 'external' ? u.user_type === 'external' : u.user_type !== 'external'
    )
    if (!search.trim()) return byType
    const q = search.toLowerCase()
    return byType.filter(u =>
      u.full_name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q)
    )
  }, [users, search, tab])

  const hasChanges = Object.keys(editedRoles).length > 0

  function handleRoleChange(userId: string, newRole: string) {
    const original = users.find(u => u.id === userId)
    if (original?.role === newRole) {
      setEditedRoles(prev => {
        const next = { ...prev }
        delete next[userId]
        return next
      })
    } else {
      setEditedRoles(prev => ({ ...prev, [userId]: newRole }))
    }
  }

  async function handleToggleActive(userId: string, currentStatus: boolean) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, is_active: !currentStatus }),
      })
      if (!res.ok) throw new Error('Erro ao alterar status')
      toast.success(currentStatus ? 'Usuario desativado' : 'Usuario ativado')
    } catch {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: currentStatus } : u))
      toast.error('Erro ao alterar status do usuario')
    }
  }

  async function handleSaveBatch() {
    setSaving(true)
    try {
      const updates = Object.entries(editedRoles).map(([id, role]) => ({ id, role }))
      const res = await fetch('/api/users/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar alteracoes')
      }
      // Update local state
      setUsers(prev => prev.map(u => editedRoles[u.id] ? { ...u, role: editedRoles[u.id] } : u))
      setEditedRoles({})
      toast.success('Perfis atualizados com sucesso')
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleSuperAdmin(userId: string, current: boolean) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_super_admin: !current } : u))
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, is_super_admin: !current }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Erro ao alterar Acesso Total')
      toast.success(current ? 'Acesso Total removido' : 'Acesso Total concedido')
    } catch (e: any) {
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_super_admin: current } : u))
      toast.error(e.message)
    }
  }

  function handleUserCreated(newUser: User) {
    setUsers(prev => [...prev, newUser])
  }

  function handleAvatarChange(userId: string, url: string) {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, avatar_url: url } : u))
  }

  // Perfil = somente custom roles (escopo). "Acesso Total" é flag separada (toggle).
  const roleOptions = roles.map(r => ({ label: r.name, value: r.name }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Sidebar: New User Form */}
      {canManage && (
        <div className="lg:col-span-1">
          <NewUserForm roles={roles} currentUserRole={currentUserRole} currentUserIsSuperAdmin={currentUserIsSuperAdmin} onUserCreated={handleUserCreated} />
        </div>
      )}

      {/* User List */}
      <div className={cn(canManage ? 'lg:col-span-2' : 'lg:col-span-3')}>
        <Card className="border border-border-divider shadow-md bg-surface-card">
          <CardHeader className="pb-4 space-y-4">
            {/* Abas: Internos x Externos */}
            <div className="flex items-center gap-1 p-1 bg-surface-background rounded-xl w-fit">
              {([
                { key: 'internal' as const, label: 'Internos', count: counts.internal },
                { key: 'external' as const, label: 'Externos', count: counts.external },
              ]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    'flex items-center gap-2 px-4 h-9 rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all',
                    tab === t.key
                      ? 'bg-surface-card text-content-primary shadow-sm'
                      : 'text-content-secondary/60 hover:text-content-primary'
                  )}
                >
                  {t.label}
                  <span className={cn(
                    'px-1.5 py-0.5 rounded-full text-[9px]',
                    tab === t.key ? 'bg-primary/10 text-primary' : 'bg-content-secondary/10 text-content-secondary/60'
                  )}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-sm font-bold uppercase tracking-widest text-content-primary">
                {tab === 'external' ? 'Usuários Externos' : 'Membros da Equipe'}
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
                <Input
                  placeholder="Buscar por nome, email ou perfil..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-9 h-9 text-xs bg-surface-background rounded-xl"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <AnimatePresence mode="popLayout">
                {filteredUsers.length === 0 ? (
                  <p className="text-content-secondary/40 text-[10px] font-extrabold uppercase tracking-widest text-center py-20">
                    Nenhum usuario encontrado.
                  </p>
                ) : (
                  filteredUsers.map((user, idx) => (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <UserCard
                        user={user}
                        roleOptions={roleOptions}
                        currentUserRole={currentUserRole}
                        currentUserId={currentUserId}
                        currentUserIsSuperAdmin={currentUserIsSuperAdmin}
                        isEdited={!!editedRoles[user.id]}
                        editedRole={editedRoles[user.id]}
                        onRoleChange={handleRoleChange}
                        onToggleActive={handleToggleActive}
                        onToggleSuperAdmin={handleToggleSuperAdmin}
                        onAvatarChange={handleAvatarChange}
                      />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating save button */}
      <AnimatePresence>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 z-50"
          >
            <Button
              onClick={handleSaveBatch}
              disabled={saving}
              className="bg-plannera-orange hover:bg-plannera-orange/90 text-white font-bold uppercase tracking-widest h-12 px-8 rounded-2xl shadow-2xl gap-2 text-xs"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alteracoes ({Object.keys(editedRoles).length})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
