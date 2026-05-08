'use client'

import { ReactNode, useContext } from 'react'
import { UserContext } from '@/components/providers/UserProvider'
import { UserRole } from '@/lib/supabase/types'

interface RequireRoleProps {
  role: UserRole | UserRole[]
  fallback?: ReactNode
  children: ReactNode
}

export function RequireRole({ role, fallback = null, children }: RequireRoleProps) {
  const context = useContext(UserContext)

  if (!context) {
    return fallback
  }

  const { role: userRole } = context
  const requiredRoles = Array.isArray(role) ? role : [role]

  const hasRole = userRole && requiredRoles.includes(userRole)

  return hasRole ? children : fallback
}
