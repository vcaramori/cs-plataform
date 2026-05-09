import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Logger, ErrorTracker } from '@/lib/observability/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const logger = new Logger(supabaseUrl, supabaseKey, 'observability-errors-api');
const errorTracker = new ErrorTracker(supabaseUrl, supabaseKey);

/**
 * GET /api/observability/errors - Get recent errors
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

    // Check admin access
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
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    const errors = await errorTracker.getRecentErrors(limit, severity || undefined);

    return NextResponse.json({
      errors,
      count: errors.length,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to get errors', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/observability/errors/:id - Mark error as resolved
 */
export async function PUT(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const errorId = searchParams.get('id');

    if (!errorId) {
      return NextResponse.json({ error: 'Error ID required' }, { status: 400 });
    }

    await errorTracker.resolveError(errorId);

    await logger.info('Error marked as resolved', { errorId });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to resolve error', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
