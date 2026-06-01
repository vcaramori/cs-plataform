import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'

export async function GET() {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  const supabase = await getSupabaseServerClient()

  // 1. Contas com Health Score Crítico (<40)
  const { data: accountsHealth, error: healthError } = await supabase
    .from('accounts')
    .select('id, name, health_score, csm_owner_id')
    .lt('health_score', 40)
    .order('health_score', { ascending: true })

  if (healthError) {
    console.error('Error fetching accounts with critical health score:', healthError)
    return NextResponse.json({ error: healthError.message }, { status: 500 })
  }

  // 2. Playbooks em atraso — legado removido (módulo migrado para Fluxos)
  const delayedPlaybooks: any[] = []

  // 3. Riscos Críticos / Altos não mitigados
  const { data: openRisks, error: risksError } = await supabase
    .from('account_risks')
    .select('id, account_id, risk_type, severity, status, accounts(name)')
    .in('severity', ['high', 'critical'])
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })

  // 4. Buscar perfis válidos de CSM
  const { data: validCsms } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['csm', 'csm_senior', 'head_cs', 'account_manager', 'admin', 'super_admin'])

  const validCsmIds = new Set((validCsms || []).map(c => c.id))

  // 5. Todas as contas para o dropdown de Novo Risco e verificação de CSM
  const { data: allAccounts, error: allAccountsError } = await supabase
    .from('accounts')
    .select('id, name, csm_owner_id')
    .order('name', { ascending: true })

  if (allAccountsError) {
    console.error('Error fetching all accounts:', allAccountsError)
    return NextResponse.json({ error: allAccountsError.message }, { status: 500 })
  }

  const unassignedAccounts = (allAccounts || []).filter(
    a => !a.csm_owner_id || !validCsmIds.has(a.csm_owner_id)
  )

  return NextResponse.json({
    accountsHealth: accountsHealth || [],
    delayedPlaybooks: delayedPlaybooks || [],
    openRisks: openRisks || [],
    allAccounts: allAccounts || [],
    unassignedAccounts: unassignedAccounts || []
  })
}

