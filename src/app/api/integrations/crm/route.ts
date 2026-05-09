import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import CRMService from '@/lib/integrations/crm-service';
import { Logger } from '@/lib/observability/logger';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createCRMIntegrationSchema = z.object({
  crm_type: z.enum(['salesforce', 'hubspot']),
  api_key: z.string(),
  instance_url: z.string().url(),
  api_secret: z.string().optional(),
  account_id: z.string(),
});

const logger = new Logger(supabaseUrl, supabaseKey, 'crm-integration-api');

/**
 * GET /api/integrations/crm - List CRM integrations
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
    const accountId = searchParams.get('account_id');

    if (!accountId) {
      return NextResponse.json({ error: 'account_id required' }, { status: 400 });
    }

    const crmService = new CRMService(supabaseUrl, supabaseKey);
    const integrations = await crmService.listIntegrations(accountId);

    return NextResponse.json({
      integrations,
      count: integrations.length,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to list CRM integrations', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/integrations/crm - Create CRM integration
 */
export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: () => cookieStore });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createCRMIntegrationSchema.parse(body);

    const crmService = new CRMService(supabaseUrl, supabaseKey);
    const integration = await crmService.createIntegration(
      validated.account_id,
      validated.crm_type,
      validated.api_key,
      validated.instance_url,
      user.id
    );

    await logger.info('CRM integration created', {
      integrationId: integration.id,
      crmType: validated.crm_type,
      accountId: validated.account_id,
    });

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to create CRM integration', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
