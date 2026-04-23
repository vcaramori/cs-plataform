'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContainer } from '@/components/ui/page-container'
import { Loader2, Plus, Users, Mail, UserPlus, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (res.ok) {
        const data = await res.json()
        setUsers(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError('')
    setSuccess('')

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao criar usuário')
      }

      setSuccess('Usuário criado com sucesso!')
      setEmail('')
      setPassword('')
      fetchUsers()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <PageContainer className="max-w-6xl space-y-10">
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <Users className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Gestão de Equipe</h1>
        </div>
        <p className="label-premium flex items-center gap-2">
          Controle de Acessos, CSMs e Governança Plannera
          <ShieldCheck className="w-3.5 h-3.5 text-content-secondary/40" />
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <Card className="relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-plannera-orange/5 blur-3xl pointer-events-none" />
            <CardHeader className="pb-6">
              <CardTitle className="h2-section flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Novo Integrante
              </CardTitle>
              <CardDescription className="label-premium !text-[9px] opacity-60">Expandir time de sucesso</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label className="label-premium ml-1">Email Corporativo *</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="csm@plannera.tech"
                    className="transition-all focus:border-plannera-orange"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label className="label-premium ml-1">Senha de Acesso *</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Gerada via protocolo"
                    className="transition-all focus:border-plannera-orange"
                    required
                    minLength={6}
                  />
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-plannera-demand text-[10px] font-bold uppercase tracking-widest bg-plannera-demand/10 p-2 rounded-lg text-center">{error}</motion.p>
                  )}
                  {success && (
                    <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="text-plannera-ds text-[10px] font-bold uppercase tracking-widest bg-plannera-ds/10 p-2 rounded-lg text-center">{success}</motion.p>
                  )}
                </AnimatePresence>

                <Button type="submit" disabled={creating} className="w-full bg-plannera-orange hover:bg-plannera-orange/90 text-white font-bold uppercase tracking-widest h-12 rounded-xl shadow-xl transition-all active:scale-95 gap-2">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? 'Cadastrando...' : 'Cadastrar CSM'}
                </Button>
              </form>

              <div className="mt-8 pt-6 border-t border-border-divider">
                <div className="flex items-center gap-3 opacity-60">
                  <ShieldCheck className="w-4 h-4 text-content-secondary" />
                  <span className="text-[8px] font-bold text-content-secondary uppercase tracking-widest italic">Acessos auditados via logs Supabase</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="pb-6">
              <CardTitle className="text-sm font-bold uppercase tracking-widest">Matriz de Membros</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                  <Loader2 className="w-10 h-10 text-plannera-orange animate-spin" />
                  <span className="text-[10px] text-content-secondary font-bold uppercase tracking-[0.2em] animate-pulse">Consultando IAM...</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <AnimatePresence mode='popLayout'>
                    {users.length === 0 ? (
                      <p className="text-content-secondary/40 text-[10px] font-black uppercase tracking-widest text-center py-20">Nenhum usuário cadastrado além de você.</p>
                    ) : (
                      users.map((user, idx) => (
                        <motion.div
                          key={user.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="group flex items-center justify-between p-4 rounded-xl bg-surface-background border border-border-divider hover:bg-surface-background/80 transition-all shadow-sm"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-plannera-sop/10 border border-plannera-sop/20 text-plannera-orange flex items-center justify-center group-hover:scale-110 transition-transform shadow-lg">
                              <Mail className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="text-content-primary text-sm font-bold tracking-tight uppercase group-hover:text-plannera-orange transition-colors">{user.email}</p>
                              <p className="text-content-secondary text-[10px] font-bold uppercase tracking-widest opacity-60">
                                {user.last_sign_in_at ? `Atividade: ${new Date(user.last_sign_in_at).toLocaleDateString()}` : 'Credenciais Pendentes'}
                              </p>
                            </div>
                          </div>
                          <div className="text-content-primary text-[10px] font-mono font-bold px-3 py-1 rounded bg-surface-card border border-border-divider shadow-sm">TOKEN: {user.id.split('-')[0].toUpperCase()}</div>
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
    </PageContainer>
  )
}
