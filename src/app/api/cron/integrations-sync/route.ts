import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import CRMService from '@/lib/integrations/crm-service';
import SupportService from '@/lib/integrations/support-service';
import BIService from '@/lib/integrations/bi-service';
import { Logger } from '@/lib/observability/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const logger = new Logger(supabaseUrl, supabaseKey, 'cron-integrations-sync');

// Verify cron secret
function verifyCronSecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-cron-secret');
  return secret === process.env.CRON_SECRET;
}

/**
 * POST /api/cron/integrations-sync - Sync all active integrations
 * Should be called hourly by external cron service
 */
export async function POST(req: NextRequest) {
  try {
    if (!verifyCronSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active CRM integrations
    const { data: crmIntegrations } = await supabase
      .from('crm_integrations')
      .select('*')
      .eq('is_active', true);

    // Get all active support integrations
    const { data: supportIntegrations } = await supabase
      .from('support_integrations')
      .select('*')
      .eq('is_active', true);

    // Get all active BI integrations
    const { data: biIntegrations } = await supabase
      .from('bi_integrations')
      .select('*')
      .eq('is_active', true);

    const crmService = new CRMService(supabaseUrl, supabaseKey);
    const supportService = new SupportService(supabaseUrl, supabaseKey);
    const biService = new BIService(supabaseUrl, supabaseKey);

    let syncedCount = 0;
    let failedCount = 0;

    // Sync CRM integrations
    for (const integration of crmIntegrations || []) {
      try {
        if (integration.crm_type === 'salesforce') {
          await crmService.syncSalesforceAccounts(integration.id);
        } else if (integration.crm_type === 'hubspot') {
          await crmService.syncHubSpotCompanies(integration.id);
        }
        syncedCount++;

        // Update last_sync_at
        await supabase
          .from('crm_integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id);
      } catch (error) {
        failedCount++;
        await logger.error(`CRM sync failed for ${integration.id}`, error as Error);
      }
    }

    // Sync support integrations
    for (const integration of supportIntegrations || []) {
      try {
        if (integration.support_type === 'zendesk') {
          await supportService.syncZendeskTickets(integration.id);
        } else if (integration.support_type === 'jira_sd') {
          await supportService.syncJiraTickets(integration.id);
        }
        syncedCount++;

        await supabase
          .from('support_integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id);
      } catch (error) {
        failedCount++;
        await logger.error(`Support sync failed for ${integration.id}`, error as Error);
      }
    }

    // Sync BI integrations (daily exports)
    for (const integration of biIntegrations || []) {
      try {
        if (integration.bi_type === 'bigquery') {
          await biService.exportAccountsToBigQuery(integration.id);
        } else if (integration.bi_type === 'snowflake') {
          await biService.exportContractsToSnowflake(integration.id);
        }
        syncedCount++;

        await supabase
          .from('bi_integrations')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', integration.id);
      } catch (error) {
        failedCount++;
        await logger.error(`BI export failed for ${integration.id}`, error as Error);
      }
    }

    await logger.info('Integration sync complete', {
      synced: syncedCount,
      failed: failedCount,
    });

    return NextResponse.json({
      success: true,
      synced: syncedCount,
      failed: failedCount,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Cron sync failed', err);

    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
