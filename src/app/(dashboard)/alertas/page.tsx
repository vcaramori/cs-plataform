import { redirect } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PageContainer } from '@/components/ui/page-container'
import { AlertsClient } from './AlertsClient'

export default async function AlertasPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <PageContainer>
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-destructive/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider flex items-center justify-center shadow-sm">
            <AlertTriangle className="w-5 h-5 text-content-primary" />
          </div>
          <h1 className="h1-page">Central de Alertas</h1>
        </div>
        <p className="label-premium">
          Catálogo consolidado de alertas — quem recebeu, o que foi feito e o que segue pendente.
        </p>
      </div>

      <AlertsClient />
    </PageContainer>
  )
}
