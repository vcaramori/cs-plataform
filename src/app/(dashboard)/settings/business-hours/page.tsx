import { getSupabaseServerClient } from '@/lib/supabase/server'
import { BusinessHoursEditor } from '@/components/support/BusinessHoursEditor'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'

export default async function GlobalBusinessHoursPage() {
  const supabase = await getSupabaseServerClient()

  const { data: hours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('scope', 'global')

  return (
    <PageContainer className="max-w-5xl mx-auto space-y-6">
      <ModuleHeader
        title="Horário Operacional"
        subtitle="Configuração Base de Atendimento e Disponibilidade Global"
        iconName="Clock"
      />

      <BusinessHoursEditor initialHours={hours || []} />
    </PageContainer>
  )
}
