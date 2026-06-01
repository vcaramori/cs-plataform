import { requirePageAuth } from '@/lib/auth/require-page-auth'
import { ProductsSettingsClient } from './ProductsSettingsClient'

export default async function ProductsSettingsPage() {
  await requirePageAuth('view:settings')
  return <ProductsSettingsClient />
}
