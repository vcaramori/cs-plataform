'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Sparkles, ArrowLeft, MailCheck } from 'lucide-react'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = getSupabaseBrowserClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${baseUrl}/api/auth/callback?redirect_to=/update-password`
    })

    if (error) {
      setError('Erro ao solicitar redefinição. Verifique o email.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#070d1e] flex items-center justify-center p-4 relative overflow-hidden">
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
          <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-[0.34em] mt-2">Recuperação de Acesso</p>
        </div>

        <div className="relative bg-slate-950/40 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 h-[2px] bg-gradient-to-r from-plannera-orange via-plannera-soe to-plannera-sop w-full" />
          
          {success ? (
            <div className="text-center space-y-4 py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-400 mb-2">
                <MailCheck className="w-6 h-6" />
              </div>
              <h2 className="text-white text-lg font-black uppercase tracking-tight">Verifique seu e-mail</h2>
              <p className="text-slate-400 text-sm font-medium">
                Enviamos um link de redefinição de senha para <span className="text-white">{email}</span>
              </p>
              <Link href="/login" className="mt-4 block text-plannera-orange hover:text-plannera-soe text-[10px] font-bold uppercase tracking-widest transition-colors">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-white text-lg font-black uppercase tracking-tight">Esqueci a Senha</h2>
                <p className="text-slate-400 text-[10px] font-extrabold uppercase tracking-widest mt-1">Informe seu e-mail corporativo</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
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
                  {loading ? 'Enviando...' : 'Enviar Link de Recuperação'}
                </button>

                <div className="text-center pt-2">
                  <Link href="/login" className="inline-flex items-center gap-1 text-slate-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
                    <ArrowLeft className="w-3 h-3" />
                    Voltar para o login
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
