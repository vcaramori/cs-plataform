import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import CRMService from '@/lib/integrations/crm-service';
import { Logger } from '@/lib/observability/logger';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const syncSchema = z.object({
  integration_id: z.string(),
  sync_type: z.enum(['accounts', 'contacts', 'deals']),
});

const logger = new Logger(supabaseUrl, supabaseKey, 'crm-sync-api');

/**
 * POST /api/integrations/crm/sync - Sync CRM data
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
    const { integration_id, sync_type } = syncSchema.parse(body);

    const crmService = new CRMService(supabaseUrl, supabaseKey);
    const startTime = Date.now();

    let result;
    if (sync_type === 'accounts') {
      // Get integration type to determine which sync to run
      const { data: integration } = await supabase
        .from('crm_integrations')
        .select('crm_type')
        .eq('id', integration_id)
        .single();

      if (!integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }

      if (integration.crm_type === 'salesforce') {
        result = await crmService.syncSalesforceAccounts(integration_id);
      } else if (integration.crm_type === 'hubspot') {
        result = await crmService.syncHubSpotCompanies(integration_id);
      }
    }

    const duration = Date.now() - startTime;

    await logger.info('CRM sync completed', {
      integrationId: integration_id,
      syncType: sync_type,
      synced: result?.synced,
      failed: result?.failed,
      duration,
    });

    return NextResponse.json({
      success: true,
      synced: result?.synced || 0,
      failed: result?.failed || 0,
      duration_ms: duration,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('CRM sync failed', err);

    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
