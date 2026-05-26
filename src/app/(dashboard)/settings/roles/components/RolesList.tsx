'use client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import type { PermissionRow } from '@/lib/auth/modules'

type CustomRole = {
  id: string
  name: string
  description: string | null
  permissions: PermissionRow[]
  created_at: string
}

interface RolesListProps {
  roles: CustomRole[]
  selectedRoleId: string | null
  onSelect: (role: CustomRole) => void
  onEdit: (role: CustomRole) => void
  onDelete: (roleId: string) => void
}

export function RolesList({ roles, selectedRoleId, onSelect, onEdit, onDelete }: RolesListProps) {
  function handleDelete(e: React.MouseEvent, role: CustomRole) {
    e.stopPropagation()
    if (!confirm(`Tem certeza que deseja remover o perfil "${role.name}"?`)) return
    onDelete(role.id)
    toast.success(`Perfil "${role.name}" removido`)
  }

  return (
    <Card className="border border-border-divider bg-surface-card shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xs font-black uppercase tracking-widest text-content-primary">Perfis do Sistema</CardTitle>
        <CardDescription className="text-[9px] uppercase tracking-wider font-semibold opacity-60">Selecione para ver a matriz</CardDescription>
      </CardHeader>
      <CardContent>
        {roles.length === 0 ? (
          <div className="flex justify-center py-6">
            <p className="text-xs text-content-secondary opacity-60">Nenhum perfil cadastrado</p>
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar">
            {roles.map(r => {
              const isSelected = selectedRoleId === r.id
              return (
                <div
                  key={r.id}
                  onClick={() => onSelect(r)}
                  className={cn(
                    'group flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer',
                    isSelected
                      ? 'bg-primary text-white border-primary shadow-md'
                      : 'bg-surface-background text-content-primary border-border-divider hover:bg-surface-background/75'
                  )}
                >
                  <span className="truncate pr-2">{r.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => { e.stopPropagation(); onEdit(r) }}
                      className={cn('p-1 rounded hover:bg-black/10 transition-colors', isSelected ? 'text-white' : 'text-content-secondary')}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, r)}
                      className={cn('p-1 rounded hover:bg-red-500/10 transition-colors', isSelected ? 'text-white' : 'text-red-500')}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
