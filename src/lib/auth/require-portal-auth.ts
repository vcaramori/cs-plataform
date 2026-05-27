import { redirect } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export type PortalAuthResult = {
  user: { id: string; email?: string }
  profile: {
    id: string
    full_name: string | null
    user_type: string
    account_id: string
    contact_id: string | null
    portal_approved_at: string
  }
  account: {
    id: string
    name: string
    logo_url: string | null
  }
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
  if (
    !profile ||
    profile.user_type !== 'external' ||
    !profile.portal_approved_at ||
    !profile.account_id
  ) {
    redirect('/portal/login')
  }

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, logo_url')
    .eq('id', profile.account_id)
    .single()

  if (!account) redirect('/portal/login')

  return {
    user: { id: user.id, email: user.email },
    profile: profile as PortalAuthResult['profile'],
    account,
  }
}
