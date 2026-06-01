import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const supabase = getSupabaseAdminClient() as any

  try {
    // Check for Wave 4 migrations by verifying if tables/columns exist
    const checks = {
      // Story 23.1 — Playbook Governance columns
      playbook_governance: {
        table: 'playbook_tasks',
        columns: ['assigned_role', 'due_days_from_start', 'estimated_hours', 'feature_tags']
      },
      // Story 14.2 — Playbook Trigger Alert
      playbook_trigger_alert: {
        type: 'alert_type',
        value: 'playbook_trigger'
      },
      // Story 15.1 — Auto Check-in Queue
      auto_checkin_queue: {
        table: 'auto_checkin_queue',
        columns: ['id', 'account_id', 'csm_id', 'generated_subject', 'status', 'approval_deadline']
      }
    }

    const results: any = {}

    // Check Story 23.1
    const { data: playbook_tasks_info, error: pb_error } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'playbook_tasks')
      .in('column_name', checks.playbook_governance.columns)

    if (!pb_error && playbook_tasks_info) {
      const foundColumns = playbook_tasks_info.map((c: any) => c.column_name)
      results['Story 23.1 (Playbook Governance)'] = {
        status: foundColumns.length === checks.playbook_governance.columns.length ? '✅ APPLIED' : '⏳ PARTIAL',
        expected: checks.playbook_governance.columns,
        found: foundColumns,
        missing: checks.playbook_governance.columns.filter((c: string) => !foundColumns.includes(c))
      }
    } else {
      results['Story 23.1 (Playbook Governance)'] = {
        status: '❌ NOT APPLIED',
        error: pb_error?.message || 'Could not verify'
      }
    }

    // Check Story 14.2 — Check if alert_type enum has playbook_trigger
    const { data: enum_data, error: enum_error } = await supabase
      .from('pg_enum')
      .select('enumlabel')
      .eq('enumlabel', 'playbook_trigger')

    if (!enum_error && enum_data && enum_data.length > 0) {
      results['Story 14.2 (Playbook Trigger Alert)'] = {
        status: '✅ APPLIED',
        found: 'playbook_trigger enum value exists'
      }
    } else {
      results['Story 14.2 (Playbook Trigger Alert)'] = {
        status: '❌ NOT APPLIED',
        error: 'playbook_trigger not found in alert_type enum',
        details: enum_error
      }
    }

    // Check Story 15.1
    const { data: auto_checkin_info, error: ac_error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'auto_checkin_queue')

    if (!ac_error && auto_checkin_info && auto_checkin_info.length > 0) {
      // Table exists, now check columns
      const { data: ac_columns } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'auto_checkin_queue')
        .in('column_name', checks.auto_checkin_queue.columns)

      const foundColumns = ac_columns?.map((c: any) => c.column_name) || []
      results['Story 15.1 (Auto Check-in Queue)'] = {
        status: foundColumns.length === checks.auto_checkin_queue.columns.length ? '✅ APPLIED' : '⏳ PARTIAL',
        expected: checks.auto_checkin_queue.columns,
        found: foundColumns,
        missing: checks.auto_checkin_queue.columns.filter((c: string) => !foundColumns.includes(c))
      }
    } else {
      results['Story 15.1 (Auto Check-in Queue)'] = {
        status: '❌ NOT APPLIED',
        error: 'auto_checkin_queue table does not exist'
      }
    }

    // Summary
    const allApplied = Object.values(results).every((r: any) => r.status?.includes('✅'))
    const summary = {
      overall: allApplied ? '✅ ALL MIGRATIONS APPLIED' : '⏳ MIGRATIONS PENDING',
      applied: Object.values(results).filter((r: any) => r.status?.includes('✅')).length,
      pending: Object.values(results).filter((r: any) => r.status?.includes('❌')).length,
      partial: Object.values(results).filter((r: any) => r.status?.includes('⏳')).length
    }

    return NextResponse.json({
      summary,
      details: results,
      timestamp: new Date().toISOString()
    })
  } catch (err: any) {
    console.error('Validation error:', err)
    return NextResponse.json(
      {
        error: 'Could not validate migrations',
        message: err.message,
        suggestion: 'Run: curl -H "Authorization: Bearer YOUR_SUPABASE_KEY" https://your-domain/api/migrations/validate'
      },
      { status: 500 }
    )
  }
}
