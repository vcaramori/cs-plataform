'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createRisk(data: {
  account_id: string;
  risk_type: string;
  severity: string;
  status: string;
  description: string;
  action_plan?: string;
}) {
  const supabase = (await getSupabaseServerClient()) as any;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  if (data.severity === 'critical' && (!data.action_plan || data.action_plan.trim() === '')) {
    return { success: false, error: 'Plano de ação é obrigatório para riscos de severidade crítica.' };
  }

  const { data: risk, error } = await supabase
    .from('account_risks')
    .insert({
      ...data,
      identified_by: user.id
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating risk:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/cs-ops');
  revalidatePath(`/accounts/${data.account_id}`);
  return { success: true, riskId: risk.id };
}

export async function updateRiskStatus(id: string, data: { status?: string; severity?: string; action_plan?: string; description?: string }) {
  const supabase = (await getSupabaseServerClient()) as any;

  // For checking existing severity if only status/action_plan is provided
  if (!data.severity && data.action_plan !== undefined) {
    const { data: existingRisk, error: fetchError } = await supabase
      .from('account_risks')
      .select('severity')
      .eq('id', id)
      .single();
      
    if (fetchError) {
      return { success: false, error: fetchError.message };
    }
    
    if (existingRisk.severity === 'critical' && (!data.action_plan || data.action_plan.trim() === '')) {
      return { success: false, error: 'Plano de ação é obrigatório para riscos de severidade crítica.' };
    }
  } else if (data.severity === 'critical') {
      if (!data.action_plan || data.action_plan.trim() === '') {
         return { success: false, error: 'Plano de ação é obrigatório para riscos de severidade crítica.' };
      }
  }


  const { error } = await supabase
    .from('account_risks')
    .update({ ...data })
    .eq('id', id);

  if (error) {
    console.error('Error updating risk:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/cs-ops');
  return { success: true };
}

export async function resolveRisk(id: string) {
  const supabase = (await getSupabaseServerClient()) as any;

  const { error } = await supabase
    .from('account_risks')
    .update({ status: 'resolved' })
    .eq('id', id);

  if (error) {
    console.error('Error resolving risk:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/cs-ops');
  return { success: true };
}

