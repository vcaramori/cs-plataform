'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContainer } from '@/components/ui/page-container'
import { Switch } from '@/components/ui/switch'
import { 
  Loader2, 
  Plus, 
  ShieldCheck, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Key, 
  CheckCircle,
  AlertCircle,
  Settings,
  Layers,
  ArrowRight,
  Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type PermissionRow = {
  module: string
  label: string
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
  export: boolean
}

type CustomRole = {
  id: string
  name: string
  description: string | null
  permissions: PermissionRow[]
  created_at: string
}

const DEFAULT_MODULES = [
  { module: 'suporte', label: 'Suporte & Tickets' },
  { module: 'nps', label: 'Pesquisas NPS' },
  { module: 'voc', label: 'Voz do Cliente (VoC)' },
  { module: 'adoption', label: 'Adoption & Heatmaps' },
  { module: 'contracts', label: 'Contratos & Faturamento' },
  { module: 'playbooks', label: 'Automação & Playbooks' },
  { module: 'governance', label: 'Governança & Auditoria' }
]

function makeDefaultPermissions(): PermissionRow[] {
  return DEFAULT_MODULES.map(m => ({
    module: m.module,
    label: m.label,
    view: false,
    create: false,
    edit: false,
    delete: false,
    export: false
  }))
}

export default function RolesPage() {
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)
  const [selectedRole, setSelectedRole] = useState<CustomRole | null>(null)

  // Form Novo Perfil
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [creatingRole, setCreatingRole] = useState(false)
  const [roleError, setRoleError] = useState('')
  const [roleSuccess, setRoleSuccess] = useState('')

  // Edição de Perfil
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [editingRoleDescription, setEditingRoleDescription] = useState('')

  // Salvamento da Matriz
  const [savingMatrix, setSavingMatrix] = useState(false)
  const [matrixSuccess, setMatrixSuccess] = useState(false)

  useEffect(() => {
    fetchRoles()
  }, [])

  async function fetchRoles(selectId?: string) {
    setLoadingRoles(true)
    try {
      const res = await fetch('/api/custom-roles')
      if (res.ok) {
        const data = await res.json()
        const normalized = data.map((r: any) => {
          // Garante a presença estruturada das permissões
          const existingPerms = Array.isArray(r.permissions) ? r.permissions : []
          const perms = DEFAULT_MODULES.map(m => {
            const match = existingPerms.find((p: any) => p.module === m.module)
            return {
              module: m.module,
              label: m.label,
              view: match?.view ?? false,
              create: match?.create ?? false,
              edit: match?.edit ?? false,
              delete: match?.delete ?? false,
              export: match?.export ?? false
            }
          })
          return { ...r, permissions: perms }
        })
        setRoles(normalized)

        if (normalized.length > 0) {
          if (selectId) {
            const found = normalized.find((r: any) => r.id === selectId)
            setSelectedRole(found || normalized[0])
          } else if (!selectedRole) {
            setSelectedRole(normalized[0])
          } else {
            const found = normalized.find((r: any) => r.id === selectedRole.id)
            setSelectedRole(found || normalized[0])
          }
        }
      }
    } catch (e) {
      console.error('Erro ao buscar perfis:', e)
    } finally {
      setLoadingRoles(false)
    }
  }

  async function onSubmitRole(e: React.FormEvent) {
    e.preventDefault()
    setCreatingRole(true)
    setRoleError('')
    setRoleSuccess('')

    try {
      const res = await fetch('/api/custom-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: roleName, 
          description: roleDescription,
          permissions: makeDefaultPermissions()
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao criar perfil de acesso')
      }

      const newRole = await res.json()
      setRoleSuccess('Perfil de acesso criado!')
      setRoleName('')
      setRoleDescription('')
      fetchRoles(newRole.id)
    } catch (e: any) {
      setRoleError(e.message)
    } finally {
      setCreatingRole(false)
    }
  }

  async function onSaveEditedRole(roleId: string) {
    try {
      const res = await fetch('/api/custom-roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: roleId, 
          name: editingRoleName, 
          description: editingRoleDescription 
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao atualizar perfil')
      }

      setEditingRoleId(null)
      fetchRoles(roleId)
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function onDeleteRole(roleId: string, name: string) {
    if (!confirm(`Tem certeza que deseja remover o perfil "${name}"?`)) return

    try {
      const res = await fetch(`/api/custom-roles?id=${roleId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao remover perfil')
      }

      if (selectedRole?.id === roleId) {
        setSelectedRole(null)
      }
      fetchRoles()
    } catch (e: any) {
      alert(e.message)
    }
  }

  // Altera Switch na Matriz
  function onTogglePermission(module: string, action: 'view' | 'create' | 'edit' | 'delete' | 'export', checked: boolean) {
    if (!selectedRole) return
    const updatedPerms = selectedRole.permissions.map(p => 
      p.module === module ? { ...p, [action]: checked } : p
    )
    setSelectedRole({ ...selectedRole, permissions: updatedPerms })
  }

  async function onSaveMatrix() {
    if (!selectedRole) return
    setSavingMatrix(true)
    setMatrixSuccess(false)
    try {
      const res = await fetch('/api/custom-roles', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedRole.id,
          name: selectedRole.name,
          permissions: selectedRole.permissions
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar permissões')
      }

      setMatrixSuccess(true)
      setTimeout(() => setMatrixSuccess(false), 3000)
      fetchRoles(selectedRole.id)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSavingMatrix(false)
    }
  }

  return (
    <PageContainer className="max-w-[1600px] space-y-8 p-8">
      {/* Header */}
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page font-bold tracking-tight">Governança de Perfis</h1>
        </div>
        <p className="label-premium flex items-center gap-2 text-xs font-semibold text-content-secondary uppercase tracking-[0.1em]">
          Configuração de permissões por tela, governança de dados e controle IAM
          <Layers className="w-4 h-4 text-emerald-500" />
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
        {/* COLUNA ESQUERDA: LISTA DE PERFIS */}
        <div className="xl:col-span-1 space-y-6">
          <Card className="border border-border-divider bg-surface-card shadow-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-xs font-black uppercase tracking-widest text-content-primary">Perfis do Sistema</CardTitle>
              <CardDescription className="text-[9px] uppercase tracking-wider font-semibold opacity-60">Selecione para ver a matriz</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingRoles ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 text-plannera-orange animate-spin" />
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {roles.map(r => {
                    const isSelected = selectedRole?.id === r.id
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedRole(r)}
                        className={cn(
                          "group flex items-center justify-between px-4 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer",
                          isSelected
                            ? "bg-primary text-white border-primary shadow-md"
                            : "bg-surface-background text-content-primary border-border-divider hover:bg-surface-background/75"
                        )}
                      >
                        <span className="truncate pr-2">{r.name}</span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingRoleId(r.id)
                              setEditingRoleName(r.name)
                              setEditingRoleDescription(r.description || '')
                            }}
                            className={cn("p-1 rounded hover:bg-black/10 transition-colors", isSelected ? "text-white" : "text-content-secondary")}
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              onDeleteRole(r.id, r.name)
                            }}
                            className={cn("p-1 rounded hover:bg-red-500/10 transition-colors", isSelected ? "text-white" : "text-red-500")}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Form Cadastro Rápido */}
              <div className="pt-4 border-t border-border-divider space-y-4">
                <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary">Adicionar Novo Perfil</p>
                <form onSubmit={onSubmitRole} className="space-y-3">
                  <div className="space-y-1.5">
                    <Input
                      value={roleName}
                      onChange={e => setRoleName(e.target.value)}
                      placeholder="Nome do Perfil"
                      required
                      className="h-9 text-xs bg-surface-background border-border-divider rounded-xl"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Input
                      value={roleDescription}
                      onChange={e => setRoleDescription(e.target.value)}
                      placeholder="Descrição (Opcional)"
                      className="h-9 text-xs bg-surface-background border-border-divider rounded-xl"
                    />
                  </div>

                  <AnimatePresence>
                    {roleError && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] font-bold text-red-500 bg-red-50 p-2 rounded-lg border border-red-200">
                        {roleError}
                      </motion.div>
                    )}
                    {roleSuccess && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] font-bold text-emerald-500 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        {roleSuccess}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <Button
                    type="submit"
                    disabled={creatingRole}
                    className="w-full h-9 bg-primary hover:bg-primary/95 text-white text-xs font-bold uppercase tracking-widest rounded-xl gap-1.5"
                  >
                    {creatingRole ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Criar Perfil
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>

          {/* Modal Edição de Nome */}
          <AnimatePresence>
            {editingRoleId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
                <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="w-full max-w-sm bg-surface-card border border-border-divider rounded-2xl p-6 shadow-2xl">
                  <h3 className="text-xs font-black uppercase tracking-widest text-content-primary mb-4">Editar Perfil</h3>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Nome</Label>
                      <Input value={editingRoleName} onChange={e => setEditingRoleName(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-black uppercase tracking-widest ml-1">Descrição</Label>
                      <Input value={editingRoleDescription} onChange={e => setEditingRoleDescription(e.target.value)} className="h-9 text-xs" />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditingRoleId(null)} className="text-xs font-bold uppercase">Cancelar</Button>
                      <Button size="sm" onClick={() => onSaveEditedRole(editingRoleId)} className="bg-primary text-white text-xs font-bold uppercase">Salvar</Button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* ÁREA CENTRAL: MATRIZ DE PERMISSÕES */}
        <div className="xl:col-span-3">
          {selectedRole ? (
            <Card className="border border-border-divider bg-surface-card shadow-sm h-full flex flex-col">
              <CardHeader className="pb-4 border-b border-border-divider">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black uppercase tracking-widest text-content-primary">{selectedRole.name}</span>
                      <span className="text-[8px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-full border border-emerald-500/20">Ativo</span>
                    </div>
                    <p className="text-xs text-content-secondary mt-1">{selectedRole.description || 'Sem descrição cadastrada.'}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <AnimatePresence>
                      {matrixSuccess && (
                        <motion.div
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 shadow-sm"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Salvo com Sucesso
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button
                      onClick={onSaveMatrix}
                      disabled={savingMatrix}
                      className="bg-primary hover:bg-primary/95 text-white font-bold uppercase tracking-widest text-xs h-10 px-6 rounded-xl gap-2 shadow-lg shadow-primary/10 transition-all active:scale-95"
                    >
                      {savingMatrix ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar Governança
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="flex-1 p-6 space-y-6 overflow-y-auto">
                <div className="flex items-center gap-2.5 p-3.5 bg-surface-background border border-border-divider rounded-xl">
                  <Info className="w-4 h-4 text-primary shrink-0" />
                  <p className="text-[10px] font-semibold text-content-secondary uppercase tracking-wider leading-relaxed">
                    A matriz de governança concede privilégios específicos para cada rota, botão ou consulta.
                  </p>
                </div>

                {/* Grid de Permissões */}
                <div className="border border-border-divider rounded-2xl overflow-hidden shadow-sm">
                  {/* Table Header */}
                  <div className="grid grid-cols-2 md:grid-cols-6 bg-surface-background/70 border-b border-border-divider px-6 py-3 text-[10px] font-black uppercase tracking-widest text-content-secondary">
                    <div className="col-span-1 md:col-span-2">Módulo / Tela</div>
                    <div className="text-center">Visualizar</div>
                    <div className="text-center">Criar</div>
                    <div className="text-center">Editar</div>
                    <div className="text-center">Excluir</div>
                    <div className="text-center hidden md:block">Exportar</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-border-divider bg-surface-card">
                    {selectedRole.permissions.map(p => (
                      <div key={p.module} className="grid grid-cols-2 md:grid-cols-6 px-6 py-4 items-center gap-4 hover:bg-surface-background/20 transition-colors">
                        <div className="col-span-1 md:col-span-2 space-y-1">
                          <p className="text-xs font-bold text-content-primary">{p.label}</p>
                          <p className="text-[9px] text-content-secondary font-mono tracking-tight opacity-55">module:{p.module}</p>
                        </div>

                        {/* Visualizar */}
                        <div className="flex items-center justify-center gap-2 md:justify-center">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-content-secondary md:hidden">Visualizar:</span>
                          <Switch
                            checked={p.view}
                            onCheckedChange={c => onTogglePermission(p.module, 'view', c)}
                            className="scale-90"
                          />
                        </div>

                        {/* Criar */}
                        <div className="flex items-center justify-center gap-2 md:justify-center">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-content-secondary md:hidden">Criar:</span>
                          <Switch
                            checked={p.create}
                            onCheckedChange={c => onTogglePermission(p.module, 'create', c)}
                            className="scale-90"
                            disabled={!p.view}
                          />
                        </div>

                        {/* Editar */}
                        <div className="flex items-center justify-center gap-2 md:justify-center">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-content-secondary md:hidden">Editar:</span>
                          <Switch
                            checked={p.edit}
                            onCheckedChange={c => onTogglePermission(p.module, 'edit', c)}
                            className="scale-90"
                            disabled={!p.view}
                          />
                        </div>

                        {/* Excluir */}
                        <div className="flex items-center justify-center gap-2 md:justify-center">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-content-secondary md:hidden">Excluir:</span>
                          <Switch
                            checked={p.delete}
                            onCheckedChange={c => onTogglePermission(p.module, 'delete', c)}
                            className="scale-90"
                            disabled={!p.view}
                          />
                        </div>

                        {/* Exportar */}
                        <div className="flex items-center justify-center gap-2 md:justify-center col-span-2 md:col-span-1">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-content-secondary md:hidden">Exportar:</span>
                          <Switch
                            checked={p.export}
                            onCheckedChange={c => onTogglePermission(p.module, 'export', c)}
                            className="scale-90"
                            disabled={!p.view}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-[400px] flex flex-col items-center justify-center border border-dashed border-border-divider rounded-2xl bg-surface-card/45">
              <ShieldCheck className="w-12 h-12 text-content-secondary/35 mb-4 animate-pulse" />
              <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary/65">Nenhum perfil de acesso carregado</p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  )
}
