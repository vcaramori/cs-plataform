import { redirect } from 'next/navigation'
import { getSupabaseServerClient, getUserProfile } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { Settings } from 'lucide-react'

export default async function AdminPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)

  if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
    redirect('/dashboard')
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <Settings className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Admin Panel</h1>
        </div>
        <p className="label-premium flex items-center gap-2">
          Gerenciamento centralizado de configurações do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 mt-8">
        <div className="p-6 bg-surface-card rounded-lg border border-border-divider">
          <h2 className="text-lg font-bold text-content-primary">Sistema em Desenvolvimento</h2>
          <p className="text-content-secondary mt-2">
            O painel de administração será disponibilizado em breve com funcionalidades para gerenciar:
          </p>
          <ul className="list-disc list-inside mt-4 space-y-2 text-content-secondary text-sm">
            <li>Configurações de saúde e inteligência</li>
            <li>Parâmetros de alertas e automações</li>
            <li>Integração com IA e RAG</li>
            <li>Integrações externas (SMTP, Slack, etc)</li>
            <li>Políticas de segurança e acesso</li>
          </ul>
        </div>
      </div>
    </PageContainer>
  )
}
