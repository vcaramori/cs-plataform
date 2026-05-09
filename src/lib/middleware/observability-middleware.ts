import { NextRequest, NextResponse } from 'next/server';
import { RequestTracer, MetricsCollector, Logger } from '@/lib/observability/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const tracer = new RequestTracer(supabaseUrl, supabaseKey);
const metrics = new MetricsCollector(supabaseUrl, supabaseKey, 'api');
const logger = new Logger(supabaseUrl, supabaseKey, 'api-middleware');

/**
 * Observability middleware for API routes
 * Tracks: request tracing, metrics, error tracking
 */
export async function observabilityMiddleware(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>
): Promise<NextResponse> {
  const traceId = tracer.generateTraceId();
  const startTime = Date.now();

  // Extract user ID if authenticated
  const authHeader = req.headers.get('authorization');
  const userId = authHeader ? extractUserIdFromToken(authHeader) : undefined;

  try {
    // Set context in logger
    logger.setContext(traceId, traceId);

    // Call handler
    const response = await handler(req);

    // Record metrics
    const duration = Date.now() - startTime;
    const method = req.method;
    const pathname = new URL(req.url).pathname;
    const status = response.status;

    // Log successful request
    await logger.info(`${method} ${pathname} ${status}`, {
      duration,
      traceId,
      userId,
    });

    // Record trace
    await tracer.recordTrace(
      traceId,
      method,
      pathname,
      status,
      duration,
      userId
    );

    // Record metrics
    await metrics.recordResponseTime(pathname, duration, {
      method,
      status: String(status),
    });

    // Add trace headers to response
    const headers = new Headers(response.headers);
    headers.set('X-Trace-ID', traceId);
    headers.set('X-Response-Time', `${duration}ms`);

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    const method = req.method;
    const pathname = new URL(req.url).pathname;

    const err = error instanceof Error ? error : new Error(String(error));

    // Log error
    await logger.error(`${method} ${pathname} failed`, err, {
      duration,
      traceId,
      userId,
    });

    // Record trace with error
    await tracer.recordTrace(
      traceId,
      method,
      pathname,
      500,
      duration,
      userId,
      err
    );

    // Record error metric
    await metrics.recordError(pathname, err.name, {
      method,
    });

    // Return error response
    return NextResponse.json(
      {
        error: 'Internal server error',
        traceId,
      },
      {
        status: 500,
        headers: {
          'X-Trace-ID': traceId,
        },
      }
    );
  }
}

/**
 * Extract user ID from JWT token (basic implementation)
 * In production, use jwt library for proper verification
 */
function extractUserIdFromToken(authHeader: string): string | undefined {
  try {
    const token = authHeader.replace('Bearer ', '');
    const parts = token.split('.');

    if (parts.length !== 3) return undefined;

    // Decode payload (base64url)
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    );

    return payload.sub || payload.user_id;
  } catch {
    return undefined;
  }
}

/**
 * Helper function to wrap API route handlers with observability
 */
export function withObservability(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest) => {
    return observabilityMiddleware(req, handler);
  };
}
