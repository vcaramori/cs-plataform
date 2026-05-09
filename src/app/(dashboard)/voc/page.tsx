import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import VocBoardClient from './components/VocBoardClient'
import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export default async function VocPage() {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-content-primary">Voice of Customer</h1>
          <p className="text-slate-600 mt-2">Análise de sentimentos, temas e feedback do cliente</p>
        </div>

        <Suspense fallback={<Skeleton className="h-80 rounded-lg" />}>
          <VocBoardClient />
        </Suspense>
      </div>
    </div>
  )
}
