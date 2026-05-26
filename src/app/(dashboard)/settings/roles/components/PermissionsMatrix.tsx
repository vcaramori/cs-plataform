'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Loader2, Save, ShieldCheck, Info, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { PermissionRow } from '@/lib/auth/modules'

type CustomRole = {
  id: string
  name: string
  description: string | null
  permissions: PermissionRow[]
  created_at: string
}

interface PermissionsMatrixProps {
  selectedRole: CustomRole | null
  onPermissionChange: (module: string, action: keyof Omit<PermissionRow, 'module' | 'label'>, checked: boolean) => void
  onSaved: (id: string) => void
}

export function PermissionsMatrix({ selectedRole, onPermissionChange, onSaved }: PermissionsMatrixProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function handleSave() {
    if (!selectedRole) return
    setSaving(true)
    setSaved(false)

    try {
      const res = await fetch('/api/custom-roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRole.id,
          name: selectedRole.name,
          permissions: selectedRole.permissions,
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar permissoes')
      }

      setSaved(true)
      toast.success('Governanca salva com sucesso!')
      setTimeout(() => setSaved(false), 3000)
      onSaved(selectedRole.id)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (!selectedRole) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-border-divider rounded-2xl bg-surface-card/45">
        <ShieldCheck className="w-12 h-12 text-content-secondary/35 mb-4" />
        <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary/65">
          Selecione um perfil para configurar permissoes
        </p>
      </div>
    )
  }

  const actions: { key: keyof Omit<PermissionRow, 'module' | 'label'>; label: string }[] = [
    { key: 'view', label: 'Visualizar' },
    { key: 'create', label: 'Criar' },
    { key: 'edit', label: 'Editar' },
    { key: 'delete', label: 'Excluir' },
    { key: 'export', label: 'Exportar' },
  ]

  return (
    <Card className="border border-border-divider bg-surface-card shadow-sm h-full flex flex-col">
      <CardHeader className="pb-4 border-b border-border-divider">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black uppercase tracking-widest text-content-primary">{selectedRole.name}</span>
              <span className="text-[8px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">Ativo</span>
            </div>
            <p className="text-xs text-content-secondary mt-1">{selectedRole.description || 'Sem descricao cadastrada.'}</p>
          </div>

          <div className="flex items-center gap-2">
            {saved && (
              <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 shadow-sm dark:bg-emerald-900/20">
                <CheckCircle className="w-3.5 h-3.5" /> Salvo
              </div>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-primary hover:bg-primary/95 text-white font-bold uppercase tracking-widest text-xs h-10 px-6 rounded-xl gap-2 shadow-lg shadow-primary/10 transition-all active:scale-95"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Governanca
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center gap-2.5 p-3.5 bg-surface-background border border-border-divider rounded-xl">
          <Info className="w-4 h-4 text-primary shrink-0" />
          <p className="text-[10px] font-semibold text-content-secondary uppercase tracking-wider leading-relaxed">
            A matriz de governanca concede privilegios especificos para cada rota, botao ou consulta.
          </p>
        </div>

        <div className="border border-border-divider rounded-2xl overflow-hidden shadow-sm bg-surface-card">
          <div className="overflow-x-auto scrollbar-thin">
            <div className="min-w-[768px]">
              {/* Header */}
              <div className="grid grid-cols-7 bg-surface-background/70 border-b border-border-divider px-5 py-2.5 text-[9px] font-black uppercase tracking-widest text-content-secondary">
                <div className="col-span-2">Modulo / Tela</div>
                {actions.map(a => (
                  <div key={a.key} className="text-center">{a.label}</div>
                ))}
              </div>

              {/* Rows */}
              <div className="divide-y divide-border-divider">
                {selectedRole.permissions.map(p => (
                  <div key={p.module} className="grid grid-cols-7 px-5 py-2.5 items-center gap-2 hover:bg-surface-background/20 transition-colors">
                    <div className="col-span-2 space-y-0.5">
                      <p className="text-xs font-extrabold text-content-primary leading-tight">{p.label}</p>
                      <p className="text-[8px] text-content-secondary font-mono tracking-tight opacity-40">module:{p.module}</p>
                    </div>
                    {actions.map(a => (
                      <div key={a.key} className="flex items-center justify-center">
                        <Switch
                          checked={p[a.key]}
                          onCheckedChange={c => onPermissionChange(p.module, a.key, c)}
                          className="scale-[0.8]"
                          disabled={a.key !== 'view' && !p.view}
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
