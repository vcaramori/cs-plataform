import pkg from 'pg';
const { Client } = pkg;
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Carregar .env manualmente
const envContent = readFileSync(join(__dirname, '../.env'), 'utf-8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
}

const password = env['SUPABASE_DB_PASSWORD'];
const projectRef = env['SUPABASE_PROJECT_REF'];

if (!password || !projectRef) {
  console.error('❌ SUPABASE_DB_PASSWORD ou SUPABASE_PROJECT_REF não encontrados no .env');
  process.exit(1);
}

// Tentar conectar via pooler do Supabase (Região us-east-1)
const connectionString = `postgres://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;

const client = new Client({
  connectionString,
  ssl: {
    rejectUnauthorized: false // Necessário para Supabase
  }
});

async function main() {
  try {
    console.log('🔄 Conectando ao banco de dados Supabase via Pooler (us-east-1)...');
    console.log(`Host: aws-0-us-east-1.pooler.supabase.com`);
    await client.connect();
    console.log('✅ Conectado com sucesso!');

    const sqlPath = join(__dirname, '../supabase/migrations/consolidated_missing_migrations.sql');
    console.log(`📖 Lendo arquivo de migrations: ${sqlPath}`);
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('⏳ Executando migrations (isso pode levar alguns segundos)...');
    
    const res = await client.query(sql);
    
    console.log('✅ Migrations executadas com sucesso!');
    console.log('Resultado:', res.length ? `Executados ${res.length} comandos.` : 'Comando executado.');

  } catch (err) {
    console.error('❌ Erro ao executar migrations:', err);
  } finally {
    await client.end();
    console.log('🔌 Conexão encerrada.');
  }
}

main();
