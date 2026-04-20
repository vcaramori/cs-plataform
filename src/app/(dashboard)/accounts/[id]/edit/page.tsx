import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AccountForm } from '../../new/components/AccountForm'
import { notFound } from 'next/navigation'

export const metadata = {
  title: 'CS-Continuum | Editar Cliente',
}

interface EditAccountPageProps {
  params: Promise<{ id: string }>
}

export default async function EditAccountPage({ params }: EditAccountPageProps) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  // Buscar dados da conta e contratos
  const { data: account, error } = await supabase
    .from('accounts')
    .select('*, contracts(*)')
    .eq('id', id)
    .single()

  if (error || !account) {
    notFound()
  }

  return <AccountForm initialData={account} mode="edit" />
}
