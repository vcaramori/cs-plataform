'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContainer } from '@/components/ui/page-container'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { 
  Loader2, 
  Plus, 
  Users, 
  Mail, 
  UserPlus, 
  ShieldCheck, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Key, 
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  full_name: string
  role: string
  is_active: boolean
}

type CustomRole = {
  id: string
  name: string
  description: string | null
  created_at: string
}

export default function UsersPage() {
  // Dados de usuários
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  
  // Dados de perfis customizados
  const [roles, setRoles] = useState<CustomRole[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)

  // Formulário Novo Usuário
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [selectedRole, setSelectedRole] = useState('')
  const [creatingUser, setCreatingUser] = useState(false)
  const [userError, setUserError] = useState('')
  const [userSuccess, setUserSuccess] = useState('')

  // Formulário Novo Perfil Customizado
  const [roleName, setRoleName] = useState('')
  const [roleDescription, setRoleDescription] = useState('')
  const [creatingRole, setCreatingRole] = useState(false)
  const [roleError, setRoleError] = useState('')
  const [roleSuccess, setRoleSuccess] = useState('')

  // Edição de Perfil Customizado
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [editingRoleDescription, setEditingRoleDescription] = useState('')
  const [savingRole, setSavingRole] = useState(false)

  // Edição de Usuário (Perfil rápido)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [savingUserRole, setSavingUserRole] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchRoles()
  }, [])

  async function fetchUsers() {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (e) {
      console.error('Erro ao buscar usuários:', e)
    } finally {
      setLoadingUsers(false)
    }
  }

  async function fetchRoles() {
    setLoadingRoles(true)
    try {
      const res = await fetch('/api/custom-roles')
      if (res.ok) {
        const data = await res.json()
        setRoles(data)
        // Set default selected role for new user form
        if (data.length > 0 && !selectedRole) {
          const defaultRole = data.find((r: any) => r.name.toLowerCase() === 'csm') || data[0]
          setSelectedRole(defaultRole.name)
        }
      }
    } catch (e) {
      console.error('Erro ao buscar perfis customizados:', e)
    } finally {
      setLoadingRoles(false)
    }
  }

  async function onSubmitUser(e: React.FormEvent) {
    e.preventDefault()
    setCreatingUser(true)
    setUserError('')
    setUserSuccess('')

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          full_name: fullName, 
          role: selectedRole 
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao criar usuário')
      }

      setUserSuccess('Membro da equipe cadastrado com sucesso!')
      setEmail('')
      setPassword('')
      setFullName('')
      fetchUsers()
    } catch (e: any) {
      setUserError(e.message)
    } finally {
      setCreatingUser(false)
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
          description: roleDescription 
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao criar perfil de acesso')
      }

      setRoleSuccess('Perfil de acesso criado com sucesso!')
      setRoleName('')
      setRoleDescription('')
      fetchRoles()
    } catch (e: any) {
      setRoleError(e.message)
    } finally {
      setCreatingRole(false)
    }
  }

  async function onToggleUserActive(userId: string, currentStatus: boolean) {
    // Update local state first for optimistic UI response
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u))
    
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, is_active: !currentStatus })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao alterar status do usuário')
      }
    } catch (e: any) {
      console.error(e.message)
      // Rollback on error
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: currentStatus } : u))
    }
  }

  async function onSaveUserRole(userId: string, newRole: string) {
    setSavingUserRole(true)
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, role: newRole })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao alterar perfil do usuário')
      }

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      setEditingUserId(null)
    } catch (e: any) {
      console.error(e.message)
    } finally {
      setSavingUserRole(false)
    }
  }

  async function onDeleteRole(roleId: string, roleName: string) {
    if (!confirm(`Tem certeza que deseja remover o perfil "${roleName}"?`)) return

    try {
      const res = await fetch(`/api/custom-roles?id=${roleId}`, {
        method: 'DELETE'
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao remover perfil')
      }

      fetchRoles()
    } catch (e: any) {
      alert(e.message)
    }
  }

  async function onSaveEditedRole(roleId: string) {
    setSavingRole(true)
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
      fetchRoles()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSavingRole(false)
    }
  }

  const roleOptions = roles.map(r => ({
    label: r.name,
    value: r.name
  }))

  return (
    <PageContainer className="max-w-6xl space-y-10">
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page font-bold tracking-tight">Gestão de Usuários</h1>
        </div>
        <p className="label-premium flex items-center gap-2 text-xs font-semibold text-content-secondary uppercase tracking-[0.1em]">
          Controle de Acessos, Perfis Dinâmicos e Governança Plannera
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
        </p>
      </div>

      <Tabs defaultValue="users" className="w-full space-y-6">
        <TabsList className="bg-surface-card p-1 rounded-2xl h-12">
          <TabsTrigger value="users" className="rounded-xl px-6 py-2.5 text-xs font-bold uppercase tracking-wider data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 transition-all shadow-sm">
            Membros da Equipe
          </TabsTrigger>
        </TabsList>

        {/* ABA MEMBROS DA EQUIPE */}
        <TabsContent value="users" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form de Novo Usuário */}
            <div className="lg:col-span-1">
              <Card className="relative overflow-hidden border border-border-divider shadow-md bg-surface-card">
                <div className="absolute top-0 right-0 w-24 h-24 bg-plannera-orange/5 blur-3xl pointer-events-none" />
                <CardHeader className="pb-6">
                  <CardTitle className="h2-section flex items-center gap-2 text-md font-bold uppercase tracking-widest text-content-primary">
                    <UserPlus className="w-4 h-4 text-primary" />
                    Novo Integrante
                  </CardTitle>
                  <CardDescription className="text-[10px] text-content-secondary uppercase font-bold tracking-wider opacity-60">
                    Expandir time de sucesso
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={onSubmitUser} className="space-y-5">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-content-primary ml-1 uppercase tracking-widest">Nome Completo *</Label>
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Nome do integrante"
                        className="transition-all focus:border-plannera-orange h-10 text-xs font-medium bg-surface-background rounded-xl"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-content-primary ml-1 uppercase tracking-widest">Email Corporativo *</Label>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="csm@plannera.tech"
                        className="transition-all focus:border-plannera-orange h-10 text-xs font-medium bg-surface-background rounded-xl"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-content-primary ml-1 uppercase tracking-widest">Senha de Acesso *</Label>
                      <Input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="transition-all focus:border-plannera-orange h-10 text-xs font-medium bg-surface-background rounded-xl"
                        required
                        minLength={6}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-content-primary ml-1 uppercase tracking-widest">Perfil de Acesso *</Label>
                      {loadingRoles ? (
                        <div className="h-10 w-full flex items-center justify-center border border-border-divider bg-surface-background rounded-xl">
                          <Loader2 className="w-4 h-4 animate-spin text-plannera-orange" />
                        </div>
                      ) : (
                        <SearchableSelect
                          options={roleOptions}
                          value={selectedRole}
                          onValueChange={(val) => setSelectedRole(val)}
                          placeholder="Escolha um Perfil..."
                          size="sm"
                        />
                      )}
                    </div>

                    <AnimatePresence>
                      {userError && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          className="flex items-center gap-2 text-plannera-demand text-[10px] font-bold uppercase tracking-widest bg-plannera-demand/10 p-3 rounded-xl border border-plannera-demand/20"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{userError}</span>
                        </motion.div>
                      )}
                      {userSuccess && (
                        <motion.div 
                          initial={{ opacity: 0, y: -5 }} 
                          animate={{ opacity: 1, y: 0 }} 
                          className="flex items-center gap-2 text-plannera-ds text-[10px] font-bold uppercase tracking-widest bg-plannera-ds/10 p-3 rounded-xl border border-plannera-ds/20"
                        >
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          <span>{userSuccess}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Button 
                      type="submit" 
                      disabled={creatingUser} 
                      className="w-full bg-plannera-orange hover:bg-plannera-orange/90 text-white font-bold uppercase tracking-widest h-11 rounded-xl shadow-lg transition-all active:scale-95 gap-2 text-xs"
                    >
                      {creatingUser ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      {creatingUser ? 'Cadastrando...' : 'Cadastrar Membro'}
                    </Button>
                  </form>

                  <div className="mt-6 pt-5 border-t border-border-divider">
                    <div className="flex items-center gap-2 opacity-60">
                      <Key className="w-3.5 h-3.5 text-content-secondary" />
                      <span className="text-[8px] font-bold text-content-secondary uppercase tracking-widest italic">Acessos auditados via logs Supabase</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Membros */}
            <div className="lg:col-span-2">
              <Card className="border border-border-divider shadow-md bg-surface-card h-full">
                <CardHeader className="pb-6">
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-content-primary">Matriz de Membros</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingUsers ? (
                    <div className="flex flex-col items-center justify-center p-20 gap-4">
                      <Loader2 className="w-10 h-10 text-plannera-orange animate-spin" />
                      <span className="text-[10px] text-content-secondary font-bold uppercase tracking-[0.2em] animate-pulse">Consultando IAM...</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <AnimatePresence mode='popLayout'>
                        {users.length === 0 ? (
                          <p className="text-content-secondary/40 text-[10px] font-extrabold uppercase tracking-widest text-center py-20">Nenhum usuário cadastrado além de você.</p>
                        ) : (
                          users.map((user, idx) => (
                            <motion.div
                              key={user.id}
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className={cn(
                                "group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border transition-all shadow-sm gap-4 bg-surface-background hover:bg-surface-background/80",
                                !user.is_active ? "border-red-200/50 bg-red-50/10 opacity-75" : "border-border-divider"
                              )}
                            >
                              <div className="flex items-center gap-4">
                                <div className={cn(
                                  "w-10 h-10 rounded-xl border text-plannera-orange flex items-center justify-center group-hover:scale-105 transition-transform shadow-md",
                                  !user.is_active ? "bg-red-100/50 border-red-200 text-red-500" : "bg-plannera-sop/10 border-plannera-sop/20"
                                )}>
                                  <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-content-primary text-sm font-bold tracking-tight uppercase group-hover:text-plannera-orange transition-colors">
                                      {user.full_name !== 'N/A' ? user.full_name : user.email}
                                    </p>
                                    {!user.is_active && (
                                      <span className="text-[8px] font-bold uppercase tracking-widest bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                                        Inativo
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    {editingUserId === user.id ? (
                                      <div className="flex items-center gap-2 mt-1">
                                        <SearchableSelect
                                          options={roleOptions}
                                          value={user.role}
                                          onValueChange={(val) => onSaveUserRole(user.id, val)}
                                          placeholder="Alterar Perfil..."
                                          size="sm"
                                          className="w-48 h-8 rounded-lg text-xs"
                                        />
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingUserId(null)}
                                          className="h-8 w-8 p-0 rounded-lg"
                                        >
                                          <X className="w-4 h-4 text-content-secondary" />
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2">
                                        <span className="text-[9px] font-extrabold uppercase tracking-widest bg-primary/10 text-primary px-2.5 py-1 rounded-lg">
                                          {user.role}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          onClick={() => setEditingUserId(user.id)}
                                          className="h-6 w-6 p-0 hover:bg-surface-card rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                          title="Alterar Perfil"
                                        >
                                          <Edit2 className="w-3 h-3 text-content-secondary" />
                                        </Button>
                                      </div>
                                    )}

                                    <span className="text-content-secondary/40 text-[9px] font-medium">•</span>
                                    
                                    <p className="text-content-secondary text-[9px] font-bold uppercase tracking-widest opacity-60">
                                      {user.last_sign_in_at ? `Atividade: ${new Date(user.last_sign_in_at).toLocaleDateString()}` : 'Credenciais Pendentes'}
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center justify-end gap-4">
                                <div className="text-content-primary text-[9px] font-mono font-bold px-2.5 py-1 rounded-lg bg-surface-card border border-border-divider shadow-sm hidden md:block">
                                  ID: {user.id.split('-')[0].toUpperCase()}
                                </div>

                                <div className="flex items-center gap-2 border-l border-border-divider/50 pl-4 h-8">
                                  <span className={cn(
                                    "text-[9px] font-bold uppercase tracking-wider",
                                    user.is_active ? "text-emerald-500" : "text-content-secondary/60"
                                  )}>
                                    {user.is_active ? 'Ativo' : 'Bloqueado'}
                                  </span>
                                  <Switch
                                    checked={user.is_active}
                                    onCheckedChange={() => onToggleUserActive(user.id, user.is_active)}
                                    className="scale-90"
                                  />
                                </div>
                              </div>
                            </motion.div>
                          ))
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  )
}
