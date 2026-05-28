'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sparkles } from 'lucide-react'
import Link from 'next/link'

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

    // Aguarda o client do Supabase gravar o cookie no browser para evitar race condition
    let attempts = 0
    while (attempts < 20 && !document.cookie.includes('-auth-token')) {
      await new Promise(resolve => setTimeout(resolve, 50))
      attempts++
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#070d1e] flex items-center justify-center p-4 relative overflow-hidden">
      {/* High-end decorative blurred background orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-plannera-sop/15 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-plannera-orange/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute center w-[300px] h-[300px] bg-blue-500/5 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="w-full max-w-[400px] relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-plannera-orange to-plannera-soe mb-5 shadow-xl shadow-plannera-orange/20 border border-white/10 relative group overflow-hidden">
             <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
             <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-heading font-black text-white tracking-tight uppercase text-glow">CS-Continuum</h1>
          <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-[0.34em] mt-2">Control Tower — Plannera DS</p>
        </div>

        {/* Premium Dark Glassmorphic Card Container */}
        <div className="relative bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
          {/* Top glowing gradient border */}
          <div className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-plannera-orange via-plannera-soe to-plannera-sop w-full" />
          
          <div className="mb-6">
            <h2 className="text-white text-lg font-black uppercase tracking-tight">Autenticação</h2>
            <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mt-1">Insira suas credenciais Plannera</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="text-slate-300 text-[10px] font-extrabold uppercase tracking-widest block">
                E-mail Corporativo
              </label>
              <input
                id="email"
                type="email"
                placeholder="usuario@plannera.tech"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900/60 border border-white/15 text-white placeholder:text-slate-500/80 focus:border-plannera-orange focus:ring-1 focus:ring-plannera-orange/30 outline-none h-11 px-4 rounded-xl transition-all text-sm font-medium"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-slate-300 text-[10px] font-extrabold uppercase tracking-widest block">
                  Senha de Acesso
                </label>
                <Link href="/forgot-password" className="text-plannera-orange hover:text-plannera-soe text-[10px] font-bold uppercase tracking-widest transition-colors">
                  Esqueci a senha
                </Link>
              </div>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full bg-slate-900/60 border border-white/15 text-white placeholder:text-slate-500/80 focus:border-plannera-orange focus:ring-1 focus:ring-plannera-orange/30 outline-none h-11 px-4 rounded-xl transition-all text-sm font-medium"
              />
            </div>

            {error && (
              <p className="text-plannera-demand text-[10px] font-bold uppercase tracking-widest bg-plannera-demand/10 p-3 rounded-xl text-center border border-plannera-demand/20">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-plannera-orange to-plannera-soe hover:from-plannera-orange/90 hover:to-plannera-soe/90 text-white font-extrabold uppercase tracking-widest h-12 rounded-xl shadow-lg shadow-plannera-orange/20 transition-all hover:scale-[1.02] active:scale-95 duration-200 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading ? 'Processando...' : 'Iniciar Sessão'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
