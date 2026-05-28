-- Soft delete para csm_tasks
-- Tarefas excluídas ficam visíveis na Lixeira e podem ser restauradas.
ALTER TABLE public.csm_tasks
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índice parcial: só indexa linhas deletadas (muito pequena em produção)
CREATE INDEX IF NOT EXISTS csm_tasks_deleted_at_idx
  ON public.csm_tasks (deleted_at)
  WHERE deleted_at IS NOT NULL;
