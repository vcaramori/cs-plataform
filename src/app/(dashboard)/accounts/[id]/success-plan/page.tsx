import { requirePageAuth } from '@/lib/auth/require-page-auth'
import { SuccessPlanClient } from './SuccessPlanClient'

export default async function SuccessPlanPage() {
  await requirePageAuth()
  return <SuccessPlanClient />
}
