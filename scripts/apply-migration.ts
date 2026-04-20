import fs from 'fs'
import path from 'path'

async function run() {
  const token = 'sbp_42e5245fa1c47365e2a2440adf76d24523b03ce9'
  const projectRef = 'mgkwaejxazwwevblqycd'
  
  const sqlFile = path.join(process.cwd(), 'supabase/migrations/012_support_sla.sql')
  const query = fs.readFileSync(sqlFile, 'utf-8')

  console.log(`Applying migration 012_support_sla.sql (${query.length} chars) to project ${projectRef}...`)

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('FAILED TO APPLY MIGRATION:', res.status, errorText)
    process.exit(1)
  }

  console.log('Migration applied successfully!')
}

run()
