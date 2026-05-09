import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { Logger } from '@/lib/observability/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const logger = new Logger(supabaseUrl, supabaseKey, 'audit-logs-api');

/**
 * GET /api/audit-logs - Get audit logs
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminRole } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (!adminRole) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);
    const offset = parseInt(searchParams.get('offset') || '0');
    const action = searchParams.get('action');
    const userId = searchParams.get('user_id');
    const resourceType = searchParams.get('resource_type');

    let query = supabase.from('permission_audit_logs').select('*', { count: 'exact' });

    if (action) query = query.eq('action', action);
    if (userId) query = query.eq('user_id', userId);
    if (resourceType) query = query.eq('resource_type', resourceType);

    const { data: logs, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to get audit logs', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
