import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from "@/lib/supabase/server";
import SupportService from '@/lib/integrations/support-service';
import { Logger } from '@/lib/observability/logger';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createSupportIntegrationSchema = z.object({
  support_type: z.enum(['zendesk', 'jira_sd']),
  api_key: z.string(),
  instance_url: z.string().url(),
  api_secret: z.string().optional(),
  account_id: z.string(),
});

const logger = new Logger(supabaseUrl, supabaseKey, 'support-integration-api');

/**
 * GET /api/integrations/support - List support integrations
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

    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account_id');

    if (!accountId) {
      return NextResponse.json({ error: 'account_id required' }, { status: 400 });
    }

    const supportService = new SupportService(supabaseUrl, supabaseKey);
    const integrations = await supportService.listIntegrations(accountId);

    return NextResponse.json({
      integrations,
      count: integrations.length,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to list support integrations', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/integrations/support - Create support integration
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createSupportIntegrationSchema.parse(body);

    const supportService = new SupportService(supabaseUrl, supabaseKey);
    const integration = await supportService.createIntegration(
      validated.account_id,
      validated.support_type,
      validated.api_key,
      validated.instance_url,
      user.id,
      validated.api_secret
    );

    await logger.info('Support integration created', {
      integrationId: integration.id,
      supportType: validated.support_type,
      accountId: validated.account_id,
    });

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to create support integration', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
