import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from "@/lib/supabase/server";
import WebhookService from '@/lib/integrations/webhook-service';
import { Logger } from '@/lib/observability/logger';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const testWebhookSchema = z.object({
  webhook_id: z.string(),
  event_type: z.string(),
});

const logger = new Logger(supabaseUrl, supabaseKey, 'webhooks-test-api');

/**
 * POST /api/webhooks/test - Send test webhook delivery
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
    const { webhook_id, event_type } = testWebhookSchema.parse(body);

    const webhookService = new WebhookService(supabaseUrl, supabaseKey);
    const webhook = await webhookService.getWebhook(webhook_id);

    if (!webhook) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 });
    }

    // Create test payload
    const testPayload = {
      event_type: event_type || 'test.webhook',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        test: true,
      },
      account_id: (webhook as any).account_id || '',
    };

    // Send test delivery
    const signature = webhookService.signPayload(testPayload, webhook.secret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-ID': webhook_id,
      'X-Webhook-Timestamp': new Date().toISOString(),
      'X-Webhook-Test': 'true',
    };

    if (webhook.auth_type === 'bearer' && webhook.auth_token) {
      headers['Authorization'] = `Bearer ${webhook.auth_token}`;
    }

    const startTime = Date.now();
    let statusCode = null;
    let responseBody = null;
    let errorMessage = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(testPayload),
          signal: controller.signal,
        });

        statusCode = response.status;
        responseBody = await response.text();
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
    }

    const duration = Date.now() - startTime;

    // Log the test delivery
    await supabase.from('webhook_deliveries').insert({
      webhook_id,
      event_type: 'test.webhook',
      payload: testPayload,
      status_code: statusCode,
      response_body: responseBody,
      error_message: errorMessage,
      delivered_at: !errorMessage ? new Date().toISOString() : null,
      duration_ms: duration,
    });

    await logger.info('Test webhook sent', {
      webhookId: webhook_id,
      statusCode,
      duration,
    });

    return NextResponse.json({
      success: !errorMessage,
      status_code: statusCode,
      response: responseBody,
      error: errorMessage,
      duration_ms: duration,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to send test webhook', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
