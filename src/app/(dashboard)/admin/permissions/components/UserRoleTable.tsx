'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Pencil } from 'lucide-react'

interface User {
  id: string
  email: string
  role: string
  created_at: string
}

const roleLabels: Record<string, { label: string; color: string }> = {
  super_admin: { label: 'Super Admin', color: 'destructive' },
  admin: { label: 'Admin', color: 'default' },
  head_cs: { label: 'Head de CS', color: 'default' },
  csm_senior: { label: 'CSM Senior', color: 'secondary' },
  csm: { label: 'CSM', color: 'secondary' },
  account_manager: { label: 'Account Manager', color: 'outline' },
  report_viewer: { label: 'Report Viewer', color: 'outline' },
  finance_auditor: { label: 'Finance Auditor', color: 'outline' }
}

interface UserRoleTableProps {
  users: User[]
  availableRoles: string[]
  onEditUser: (user: User) => void
}

export function UserRoleTable({ users, availableRoles, onEditUser }: UserRoleTableProps) {
  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-surface-card/50">
            <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Email</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary">Role Atual</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-[0.2em] text-content-secondary text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <AnimatePresence mode="popLayout">
            {users.map((user, idx) => (
              <motion.tr
                key={user.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: idx * 0.05 }}
                className="border-t border-border-divider hover:bg-surface-card/30 transition-colors"
              >
                <TableCell className="font-mono text-sm text-content-primary">{user.email}</TableCell>
                <TableCell>
                  <Badge variant={roleLabels[user.role]?.color as any}>
                    {roleLabels[user.role]?.label || user.role}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditUser(user)}
                    className="h-8 w-8 text-content-secondary hover:text-plannera-orange"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </TableCell>
              </motion.tr>
            ))}
          </AnimatePresence>
        </TableBody>
      </Table>
    </Card>
  )
}
