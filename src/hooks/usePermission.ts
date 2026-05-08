'use client'

import { useContext } from 'react'
import { UserContext } from '@/components/providers/UserProvider'
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/auth/permissions'

export function usePermission() {
  const context = useContext(UserContext)

  if (!context) {
    throw new Error('usePermission must be used within UserProvider')
  }

  const { role } = context

  return {
    role,
    can: (permission: Permission) => hasPermission(role, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(role, permissions),
    canAll: (permissions: Permission[]) => hasAllPermissions(role, permissions),
  }
}
