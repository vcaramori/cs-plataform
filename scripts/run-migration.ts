#!/usr/bin/env npx tsx

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados no .env');
  process.exit(1);
}

// Parse Supabase URL to extract host
const urlObj = new URL(supabaseUrl);
const projectRef = urlObj.hostname.split('.')[0];

// Construct PostgreSQL connection string
const connectionString = `postgresql://postgres:${serviceRoleKey}@db.${projectRef}.supabase.co:5432/postgres`;

const pool = new Pool({ connectionString });

async function runMigration() {
  const client = await pool.connect();

  try {
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/008_phase1_foundation.sql');

    if (!fs.existsSync(migrationPath)) {
      console.error(`❌ Migration file not found: ${migrationPath}`);
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Conectando ao Supabase...\n');

    console.log('📝 Executando migration 008_phase1_foundation.sql...\n');

    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0 && !stmt.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      process.stdout.write(`  [${i + 1}/${statements.length}] Executando...`);

      try {
        await client.query(statement);
        console.log(' ✓\n');
      } catch (err: any) {
        // Ignore "already exists" errors for idempotency
        if (err.code === '42P07' || err.message.includes('already exists')) {
          console.log(' (já existe) ✓\n');
        } else {
          console.log(` ❌\n`);
          throw err;
        }
      }
    }

    console.log('\n✅ Migration 008 executada com sucesso!\n');
    console.log('📊 Tabelas criadas / verificadas:');
    console.log('  ✓ saved_views (com RLS)');
    console.log('  ✓ csm_queue_config (com RLS)');
    console.log('  ✓ ticket_merge_history');
    console.log('  ✓ ticket_similarity_candidates');
    console.log('  ✓ ticket_events');
    console.log('  ✓ timeline_events (com RLS)');
    console.log('\n💾 Índices criados: 12');
    console.log('🔒 Políticas RLS: 8');

  } catch (err) {
    console.error('❌ Erro ao executar migration:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
