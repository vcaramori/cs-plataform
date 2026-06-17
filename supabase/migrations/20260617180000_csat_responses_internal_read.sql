-- CSAT só era visível para o CSM dono da conta (account_id via csm_owner_id). Usuários
-- internos sem contas próprias (ex.: super_admin) liam NULL → a tela de detalhe mostrava
-- "Aguardando avaliação" e o dashboard zerava o CSAT, mesmo com a avaliação importada
-- corretamente do HelpDesk. Espelha a visibilidade ampla de support_tickets: qualquer
-- usuário INTERNO pode ler o CSAT (não expõe a usuários externos do portal).
DROP POLICY IF EXISTS "Internal users can view CSAT" ON csat_responses;
CREATE POLICY "Internal users can view CSAT" ON csat_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.user_type = 'internal')
  );
