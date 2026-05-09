import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from "@/lib/supabase/server";
import BIService from '@/lib/integrations/bi-service';
import { Logger } from '@/lib/observability/logger';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const exportSchema = z.object({
  integration_id: z.string(),
  export_type: z.enum(['accounts', 'contracts', 'health_scores']),
  destination: z.enum(['bigquery', 'snowflake']).optional(),
});

const logger = new Logger(supabaseUrl, supabaseKey, 'bi-export-api');

/**
 * POST /api/integrations/bi/export - Export data to BI platform
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
    const { integration_id, export_type, destination } = exportSchema.parse(body);

    const biService = new BIService(supabaseUrl, supabaseKey);
    const startTime = Date.now();

    let result;
    if (destination === 'bigquery') {
      result = await biService.exportAccountsToBigQuery(integration_id);
    } else if (destination === 'snowflake') {
      result = await biService.exportContractsToSnowflake(integration_id);
    } else {
      // Default: just fetch the data
      result = await biService.getTableauDataSource(integration_id);
    }

    const duration = Date.now() - startTime;

    await logger.info('BI export completed', {
      integrationId: integration_id,
      exportType: export_type,
      destination: destination || 'default',
      duration,
    });

    return NextResponse.json({
      success: true,
      exported: result?.exported || 0,
      duration_ms: duration,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('BI export failed', err);

    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

/**
 * GET /api/integrations/bi/export - Get data as CSV
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
    const integrationId = searchParams.get('integration_id');
    const entityType = searchParams.get('entity_type') || 'accounts';

    if (!integrationId) {
      return NextResponse.json({ error: 'integration_id required' }, { status: 400 });
    }

    const biService = new BIService(supabaseUrl, supabaseKey);
    const csv = await biService.exportAsCSV(integrationId, entityType);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${entityType}_${Date.now()}.csv"`,
      },
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to export CSV', err);

    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
