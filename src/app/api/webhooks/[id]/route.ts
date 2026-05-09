import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import WebhookService from '@/lib/integrations/webhook-service';
import { Logger } from '@/lib/observability/logger';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  auth_type: z.enum(['hmac', 'bearer', 'custom']).optional(),
  auth_token: z.string().optional(),
  is_active: z.boolean().optional(),
});

const logger = new Logger(supabaseUrl, supabaseKey, 'webhooks-api');

/**
 * PUT /api/webhooks/[id] - Update webhook
 */
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
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
    const validated = updateWebhookSchema.parse(body);

    const webhookService = new WebhookService(supabaseUrl, supabaseKey);
    const webhook = await webhookService.updateWebhook(params.id, validated);

    await logger.info('Webhook updated', {
      webhookId: params.id,
      userId: user.id,
    });

    return NextResponse.json(webhook);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to update webhook', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/webhooks/[id] - Delete webhook
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: () => cookieStore });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhookService = new WebhookService(supabaseUrl, supabaseKey);
    await webhookService.deleteWebhook(params.id);

    await logger.info('Webhook deleted', {
      webhookId: params.id,
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to delete webhook', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/webhooks/[id] - Get webhook metrics
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: () => cookieStore });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhookService = new WebhookService(supabaseUrl, supabaseKey);
    const metrics = await webhookService.getDeliveryMetrics(params.id);
    const { deliveries, total } = await webhookService.getDeliveryLogs(params.id, 50, 0);

    return NextResponse.json({
      metrics,
      deliveries: deliveries.slice(0, 10),
      total,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to get webhook metrics', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
