#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function getMigrationHistory() {
  try {
    const { data } = await supabase.from('_migrations').select('name')
    return new Set((data || []).map(m => m.name))
  } catch {
    return new Set()
  }
}

async function applyMigration(name, sql) {
  try {
    // Execute SQL directly via Postgres
    const { error } = await supabase.rpc('exec', { sql })
    if (error) {
      // If RPC fails, try direct query with single statements
      const statements = sql.split(';').filter(s => s.trim())
      for (const stmt of statements) {
        if (!stmt.trim()) continue
        await supabase.rpc('exec', { sql: stmt + ';' })
      }
    }

    // Record migration
    await supabase.from('_migrations').insert({ name, sql })
    console.log(`✅ ${name}`)
    return true
  } catch (err) {
    console.error(`❌ ${name}: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('🚀 Applying migrations...\n')

  const migrationsDir = path.join(__dirname, '../supabase/migrations')
  const files = fs.readdirSync(migrationsDir).sort()

  const applied = await getMigrationHistory()
  const toApply = files.filter(f => f.endsWith('.sql') && !applied.has(f.replace('.sql', '')))

  if (toApply.length === 0) {
    console.log('✨ All migrations already applied')
    return
  }

  for (const file of toApply) {
    const filepath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filepath, 'utf-8')
    const name = file.replace('.sql', '')
    await applyMigration(name, sql)
  }

  console.log('\n✨ Migrations complete')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
