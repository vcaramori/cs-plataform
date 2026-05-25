import nodemailer from 'nodemailer'

export interface EmailSettings {
  smtp_host?: string
  smtp_port?: number
  smtp_user?: string
  smtp_password?: string
  imap_user?: string
}

export async function sendTicketAcknowledgment(ticket: any, emailSettings: EmailSettings, originalSender: string, originalSubject: string) {
  if (!emailSettings.smtp_host || !emailSettings.smtp_user || !emailSettings.smtp_password) {
    console.error('[EmailSender] SMTP settings are incomplete.')
    return false
  }

  const transporter = nodemailer.createTransport({
    host: emailSettings.smtp_host,
    port: emailSettings.smtp_port || 587,
    secure: emailSettings.smtp_port === 465,
    auth: {
      user: emailSettings.smtp_user,
      pass: emailSettings.smtp_password
    },
    tls: {
      rejectUnauthorized: false
    }
  })

  // Rule: If sender contains "notify", route to vinicius.caramori@plannera.com.br for testing
  let recipient = originalSender
  if (recipient.toLowerCase().includes('notify')) {
    recipient = 'vinicius.caramori@plannera.com.br'
  }

  // Remove potential Re: or [Ticket ...] from the original subject to prevent duplication
  const cleanSubject = originalSubject.replace(/^(Re:\s*)+/i, '').replace(/\[Ticket #[A-Z0-9]+\]\s*/i, '').trim()
  const ticketCode = ticket.external_ticket_id || ticket.id.split('-')[0].toUpperCase()
  
  const subject = `Re: [Ticket #${ticketCode}] ${cleanSubject}`

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6;">
      <p>Olá,</p>
      <p>Recebemos sua solicitação e um ticket foi aberto em nosso sistema com o código <strong>#${ticketCode}</strong>.</p>
      <p>Nossa equipe de suporte analisará a requisição e responderá o mais breve possível. Para adicionar mais informações ou acompanhar, por favor responda a este e-mail mantendo o assunto inalterado.</p>
      <br />
      <hr style="border: none; border-top: 1px solid #eee;" />
      <p style="color: #666; font-size: 12px;">
        <strong>Resumo da solicitação:</strong><br />
        <em>${ticket.title}</em>
      </p>
      <br />
      <p style="color: #999; font-size: 11px;">Equipe de Suporte Plannera</p>
    </div>
  `

  try {
    await transporter.sendMail({
      from: emailSettings.imap_user || emailSettings.smtp_user,
      to: recipient,
      subject,
      html: htmlBody
    })
    console.log(`[EmailSender] Auto-reply sent to ${recipient} for ticket #${ticketCode}`)
    return true
  } catch (error) {
    console.error(`[EmailSender] Error sending auto-reply for ticket #${ticketCode}:`, error)
    return false
  }
}
