import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Logger, MetricsCollector } from '@/lib/observability/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const logger = new Logger(supabaseUrl, supabaseKey, 'observability-metrics-api');
const metricsCollector = new MetricsCollector(supabaseUrl, supabaseKey, 'api');

/**
 * GET /api/observability/metrics - Get metrics data
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
    const limit = parseInt(searchParams.get('limit') || '1000');

    if (!metricName) {
      return NextResponse.json({ error: 'metric_name required' }, { status: 400 });
    }

    const metrics = await metricsCollector.getMetrics(metricName, limit);

    return NextResponse.json({
      metric_name: metricName,
      data: metrics,
      count: metrics.length,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to get metrics', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/observability/metrics/summary - Get metrics summary
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

    // Get metrics for last 24 hours
    const { data: metrics } = await supabase
      .from('metrics')
      .select('metric_name, value')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    // Calculate summary stats
    const summary: Record<string, any> = {};

    (metrics || []).forEach((m: any) => {
      if (!summary[m.metric_name]) {
        summary[m.metric_name] = {
          count: 0,
          sum: 0,
          min: Infinity,
          max: -Infinity,
          values: [],
        };
      }

      summary[m.metric_name].count++;
      summary[m.metric_name].sum += m.value;
      summary[m.metric_name].min = Math.min(summary[m.metric_name].min, m.value);
      summary[m.metric_name].max = Math.max(summary[m.metric_name].max, m.value);
      summary[m.metric_name].values.push(m.value);
    });

    // Calculate averages
    Object.keys(summary).forEach((key) => {
      const data = summary[key];
      data.avg = data.sum / data.count;
      data.p95 = this.calculateP95(data.values);
      delete data.values;
    });

    return NextResponse.json(summary);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to get metrics summary', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateP95(values: number[]): number {
  const sorted = values.sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * 0.95) - 1;
  return sorted[Math.max(0, index)] || 0;
}
