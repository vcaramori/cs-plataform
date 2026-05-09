import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Logger } from '@/lib/observability/logger';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createRoleSchema = z.object({
  user_id: z.string(),
  account_id: z.string(),
  role: z.enum(['admin', 'csm', 'account_manager', 'report_viewer', 'finance_auditor', 'read_only']),
});

const grantAccessSchema = z.object({
  user_id: z.string(),
  account_id: z.string(),
  resource_type: z.enum(['account', 'contract', 'ticket', 'interaction']),
  resource_id: z.string(),
  permission: z.enum(['view', 'edit', 'manage']),
});

const logger = new Logger(supabaseUrl, supabaseKey, 'permissions-api');

/**
 * GET /api/permissions - Get user permissions
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: () => cookieStore });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('user_id') || user.id;
    const accountId = searchParams.get('account_id');

    // Get user roles
    let rolesQuery = supabase.from('user_roles').select('*').eq('user_id', userId);

    if (accountId) {
      rolesQuery = rolesQuery.eq('account_id', accountId);
    }

    const { data: roles } = await rolesQuery;

    // Get resource-level access
    let accessQuery = supabase.from('resource_access').select('*').eq('user_id', userId);

    if (accountId) {
      accessQuery = accessQuery.eq('account_id', accountId);
    }

    const { data: resources } = await accessQuery;

    // Get permission matrix for roles
    const roleSet = new Set((roles || []).map((r: any) => r.role));
    const { data: permissions } = await supabase
      .from('permission_matrix')
      .select('*')
      .in('role', Array.from(roleSet));

    return NextResponse.json({
      roles: roles || [],
      resources: resources || [],
      permissions: permissions || [],
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to get permissions', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/permissions/role - Assign role to user
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: () => cookieStore });

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: adminRoles } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', authUser.id)
      .eq('role', 'admin');

    if (!adminRoles || adminRoles.length === 0) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const validated = createRoleSchema.parse(body);

    // Create role assignment
    const { data: role } = await supabase
      .from('user_roles')
      .upsert(
        {
          user_id: validated.user_id,
          account_id: validated.account_id,
          role: validated.role,
        },
        {
          onConflict: 'user_id,account_id,role',
        }
      )
      .select()
      .single();

    // Log audit
    await supabase.from('permission_audit_logs').insert({
      user_id: validated.user_id,
      action: 'role_assigned',
      changed_by: authUser.id,
      changed_fields: { role: validated.role },
      resource_type: 'user',
      resource_id: validated.user_id,
    });

    await logger.info('Role assigned', {
      userId: validated.user_id,
      accountId: validated.account_id,
      role: validated.role,
    });

    return NextResponse.json(role, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to assign role', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/permissions/access - Grant resource access
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: () => cookieStore });

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = grantAccessSchema.parse(body);

    // Create access grant
    const { data: access } = await supabase
      .from('resource_access')
      .insert({
        user_id: validated.user_id,
        account_id: validated.account_id,
        resource_type: validated.resource_type,
        resource_id: validated.resource_id,
        permission: validated.permission,
        granted_by: authUser.id,
      })
      .select()
      .single();

    // Log audit
    await supabase.from('permission_audit_logs').insert({
      user_id: validated.user_id,
      action: 'access_granted',
      changed_by: authUser.id,
      resource_type: validated.resource_type,
      resource_id: validated.resource_id,
      changed_fields: { permission: validated.permission },
    });

    await logger.info('Resource access granted', {
      userId: validated.user_id,
      resourceType: validated.resource_type,
      resourceId: validated.resource_id,
    });

    return NextResponse.json(access, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to grant access', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
