import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from "@/lib/supabase/server";
import BIService from '@/lib/integrations/bi-service';
import { Logger } from '@/lib/observability/logger';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createBIIntegrationSchema = z.object({
  bi_type: z.enum(['bigquery', 'snowflake', 'tableau', 'looker']),
  api_key: z.string(),
  instance_url: z.string().url(),
  account_id: z.string(),
  dataset_id: z.string().optional(),
  schema_name: z.string().optional(),
});

const logger = new Logger(supabaseUrl, supabaseKey, 'bi-integration-api');

/**
 * GET /api/integrations/bi - List BI integrations
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

    const biService = new BIService(supabaseUrl, supabaseKey);
    const integrations = await biService.listIntegrations(accountId);

    return NextResponse.json({
      integrations,
      count: integrations.length,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to list BI integrations', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/integrations/bi - Create BI integration
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
    const validated = createBIIntegrationSchema.parse(body);

    const biService = new BIService(supabaseUrl, supabaseKey);
    const integration = await biService.createIntegration(
      validated.account_id,
      validated.bi_type,
      validated.api_key,
      validated.instance_url,
      user.id,
      {
        datasetId: validated.dataset_id,
        schemaName: validated.schema_name,
      }
    );

    await logger.info('BI integration created', {
      integrationId: integration.id,
      biType: validated.bi_type,
      accountId: validated.account_id,
    });

    return NextResponse.json(integration, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to create BI integration', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
