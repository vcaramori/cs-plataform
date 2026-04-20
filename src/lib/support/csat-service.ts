import nodemailer from 'nodemailer'
import { getSupabaseAdminClient as createAdminClient } from '../supabase/admin'

/**
 * Generates a one-time CSAT token for a ticket.
 * Expires in 7 days by default.
 */
export async function generateCSATToken(ticketId: string): Promise<string | null> {
  const supabase = createAdminClient()
  
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

const token = crypto.randomUUID()

  // Try to insert or update (if already exists and not used)
  const { data, error } = await supabase
    .from('csat_tokens')
    .upsert({
      ticket_id: ticketId,
      token: token,
      expires_at: expiresAt.toISOString(),
      used_at: null,
      email_delivery_failed: false
    }, { onConflict: 'ticket_id' })
    .select()
    .single()

  if (error) {
    console.error(`[CSAT Service] Error generating token for ticket ${ticketId}:`, error)
    return null
  }

  return data.token
}

/**
 * Sends a CSAT email with exponential backoff.
 */
export async function sendCSATEmail(ticketId: string, retryCount = 0): Promise<boolean> {
  const supabase = createAdminClient()

  // 1. Fetch ticket and customer details
  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select(`
      id,
      title,
      account_id,
      accounts (name)
    `)
    .eq('id', ticketId)
    .single()

  if (error || !ticket) {
    console.error(`[CSAT Service] Ticket ${ticketId} not found.`)
    return false
  }

  // 2. Generate/Get token
  const token = await generateCSATToken(ticketId)
  if (!token) return false

  // 3. Prepare Email
  const smtpConfig = {
    host: process.env.SMTP_HOST || 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER || process.env.IMAP_USER,
      pass: process.env.SMTP_PASS || process.env.IMAP_PASSWORD,
    },
  }

  const transporter = nodemailer.createTransport(smtpConfig)
  
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const surveyUrl = `${baseUrl}/csat/${token}`

  const htmlContent = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #f7941e;">Sua opinião é fundamental!</h2>
      <p>Olá,</p>
      <p>O seu ticket <strong>"${ticket.title}"</strong> foi resolvido recentemente.</p>
      <p>Gostaríamos de saber como foi sua experiência com nosso suporte. Leva menos de 1 minuto!</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${surveyUrl}" style="background-color: #f7941e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
          Avaliar Atendimento
        </a>
      </div>
      
      <p style="font-size: 12px; color: #64748b;">
        Este link expira em 7 dias. Se você não solicitou este e-mail, por favor ignore-o.
      </p>
      <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="font-size: 12px; color: #94a3b8; text-align: center;">
        Plannera — CS-Continuum Platform
      </p>
    </div>
  `

  try {
    await transporter.sendMail({
      from: `"Suporte Plannera" <${smtpConfig.auth.user}>`,
      to: 'cliente@exemplo.com', // No cenário real, buscaríamos o e-mail do contato do ticket
      subject: `Como foi nosso suporte? — ${ticket.title}`,
      html: htmlContent,
    })

    console.log(`[CSAT Service] Email sent for ticket ${ticketId}`)
    return true
  } catch (err) {
    console.error(`[CSAT Service] Failed to send email for ticket ${ticketId} (Attempt ${retryCount + 1}):`, err)
    
    // Exponential Backoff: 3 retries max
    if (retryCount < 2) {
      const delay = Math.pow(2, retryCount) * 1000 // 1s, 2s
      await new Promise(res => setTimeout(res, delay))
      return sendCSATEmail(ticketId, retryCount + 1)
    }

    // Mark as failed in DB
    await supabase.from('csat_tokens').update({ email_delivery_failed: true }).eq('ticket_id', ticketId)
    return false
  }
}
