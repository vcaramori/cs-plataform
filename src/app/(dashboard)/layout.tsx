import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ReactQueryProvider } from '@/components/providers/ReactQueryProvider'
import { Sidebar } from '@/components/layout/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <ReactQueryProvider>
      <div className="flex h-screen bg-slate-950 overflow-hidden">
        <Sidebar user={user} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </ReactQueryProvider>
  )
}
