-- Descarte do legado de Playbooks (módulo migrado para "Fluxos & Playbooks").
-- Sem dados reais; consumidores de runtime (alert-service, cs-ops cockpit, RAG)
-- já foram migrados para não referenciar estas tabelas.
drop table if exists public.account_playbook_tasks cascade;
drop table if exists public.account_playbooks cascade;
drop table if exists public.playbook_tasks cascade;
drop table if exists public.playbook_templates cascade;
drop table if exists public.playbook_audit_logs cascade;
