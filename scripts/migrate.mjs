#!/usr/bin/env node
/**
 * migrate.mjs — aplica uma migration SQL diretamente no Supabase via pg pooler.
 *
 * Uso:
 *   node scripts/migrate.mjs supabase/migrations/20260528020000_csm_tasks_soft_delete.sql
 *
 * Variáveis necessárias no .env:
 *   SUPABASE_PROJECT_REF   — ref do projeto (ex: abcdefghijklmnop)
 *   SUPABASE_DB_PASSWORD   — senha do banco de dados
 */

import pkg from 'pg'
const { Client } = pkg

import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// --- Lê .env sem depender de dotenv ---
const envPath = join(__dirname, '../.env')
const envContent = readFileSync(envPath, 'utf-8')
const env = {}
for (const line of envContent.split('\n')) {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const idx = trimmed.indexOf('=')
  if (idx === -1) continue
  env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim()
}

const password = env['SUPABASE_DB_PASSWORD']
const projectRef = env['SUPABASE_PROJECT_REF']

if (!password || !projectRef) {
  console.error('❌ SUPABASE_DB_PASSWORD ou SUPABASE_PROJECT_REF não encontrados no .env')
  process.exit(1)
}

// --- Arquivo de migration passado como argumento ---
const migrationArg = process.argv[2]
if (!migrationArg) {
  console.error('❌ Informe o caminho da migration como argumento.')
  console.error('   Exemplo: node scripts/migrate.mjs supabase/migrations/20260528020000_csm_tasks_soft_delete.sql')
  process.exit(1)
}

const migrationPath = join(process.cwd(), migrationArg)
let sql
try {
  sql = readFileSync(migrationPath, 'utf-8')
} catch {
  console.error(`❌ Arquivo não encontrado: ${migrationPath}`)
  process.exit(1)
}

// --- Conexão via Supabase Pooler ---
const connectionString = `postgres://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`
const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } })

async function run() {
  console.log(`\n🔄 Conectando ao Supabase (project: ${projectRef})...`)
  await client.connect()
  console.log('✅ Conectado.\n')

  console.log(`📄 Migration: ${migrationArg}`)
  console.log('─'.repeat(60))

  // Divide por ';' mas respeita blocos $$ (funções PL/pgSQL)
  const statements = splitSQL(sql)
  let ok = 0, skipped = 0

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i].trim()
    if (!stmt) continue

    const preview = stmt.replace(/\s+/g, ' ').slice(0, 80)
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}...\n`)

    try {
      await client.query(stmt)
      process.stdout.write('  → ✅ ok\n\n')
      ok++
    } catch (err) {
      const alreadyExists = err.code === '42P07' || err.code === '42701' ||
        (err.message || '').toLowerCase().includes('already exists')

      if (alreadyExists) {
        process.stdout.write('  → ⚠️  já existe (ignorado)\n\n')
        skipped++
      } else {
        process.stdout.write(`  → ❌ ERRO: ${err.message}\n\n`)
        await client.end()
        process.exit(1)
      }
    }
  }

  console.log('─'.repeat(60))
  console.log(`✅ Migration aplicada: ${ok} statements executados, ${skipped} ignorados.\n`)
  await client.end()
}

/**
 * Divide SQL respeitando blocos $$ para não quebrar funções/triggers.
 */
function splitSQL(sql) {
  const results = []
  let current = ''
  let inDollar = false

  const lines = sql.split('\n')
  for (const line of lines) {
    if (line.trim().startsWith('--')) {
      current += line + '\n'
      continue
    }
    if (line.includes('$$')) inDollar = !inDollar
    current += line + '\n'
    if (!inDollar && current.trim().endsWith(';')) {
      results.push(current.trim())
      current = ''
    }
  }
  if (current.trim()) results.push(current.trim())
  return results
}

run().catch(err => {
  console.error('❌ Erro fatal:', err.message)
  process.exit(1)
})
