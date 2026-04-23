import { Clock } from 'lucide-react'
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
      <div className="flex flex-col gap-2 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white dark:bg-primary/10 border border-slate-200 dark:border-primary/20 flex items-center justify-center shadow-sm">
             <Clock className="w-5 h-5 text-[#2d3558] dark:text-primary" />
          </div>
          <h1 className="h1-page">Horário Operacional</h1>
        </div>
        <p className="label-premium flex items-center gap-2">
          Configuração Base de Atendimento e Disponibilidade Global
        </p>
      </div>

      <BusinessHoursEditor initialHours={hours || []} />
    </div>
  )
}
