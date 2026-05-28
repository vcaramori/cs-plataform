'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Mail, MailCheck, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function PortalForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const supabase = getSupabaseBrowserClient()
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/api/auth/callback?redirect_to=/portal/update-password`
      })
      if (error) throw error
      setSuccess(true)
    } catch (e: any) {
      toast.error(e.message || 'Erro ao enviar e-mail')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-surface-background px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/brand/logo.png"
            alt="Portal do Cliente"
            width={160}
            height={52}
            className="h-12 w-auto object-contain"
            priority
          />
          <div className="text-center">
            <h1 className="text-xl font-black uppercase tracking-tight text-foreground">
              Recuperação de Senha
            </h1>
            <p className="text-xs text-content-secondary mt-1 font-medium">
              Portal do Cliente
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-border-divider rounded-2xl shadow-xl p-8 space-y-5">
          {success ? (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/20 text-green-500 mb-2">
                <MailCheck className="w-6 h-6" />
              </div>
              <h2 className="text-foreground text-lg font-black uppercase tracking-tight">Verifique seu e-mail</h2>
              <p className="text-content-secondary text-sm font-medium">
                Enviamos as instruções para <span className="text-foreground">{email}</span>
              </p>
              <Link href="/portal/login" className="mt-4 block text-plannera-orange hover:text-plannera-orange/80 text-[10px] font-bold uppercase tracking-widest transition-colors">
                Voltar para o login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-content-secondary">
                  E-mail
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
                  <Input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="pl-9 h-11 rounded-xl"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 rounded-xl bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-widest text-xs gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Enviar Link
              </Button>

              <div className="text-center pt-2">
                <Link href="/portal/login" className="inline-flex items-center gap-1 text-content-secondary hover:text-foreground text-[10px] font-bold uppercase tracking-widest transition-colors">
                  <ArrowLeft className="w-3 h-3" />
                  Voltar
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
