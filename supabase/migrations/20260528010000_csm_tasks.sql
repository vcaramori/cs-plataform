-- ================================================================
-- Tabela de tarefas do CSM (Módulo Atividades)
-- ================================================================

CREATE TABLE IF NOT EXISTS public.csm_tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  csm_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id    UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  activity_type TEXT CHECK (activity_type IN (
                  'meeting','email','call','analysis','follow_up','internal','other'
                )),
  status        TEXT NOT NULL DEFAULT 'todo'
                  CHECK (status IN (
                    'suggested',   -- criada por IA, aguarda confirmação do CSM
                    'todo',
                    'in_progress',
                    'completed',
                    'cancelled'
                  )),
  priority      TEXT NOT NULL DEFAULT 'medium'
                  CHECK (priority IN ('low','medium','high')),
  due_date      DATE,

  -- Origem com integridade referencial (no máximo uma preenchida)
  adoption_id    UUID REFERENCES public.account_feature_adoption(id) ON DELETE SET NULL,
  time_entry_id  UUID REFERENCES public.time_entries(id)              ON DELETE SET NULL,
  alert_id       UUID REFERENCES public.proactive_alerts(id)          ON DELETE SET NULL,

  CONSTRAINT csm_tasks_single_source CHECK (
    (adoption_id IS NOT NULL)::int +
    (time_entry_id IS NOT NULL)::int +
    (alert_id IS NOT NULL)::int <= 1
  ),

  -- Label de origem imutável (persiste mesmo após ON DELETE SET NULL)
  source_label  TEXT CHECK (source_label IN (
                  'manual','adoption','time_entry','alert','playbook'
                )),

  completed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de consulta frequente
CREATE INDEX IF NOT EXISTS csm_tasks_csm_id_idx    ON public.csm_tasks (csm_id);
CREATE INDEX IF NOT EXISTS csm_tasks_account_id_idx ON public.csm_tasks (account_id);
CREATE INDEX IF NOT EXISTS csm_tasks_status_idx     ON public.csm_tasks (status);
CREATE INDEX IF NOT EXISTS csm_tasks_due_date_idx   ON public.csm_tasks (due_date);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS csm_tasks_updated_at ON public.csm_tasks;
CREATE TRIGGER csm_tasks_updated_at
  BEFORE UPDATE ON public.csm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ================================================================
-- RLS
-- ================================================================
ALTER TABLE public.csm_tasks ENABLE ROW LEVEL SECURITY;

-- GIN index em custom_roles.permissions para JSONB lookup
CREATE INDEX IF NOT EXISTS idx_custom_roles_permissions_gin
  ON public.custom_roles USING GIN (permissions);

-- Função auxiliar: verifica permissão de módulo via SECURITY DEFINER
-- STABLE = Postgres pode reutilizar resultado dentro do mesmo statement (performance)
CREATE OR REPLACE FUNCTION public.has_module_permission(p_module TEXT, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    JOIN custom_roles cr ON cr.id = p.custom_role_id
    WHERE p.id = auth.uid()
      AND cr.permissions @> jsonb_build_array(
            jsonb_build_object('module', p_module, p_action, true)
          )
  )
$$;

-- Policy 1: Dono — SELECT/INSERT/UPDATE/DELETE nas próprias tarefas
DROP POLICY IF EXISTS csm_tasks_owner ON public.csm_tasks;
CREATE POLICY csm_tasks_owner ON public.csm_tasks
  FOR ALL
  USING (csm_id = auth.uid());

-- Policy 2: Gestor com view_team — SELECT em todas as tarefas do tenant
DROP POLICY IF EXISTS csm_tasks_team_select ON public.csm_tasks;
CREATE POLICY csm_tasks_team_select ON public.csm_tasks
  FOR SELECT
  USING (public.has_module_permission('atividades', 'view_team'));

-- Policy 3: Gestor com view_team — UPDATE em tarefas de qualquer CSM (ex: mover status)
DROP POLICY IF EXISTS csm_tasks_team_update ON public.csm_tasks;
CREATE POLICY csm_tasks_team_update ON public.csm_tasks
  FOR UPDATE
  USING (public.has_module_permission('atividades', 'view_team'));
