/**
 * E-mails transacionais do Portal do Cliente
 * Segue o mesmo padrão de SMTP do public-ticket-email.ts
 */

import nodemailer from 'nodemailer'
import { getSupabaseAdminClient } from '../supabase/admin'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://csplataform.plannera.com'
const EMAIL_FROM = process.env.EMAIL_FROM || 'noreply@plannera.com'

function escapeHtml(text: string): string {
  const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }
  return text.replace(/[&<>"']/g, c => map[c])
}

async function getTransporter() {
  const admin = getSupabaseAdminClient() as any
  const { data } = await admin.from('app_settings').select('value').eq('key', 'support_email_integration').single()
  const cfg = data?.value || {}

  const host = cfg.smtp_host || process.env.SMTP_HOST
  const port = parseInt(cfg.smtp_port || process.env.SMTP_PORT || '587')
  const user = cfg.smtp_user || process.env.SMTP_USER
  const pass = cfg.smtp_password || process.env.SMTP_PASS
  const testRecipient = cfg.email_test_recipient || process.env.EMAIL_TEST_RECIPIENT || null

  const transporter = host && user && pass
    ? nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } })
    : null

  return { transporter, testRecipient }
}

async function send(to: string, subject: string, html: string, text: string) {
  try {
    const { transporter, testRecipient } = await getTransporter()
    const finalTo = testRecipient || to
    const finalSubject = testRecipient ? `[TESTE → ${to}] ${subject}` : subject

    if (!transporter) {
      console.log('[PortalEmail] SMTP não configurado. Log:', { to: finalTo, subject: finalSubject })
      return
    }
    const result = await transporter.sendMail({ from: EMAIL_FROM, to: finalTo, subject: finalSubject, html, text })
    console.log(`[PortalEmail] Enviado para ${finalTo}: ${result.messageId}`)
    return result
  } catch (err) {
    console.error('[PortalEmail] Erro ao enviar:', err)
    // Não lança — e-mail não pode derrubar o fluxo principal
  }
}

// ─── Templates base ──────────────────────────────────────────────────────────

function baseLayout(title: string, body: string, cta?: { url: string; label: string }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; }
    .header { background: #2d3558; padding: 28px 32px; border-radius: 16px 16px 0 0; text-align: center; }
    .header img { height: 36px; width: auto; }
    .body { background: #ffffff; padding: 32px; border: 1px solid #e2e8f0; border-top: none; }
    .body p { color: #475569; font-size: 14px; line-height: 1.7; margin-bottom: 16px; }
    .body strong { color: #1e293b; }
    .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin: 20px 0; }
    .card p { margin: 0; color: #334155; font-size: 13px; }
    .btn { display: inline-block; background: #f7941e; color: #ffffff !important; text-decoration: none;
           font-weight: 700; font-size: 13px; letter-spacing: 0.05em; text-transform: uppercase;
           padding: 14px 28px; border-radius: 10px; margin-top: 8px; }
    .btn-secondary { background: #2ba09d; }
    .btn-danger   { background: #ef4444; }
    .footer { background: #f8fafc; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;
              padding: 16px 32px; text-align: center; }
    .footer p { color: #94a3b8; font-size: 11px; }
    h2 { color: #1e293b; font-size: 18px; font-weight: 800; margin-bottom: 16px; letter-spacing: -0.01em; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <img src="${APP_URL}/brand/logo.png" alt="Plannera" />
    </div>
    <div class="body">
      <h2>${escapeHtml(title)}</h2>
      ${body}
      ${cta ? `<div style="text-align:center;margin-top:24px"><a href="${cta.url}" class="btn">${escapeHtml(cta.label)}</a></div>` : ''}
    </div>
    <div class="footer">
      <p>Este é um e-mail automático — não responda a esta mensagem.</p>
      <p style="margin-top:4px">© ${new Date().getFullYear()} Plannera. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>`
}

// ─── 1. Convite enviado → cliente ─────────────────────────────────────────────

export async function sendPortalInviteEmail({
  to,
  contactName,
  accountName,
  setupUrl,
}: {
  to: string
  contactName: string
  accountName: string
  setupUrl: string
}) {
  const title = `Você foi convidado para o Portal ${accountName}`
  const body = `
    <p>Olá, <strong>${escapeHtml(contactName)}</strong>!</p>
    <p>Você recebeu um convite de acesso ao <strong>Portal do Cliente</strong> de <strong>${escapeHtml(accountName)}</strong>.</p>
    <p>No portal você pode acompanhar todos os seus chamados de suporte, verificar status e indicadores de SLA em tempo real.</p>
    <div class="card">
      <p><strong>📧 E-mail de acesso:</strong> ${escapeHtml(to)}</p>
      <p style="margin-top:8px"><strong>⏰ Link válido por:</strong> 72 horas</p>
    </div>
    <p>Clique no botão abaixo para criar sua senha e acessar o portal:</p>
  `
  const text = `Olá ${contactName}!\n\nVocê foi convidado para o Portal do Cliente de ${accountName}.\nAcesse: ${setupUrl}\n\nO link expira em 72 horas.`
  await send(to, `Convite: Acesso ao Portal ${accountName}`, baseLayout(title, body, { url: setupUrl, label: 'Criar Minha Senha e Acessar' }), text)
}

// ─── 2. Aprovação pendente → CSM ──────────────────────────────────────────────

export async function sendPortalApprovalRequestEmail({
  to,
  csmName,
  contactName,
  contactEmail,
  accountName,
  approveUrl,
}: {
  to: string
  csmName: string
  contactName: string
  contactEmail: string
  accountName: string
  approveUrl: string
}) {
  const title = `Aprovação pendente — Portal do Cliente`
  const body = `
    <p>Olá, <strong>${escapeHtml(csmName)}</strong>!</p>
    <p>O stakeholder abaixo solicitou acesso ao Portal do Cliente e aguarda sua aprovação:</p>
    <div class="card">
      <p><strong>👤 Nome:</strong> ${escapeHtml(contactName)}</p>
      <p style="margin-top:8px"><strong>📧 E-mail:</strong> ${escapeHtml(contactEmail)}</p>
      <p style="margin-top:8px"><strong>🏢 Conta:</strong> ${escapeHtml(accountName)}</p>
    </div>
    <p>Acesse a plataforma para aprovar ou rejeitar o acesso:</p>
  `
  const text = `${csmName}, ${contactName} (${contactEmail}) solicitou acesso ao portal de ${accountName}.\nAprovar/rejeitar: ${approveUrl}`
  await send(to, `[Ação Necessária] Aprovação de acesso ao portal — ${contactName}`, baseLayout(title, body, { url: approveUrl, label: 'Aprovar ou Rejeitar Acesso' }), text)
}

// ─── 3. Acesso aprovado → cliente ─────────────────────────────────────────────

export async function sendPortalAccessApprovedEmail({
  to,
  contactName,
  accountName,
}: {
  to: string
  contactName: string
  accountName: string
}) {
  const portalUrl = `${APP_URL}/portal/login`
  const title = `Seu acesso foi aprovado!`
  const body = `
    <p>Olá, <strong>${escapeHtml(contactName)}</strong>!</p>
    <p>Seu acesso ao Portal do Cliente de <strong>${escapeHtml(accountName)}</strong> foi <strong style="color:#16a34a">aprovado</strong>.</p>
    <p>Você já pode entrar com o e-mail <strong>${escapeHtml(to)}</strong> e a senha que definiu no convite.</p>
    <div class="card">
      <p>No portal você encontra:</p>
      <p style="margin-top:8px">📋 Todos os seus chamados abertos e histórico</p>
      <p style="margin-top:4px">📊 Indicadores de SLA e tempo de resolução</p>
      <p style="margin-top:4px">🔔 Status em tempo real de cada chamado</p>
    </div>
  `
  const text = `${contactName}, seu acesso ao portal de ${accountName} foi aprovado!\nAcesse: ${portalUrl}`
  await send(to, `Acesso aprovado — Portal ${accountName}`, baseLayout(title, body, { url: portalUrl, label: 'Acessar o Portal' }), text)
}

// ─── 4. Acesso rejeitado → cliente ────────────────────────────────────────────

export async function sendPortalAccessRejectedEmail({
  to,
  contactName,
  accountName,
  reason,
}: {
  to: string
  contactName: string
  accountName: string
  reason?: string | null
}) {
  const title = `Solicitação de acesso não aprovada`
  const body = `
    <p>Olá, <strong>${escapeHtml(contactName)}</strong>!</p>
    <p>Infelizmente sua solicitação de acesso ao Portal do Cliente de <strong>${escapeHtml(accountName)}</strong> não foi aprovada neste momento.</p>
    ${reason ? `<div class="card"><p><strong>Motivo:</strong> ${escapeHtml(reason)}</p></div>` : ''}
    <p>Em caso de dúvidas, entre em contato com o CSM responsável pela sua conta.</p>
  `
  const text = `${contactName}, seu acesso ao portal de ${accountName} não foi aprovado.${reason ? `\nMotivo: ${reason}` : ''}`
  await send(to, `Solicitação de acesso não aprovada — ${accountName}`, baseLayout(title, body), text)
}

// ─── 5. Status de ticket atualizado → cliente ────────────────────────────────

export async function sendPortalTicketStatusEmail({
  to,
  contactName,
  accountName,
  ticketTitle,
  ticketRef,
  newStatus,
  ticketId,
}: {
  to: string
  contactName: string
  accountName: string
  ticketTitle: string
  ticketRef: string
  newStatus: string
  ticketId: string
}) {
  const STATUS_LABELS: Record<string, string> = {
    open: 'Aberto', in_progress: 'Em Andamento', waiting: 'Aguardando',
    escalated: 'Escalado', resolved: 'Resolvido', closed: 'Encerrado',
  }
  const statusLabel = STATUS_LABELS[newStatus] ?? newStatus
  const ticketUrl = `${APP_URL}/portal/tickets/${ticketId}`

  const title = `Atualização no chamado ${ticketRef}`
  const body = `
    <p>Olá, <strong>${escapeHtml(contactName)}</strong>!</p>
    <p>Houve uma atualização no seu chamado de suporte:</p>
    <div class="card">
      <p><strong>📋 Chamado:</strong> ${escapeHtml(ticketRef)}</p>
      <p style="margin-top:8px"><strong>📝 Assunto:</strong> ${escapeHtml(ticketTitle)}</p>
      <p style="margin-top:8px"><strong>🔄 Novo status:</strong> <strong style="color:#f7941e">${escapeHtml(statusLabel)}</strong></p>
      <p style="margin-top:8px"><strong>🏢 Conta:</strong> ${escapeHtml(accountName)}</p>
    </div>
    <p>Acompanhe o histórico completo no portal:</p>
  `
  const text = `${contactName}, seu chamado ${ticketRef} foi atualizado para "${statusLabel}".\nVer detalhes: ${ticketUrl}`
  await send(to, `[${statusLabel}] Chamado ${ticketRef} — ${accountName}`, baseLayout(title, body, { url: ticketUrl, label: 'Ver Chamado no Portal' }), text)
}
