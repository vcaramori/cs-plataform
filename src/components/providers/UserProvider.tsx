'use client'

import { createContext, ReactNode } from 'react'
import { UserRole, Profile } from '@/lib/supabase/types'
import type { ModulePermission } from '@/lib/auth/permission-schema'

export interface UserContextType {
  role: UserRole | null
  profile: Profile | null
  modulePermissions: ModulePermission[] | null
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
  }

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>
}
