import { redirect } from "next/navigation"
import { getSupabaseServerClient, getUserProfile } from "@/lib/supabase/server"
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider"
import { ClientDashboardLayout } from "@/components/layout/ClientDashboardLayout"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const profile = await getUserProfile(user.id)

  return (
    <ReactQueryProvider>
      <ClientDashboardLayout user={user} profile={profile}>
        {children}
      </ClientDashboardLayout>
    </ReactQueryProvider>
  )
}
