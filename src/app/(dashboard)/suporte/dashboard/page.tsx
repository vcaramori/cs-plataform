import { requirePageAuth } from '@/lib/auth/require-page-auth'
import { SupportDashboardClient } from './SupportDashboardClient'

export default async function SupportDashboardPage() {
  await requirePageAuth()
  return <SupportDashboardClient />
}
