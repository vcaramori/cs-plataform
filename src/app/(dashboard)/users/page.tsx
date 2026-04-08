'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Plus, Users, Mail, UserPlus } from 'lucide-react'

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
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-indigo-500" /> Equipe (CSMs)
        </h1>
        <p className="text-slate-400 text-sm mt-1">Gerencie os acessos do time de Customer Success na plataforma</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                Novo Usuário
              </CardTitle>
              <CardDescription className="text-slate-400">Cadastre um novo membro</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Email *</Label>
                  <Input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="csm@plannera.com.br" 
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" 
                    required 
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Senha Provisória *</Label>
                  <Input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="mínimo 6 caracteres" 
                    className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" 
                    required 
                    minLength={6}
                  />
                </div>
                
                {error && <p className="text-red-400 text-xs">{error}</p>}
                {success && <p className="text-green-400 text-xs">{success}</p>}

                <Button type="submit" disabled={creating} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-2 mt-4">
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  {creating ? 'Cadastrando...' : 'Cadastrar CSM'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="bg-slate-900 border-slate-800 h-full">
            <CardHeader>
              <CardTitle className="text-white text-base">Membros Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center p-8">
                  <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <div className="space-y-3">
                  {users.length === 0 ? (
                    <p className="text-slate-400 text-sm">Nenhum usuário cadastrado além de você.</p>
                  ) : (
                    users.map(user => (
                      <div key={user.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-white text-sm font-medium">{user.email}</p>
                            <p className="text-slate-400 text-xs">
                              {user.last_sign_in_at ? `Último acesso: ${new Date(user.last_sign_in_at).toLocaleDateString()}` : 'Nunca acessou'}
                            </p>
                          </div>
                        </div>
                        <div className="text-slate-500 text-xs">ID: {user.id.split('-')[0]}...</div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
