'use server'

import { getSupabaseServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Utility to add business days (skips weekends)
function addBusinessDays(startDate: Date, days: number): Date {
  const result = new Date(startDate);
  let daysAdded = 0;
  
  while (daysAdded < days) {
    result.setDate(result.getDate() + 1);
    // 0 is Sunday, 6 is Saturday
    if (result.getDay() !== 0 && result.getDay() !== 6) {
      daysAdded++;
    }
  }
  
  // Set to end of business day (18:00)
  result.setHours(18, 0, 0, 0);
  return result;
}

export async function togglePlaybookStatus(id: string, isActive: boolean) {
  const supabase = await getSupabaseServerClient()
  
  const { error } = await supabase
    .from('playbook_templates')
    .update({ is_active: isActive })
    .eq('id', id)
    
  if (error) {
    console.error('Error updating playbook status:', error)
    return { success: false, error: error.message }
  }
  
  revalidatePath('/playbooks')
  return { success: true }
}

export async function instantiatePlaybook(accountId: string, templateId: string) {
  const supabase = await getSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  // 1. Obter o CSM da conta para atribuição
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('csm_owner_id')
    .eq('id', accountId)
    .single()
    
  if (accountError) {
    console.error('Error fetching account:', accountError)
    return { success: false, error: accountError.message }
  }
  
  const csmOwnerId = account?.csm_owner_id || user.id;

  // 2. Buscar as tarefas do template para calcular o due_date do playbook
  const { data: tasks, error: tasksError } = await supabase
    .from('playbook_tasks')
    .select('*')
    .eq('template_id', templateId)
    .order('step_order', { ascending: true })
    
  if (tasksError) {
    console.error('Error fetching template tasks:', tasksError)
    return { success: false, error: tasksError.message }
  }

  // Calcular o due date geral do playbook baseado na tarefa com maior prazo
  let maxDueDays = 0;
  if (tasks && tasks.length > 0) {
    maxDueDays = Math.max(...tasks.map(t => t.due_days_from_start || 0));
  }
  const playbookDueDate = addBusinessDays(new Date(), maxDueDays);

  // 3. Criar a instância do playbook
  const { data: instance, error: instanceError } = await supabase
    .from('account_playbooks')
    .insert({
      account_id: accountId,
      template_id: templateId,
      status: 'in_progress',
      started_at: new Date().toISOString(),
      csm_owner_id: user.id, // Quem instanciou
      due_date: playbookDueDate.toISOString()
    })
    .select()
    .single()
    
  if (instanceError) {
    console.error('Error creating playbook instance:', instanceError)
    return { success: false, error: instanceError.message }
  }
  
  // (As tarefas já foram buscadas no passo 2)
  if (tasks && tasks.length > 0) {
    const startDate = new Date();
    
    const tasksToInsert = tasks.map(task => {
      // Calculate due date based on SLA business days
      const daysToAdd = task.due_days_from_start || 0;
      const dueDate = addBusinessDays(startDate, daysToAdd);

      return {
        account_playbook_id: instance.id,
        task_id: task.id,
        status: 'pending',
        created_at: new Date().toISOString(),
        title: task.title,
        description: task.description,
        task_type: task.task_type || 'manual',
        is_custom: false,
        due_date: dueDate.toISOString(),
        assigned_to: csmOwnerId
      };
    })
    
    const { error: insertTasksError } = await supabase
      .from('account_playbook_tasks')
      .insert(tasksToInsert)
      
    if (insertTasksError) {
      console.error('Error creating playbook tasks:', insertTasksError)
      return { success: false, error: insertTasksError.message }
    }
  }
  
  revalidatePath(`/accounts/${accountId}`)
  return { success: true, instanceId: instance.id }
}

export async function togglePlaybookTaskStatus(taskId: string, currentStatus: string, playbookId: string, notes?: string) {
  const supabase = await getSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
  const isCompleting = newStatus === 'completed';

  // 1. Validação de Nota Obrigatória
  if (isCompleting) {
    const { data: taskData, error: taskError } = await supabase
      .from('account_playbook_tasks')
      .select('is_custom, playbook_tasks(is_note_required)')
      .eq('id', taskId)
      .single();

    if (taskError) {
      console.error('Error fetching task details:', taskError);
      return { success: false, error: taskError.message };
    }

    const playbookTasksRel = taskData.playbook_tasks as any; // Handle array vs object mapping depending on schema relation
    // Depending on postgrest version, playbook_tasks might be an array if relation isn't recognized as 1:1. 
    // We'll safely unwrap it.
    const isNoteRequired = !taskData.is_custom && 
      (Array.isArray(playbookTasksRel) ? playbookTasksRel[0]?.is_note_required : playbookTasksRel?.is_note_required);

    if (isNoteRequired && (!notes || notes.trim() === '')) {
      return { success: false, error: 'Nota obrigatória para a conclusão desta tarefa. Por favor, adicione uma anotação.' };
    }
  }

  // 2. Atualizar a tarefa
  const { error: updateError } = await supabase
    .from('account_playbook_tasks')
    .update({ 
      status: newStatus,
      completed_at: isCompleting ? new Date().toISOString() : null,
      completed_by: isCompleting ? user.id : null,
      notes: notes || null
    })
    .eq('id', taskId);

  if (updateError) {
    console.error('Error toggling task:', updateError);
    return { success: false, error: updateError.message };
  }

  // 2. Registrar na auditoria (Party Mode Requirement)
  await supabase.from('playbook_audit_logs').insert({
    account_playbook_id: playbookId,
    account_playbook_task_id: taskId,
    actor_id: user.id,
    action: isCompleting ? 'task_completed' : 'task_reverted',
    details: { previous_status: currentStatus, new_status: newStatus, notes }
  });

  // 3. Checar se o playbook inteiro foi concluído
  if (isCompleting) {
    const { count } = await supabase
      .from('account_playbook_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('account_playbook_id', playbookId)
      .eq('status', 'pending');

    if (count === 0) {
      // Auto-complete playbook se não houver tarefas pendentes
      await supabase
        .from('account_playbooks')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', playbookId);
    }
  } else {
    // Se reverteu e estava concluído, volta para in_progress
    await supabase
      .from('account_playbooks')
      .update({ status: 'in_progress', completed_at: null })
      .eq('id', playbookId)
      .eq('status', 'completed');
  }

  revalidatePath(`/playbooks/execution/${playbookId}`);
  return { success: true };
}

export async function addCustomTask(playbookId: string, task: { title: string, description?: string, task_type: string, due_days: number }) {
  const supabase = await getSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  // Calcular SLA para a nova tarefa customizada
  const dueDate = addBusinessDays(new Date(), task.due_days || 0);

  const { data: newTask, error: insertError } = await supabase
    .from('account_playbook_tasks')
    .insert({
      account_playbook_id: playbookId,
      status: 'pending',
      title: task.title,
      description: task.description,
      task_type: task.task_type,
      is_custom: true,
      due_date: dueDate.toISOString(),
      created_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    console.error('Error adding custom task:', insertError);
    return { success: false, error: insertError.message };
  }

  // Registrar auditoria
  await supabase.from('playbook_audit_logs').insert({
    account_playbook_id: playbookId,
    account_playbook_task_id: newTask.id,
    actor_id: user.id,
    action: 'custom_task_added',
    details: { task_title: task.title }
  });

  revalidatePath(`/playbooks/execution/${playbookId}`);
  return { success: true };
}

export async function reassignTask(taskId: string, newCsmId: string, playbookId: string) {
  const supabase = await getSupabaseServerClient()
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Usuário não autenticado");

  // Buscar tarefa atual para logar quem era o assignee anterior
  const { data: currentTask, error: fetchError } = await supabase
    .from('account_playbook_tasks')
    .select('assigned_to')
    .eq('id', taskId)
    .single();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }

  const { error: updateError } = await supabase
    .from('account_playbook_tasks')
    .update({ assigned_to: newCsmId })
    .eq('id', taskId);

  if (updateError) {
    console.error('Error reassigning task:', updateError);
    return { success: false, error: updateError.message };
  }

  // Registrar auditoria
  await supabase.from('playbook_audit_logs').insert({
    account_playbook_id: playbookId,
    account_playbook_task_id: taskId,
    actor_id: user.id,
    action: 'task_reassigned',
    details: { previous_assignee: currentTask.assigned_to, new_assignee: newCsmId }
  });

  revalidatePath(`/playbooks/execution/${playbookId}`);
  revalidatePath(`/cs-ops/tasks`);
  return { success: true };
}
