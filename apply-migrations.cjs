#!/usr/bin/env node

require('dotenv').config()

const fs = require('fs')
const path = require('path')
const pg = require('pg')

const PROJECT_REF = 'mgkwaejxazwwevblqycd'
const DB_HOST = `db.${PROJECT_REF}.supabase.co`
const DB_USER = 'postgres'
const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD

if (!DB_PASSWORD) {
  console.error('❌ SUPABASE_DB_PASSWORD not set in .env')
  process.exit(1)
}

const pool = new pg.Pool({
  user: DB_USER,
  password: DB_PASSWORD,
  host: DB_HOST,
  port: 5432,
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
})

async function main() {
  const client = await pool.connect()

  try {
    console.log('🚀 Connecting to Supabase database...')

    // Create migrations table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        sql TEXT NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('✅ Migrations table ensured\n')

    // Get applied migrations
    const result = await client.query('SELECT name FROM _migrations ORDER BY name')
    const appliedSet = new Set(result.rows.map(r => r.name))

    // Get migration files
    const migrationsDir = path.join(__dirname, 'supabase/migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    console.log(`📂 Found ${files.length} migration files\n`)

    let applied = 0
    let skipped = 0
    let failed = 0

    for (const file of files) {
      const name = file.replace('.sql', '')

      if (appliedSet.has(name)) {
        console.log(`⏭️  ${name} (already applied)`)
        skipped++
        continue
      }

      try {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')

        await client.query('BEGIN')
        console.log(`📝 ${name}...`)

        // Execute migration
        await client.query(sql)

        // Record it
        await client.query(
          'INSERT INTO _migrations (name, sql) VALUES ($1, $2)',
          [name, sql]
        )

        await client.query('COMMIT')
        console.log(`✅ ${name}`)
        applied++
      } catch (err) {
        try {
          await client.query('ROLLBACK')
        } catch {}

        console.error(`❌ ${name}: ${err.message}`)
        failed++
      }
    }

    console.log(`\n📊 Summary: ${applied} applied, ${skipped} skipped, ${failed} failed`)

    if (failed > 0) {
      process.exit(1)
    }
  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  } finally {
    await client.release()
    await pool.end()
  }
}

main()
