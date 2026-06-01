import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

export const maxDuration = 120

export async function POST(request: Request) {
  // Endpoint executa SQL arbitrário (exec_sql) — desligado por padrão.
  // Habilite intencionalmente com ENABLE_MIGRATION_ENDPOINT=true só quando for
  // aplicar migrations; prefira o Supabase CLI (`supabase db push`).
  if (process.env.ENABLE_MIGRATION_ENDPOINT !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.API_SECRET}`

  if (!process.env.API_SECRET || !authHeader || authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase credentials' },
      { status: 500 }
    )
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const results: any[] = []
  const errors: any[] = []

  try {
    // Get list of migration files
    const migrationsPath = path.join(process.cwd(), 'supabase/migrations')
    const migrationFiles = fs.readdirSync(migrationsPath)
      .filter(f => f.endsWith('.sql'))
      .sort()

    console.log(`Found ${migrationFiles.length} migration files`)

    // Get already applied migrations
    const { data: appliedMigrations } = await supabase
      .from('_migrations')
      .select('name')

    const appliedSet = new Set((appliedMigrations || []).map(m => m.name))

    // Apply pending migrations
    for (const file of migrationFiles) {
      const name = file.replace('.sql', '')

      // Skip if already applied
      if (appliedSet.has(name)) {
        results.push({ name, status: 'skipped', reason: 'already_applied' })
        console.log(`⏭️  ${name}`)
        continue
      }

      try {
        const sqlPath = path.join(migrationsPath, file)
        const sql = fs.readFileSync(sqlPath, 'utf-8')

        console.log(`📝 Applying ${name}...`)

        // Execute via admin client RPC
        const { error } = await supabase.rpc('exec_sql', { sql_text: sql })

        if (error && error.code !== 'PGRST102') {
          // PGRST102 = function not found, try direct approach
          // Split into statements and execute individually
          const statements = sql.split(';').filter(s => s.trim())
          let hasError = false

          for (const stmt of statements) {
            if (!stmt.trim()) continue
            try {
              const result = await supabase.rpc('exec_sql', {
                sql_text: stmt + ';'
              })
              const stmtError = result.error

              if (stmtError && stmtError.code !== 'PGRST102') {
                hasError = true
                break
              }
            } catch {
              // ignore catch errors
            }
          }

          if (hasError && error.code !== 'PGRST102') {
            throw error
          }
        }

        // Record migration
        await supabase.from('_migrations').insert({ name, sql })

        results.push({ name, status: 'applied' })
        console.log(`✅ ${name}`)
      } catch (err: any) {
        const errMsg = err.message || 'Unknown error'
        results.push({ name, status: 'error', error: errMsg })
        errors.push({ name, error: errMsg })
        console.error(`❌ ${name}: ${errMsg}`)
      }
    }

    return NextResponse.json({
      success: errors.length === 0,
      total: migrationFiles.length,
      applied: results.filter(r => r.status === 'applied').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors_count: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    })
  } catch (err: any) {
    console.error('Migration error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        results
      },
      { status: 500 }
    )
  }
}
