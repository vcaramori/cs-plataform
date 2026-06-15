import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getModulePermission } from '@/lib/auth/get-module-permission'
import { PageContainer } from '@/components/ui/page-container'
import { CheckSquare } from 'lucide-react'
import { AtividadesClient } from './components/AtividadesClient'

export const dynamic = 'force-dynamic'

export default async function AtividadesPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [canView, canViewTeam] = await Promise.all([
    getModulePermission(user.id, 'atividades', 'view'),
    getModulePermission(user.id, 'atividades', 'view_team'),
  ])

  if (!canView) redirect('/dashboard')

  return (
    <PageContainer>
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <CheckSquare className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Atividades</h1>
        </div>
        <p className="label-premium flex items-center gap-2">
          Hub central de tarefas do CSM — criadas manualmente ou automaticamente pela plataforma.
        </p>
      </div>

      <AtividadesClient userId={user.id} canViewTeam={canViewTeam} />
    </PageContainer>
  )
}
