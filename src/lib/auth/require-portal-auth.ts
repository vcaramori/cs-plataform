import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getPortalAccounts, type PortalAccount } from './portal-accounts'

export type PortalAuthResult = {
  user: { id: string; email?: string }
  profile: {
    id: string
    full_name: string | null
    user_type: string
    account_id: string | null
    contact_id: string | null
    portal_approved_at: string
  }
  /** Conta atualmente selecionada (cookie portal_account, default = 1ª). */
  account: PortalAccount
  /** Todas as contas onde o usuário é stakeholder. */
  accounts: PortalAccount[]
}

export async function requirePortalAuth(): Promise<PortalAuthResult> {
  const supabase = await getSupabaseServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/portal/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, user_type, account_id, contact_id, portal_approved_at')
    .eq('id', user.id)
    .single()

  // Deve ser usuário externo e aprovado
  if (!profile || profile.user_type !== 'external' || !profile.portal_approved_at) {
    redirect('/portal/login')
  }

  // Contas onde é stakeholder (multi-cliente) + fallback legado account_id
  const accounts = await getPortalAccounts(user.email, profile.account_id)
  if (accounts.length === 0) redirect('/portal/login')

  // Conta selecionada via cookie, validada contra as permitidas
  const cookieStore = await cookies()
  const selected = cookieStore.get('portal_account')?.value
  const account = accounts.find(a => a.id === selected) ?? accounts[0]

  return {
    user: { id: user.id, email: user.email },
    profile: profile as PortalAuthResult['profile'],
    account,
    accounts,
  }
}
