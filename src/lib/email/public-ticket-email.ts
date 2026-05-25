/**
 * Email service for public ticket submissions
 * Sends confirmation email to customer after ticket creation via public form
 */

import nodemailer from 'nodemailer'
import { getSupabaseAdminClient } from '../supabase/admin'

const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@plannera.com'

interface PublicTicketEmailParams {
  email: string
  ticket_id: string
  ticket_title: string
  external_ticket_id?: string | null
}

export async function sendPublicTicketConfirmationEmail({
  email,
  ticket_id,
  ticket_title,
  external_ticket_id
}: PublicTicketEmailParams) {
  try {
    const adminClient = getSupabaseAdminClient()
    
    // Load Dynamic SMTP & Override settings from DB
    const { data: dbSettingsRow } = await (adminClient as any)
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

    // Override de E-mail de Teste
    const emailTestRecipient = emailSettings.email_test_recipient || process.env.EMAIL_TEST_RECIPIENT
    let finalTo = email
    let subjectPrefix = ''
    
    if (emailTestRecipient) {
      finalTo = emailTestRecipient
      subjectPrefix = `[TESTE - Destinatário Original: ${email}] `
    }

    const ticketNumber = external_ticket_id || ticket_id.substring(0, 8).toUpperCase()
    const trackingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://csplataform.plannera.com'}/tickets/${ticket_id}`

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #2d3558; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; padding: 20px; }
    .ticket-info { background: white; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; }
    .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; margin-top: 15px; }
    .footer { color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Ticket de Suporte Criado</h1>
    </div>
    <div class="content">
      <p>Olá,</p>
      <p>Seu ticket de suporte foi criado com sucesso. Aqui estão os detalhes:</p>
 
      <div class="ticket-info">
        <strong>Número do Ticket:</strong> #${ticketNumber}<br>
        <strong>Assunto:</strong> ${escapeHtml(ticket_title)}<br>
        <strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })}<br>
        <strong>Status:</strong> Aberto
      </div>
 
      <p>Você receberá atualizações por email conforme seu ticket for processado.</p>
 
      <a href="${trackingUrl}" class="button">Ver Ticket</a>
 
      <div class="footer">
        <p>Este é um e-mail automático. Por favor, não responda. Se tiver dúvidas, responda diretamente no seu ticket.</p>
        <p>© ${new Date().getFullYear()} Plannera. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>
 </body>
 </html>
     `

    const plainTextContent = `
Ticket de Suporte Criado

Seu ticket de suporte foi criado com sucesso.

Número do Ticket: #${ticketNumber}
Assunto: ${ticket_title}
Data: ${new Date().toLocaleDateString('pt-BR')}
Status: Aberto

Você receberá atualizações por email conforme seu ticket for processado.

© ${new Date().getFullYear()} Plannera. Todos os direitos reservados.
    `

    if (!transporter) {
      console.log('[Email] SMTP not configured. Logging email instead:')
      console.log({
        to: finalTo,
        subject: `${subjectPrefix}Seu ticket de suporte #${ticketNumber} foi criado`,
        text: plainTextContent
      })
      return
    }

    const result = await transporter.sendMail({
      from: EMAIL_FROM,
      to: finalTo,
      subject: `${subjectPrefix}Seu ticket de suporte #${ticketNumber} foi criado`,
      text: plainTextContent,
      html: htmlContent
    })

    console.log(`[Email] Confirmation email sent to ${finalTo} for ticket ${ticket_id} (Original: ${email}):`, result.messageId)
    return result
  } catch (err) {
    console.error('[Email] Error sending confirmation email:', err)
    throw err
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, char => map[char])
}
