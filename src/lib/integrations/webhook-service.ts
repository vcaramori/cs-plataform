import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

interface WebhookPayload {
  event_type: string;
  timestamp: string;
  data: any;
  account_id: string;
}

interface WebhookConfig {
  id: string;
  url: string;
  secret: string;
  auth_type: string;
  auth_token?: string;
  rate_limit: number;
  is_active: boolean;
}

export class WebhookService {
  private supabase: any;
  private rateLimitMap = new Map<string, number[]>();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Sign payload with HMAC-SHA256
   */
  signPayload(payload: WebhookPayload, secret: string): string {
    const message = JSON.stringify(payload);
    return crypto
      .createHmac('sha256', secret)
      .update(message)
      .digest('hex');
  }

  /**
   * Verify incoming webhook signature
   */
  verifySignature(payload: string, signature: string, secret: string): boolean {
    const computedSignature = this.signPayload(JSON.parse(payload), secret);
    return crypto.timingSafeEqual(
      Buffer.from(computedSignature),
      Buffer.from(signature)
    );
  }

  /**
   * Check rate limiting (100 req/min per endpoint)
   */
  checkRateLimit(webhookId: string): boolean {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    if (!this.rateLimitMap.has(webhookId)) {
      this.rateLimitMap.set(webhookId, []);
    }

    const timestamps = this.rateLimitMap.get(webhookId)!;
    const recentTimestamps = timestamps.filter((t) => t > windowStart);

    if (recentTimestamps.length >= 100) {
      return false;
    }

    recentTimestamps.push(now);
    this.rateLimitMap.set(webhookId, recentTimestamps);
    return true;
  }

  /**
   * Dispatch event to all active webhooks
   */
  async dispatchEvent(
    accountId: string,
    eventType: string,
    data: any
  ): Promise<void> {
    // Get all active webhooks for account that subscribe to this event
    const { data: webhooks } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('account_id', accountId)
      .eq('is_active', true)
      .contains('events', [eventType]);

    if (!webhooks || webhooks.length === 0) {
      return;
    }

    const payload: WebhookPayload = {
      event_type: eventType,
      timestamp: new Date().toISOString(),
      data,
      account_id: accountId,
    };

    for (const webhook of webhooks) {
      // Check rate limit
      if (!this.checkRateLimit(webhook.id)) {
        await this.logDelivery(webhook.id, eventType, payload, null, null, 'Rate limited');
        continue;
      }

      // Schedule delivery with retry
      this.scheduleDelivery(webhook, payload);
    }
  }

  /**
   * Schedule webhook delivery with exponential backoff
   */
  private async scheduleDelivery(webhook: WebhookConfig, payload: WebhookPayload) {
    const startTime = Date.now();

    try {
      const response = await this.sendWebhook(webhook, payload);

      const duration = Date.now() - startTime;
      await this.logDelivery(
        webhook.id,
        payload.event_type,
        payload,
        response.status,
        response.body,
        null,
        duration
      );

      // Retry on 5xx errors
      if (response.status >= 500) {
        await this.scheduleRetry(webhook, payload, 1);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const duration = Date.now() - startTime;
      await this.logDelivery(
        webhook.id,
        payload.event_type,
        payload,
        null,
        null,
        errorMessage,
        duration
      );

      // Retry on error
      await this.scheduleRetry(webhook, payload, 1);
    }
  }

  /**
   * Send webhook request
   */
  private async sendWebhook(
    webhook: WebhookConfig,
    payload: WebhookPayload
  ): Promise<{ status: number; body: string }> {
    const signature = this.signPayload(payload, webhook.secret);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-ID': webhook.id,
      'X-Webhook-Timestamp': new Date().toISOString(),
    };

    // Add auth header based on auth type
    if (webhook.auth_type === 'bearer' && webhook.auth_token) {
      headers['Authorization'] = `Bearer ${webhook.auth_token}`;
    } else if (webhook.auth_type === 'custom' && webhook.auth_token) {
      headers['X-API-Key'] = webhook.auth_token;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = await response.text();
      return {
        status: response.status,
        body,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Schedule retry with exponential backoff (max 3 retries)
   */
  private async scheduleRetry(webhook: WebhookConfig, payload: WebhookPayload, retryCount: number) {
    if (retryCount > 3) {
      return;
    }

    const delayMs = Math.pow(2, retryCount) * 60000; // 1m, 2m, 4m
    const nextRetryAt = new Date(Date.now() + delayMs);

    // Store retry in database - would be processed by a job queue in production
    await this.supabase.from('webhook_deliveries').insert({
      webhook_id: webhook.id,
      event_type: payload.event_type,
      payload,
      retry_count: retryCount,
      next_retry_at: nextRetryAt.toISOString(),
    });
  }

  /**
   * Log webhook delivery
   */
  private async logDelivery(
    webhookId: string,
    eventType: string,
    payload: WebhookPayload,
    statusCode: number | null,
    responseBody: string | null,
    errorMessage: string | null,
    durationMs?: number
  ): Promise<void> {
    await this.supabase.from('webhook_deliveries').insert({
      webhook_id: webhookId,
      event_type: eventType,
      payload,
      status_code: statusCode,
      response_body: responseBody,
      error_message: errorMessage,
      delivered_at: !errorMessage ? new Date().toISOString() : null,
      duration_ms: durationMs,
    });
  }

  /**
   * Get webhook by ID
   */
  async getWebhook(webhookId: string): Promise<WebhookConfig | null> {
    const { data } = await this.supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .single();

    return data;
  }

  /**
   * List webhooks for account
   */
  async listWebhooks(accountId: string) {
    const { data } = await this.supabase
      .from('webhooks')
      .select('id, url, events, auth_type, is_active, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  /**
   * Create webhook
   */
  async createWebhook(
    accountId: string,
    url: string,
    events: string[],
    authType: string,
    authToken?: string,
    userId?: string
  ): Promise<any> {
    const secret = crypto.randomBytes(32).toString('hex');

    const { data } = await this.supabase
      .from('webhooks')
      .insert({
        account_id: accountId,
        url,
        events,
        secret,
        auth_type: authType,
        auth_token: authToken,
        created_by: userId,
      })
      .select()
      .single();

    return data;
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    webhookId: string,
    updates: Partial<WebhookConfig>
  ): Promise<any> {
    const { data } = await this.supabase
      .from('webhooks')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', webhookId)
      .select()
      .single();

    return data;
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(webhookId: string): Promise<void> {
    await this.supabase.from('webhooks').delete().eq('id', webhookId);
  }

  /**
   * Get delivery logs
   */
  async getDeliveryLogs(webhookId: string, limit: number = 100, offset: number = 0) {
    const { data } = await this.supabase
      .from('webhook_deliveries')
      .select('*')
      .eq('webhook_id', webhookId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { count } = await this.supabase
      .from('webhook_deliveries')
      .select('*', { count: 'exact', head: true })
      .eq('webhook_id', webhookId);

    return {
      deliveries: data || [],
      total: count,
    };
  }

  /**
   * Get delivery success rate
   */
  async getDeliveryMetrics(webhookId: string): Promise<any> {
    const { data: deliveries } = await this.supabase
      .from('webhook_deliveries')
      .select('status_code, duration_ms')
      .eq('webhook_id', webhookId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!deliveries || deliveries.length === 0) {
      return {
        success_count: 0,
        failure_count: 0,
        success_rate: 0,
        avg_latency: 0,
        p95_latency: 0,
      };
    }

    const successful = deliveries.filter((d: any) => d.status_code >= 200 && d.status_code < 300);
    const durations = deliveries
      .filter((d: any) => d.duration_ms)
      .map((d: any) => d.duration_ms)
      .sort((a: number, b: number) => a - b);

    const p95Index = Math.ceil(durations.length * 0.95) - 1;

    return {
      success_count: successful.length,
      failure_count: deliveries.length - successful.length,
      success_rate: (successful.length / deliveries.length) * 100,
      avg_latency: durations.reduce((a: number, b: number) => a + b, 0) / durations.length,
      p95_latency: durations[Math.max(0, p95Index)] || 0,
    };
  }
}

export default WebhookService;
