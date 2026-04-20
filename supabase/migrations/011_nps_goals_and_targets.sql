-- Migration 011: NPS Goals and Program Targets
-- Implement metas vivas e históricas para NPS

-- 1. Tabela de Metas Globais (Histórico)
CREATE TABLE IF NOT EXISTS public.nps_global_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_score INT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ, -- nulo se for a meta atual
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adiciona campo de meta opcional nos programas
ALTER TABLE public.nps_programs ADD COLUMN IF NOT EXISTS target_score INT;

-- 3. Habilita RLS para nps_global_goals
ALTER TABLE public.nps_global_goals ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de RLS para metas (leitura por todos os CSMs, escrita por administradores ou qualquer CSM autenticado neste contexto simplificado)
CREATE POLICY "nps_global_goals_select" ON public.nps_global_goals
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "nps_global_goals_insert" ON public.nps_global_goals
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "nps_global_goals_update" ON public.nps_global_goals
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. Função para fechar meta anterior ao inserir uma nova (Trigger simplificado ou execução manual no backend)
-- No backend, sempre que inserirmos uma nova meta global, faremos o update da anterior setando end_date = now().
