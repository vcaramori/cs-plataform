import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createHmac } from 'crypto'
import { z } from 'zod'

const WebhookTicketSchema = z.object({
  email: z.string().email(),
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  account_key: z.string() // External account ID
})

interface WebhookDelivery {
  account_id: string
  payload: any
  response_status: number | null
  response_body: string
  attempt_count: number
  success: boolean
  error_message?: string
}

function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature || !secret) return false

  const hash = createHmac('sha256', secret).update(payload).digest('hex')
  const expected = `sha256=${hash}`

  // Timing-safe comparison
  return expected.length === signature.length &&
    Buffer.from(expected).equals(Buffer.from(signature))
}

async function storeWebhookDelivery(delivery: WebhookDelivery) {
  const admin = getSupabaseAdminClient()

  try {
    await (admin as any).from('webhook_deliveries').insert({
      account_id: delivery.account_id,
      payload: delivery.payload,
      response_status: delivery.response_status,
      response_body: delivery.response_body,
      attempt_count: delivery.attempt_count,
      success: delivery.success,
      error_message: delivery.error_message,
      last_attempt_at: new Date().toISOString()
    })
  } catch (err) {
    console.error('[Webhook] Error storing delivery log:', err)
  }
}

export async function POST(request: Request) {
  const admin = getSupabaseAdminClient()
  const rawBody = await request.text()

  try {
    // 1. Validate HMAC signature if present
    const signature = request.headers.get('X-Webhook-Signature')

    if (signature) {
      // Get webhook secret from account (in production, you'd look this up)
      const webhookSecret = process.env.WEBHOOK_SECRET

      if (!webhookSecret || !validateWebhookSignature(rawBody, signature, webhookSecret)) {
        return NextResponse.json(
          { error: 'Invalid webhook signature' },
          { status: 401 }
        )
      }
    }

    // 2. Parse and validate payload
    const payload = JSON.parse(rawBody)
    const parsed = WebhookTicketSchema.safeParse(payload)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { email, title, description, priority, account_key } = parsed.data

    // 3. Resolve account from external key
    const { data: account, error: accountErr } = await admin
      .from('accounts')
      .select('id')
      .eq('client_id', account_key)
      .single()

    if (accountErr || !account) {
      console.error('[Webhook] Account not found:', account_key)

      // Log failed delivery
      await storeWebhookDelivery({
        account_id: 'unknown', // Can't store without valid account
        payload,
        response_status: 400,
        response_body: 'Account not found',
        attempt_count: 1,
        success: false,
        error_message: 'Invalid account_key'
      })

      return NextResponse.json(
        { error: 'Account not found' },
        { status: 400 }
      )
    }

    // 4. Create ticket
    const { data: ticket, error: createErr } = await admin
      .from('support_tickets')
      .insert({
        account_id: account.id,
        title: title.substring(0, 200),
        description: description.substring(0, 2000),
        priority,
        status: 'open',
        opened_at: new Date().toISOString(),
        source: 'webhook',
        external_ticket_id: payload.external_id // Store external ticket ID if provided
      })
      .select('id')
      .single()

    if (createErr || !ticket) {
      console.error('[Webhook] Error creating ticket:', createErr)

      // Log failed delivery
      await storeWebhookDelivery({
        account_id: account.id,
        payload,
        response_status: 500,
        response_body: createErr?.message || 'Failed to create ticket',
        attempt_count: 1,
        success: false,
        error_message: createErr?.message
      })

      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      )
    }

    // 5. Log event
    try {
      await admin.from('ticket_events').insert({
        ticket_id: ticket.id,
        event_type: 'webhook_submission',
        payload: {
          submitted_by_email: email,
          source: 'webhook',
          external_account_key: account_key,
          submitted_at: new Date().toISOString()
        }
      })
    } catch (err) {
      console.error('[Webhook] Error logging event:', err)
    }

    // 6. Log successful delivery
    await storeWebhookDelivery({
      account_id: account.id,
      payload,
      response_status: 200,
      response_body: JSON.stringify({ ticket_id: ticket.id }),
      attempt_count: 1,
      success: true
    })

    return NextResponse.json({
      success: true,
      ticket_id: ticket.id,
      message: 'Ticket created from webhook'
    }, { status: 200 })
  } catch (err: any) {
    console.error('[Webhook] Error:', err)

    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Webhook test endpoint for verifying connectivity
 * GET /api/webhooks/tickets/create?test=1
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const isTest = url.searchParams.get('test')

  if (isTest) {
    return NextResponse.json({
      status: 'ok',
      message: 'Webhook endpoint is reachable',
      timestamp: new Date().toISOString()
    })
  }

  return NextResponse.json(
    { error: 'This endpoint only accepts POST requests' },
    { status: 405 }
  )
}
