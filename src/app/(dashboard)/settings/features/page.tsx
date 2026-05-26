import { requirePageAuth } from '@/lib/auth/require-page-auth'
import { FeaturesSettingsClient } from './FeaturesSettingsClient'

export default async function FeaturesSettingsPage() {
  await requirePageAuth('view:settings')
  return <FeaturesSettingsClient />
}
