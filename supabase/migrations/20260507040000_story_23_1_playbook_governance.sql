-- Wave 4, Story 23.1: Playbook Governance Foundation
-- Add governance fields to playbook tables for tracking assignment, timeline, effort, and comments

-- playbook_tasks: governance fields
ALTER TABLE playbook_tasks
  ADD COLUMN assigned_role VARCHAR(50),
  ADD COLUMN due_days_from_start INT,
  ADD COLUMN estimated_hours DECIMAL(5,2),
  ADD COLUMN feature_tags TEXT[];

-- account_playbook_tasks: governance + collaboration fields
ALTER TABLE account_playbook_tasks
  ADD COLUMN assigned_to UUID REFERENCES auth.users(id) DEFERRABLE,
  ADD COLUMN due_date TIMESTAMPTZ,
  ADD COLUMN completed_by UUID REFERENCES auth.users(id) DEFERRABLE,
  ADD COLUMN comments JSONB DEFAULT '[]',
  ADD COLUMN time_spent_hours DECIMAL(5,2);

-- account_playbooks: strategic context fields
ALTER TABLE account_playbooks
  ADD COLUMN expected_end_date TIMESTAMPTZ,
  ADD COLUMN objective TEXT,
  ADD COLUMN success_criteria TEXT;

-- No RLS changes needed — new fields inherit policies from existing columns
-- Comments array: [{ author_id UUID, author_name VARCHAR, text TEXT, created_at TIMESTAMPTZ }]
