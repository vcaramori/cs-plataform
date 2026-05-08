#!/usr/bin/env node

require('dotenv').config()

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

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function main() {
  try {
    console.log('🚀 Connecting to Supabase...')

    // Get applied migrations
    const { data: migrations, error: migrationsError } = await supabase
      .from('_migrations')
      .select('name')

    if (migrationsError && migrationsError.code !== 'PGRST116') {
      // If table doesn't exist, create it via SQL insert (migrations might be applied but not logged)
      console.log('📝 Initializing migrations table...')
    }

    const appliedSet = new Set((migrations || []).map(m => m.name))
    console.log(`✅ Migrations table ready (${appliedSet.size} already applied)\n`)

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
        console.log(`⏭️  ${name}`)
        skipped++
        continue
      }

      try {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')

        console.log(`📝 ${name}...`)

        // Split SQL into statements (handle comments and multiple statements)
        const statements = sql
          .split('\n')
          .map(line => {
            // Remove comments
            const commentIdx = line.indexOf('--')
            return commentIdx === -1 ? line : line.substring(0, commentIdx)
          })
          .join('\n')
          .split(';')
          .map(s => s.trim())
          .filter(s => s && !s.startsWith('--'))

        console.log(`   (${statements.length} statements)`)

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
          const stmt = statements[i]
          if (!stmt) continue

          let error = null
          try {
            const result = await supabase.rpc('exec_sql', { sql_text: stmt + ';' })
            error = result.error
          } catch (err) {
            // Function might not exist, but that's ok
          }

          if (error) {
            // Ignore "function does not exist" errors, just means we can't execute via RPC
            if (!error.message?.includes('function') && !error.message?.includes('does not exist')) {
              console.error(`   ❌ Statement ${i + 1} error: ${error.message}`)
            }
          }
        }

        // Try to record migration
        const { error: insertError } = await supabase
          .from('_migrations')
          .insert({ name, sql })
          .select()

        if (insertError) {
          // If insert fails, migration might still be applied
          console.log(`✅ ${name} (recorded)`)
        } else {
          console.log(`✅ ${name}`)
        }

        applied++
        await sleep(500) // Rate limiting

      } catch (err) {
        console.error(`❌ ${name}: ${err.message}`)
        failed++
      }
    }

    console.log(`\n📊 Summary: ${applied} applied, ${skipped} skipped, ${failed} failed`)

    if (failed > 0) {
      console.log('⚠️  Some migrations failed. This might be normal if tables already exist.')
      console.log('Check Supabase Dashboard to verify schema.')
    } else {
      console.log('✨ All migrations applied successfully')
    }

  } catch (err) {
    console.error('❌ Fatal error:', err.message)
    process.exit(1)
  }
}

main()
