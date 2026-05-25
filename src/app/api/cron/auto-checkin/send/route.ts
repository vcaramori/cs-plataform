import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import nodemailer from 'nodemailer'

export const maxDuration = 300 // 5 minutes

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@plannera.com'

export async function POST(request: Request) {
  // Check API Secret for internal cron auth
  const secret = request.headers.get('x-api-secret')
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient() as any
  let sent = 0
  let skipped = 0
  let errors: string[] = []

  try {
    // Load Dynamic SMTP & Override settings from DB
    const { data: dbSettingsRow } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'support_email_integration')
      .single()

    const emailSettings = dbSettingsRow?.value || {}
    
    const smtpHost = emailSettings.smtp_host || process.env.SMTP_HOST
    const smtpPort = parseInt(emailSettings.smtp_port || process.env.SMTP_PORT || '587')
    const smtpUser = emailSettings.smtp_user || process.env.SMTP_USER
    const smtpPass = emailSettings.smtp_password || process.env.SMTP_PASS

    // Create transporter dynamically
    const transporter = smtpHost && smtpUser && smtpPass
      ? nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        })
      : null

    const emailTestRecipient = emailSettings.email_test_recipient || process.env.EMAIL_TEST_RECIPIENT

    // Find items to send:
    // - status='approved' OR
    // - status='pending' AND approval_deadline < NOW() (auto-approve after deadline)
    const now = new Date().toISOString()

    const { data: queueItems } = await supabase
      .from('auto_checkin_queue')
      .select(`
        *,
        account:accounts(id, name),
        csm:auth.users(id, email)
      `)
      .or(`status.eq.approved,and(status.eq.pending,approval_deadline.lt.${now})`)

    if (!queueItems || queueItems.length === 0) {
      return NextResponse.json({ sent: 0, skipped: 0 })
    }

    console.log(`[Auto-Checkin Send] Processing ${queueItems.length} items`)

    for (const item of queueItems) {
      try {
        // Determine email content (prefer edited, fallback to generated)
        const subject = item.edited_subject || item.generated_subject
        const body = item.edited_body || item.generated_body

        // Fetch CSM email for recipient
        const { data: csm } = await supabase
          .from('auth.users')
          .select('email')
          .eq('id', item.csm_id)
          .single()

        if (!csm?.email) {
          errors.push(`Queue ${item.id}: CSM email not found`)
          continue
        }

        // Fetch contact email (attempt to get primary contact or use CSM email as fallback)
        const { data: contacts } = await supabase
          .from('contacts')
          .select('email')
          .eq('account_id', item.account_id)
          .eq('decision_maker', true)
          .limit(1)

        const recipientEmail = contacts?.[0]?.email || csm.email

        // Apply email test override logic
        let finalTo = recipientEmail
        let subjectPrefix = ''
        
        if (emailTestRecipient) {
          finalTo = emailTestRecipient
          subjectPrefix = `[TESTE - Destinatário Original: ${recipientEmail}] `
        }

        // Send email via nodemailer
        if (transporter) {
          const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { border-bottom: 2px solid #5c3a8e; padding-bottom: 15px; margin-bottom: 20px; }
    .content { margin-bottom: 30px; }
    .footer { font-size: 12px; color: #666; text-align: center; padding-top: 20px; border-top: 1px solid #eee; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin: 0;">Plannera CS Continuum</h2>
    </div>
    <div class="content">
      ${body.replace(/\n/g, '<br />')}
    </div>
    <div class="footer">
      <p>Este é um email automatizado. Por favor, não responda este email.</p>
    </div>
  </div>
</body>
</html>`

          await transporter.sendMail({
            from: EMAIL_FROM,
            to: finalTo,
            subject: `${subjectPrefix}${subject}`,
            html: htmlContent,
            text: body
          })

          console.log(`[Auto-Checkin] Sent check-in email for account ${item.account_id} to ${finalTo} (Original: ${recipientEmail})`)
        } else {
          console.log(`[Auto-Checkin] SMTP not configured, logging email instead`)
          console.log(`To: ${finalTo}, Subject: ${subjectPrefix}${subject}`)
        }

        // Update queue item status
        const { error: updateError } = await supabase
          .from('auto_checkin_queue')
          .update({
            status: 'sent',
            sent_at: new Date().toISOString()
          })
          .eq('id', item.id)

        if (updateError) {
          errors.push(`Queue ${item.id}: Failed to update - ${updateError.message}`)
          continue
        }

        // Create time entry for CSM
        const { error: timeError } = await supabase
          .from('time_entries')
          .insert({
            account_id: item.account_id,
            csm_id: item.csm_id,
            activity_type: 'auto_checkin',
            natural_language_input: `Auto check-in: ${subject}`,
            parsed_hours: 0.25, // 15 minutes for email composition
            parsed_description: `Automated check-in email sent: ${subject}`,
            date: new Date().toISOString().split('T')[0],
            logged_at: new Date().toISOString()
          })

        if (timeError) {
          // Non-critical: log but don't fail the entire operation
          console.error(`Queue ${item.id}: Failed to create time entry - ${timeError.message}`)
        }

        sent++
      } catch (err: any) {
        errors.push(`Queue ${item.id}: ${err.message}`)
      }
    }

    return NextResponse.json({
      sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      total: queueItems.length
    })
  } catch (err: any) {
    console.error('[Auto-Checkin Send] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
