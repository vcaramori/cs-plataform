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
    <PageContainer noPadding className="flex flex-col h-full min-h-0 overflow-hidden px-4 pt-4 pb-3 md:px-8">
      <ModuleHeader
        title="Plannera Assistant"
        subtitle="Inteligência de Portfólio, Análise Preditiva e RAG em Tempo Real"
        iconName="Sparkles"
        className="mb-4"
      />
      <div className="flex-1 mt-3 min-h-0 overflow-hidden">
        <PerguntarClient accounts={accounts ?? []} />
      </div>
    </PageContainer>
  )
}
