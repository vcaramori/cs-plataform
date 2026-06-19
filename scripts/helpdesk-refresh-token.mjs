// Renova o Bearer token do HelpDesk via login automatizado (Playwright) e o envia
// para a cs-plataform (/api/integrations/helpdesk/token).
//
// Rodado pelo GitHub Actions (.github/workflows/helpdesk-token-refresh.yml) a cada
// ~3 dias. O token do app web dura ~5 dias; renovar a cada 3 dá folga.
//
// Variáveis de ambiente (secrets do GitHub):
//   HELPDESK_EMAIL          e-mail de login do HelpDesk
//   HELPDESK_PASSWORD       senha
//   CSPLATAFORM_BASE_URL    ex.: https://cs-plataform.vercel.app
//   HELPDESK_API_SECRET     = API_SECRET configurado no Vercel
//
// Uso local: defina as 4 vars e rode `node scripts/helpdesk-refresh-token.mjs`.

import { chromium } from 'playwright'

const EMAIL = process.env.HELPDESK_EMAIL
const PASSWORD = process.env.HELPDESK_PASSWORD
const BASE_URL = (process.env.CSPLATAFORM_BASE_URL || '').replace(/\/$/, '')
const API_SECRET = process.env.HELPDESK_API_SECRET

for (const [k, v] of Object.entries({ EMAIL, PASSWORD, BASE_URL, API_SECRET })) {
  if (!v) {
    console.error(`Faltando variável: ${k}`)
    process.exit(1)
  }
}

async function fillIfPresent(page, selectors, value) {
  for (const sel of selectors) {
    const el = page.locator(sel).first()
    if (await el.count().catch(() => 0)) {
      try {
        await el.fill(value, { timeout: 5000 })
        return true
      } catch {
        /* tenta o próximo seletor */
      }
    }
  }
  return false
}

async function clickIfPresent(page, selectors) {
  for (const sel of selectors) {
    const el = page.locator(sel).first()
    if (await el.count().catch(() => 0)) {
      try {
        await el.click({ timeout: 5000 })
        return true
      } catch {
        /* tenta o próximo */
      }
    }
  }
  return false
}

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext()
const page = await context.newPage()

try {
  // Navegar para o app dispara o redirect OAuth para accounts.livechat.com (login).
  await page.goto('https://app.helpdesk.com/', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForTimeout(2500)

  // A tela atual é um formulário ÚNICO (e-mail + senha juntos, botão "Log in with email").
  // Preenche o e-mail de forma robusta (vários seletores + label/placeholder) e VERIFICA.
  const emailFilled =
    (await fillIfPresent(page, [
      'input[autocomplete="username"]',
      'input[autocomplete="email"]',
      'input[type="email"]',
      'input[name="email"]',
      'input[name="username"]',
      'input[name="login"]',
      'input[placeholder*="email" i]',
      'input[placeholder*="e-mail" i]',
      'input[placeholder*="work-email" i]',
      '#email',
    ], EMAIL)) ||
    (await page.getByLabel(/business e-?mail|e-?mail/i).first().fill(EMAIL).then(() => true).catch(() => false))
  if (!emailFilled) {
    // Último recurso: primeiro input visível que não seja senha/oculto.
    const first = page.locator('input:not([type="password"]):not([type="hidden"]):visible').first()
    if (await first.count().catch(() => 0)) await first.fill(EMAIL).catch(() => {})
  }

  // Se houver fluxo de duas etapas (e-mail → Continuar → senha), clica em Continuar.
  await clickIfPresent(page, [
    'button:has-text("Continue")',
    'button:has-text("Continuar")',
    'button:has-text("Next")',
  ])
  await page.waitForTimeout(1200)

  await fillIfPresent(
    page,
    ['input[type="password"]', 'input[name="password"]', '#password', 'input[autocomplete="current-password"]'],
    PASSWORD
  )

  // Garante que o e-mail realmente ficou preenchido antes de submeter.
  const emailVal = await page
    .locator('input[type="email"], input[name="email"], input[autocomplete="username"], input[name="username"]')
    .first()
    .inputValue()
    .catch(() => '')
  if (!emailVal) {
    await page.getByLabel(/business e-?mail|e-?mail/i).first().fill(EMAIL).catch(() => {})
  }

  await clickIfPresent(page, [
    'button:has-text("Log in with email")',
    'button:has-text("Entrar com e-mail")',
    'button[type="submit"]',
    'button:has-text("Sign in")',
    'button:has-text("Log in")',
    'button:has-text("Entrar")',
  ])

  // Espera voltar ao app autenticado.
  await page.waitForURL(/app\.helpdesk\.com/, { timeout: 60000 })
  await page.waitForTimeout(3000)

  // Lê o token do cookie credentials.access_token.
  const cookies = await context.cookies('https://app.helpdesk.com')
  const tokenCookie = cookies.find((c) => c.name === 'credentials.access_token')
  if (!tokenCookie || !tokenCookie.value) {
    throw new Error('Cookie credentials.access_token não encontrado após o login.')
  }
  const accessToken = decodeURIComponent(tokenCookie.value)

  // Valida o token e captura o tempo de expiração na própria API.
  let expiresIn = null
  try {
    const r = await fetch('https://api.helpdesk.com/v1/tickets?pageSize=1', {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
    })
    if (!r.ok) throw new Error(`Token inválido na API (HTTP ${r.status})`)
    const exp = r.headers.get('x-token-expires-in')
    expiresIn = exp ? parseInt(exp, 10) : null
  } catch (e) {
    throw new Error(`Falha ao validar token na API HelpDesk: ${e.message}`)
  }

  // Envia para a cs-plataform.
  const res = await fetch(`${BASE_URL}/api/integrations/helpdesk/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-secret': API_SECRET },
    body: JSON.stringify({ access_token: accessToken, expires_in: expiresIn }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Falha ao enviar token à cs-plataform (HTTP ${res.status}): ${body}`)
  }

  const days = expiresIn ? Math.round((expiresIn / 86400) * 10) / 10 : '?'
  console.log(`✅ Token renovado e enviado. Expira em ~${days} dias.`)
} catch (err) {
  console.error('❌ Falha na renovação do token:', err.message)
  // Screenshot ajuda a depurar quebras de layout no login (artefato do CI).
  try {
    await page.screenshot({ path: 'helpdesk-login-failure.png', fullPage: true })
    console.error('Screenshot salvo em helpdesk-login-failure.png')
  } catch {
    /* ignore */
  }
  process.exitCode = 1
} finally {
  await browser.close()
}
