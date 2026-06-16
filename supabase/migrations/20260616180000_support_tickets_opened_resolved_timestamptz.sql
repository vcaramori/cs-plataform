-- opened_at/resolved_at eram `date` (sem hora), então os cálculos de tempo de 1ª resposta
-- e de resolução no dashboard de suporte perdiam a precisão intradiária (chamado aberto e
-- resolvido no mesmo dia = 0min). Convertendo para timestamptz para guardar a hora real do
-- HelpDesk. Compatível: o código já trata essas colunas como ISO string (.slice/new Date/gte).
-- A view stale_ticket_summaries depende de opened_at → drop + recreate idêntico.
DROP VIEW IF EXISTS stale_ticket_summaries;

ALTER TABLE support_tickets
  ALTER COLUMN opened_at TYPE timestamptz USING opened_at::timestamptz,
  ALTER COLUMN resolved_at TYPE timestamptz USING resolved_at::timestamptz;

CREATE VIEW stale_ticket_summaries AS
  SELECT st.id, st.title, st.status, st.assigned_to, tsc.summary_text, tsc.generated_at,
    (EXTRACT(hour FROM (now() - tsc.generated_at)))::integer AS hours_since_generation
  FROM (support_tickets st
    LEFT JOIN ticket_summary_cache tsc ON ((st.id = tsc.ticket_id)))
  WHERE ((st.status = ANY (ARRAY['open'::text, 'in_progress'::text]))
    AND ((st.summary_generated_at IS NULL)
      OR ((now() - st.summary_generated_at) > '24:00:00'::interval)
      OR (tsc.stale = true)))
  ORDER BY st.opened_at DESC;
