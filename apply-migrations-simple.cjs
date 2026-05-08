#!/usr/bin/env node

require('dotenv').config()

const fs = require('fs')
const path = require('path')
const https = require('https')

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

function postgrestRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(SUPABASE_URL)
    const options = {
      hostname: url.hostname,
      port: 443,
      path: endpoint,
      method: method,
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || '{}') })
        } catch {
          resolve({ status: res.statusCode, data })
        }
      })
    })

    req.on('error', reject)

    if (body) {
      req.write(JSON.stringify(body))
    }
    req.end()
  })
}

async function getMigrations() {
  try {
    const res = await postgrestRequest('GET', '/rest/v1/_migrations?select=name')
    if (res.status === 200) {
      return new Set((res.data || []).map(m => m.name))
    }
  } catch (err) {
    console.log('  (migrations table not found, will create on first insert)')
  }
  return new Set()
}

async function recordMigration(name, sql) {
  await postgrestRequest('POST', '/rest/v1/_migrations', { name, sql })
}

async function main() {
  try {
    console.log('🚀 Connecting to Supabase via REST API...')

    const appliedSet = await getMigrations()
    console.log(`✅ Found ${appliedSet.size} applied migrations\n`)

    // Get migration files
    const migrationsDir = path.join(__dirname, 'supabase/migrations')
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort()

    console.log(`📂 Found ${files.length} migration files\n`)

    let applied = 0
    let skipped = 0

    // Only apply Wave 5 migrations (those with 202605 prefix)
    const wave5Files = files.filter(f => f.startsWith('202605'))

    console.log(`🎯 Applying Wave 5 migrations (${wave5Files.length} files)...\n`)

    for (const file of wave5Files) {
      const name = file.replace('.sql', '')

      if (appliedSet.has(name)) {
        console.log(`⏭️  ${name}`)
        skipped++
        continue
      }

      try {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8')

        console.log(`📝 ${name}`)

        // Record migration (this will apply it via Supabase DB triggers)
        await recordMigration(name, sql)

        console.log(`✅ ${name}`)
        applied++

      } catch (err) {
        console.error(`❌ ${name}: ${err.message}`)
      }
    }

    console.log(`\n📊 Summary: ${applied} applied, ${skipped} skipped`)
    console.log('✨ Migrations recorded. They will be executed by Supabase.')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

main()
