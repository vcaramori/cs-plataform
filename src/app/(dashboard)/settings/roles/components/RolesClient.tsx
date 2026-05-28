'use client'

import { useState } from 'react'
import { PLATFORM_MODULES } from '@/lib/auth/modules'
import type { PermissionRow } from '@/lib/auth/modules'
import type { UserRole } from '@/lib/supabase/types'
import { RolesList } from './RolesList'
import { NewRoleForm } from './NewRoleForm'
import { PermissionsMatrix } from './PermissionsMatrix'
import { EditRoleDialog } from './EditRoleDialog'

type CustomRole = {
  id: string
  name: string
  description: string | null
  permissions: PermissionRow[]
  created_at: string
}

type RawRole = {
  id: string
  name: string
  description: string | null
  permissions: any
  created_at: string
}

interface RolesClientProps {
  initialRoles: RawRole[]
  currentUserRole: UserRole
}

function normalizeRoles(rawRoles: RawRole[]): CustomRole[] {
  return rawRoles.map(r => {
    const existingPerms = Array.isArray(r.permissions) ? r.permissions : []
    const perms: PermissionRow[] = PLATFORM_MODULES.map(m => {
      const match = existingPerms.find((p: any) => p.module === m.module)
      return {
        module: m.module,
        label: m.label,
        view: match?.view ?? false,
        create: match?.create ?? false,
        edit: match?.edit ?? false,
        delete: match?.delete ?? false,
        export: match?.export ?? false,
        view_team: match?.view_team ?? false,
      }
    })
    return { ...r, permissions: perms }
  })
}

export function RolesClient({ initialRoles, currentUserRole }: RolesClientProps) {
  const [roles, setRoles] = useState<CustomRole[]>(() => normalizeRoles(initialRoles))
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(roles[0] || null)
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null)

  async function refreshRoles(selectId?: string) {
    try {
      const res = await fetch('/api/custom-roles')
      if (!res.ok) return
      const data = await res.json()
      const normalized = normalizeRoles(data)
      setRoles(normalized)

      if (selectId) {
        setSelectedRole(normalized.find(r => r.id === selectId) || normalized[0] || null)
      } else if (selectedRole) {
        setSelectedRole(normalized.find(r => r.id === selectedRole.id) || normalized[0] || null)
      } else {
        setSelectedRole(normalized[0] || null)
      }
    } catch (e) {
      console.error('Erro ao buscar perfis:', e)
    }
  }

  function onSelectRole(role: CustomRole) {
    setSelectedRole(role)
  }

  function onEditRole(role: CustomRole) {
    setEditingRole(role)
  }

  async function onDeleteRole(roleId: string) {
    try {
      const res = await fetch(`/api/custom-roles?id=${roleId}`, { method: 'DELETE' })
      if (!res.ok) return
      if (selectedRole?.id === roleId) setSelectedRole(null)
      refreshRoles()
    } catch (e) {
      console.error('Erro ao remover perfil:', e)
    }
  }

  function onPermissionChange(module: string, action: keyof Omit<PermissionRow, 'module' | 'label'>, checked: boolean) {
    if (!selectedRole) return
    const updatedPerms = selectedRole.permissions.map(p =>
      p.module === module ? { ...p, [action]: checked } : p
    )
    setSelectedRole({ ...selectedRole, permissions: updatedPerms })
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8 pt-6">
      {/* Left Column */}
      <div className="xl:col-span-1 space-y-6">
        <RolesList
          roles={roles}
          selectedRoleId={selectedRole?.id || null}
          onSelect={onSelectRole}
          onEdit={onEditRole}
          onDelete={onDeleteRole}
        />
        <NewRoleForm onRoleCreated={(id) => refreshRoles(id)} />
      </div>

      {/* Right Column */}
      <div className="xl:col-span-3">
        <PermissionsMatrix
          selectedRole={selectedRole}
          onPermissionChange={onPermissionChange}
          onSaved={(id) => refreshRoles(id)}
        />
      </div>

      {/* Edit Dialog */}
      <EditRoleDialog
        role={editingRole}
        onClose={() => setEditingRole(null)}
        onSaved={(id) => { setEditingRole(null); refreshRoles(id) }}
      />
    </div>
  )
}
