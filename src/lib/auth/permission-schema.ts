import { z } from 'zod'

export const ModulePermissionSchema = z.object({
  module:    z.string(),
  view:      z.boolean().optional(),
  create:    z.boolean().optional(),
  edit:      z.boolean().optional(),
  delete:    z.boolean().optional(),
  export:    z.boolean().optional(),  // exportar CSV/relatório do módulo
  view_team: z.boolean().optional(),  // ver registros de outros membros do time (ex: tarefas de outros CSMs)
})

export type ModulePermission = z.infer<typeof ModulePermissionSchema>
export type ModuleAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'view_team'

export const PermissionsArraySchema = z.array(ModulePermissionSchema)

export function parsePermissions(raw: unknown): ModulePermission[] | null {
  const result = PermissionsArraySchema.safeParse(raw)
  return result.success ? result.data : null
}
