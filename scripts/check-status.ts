import fs from 'fs'

async function run() {
  const token = 'sbp_42e5245fa1c47365e2a2440adf76d24523b03ce9'
  const projectRef = 'mgkwaejxazwwevblqycd'
  
  const query = "SELECT constraint_name, pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON c.conrelid = t.oid WHERE t.relname = 'support_tickets';"

  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  })

  console.log(await res.text())
}

run()
