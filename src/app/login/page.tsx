'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha incorretos.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-plannera-primary flex items-center justify-center p-4 relative overflow-hidden">
      {/* Visual background accents */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-plannera-sop/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-plannera-orange/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-plannera-orange to-plannera-sop mb-6 shadow-2xl shadow-plannera-orange/20">
             <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-extrabold text-white tracking-tight uppercase">CS-Continuum</h1>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.3em] mt-2 opacity-70">Control Tower — Plannera DS</p>
        </div>

        <Card className="glass-card border-none shadow-2xl">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg font-bold uppercase tracking-tight">Autenticação</CardTitle>
            <CardDescription className="text-slate-500 text-xs font-medium uppercase tracking-widest">Insira suas credenciais Plannera</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">E-mail Corporativo</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="usuario@plannera.tech"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-black/20 border-white/5 text-white placeholder:text-slate-700 focus:border-plannera-orange h-11 rounded-xl transition-all"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Senha de Acesso</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-black/20 border-white/5 text-white placeholder:text-slate-700 focus:border-plannera-orange h-11 rounded-xl transition-all"
                />
              </div>
              {error && (
                <p className="text-plannera-demand text-[10px] font-bold uppercase tracking-widest bg-plannera-demand/10 p-2 rounded-lg text-center">{error}</p>
              )}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-plannera-orange hover:bg-plannera-orange/90 text-white font-bold uppercase tracking-widest h-12 rounded-xl shadow-xl transition-all active:scale-95"
              >
                {loading ? 'Processando...' : 'Iniciar Sessão'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
