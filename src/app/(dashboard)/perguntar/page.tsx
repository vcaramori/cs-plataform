import { redirect } from 'next/navigation'
import { MessageSquare, Sparkles } from 'lucide-react'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'
import { PerguntarClient } from './components/PerguntarClient'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'


export default async function PerguntarPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const scope = await getUserAccessScope(user.id, 'ask')
  let accountsQuery = supabase
    .from('accounts')
    .select('id, name')
    .order('name')
  if (scope !== 'global') accountsQuery = accountsQuery.eq('csm_owner_id', user.id)
  const { data: accounts } = await accountsQuery

  return (
    <PageContainer noPadding className="flex flex-col h-full min-h-0 overflow-hidden pt-4 pb-0">
      <div className="px-4 md:px-8">
        <ModuleHeader
          title="Plannera Assistant"
          subtitle="Inteligência de Portfólio, Análise Preditiva e RAG em Tempo Real"
          iconName="Sparkles"
          className="mb-2"
        />
      </div>
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <PerguntarClient accounts={accounts ?? []} />
      </div>
    </PageContainer>
  )
}
