import { requirePageAuth } from '@/lib/auth/require-page-auth'
import { SLASettingsClient } from './SLASettingsClient'

export default async function SLASettingsPage() {
  await requirePageAuth('manage:settings')
  return <SLASettingsClient />
}
