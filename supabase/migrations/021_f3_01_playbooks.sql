-- F3-01: Playbooks MVP with Manual Trigger
-- Create tables for playbook templates, instances, and task management

-- Playbook Templates Table
CREATE TABLE IF NOT EXISTS playbook_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_condition VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE playbook_templates IS 'Template definitions for playbook instances';
COMMENT ON COLUMN playbook_templates.trigger_condition IS 'Optional: when to auto-instantiate (e.g., "health_score < 40")';

-- Playbook Template Tasks Table
CREATE TABLE IF NOT EXISTS playbook_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES playbook_templates(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  step_order INTEGER NOT NULL,
  task_type VARCHAR(50) NOT NULL, -- 'manual' | 'email' | 'meeting' | 'review'
  action_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(template_id, step_order)
);

COMMENT ON TABLE playbook_tasks IS 'Individual tasks that make up a playbook template';
COMMENT ON COLUMN playbook_tasks.action_payload IS 'JSON config for task execution (e.g., email template ID)';

-- Account Playbooks Table (Instances)
CREATE TABLE IF NOT EXISTS account_playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES playbook_templates(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'in_progress', -- 'in_progress' | 'completed' | 'cancelled'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  csm_owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE account_playbooks IS 'Instances of playbook execution for specific accounts';

-- Account Playbook Tasks Table (Task Status per Instance)
CREATE TABLE IF NOT EXISTS account_playbook_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_playbook_id UUID NOT NULL REFERENCES account_playbooks(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES playbook_tasks(id) ON DELETE RESTRICT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- 'pending' | 'completed' | 'skipped'
  completed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(account_playbook_id, task_id)
);

COMMENT ON TABLE account_playbook_tasks IS 'Status tracking for each task in a playbook instance';

-- Create Indexes
CREATE INDEX IF NOT EXISTS idx_playbook_templates_is_active ON playbook_templates(is_active) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_playbook_tasks_template_id ON playbook_tasks(template_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_account_playbooks_account_id ON account_playbooks(account_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_account_playbooks_template_id ON account_playbooks(template_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_account_playbooks_status ON account_playbooks(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_account_playbook_tasks_playbook_id ON account_playbook_tasks(account_playbook_id) WHERE deleted_at IS NULL;

-- RLS Policies

-- Playbook Templates: CSMs can view all active templates
ALTER TABLE playbook_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csm_view_active_templates" ON playbook_templates
  FOR SELECT TO authenticated
  USING (is_active = true);

-- Account Playbooks: CSMs can view their own accounts' playbooks
ALTER TABLE account_playbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csm_view_own_playbooks" ON account_playbooks
  FOR SELECT TO authenticated
  USING (
    csm_owner_id = auth.uid() OR
    account_id IN (
      SELECT id FROM accounts WHERE csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "csm_create_playbooks" ON account_playbooks
  FOR INSERT TO authenticated
  WITH CHECK (
    account_id IN (
      SELECT id FROM accounts WHERE csm_owner_id = auth.uid()
    )
  );

-- Account Playbook Tasks: CSMs can view/update tasks for their playbooks
ALTER TABLE account_playbook_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "csm_view_own_tasks" ON account_playbook_tasks
  FOR SELECT TO authenticated
  USING (
    account_playbook_id IN (
      SELECT id FROM account_playbooks
      WHERE csm_owner_id = auth.uid() OR account_id IN (
        SELECT id FROM accounts WHERE csm_owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "csm_update_own_tasks" ON account_playbook_tasks
  FOR UPDATE TO authenticated
  USING (
    account_playbook_id IN (
      SELECT id FROM account_playbooks
      WHERE csm_owner_id = auth.uid()
    )
  )
  WITH CHECK (
    account_playbook_id IN (
      SELECT id FROM account_playbooks
      WHERE csm_owner_id = auth.uid()
    )
  );
