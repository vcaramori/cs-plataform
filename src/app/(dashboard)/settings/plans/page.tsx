import { requirePageAuth } from '@/lib/auth/require-page-auth'
import { PlansSettingsClient } from './PlansSettingsClient'

export default async function PlansSettingsPage() {
  await requirePageAuth('view:settings')
  return <PlansSettingsClient />
}
