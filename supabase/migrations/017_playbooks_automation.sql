-- CS-Continuum: Epic 9 - Playbooks & Automation

-- ==============================================================================
-- PLAYBOOK_TEMPLATES — Jornadas padrão (E9-01)
-- ==============================================================================
CREATE TABLE public.playbook_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  trigger_condition text, -- ex: "health_score_drop_40"
  is_active bool DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir um template padrão de salvamento
INSERT INTO public.playbook_templates (id, name, description, trigger_condition) 
VALUES (
  '11111111-1111-1111-1111-111111111111', 
  'Salvamento de Conta - Risco Alto', 
  'Jornada ativada automaticamente quando o Health Score cai abaixo de 40.', 
  'health_score_drop_40'
);

-- ==============================================================================
-- PLAYBOOK_TASKS — Etapas da jornada (E9-02)
-- ==============================================================================
CREATE TABLE public.playbook_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.playbook_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  step_order int NOT NULL,
  task_type text DEFAULT 'manual' CHECK (task_type IN ('manual', 'email', 'meeting', 'review')),
  action_payload jsonb, -- Para armazenar templates de email, etc.
  created_at timestamptz DEFAULT now()
);

-- Tarefas para o template de salvamento
INSERT INTO public.playbook_tasks (template_id, title, description, step_order, task_type, action_payload) VALUES 
('11111111-1111-1111-1111-111111111111', 'Diagnóstico do Risco', 'Analisar os últimos tickets e interações para entender o motivo da queda do score.', 1, 'review', null),
('11111111-1111-1111-1111-111111111111', 'Disparo de E-mail: Check-in de Crise', 'Disparar e-mail pedindo uma reunião urgente de alinhamento com o patrocinador da conta.', 2, 'email', '{"subject": "Alinhamento Estratégico - CS Continuum", "body_template": "Olá {{contact_name}}, notamos que o uso da plataforma... Gostaríamos de agendar..."}'),
('11111111-1111-1111-1111-111111111111', 'Reunião de Salvamento', 'Realizar a call de salvamento e registrar a ata nas interações.', 3, 'meeting', null);

-- ==============================================================================
-- ACCOUNT_PLAYBOOKS — Instâncias de Playbooks em contas (E9-03)
-- ==============================================================================
CREATE TABLE public.account_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.playbook_templates(id),
  status text DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  csm_owner_id uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_account_playbooks_account_id ON public.account_playbooks(account_id);
CREATE INDEX idx_account_playbooks_status ON public.account_playbooks(status);

-- ==============================================================================
-- ACCOUNT_PLAYBOOK_TASKS — Tarefas instanciadas do playbook (E9-04)
-- ==============================================================================
CREATE TABLE public.account_playbook_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_playbook_id uuid NOT NULL REFERENCES public.account_playbooks(id) ON DELETE CASCADE,
  task_id uuid NOT NULL REFERENCES public.playbook_tasks(id),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  completed_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_account_playbook_tasks_playbook_id ON public.account_playbook_tasks(account_playbook_id);

-- ==============================================================================
-- TRIGGER DE AUTOMAÇÃO DE HEALTH SCORE (E9-05)
-- ==============================================================================

-- Função que instancia um playbook automaticamente
CREATE OR REPLACE FUNCTION public.fn_trigger_health_score_playbook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_template_id uuid;
  v_csm_id uuid;
  v_new_playbook_id uuid;
  v_has_active_playbook boolean;
BEGIN
  -- Apenas disparar se o score total cair abaixo de 40 e se for INSERT ou UPDATE (com redução de score)
  IF (TG_OP = 'INSERT' AND NEW.total_score < 40) OR 
     (TG_OP = 'UPDATE' AND NEW.total_score < 40 AND OLD.total_score >= 40) THEN
     
    -- 1. Verificar se a conta já possui um playbook de salvamento em progresso
    SELECT EXISTS (
      SELECT 1 FROM public.account_playbooks 
      WHERE account_id = NEW.account_id 
        AND status = 'in_progress' 
        AND template_id = '11111111-1111-1111-1111-111111111111'
    ) INTO v_has_active_playbook;

    IF NOT v_has_active_playbook THEN
      -- Buscar o CSM dono da conta
      SELECT csm_owner_id INTO v_csm_id FROM public.accounts WHERE id = NEW.account_id;

      -- 2. Criar a instância do playbook
      INSERT INTO public.account_playbooks (account_id, template_id, csm_owner_id, status)
      VALUES (NEW.account_id, '11111111-1111-1111-1111-111111111111', v_csm_id, 'in_progress')
      RETURNING id INTO v_new_playbook_id;

      -- 3. Instanciar as tarefas associadas a esse template
      INSERT INTO public.account_playbook_tasks (account_playbook_id, task_id, status)
      SELECT v_new_playbook_id, id, 'pending'
      FROM public.playbook_tasks
      WHERE template_id = '11111111-1111-1111-1111-111111111111';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Vincular a função à tabela health_scores (DESATIVADO TEMPORARIAMENTE)
-- DROP TRIGGER IF EXISTS trigger_auto_playbook_on_health_score ON public.health_scores;
-- CREATE TRIGGER trigger_auto_playbook_on_health_score
-- AFTER INSERT OR UPDATE ON public.health_scores
-- FOR EACH ROW
-- EXECUTE FUNCTION public.fn_trigger_health_score_playbook();
