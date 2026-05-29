-- ============================================================================
-- LIMPEZA DOS DADOS DEMO (mock para teste de telas)
-- Criados em 2026-05-29. Todos os registros usam IDs com prefixo 'd0000…'/'d1…'/
-- 'd2…'/'d4…'/'d5…'/'d6…'/'d7…' e contas com nome 'DEMO · ...', dono = Vinicius.
-- Rode tudo de uma vez. Não afeta dados reais (ex.: Cristália).
-- ============================================================================

-- NPS (answers -> responses -> questions -> program)
delete from nps_answers   where response_id in (select id from nps_responses where id::text like 'd42000%');
delete from nps_responses where id::text like 'd42000%';
delete from nps_questions  where program_id = 'd4000000-0000-4000-8000-0000000000a0';
delete from nps_programs   where id = 'd4000000-0000-4000-8000-0000000000a0';

-- Suporte (reply_sentiments -> messages -> tickets)
delete from reply_sentiments       where ticket_id::text like 'd50000%';
delete from support_ticket_messages where ticket_id::text like 'd50000%';
delete from support_tickets         where id::text like 'd50000%';

-- Dados ligados às contas demo
delete from csm_tasks               where account_id::text like 'd00000%';
delete from feature_adoption        where account_id::text like 'd00000%';
delete from interactions            where account_id::text like 'd00000%';
delete from account_risk_assessments where account_id::text like 'd00000%';
delete from contracts               where account_id::text like 'd00000%';

-- Contas demo (por último)
delete from accounts                where id::text like 'd00000%';
