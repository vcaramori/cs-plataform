import { getSupabaseServerClient } from '@/lib/supabase/server'
import { BusinessHoursEditor } from '@/components/support/BusinessHoursEditor'

export default async function GlobalBusinessHoursPage() {
  const supabase = await getSupabaseServerClient()

  const { data: hours } = await supabase
    .from('business_hours')
    .select('*')
    .eq('scope', 'global')

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white tracking-tight">Configurações Base</h1>
        <p className="text-sm text-zinc-400">Opções padronizadas aplicadas a contas que não possuem customizações explícitas.</p>
      </div>

      <BusinessHoursEditor initialHours={hours || []} />
    </div>
  )
}
