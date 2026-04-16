import { redirect } from "next/navigation"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { ReactQueryProvider } from "@/components/providers/ReactQueryProvider"
import { ClientDashboardLayout } from "@/components/layout/ClientDashboardLayout"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  return (
    <ReactQueryProvider>
      <ClientDashboardLayout user={user}>
        {children}
      </ClientDashboardLayout>
    </ReactQueryProvider>
  )
}
