-- ================================================================
-- Comentários e Anexos para csm_tasks
-- ================================================================

-- Comentários
CREATE TABLE IF NOT EXISTS public.csm_task_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES public.csm_tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS csm_task_comments_task_id_idx ON public.csm_task_comments (task_id);

ALTER TABLE public.csm_task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS csm_task_comments_policy ON public.csm_task_comments;
CREATE POLICY csm_task_comments_policy ON public.csm_task_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.csm_tasks t
      WHERE t.id = task_id
        AND (t.csm_id = auth.uid() OR public.has_module_permission('atividades', 'view_team'))
    )
  );

-- Anexos
CREATE TABLE IF NOT EXISTS public.csm_task_attachments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    UUID NOT NULL REFERENCES public.csm_tasks(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name  TEXT NOT NULL,
  file_url   TEXT NOT NULL,
  file_size  INTEGER,
  mime_type  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS csm_task_attachments_task_id_idx ON public.csm_task_attachments (task_id);

ALTER TABLE public.csm_task_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS csm_task_attachments_policy ON public.csm_task_attachments;
CREATE POLICY csm_task_attachments_policy ON public.csm_task_attachments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.csm_tasks t
      WHERE t.id = task_id
        AND (t.csm_id = auth.uid() OR public.has_module_permission('atividades', 'view_team'))
    )
  );
