import { getSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PlaybookBuilderClient } from './components/PlaybookBuilderClient'

export default async function PlaybookBuilderPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <PlaybookBuilderClient />
}
