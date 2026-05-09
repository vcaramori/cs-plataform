import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { Logger, MetricsCollector } from '@/lib/observability/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const logger = new Logger(supabaseUrl, supabaseKey, 'observability-metrics-api');
const metricsCollector = new MetricsCollector(supabaseUrl, supabaseKey, 'api');

/**
 * GET /api/observability/metrics - Get metrics data or summary
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
    const metricName = searchParams.get('metric_name');
    const summary = searchParams.get('summary');
    const limit = parseInt(searchParams.get('limit') || '1000');

    if (summary === 'true') {
      // Get metrics for last 24 hours
      const { data: metrics } = await supabase
        .from('metrics')
        .select('metric_name, value')
        .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Calculate summary stats
      const summaryData: Record<string, any> = {};

      (metrics || []).forEach((m: any) => {
        if (!summaryData[m.metric_name]) {
          summaryData[m.metric_name] = {
            count: 0,
            sum: 0,
            min: Infinity,
            max: -Infinity,
            values: [],
          };
        }

        summaryData[m.metric_name].count++;
        summaryData[m.metric_name].sum += m.value;
        summaryData[m.metric_name].min = Math.min(summaryData[m.metric_name].min, m.value);
        summaryData[m.metric_name].max = Math.max(summaryData[m.metric_name].max, m.value);
        summaryData[m.metric_name].values.push(m.value);
      });

      // Calculate averages
      Object.keys(summaryData).forEach((key) => {
        const data = summaryData[key];
        data.avg = data.sum / data.count;
        data.p95 = calculateP95(data.values);
        delete data.values;
      });

      return NextResponse.json(summaryData);
    } else {
      if (!metricName) {
        return NextResponse.json({ error: 'metric_name required' }, { status: 400 });
      }

      const metrics = await metricsCollector.getMetrics(metricName, limit);

      return NextResponse.json({
        metric_name: metricName,
        data: metrics,
        count: metrics.length,
      });
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to get metrics', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateP95(values: number[]): number {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, index)] || 0;
}
