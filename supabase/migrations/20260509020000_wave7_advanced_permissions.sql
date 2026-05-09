-- Wave 7: Epic 35 - Advanced Permissions

-- Extend user_roles with new roles
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'csm', 'account_manager', 'report_viewer', 'finance_auditor', 'read_only')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, account_id, role)
);

-- Permission matrix table
CREATE TABLE IF NOT EXISTS permission_matrix (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'csm', 'account_manager', 'report_viewer', 'finance_auditor', 'read_only')),
  resource TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('view', 'create', 'edit', 'delete', 'export')),
  is_allowed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(role, resource, action)
);

-- Resource-level access grants
CREATE TABLE IF NOT EXISTS resource_access (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('account', 'contract', 'ticket', 'interaction')),
  resource_id UUID NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit', 'manage')),
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(user_id, resource_type, resource_id, permission)
);

-- Audit trail for permission changes
CREATE TABLE IF NOT EXISTS permission_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('role_assigned', 'role_revoked', 'permission_granted', 'permission_revoked', 'access_granted', 'access_revoked')),
  resource_type TEXT,
  resource_id UUID,
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_fields JSONB,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE resource_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admins can manage user roles" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.account_id = user_roles.account_id
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Users can view their own roles" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Everyone can view permission matrix" ON permission_matrix
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage permission matrix" ON permission_matrix
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Users can view their own resource access" ON resource_access
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can manage resource access" ON resource_access
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
      AND ur.account_id = resource_access.account_id
      AND ur.role = 'admin'
    )
  );

CREATE POLICY "Users can view audit logs for their account" ON permission_audit_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accounts a
      WHERE auth.uid()::text = (SELECT created_by::text FROM accounts WHERE id = a.id)
    )
  );

-- Indexes
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX idx_user_roles_account_id ON user_roles(account_id);
CREATE INDEX idx_user_roles_role ON user_roles(role);
CREATE INDEX idx_permission_matrix_role ON permission_matrix(role);
CREATE INDEX idx_permission_matrix_resource ON permission_matrix(resource);
CREATE INDEX idx_resource_access_user_id ON resource_access(user_id);
CREATE INDEX idx_resource_access_resource ON resource_access(resource_type, resource_id);
CREATE INDEX idx_permission_audit_logs_user_id ON permission_audit_logs(user_id);
CREATE INDEX idx_permission_audit_logs_created_at ON permission_audit_logs(created_at);

-- Seed default permission matrix
INSERT INTO permission_matrix (role, resource, action, is_allowed) VALUES
-- Admin: Full access
('admin', 'accounts', 'view', true),
('admin', 'accounts', 'create', true),
('admin', 'accounts', 'edit', true),
('admin', 'accounts', 'delete', true),
('admin', 'accounts', 'export', true),
('admin', 'contracts', 'view', true),
('admin', 'contracts', 'create', true),
('admin', 'contracts', 'edit', true),
('admin', 'contracts', 'delete', true),
('admin', 'contracts', 'export', true),
('admin', 'tickets', 'view', true),
('admin', 'tickets', 'create', true),
('admin', 'tickets', 'edit', true),
('admin', 'tickets', 'delete', true),
('admin', 'interactions', 'view', true),
('admin', 'interactions', 'create', true),
('admin', 'interactions', 'edit', true),
('admin', 'interactions', 'delete', true),
('admin', 'integrations', 'view', true),
('admin', 'integrations', 'create', true),
('admin', 'integrations', 'edit', true),
('admin', 'integrations', 'delete', true),
('admin', 'reports', 'view', true),
('admin', 'reports', 'export', true),

-- CSM: Limited access to accounts and tickets
('csm', 'accounts', 'view', true),
('csm', 'accounts', 'edit', true),
('csm', 'contracts', 'view', true),
('csm', 'contracts', 'edit', true),
('csm', 'tickets', 'view', true),
('csm', 'tickets', 'edit', true),
('csm', 'interactions', 'view', true),
('csm', 'interactions', 'create', true),
('csm', 'interactions', 'edit', true),
('csm', 'reports', 'view', true),

-- Account Manager: View and manage accounts
('account_manager', 'accounts', 'view', true),
('account_manager', 'accounts', 'edit', true),
('account_manager', 'contracts', 'view', true),
('account_manager', 'contracts', 'edit', true),
('account_manager', 'reports', 'view', true),
('account_manager', 'reports', 'export', true),

-- Report Viewer: Read-only access to reports
('report_viewer', 'accounts', 'view', true),
('report_viewer', 'contracts', 'view', true),
('report_viewer', 'reports', 'view', true),
('report_viewer', 'reports', 'export', true),

-- Finance Auditor: Access to financial data
('finance_auditor', 'accounts', 'view', true),
('finance_auditor', 'contracts', 'view', true),
('finance_auditor', 'contracts', 'export', true),
('finance_auditor', 'reports', 'view', true),
('finance_auditor', 'reports', 'export', true),

-- Read-only: Minimal access
('read_only', 'accounts', 'view', true),
('read_only', 'contracts', 'view', true),
('read_only', 'reports', 'view', true);
