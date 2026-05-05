import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { sendPublicTicketConfirmationEmail } from '@/lib/email/public-ticket-email'

const PublicTicketSchema = z.object({
  email: z.string().email('Invalid email'),
  title: z.string().min(5, 'Title must be at least 5 characters').max(200, 'Title max 200 chars'),
  description: z.string().min(10, 'Description must be at least 10 characters').max(2000, 'Description max 2000 chars'),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
  account_id: z.string().uuid().optional()
})

// Simple in-memory rate limiter (for development)
// In production, use Redis or database
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const limit = rateLimitMap.get(ip)

  if (!limit || limit.resetTime < now) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + 60000 }) // 1-minute window
    return true
  }

  if (limit.count >= 10) {
    return false // Rate limited
  }

  limit.count++
  return true
}

export async function POST(request: Request) {
  try {
    // 1. Get client IP for rate limiting
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown'

    // 2. Check rate limit
    if (!checkRateLimit(clientIp)) {
      return NextResponse.json(
        { error: 'Too many requests. Maximum 10 per minute.' },
        { status: 429 }
      )
    }

    // 3. Parse and validate input
    const body = await request.json()
    const parsed = PublicTicketSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.format() },
        { status: 400 }
      )
    }

    const { email, title, description, priority, account_id } = parsed.data
    const admin = getSupabaseAdminClient()

    // 4. Resolve account
    let accountIdToUse = account_id

    if (!accountIdToUse) {
      // Try to find account by email domain
      const domain = email.split('@')[1]
      const { data: accounts } = await admin
        .from('accounts')
        .select('id')
        .ilike('website', `%${domain}%`)
        .limit(1)

      if (accounts && accounts.length > 0) {
        accountIdToUse = accounts[0].id
      } else {
        // Fallback: use default account (first account)
        const { data: allAccounts } = await admin
          .from('accounts')
          .select('id')
          .limit(1)

        if (!allAccounts || allAccounts.length === 0) {
          return NextResponse.json(
            { error: 'No account found to receive your ticket' },
            { status: 400 }
          )
        }

        accountIdToUse = allAccounts[0].id
      }
    }

    // 5. Create ticket
    const { data: ticket, error: createErr } = await admin
      .from('support_tickets')
      .insert({
        account_id: accountIdToUse,
        title: title.substring(0, 200),
        description: description.substring(0, 2000),
        priority,
        status: 'open',
        opened_at: new Date().toISOString(),
        source: 'form',
        created_via_form_at: new Date().toISOString()
      })
      .select('id, external_ticket_id')
      .single()

    if (createErr || !ticket) {
      console.error('[Public Form] Error creating ticket:', createErr)
      return NextResponse.json(
        { error: 'Failed to create ticket' },
        { status: 500 }
      )
    }

    // 6. Log event (async, don't block response)
    try {
      await admin.from('ticket_events').insert({
        ticket_id: ticket.id,
        event_type: 'public_submission',
        payload: {
          submitted_by_email: email,
          source: 'public_form',
          submitted_at: new Date().toISOString()
        }
      })
    } catch (err) {
      console.error('[Public Form] Error logging event:', err)
    }

    // 7. Send confirmation email (async, don't block response)
    sendPublicTicketConfirmationEmail({
      email,
      ticket_id: ticket.id,
      ticket_title: title,
      external_ticket_id: ticket.external_ticket_id
    }).catch(err => {
      console.error('[Public Form] Error sending confirmation email:', err)
    })

    return NextResponse.json({
      success: true,
      ticket_id: ticket.id,
      message: 'Ticket created successfully. Confirmation email sent.'
    }, { status: 200 })
  } catch (err) {
    console.error('[Public Tickets API] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Enable CORS for public endpoints
export async function OPTIONS(request: Request) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Webhook-Signature'
    }
  })
}
