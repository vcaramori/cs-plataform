import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from "@/lib/supabase/server";
import SupportService from '@/lib/integrations/support-service';
import { Logger } from '@/lib/observability/logger';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const syncSchema = z.object({
  integration_id: z.string(),
  sync_type: z.enum(['tickets', 'comments']),
});

const logger = new Logger(supabaseUrl, supabaseKey, 'support-sync-api');

/**
 * POST /api/integrations/support/sync - Sync support tickets
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
    const { integration_id, sync_type } = syncSchema.parse(body);

    const supportService = new SupportService(supabaseUrl, supabaseKey);
    const startTime = Date.now();

    let result;
    if (sync_type === 'tickets') {
      // Get integration type
      const { data: integration } = await supabase
        .from('support_integrations')
        .select('support_type')
        .eq('id', integration_id)
        .single();

      if (!integration) {
        return NextResponse.json({ error: 'Integration not found' }, { status: 404 });
      }

      if (integration.support_type === 'zendesk') {
        result = await supportService.syncZendeskTickets(integration_id);
      } else if (integration.support_type === 'jira_sd') {
        result = await supportService.syncJiraTickets(integration_id);
      }
    }

    const duration = Date.now() - startTime;

    await logger.info('Support sync completed', {
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
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Support sync failed', err);

    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
