import { redirect } from 'next/navigation'
import { MessageSquare, Sparkles } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PerguntarClient } from './components/PerguntarClient'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'


export default async function PerguntarPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: accounts } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('csm_owner_id', user.id)
    .order('name')

  return (
    <PageContainer noPadding className="flex flex-col h-full min-h-0 overflow-hidden px-4 pt-4 pb-3 md:px-8">
      <ModuleHeader
        title="Plannera Assistant"
        subtitle="Inteligência de Portfólio, Análise Preditiva e RAG em Tempo Real"
        iconName="Sparkles"
      />
      <div className="flex-1 mt-3 min-h-0 overflow-hidden">
        <PerguntarClient accounts={accounts ?? []} />
      </div>
    </PageContainer>
  )
}
