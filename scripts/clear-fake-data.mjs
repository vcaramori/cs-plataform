import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carregar variáveis de ambiente manualmente do .env no diretório raiz
const envContent = readFileSync(join(__dirname, '../.env'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || env['SUPABASE_URL'];
const supabaseServiceKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontrados no arquivo .env');
  process.exit(1);
}

// Criar o cliente Supabase Admin (ignora RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Lista de tabelas transacionais a serem limpas em ordem de dependência (para evitar erros de chave estrangeira)
const TABLES_TO_CLEAR = [
  'embeddings',
  'interactions',
  'time_entries',
  'support_ticket_messages',
  'support_tickets',
  'health_scores',
  'contract_history',
  'success_goals',
  'adoption_metrics',
  'feature_adoption',
  'nps_responses',
  'nps_answers',
  'nps_questions',
  'nps_programs',
  'sla_events',
  'sla_level_mappings',
  'sla_policy_levels',
  'sla_policies',
  'business_hours',
  'csat_responses',
  'csat_tokens',
  'notifications',
  'account_risk_assessments',
  'account_playbook_tasks',
  'account_playbooks',
  'saved_views',
  'csm_queue_config',
  'ticket_merge_history',
  'ticket_similarity_candidates',
  'ticket_events',
  'timeline_events',
  'commercial_governance',
  'support_schedules',
  'auto_assign_stats',
  'sla_escalations',
  'sla_escalation_metrics',
  'categorization_suggestions',
  'reply_suggestions',
  'reply_suggestion_cache',
  'reply_suggestion_telemetry',
  'ticket_summary_cache',
  'ticket_summary_history',
  'reply_sentiments',
  'auto_checkin_queue',
  'proactive_alerts',
  'success_plans',
  'success_plan_goals',
  'playbook_audit_logs',
  'account_risks',
  'contracts',
  'contacts',
  'accounts',
  'clients'
];

async function main() {
  console.log('🧹 Iniciando limpeza da base de dados via REST API (Supabase Admin)...');
  console.log(`URL do Projeto: ${supabaseUrl}`);

  let successCount = 0;
  let errorCount = 0;

  for (const table of TABLES_TO_CLEAR) {
    try {
      process.stdout.write(`   ↳ Limpando tabela public."${table}"... `);

      // Executa delete sem filtros para limpar todos os registros
      // A chave Service Role Key do Supabase tem permissão de bypass RLS
      const { error } = await supabase
        .from(table)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Deleta tudo que não for o ID dummy (ou seja, tudo)

      if (error) {
        // Se falhar porque a tabela não tem coluna "id", tentamos limpar usando filtro de data ou ignoramos se vazia
        const { error: altError } = await supabase
          .from(table)
          .delete()
          .gte('created_at', '1970-01-01T00:00:00.000Z');

        if (altError) {
          throw altError;
        }
      }

      console.log('✅ LIMPA');
      successCount++;
    } catch (err) {
      console.log(`⚠️  Ignorada ou Erro: ${err.message}`);
      errorCount++;
    }
  }

  console.log('\n✨ Limpeza concluída!');
  console.log(`📊 Resumo: ${successCount} tabelas limpas com sucesso, ${errorCount} tabelas puladas/não aplicáveis.`);
}

main();
