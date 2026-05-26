import { requirePageAuth } from '@/lib/auth/require-page-auth'
import { SLADashboardClient } from './SLADashboardClient'

export default async function SLADashboardPage() {
  await requirePageAuth()
  return <SLADashboardClient />
}
