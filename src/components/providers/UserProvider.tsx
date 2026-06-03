'use client'

import { createContext, ReactNode } from 'react'
import { UserRole, Profile } from '@/lib/supabase/types'
import type { ModulePermission } from '@/lib/auth/permission-schema'

export interface UserContextType {
  role: UserRole | null
  profile: Profile | null
  modulePermissions: ModulePermission[] | null
  userType: string | null
  isSuperAdmin: boolean
}

export const UserContext = createContext<UserContextType | null>(null)

interface UserProviderProps {
  profile: Profile | null
  children: ReactNode
}

export function UserProvider({ profile, children }: UserProviderProps) {
  const value: UserContextType = {
    role: profile?.role || null,
    profile,
    modulePermissions: profile?.custom_role_permissions ?? null,
    userType: (profile as any)?.user_type ?? null,
    isSuperAdmin: !!(profile as any)?.is_super_admin || profile?.role === 'super_admin',
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
