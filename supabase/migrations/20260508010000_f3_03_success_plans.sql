-- F3-03: Success Plans MVP
-- Creates success plan templates with shared tokens for public viewing

-- Table: success_plans
CREATE TABLE success_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  shared_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Table: success_plan_goals
CREATE TABLE success_plan_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES success_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'completed', 'delayed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for performance
CREATE INDEX idx_success_plans_account_id ON success_plans(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_success_plans_shared_token ON success_plans(shared_token) WHERE deleted_at IS NULL;
CREATE INDEX idx_success_plans_created_by ON success_plans(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_success_plan_goals_plan_id ON success_plan_goals(plan_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_success_plan_goals_status ON success_plan_goals(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_success_plan_goals_target_date ON success_plan_goals(target_date) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE success_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_plan_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for success_plans
CREATE POLICY "CSM sees own account plans"
  ON success_plans FOR SELECT
  USING (
    account_id IN (SELECT id FROM accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "CSM creates own account plans"
  ON success_plans FOR INSERT
  WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "CSM manages own account plans"
  ON success_plans FOR UPDATE
  USING (
    account_id IN (SELECT id FROM accounts WHERE csm_owner_id = auth.uid())
  );

-- RLS Policies for success_plan_goals
CREATE POLICY "CSM manages plan goals"
  ON success_plan_goals FOR ALL
  USING (
    plan_id IN (
      SELECT id FROM success_plans
      WHERE account_id IN (SELECT id FROM accounts WHERE csm_owner_id = auth.uid())
    )
  );

-- Grant permissions
GRANT ALL ON success_plans TO authenticated;
GRANT ALL ON success_plan_goals TO authenticated;
