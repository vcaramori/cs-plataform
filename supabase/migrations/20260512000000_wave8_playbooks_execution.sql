-- Migration for Playbooks Wave 1 Execution

-- 1. Add SLA config to playbook_tasks
ALTER TABLE public.playbook_tasks ADD COLUMN days_after_start int DEFAULT 0;

-- 2. Modify account_playbook_tasks to support custom tasks and SLAs
ALTER TABLE public.account_playbook_tasks ALTER COLUMN task_id DROP NOT NULL;
ALTER TABLE public.account_playbook_tasks ADD COLUMN is_custom boolean DEFAULT false;
ALTER TABLE public.account_playbook_tasks ADD COLUMN title text;
ALTER TABLE public.account_playbook_tasks ADD COLUMN description text;
ALTER TABLE public.account_playbook_tasks ADD COLUMN task_type text DEFAULT 'manual' CHECK (task_type IN ('manual', 'email', 'meeting', 'review'));
ALTER TABLE public.account_playbook_tasks ADD COLUMN due_date timestamptz;
ALTER TABLE public.account_playbook_tasks ADD COLUMN completed_by uuid REFERENCES auth.users(id);

-- 3. Create playbook_audit_logs table
CREATE TABLE public.playbook_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    account_playbook_id uuid NOT NULL REFERENCES public.account_playbooks(id) ON DELETE CASCADE,
    account_playbook_task_id uuid REFERENCES public.account_playbook_tasks(id) ON DELETE CASCADE,
    actor_id uuid NOT NULL REFERENCES auth.users(id),
    action text NOT NULL, -- e.g., 'task_completed', 'task_reverted', 'custom_task_added'
    details jsonb, -- To store reason or previous state
    created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_playbook_audit_logs_playbook_id ON public.playbook_audit_logs(account_playbook_id);
