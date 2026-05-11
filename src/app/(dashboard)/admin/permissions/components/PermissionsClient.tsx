'use client'

import { useEffect, useState } from 'react'
import { PageContainer } from '@/components/ui/page-container'
import { SectionHeader } from '@/components/ui/section-header'
import { Lock, Loader2 } from 'lucide-react'
import { UserRoleTable } from './UserRoleTable'
import { RoleAssignDialog } from './RoleAssignDialog'
import { toast } from 'sonner'

interface User {
  id: string
  email: string
  role: 'csm' | 'csm_senior' | 'head_cs' | 'admin' | 'super_admin' | 'account_manager' | 'report_viewer' | 'finance_auditor'
  created_at: string
}

const AVAILABLE_ROLES = [
  'csm',
  'csm_senior',
  'head_cs',
  'account_manager',
  'report_viewer',
  'finance_auditor',
  'admin'
]

export function PermissionsClient() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      setLoading(true)
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      setUsers(data.users || [])
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Falha ao carregar usuários')
    } finally {
      setLoading(false)
    }
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setIsDialogOpen(true)
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch('/api/permissions?action=assign_role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          account_id: null, // global admin assignment
          role: newRole
        })
      })

      if (!response.ok) throw new Error('Failed to update role')

      toast.success('Role atualizado com sucesso')
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole as any } : u))
      setIsDialogOpen(false)
      setSelectedUser(null)
    } catch (error) {
      console.error('Error updating role:', error)
      toast.error('Falha ao atualizar role')
    }
  }

  return (
    <PageContainer className="max-w-[1400px] space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <Lock className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Permissões & RBAC</h1>
        </div>
        <p className="label-premium">Gerenciar usuários, roles e controle de acesso</p>
      </div>

      {/* Users Section */}
      <div className="space-y-6">
        <SectionHeader
          title={`Usuários do Sistema${users.length > 0 ? ` (${users.length})` : ''}`}
          action={<div />}
        />

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Loader2 className="w-6 h-6 animate-spin text-plannera-orange" />
          </div>
        ) : users.length > 0 ? (
          <UserRoleTable
            users={users}
            availableRoles={AVAILABLE_ROLES}
            onEditUser={handleEditUser}
          />
        ) : (
          <div className="p-12 bg-surface-card border-2 border-dashed border-border-divider rounded-2xl text-center">
            <p className="text-content-secondary">Nenhum usuário encontrado</p>
          </div>
        )}
      </div>

      {/* Edit Role Dialog */}
      {selectedUser && (
        <RoleAssignDialog
          user={selectedUser}
          availableRoles={AVAILABLE_ROLES}
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onConfirm={handleRoleChange}
        />
      )}
    </PageContainer>
  )
}
