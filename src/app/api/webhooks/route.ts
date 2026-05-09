import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import WebhookService from '@/lib/integrations/webhook-service';
import { Logger } from '@/lib/observability/logger';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()),
  auth_type: z.enum(['hmac', 'bearer', 'custom']),
  auth_token: z.string().optional(),
});

const logger = new Logger(supabaseUrl, supabaseKey, 'webhooks-api');

/**
 * GET /api/webhooks - List webhooks for account
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(supabaseUrl, supabaseKey, { cookies: () => cookieStore });

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get account ID from query
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get('account_id');

    if (!accountId) {
      return NextResponse.json({ error: 'account_id required' }, { status: 400 });
    }

    const webhookService = new WebhookService(supabaseUrl, supabaseKey);
    const webhooks = await webhookService.listWebhooks(accountId);

    return NextResponse.json({
      webhooks,
      count: webhooks.length,
    });
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to list webhooks', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/webhooks - Create webhook
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
    const validated = createWebhookSchema.parse(body);

    const accountId = body.account_id;
    if (!accountId) {
      return NextResponse.json({ error: 'account_id required' }, { status: 400 });
    }

    const webhookService = new WebhookService(supabaseUrl, supabaseKey);
    const webhook = await webhookService.createWebhook(
      accountId,
      validated.url,
      validated.events,
      validated.auth_type,
      validated.auth_token,
      user.id
    );

    await logger.info('Webhook created', {
      webhookId: webhook.id,
      accountId,
      userId: user.id,
    });

    return NextResponse.json(webhook, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }

    const err = error instanceof Error ? error : new Error(String(error));
    await logger.error('Failed to create webhook', err);

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
