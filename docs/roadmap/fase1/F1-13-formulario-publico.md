# F1-13: Formulário Público/Webhook

## Contexto

Customers submit support tickets via email or widget. Need a public form without login + webhook ingestion from external systems (e.g., customer submits via Jira, form auto-creates ticket in CSPlataform).

Public form at `/api/public/tickets` (no auth), fields: email, subject, description, priority. Webhook endpoint accepts JSON payload, creates ticket atomically. Rate limiting + HMAC signature validation.

---

## Escopo

**É:**
- Public form: `/api/public/tickets` (GET renders form, POST creates ticket)
- No authentication required
- Fields: email (required), subject (required), description, priority (optional)
- On submit: create support_ticket, send confirmation email to customer
- Webhook endpoint: `/api/webhooks/tickets/create` + HMAC signature validation
- Webhook payload: `{ email, subject, description, priority, account_key }`
- Rate limit: 100 req/min per origin (prevent abuse)
- Return: 200 with `{ ticket_id }` on success, 400 on validation error, 429 on rate limit
- Webhook retry logic: implement exponential backoff (3 retries, 1s/2s/4s intervals)

**Não é (MVP):**
- Form customization per account (F2)
- Multi-field forms (only 4 core fields)
- File uploads (plain text only)
- Customer authentication (forms always public)
- Webhook delivery dashboard (F2)

---

## Decisões de Design (UX)

**Public Form UI:**
- Page: simple, no sidebar, CSPlataform branding minimal
- Form: centered, white card on light background
- Fields:
  - Email (required, text input, validation)
  - Subject (required, text input, max 200 chars)
  - Description (required, textarea, max 2000 chars)
  - Priority (optional, select: low, medium, high — default: medium)
- Button: "Enviar" (disabled if validation fails)
- On submit: spinner, disable button
- Success: "✓ Ticket criado (#123). Email de confirmação enviado para [email]"
- Error: "Erro ao criar ticket. Tente novamente." (generic, don't leak details)

**Confirmation Email:**
- To: customer email
- Subject: "Seu ticket de suporte #123 foi criado"
- Body: ticket ID, subject, link to public tracking page (future F2)
- Plain text + HTML

**Webhook Format:**
```json
{
  "email": "john@acme.com",
  "subject": "Database connection timeout",
  "description": "Every 5 minutes, DB connection fails...",
  "priority": "high",
  "account_key": "acme-prod-123", // maps to accounts.external_id
  "timestamp": 1705305600,
  "signature": "sha256=abcd..." // HMAC-SHA256(payload, webhook_secret)
}
```

**Retry Logic:**
- Webhook fails: log attempt
- Retry: 1s wait, then 2s, then 4s (3 total attempts)
- After 3 failures: log error, alert admin (F3)

---

## Schema / Migrações

**Coluna nova em support_tickets (optional):**

```sql
ALTER TABLE support_tickets ADD COLUMN (
  source text DEFAULT 'manual', -- 'manual', 'form', 'webhook', 'email'
  external_id text, -- ticket ID from external system (Jira, etc)
  created_via_form_at timestamptz -- timestamp if created via public form
);

CREATE INDEX idx_support_tickets_source ON support_tickets(source);
CREATE INDEX idx_support_tickets_external_id ON support_tickets(external_id);
```

**Webhook delivery log (optional):**

```sql
CREATE TABLE webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  payload jsonb NOT NULL,
  response_status int,
  response_body text,
  attempt_count int DEFAULT 1,
  last_attempt_at timestamptz DEFAULT now(),
  success boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_webhook_deliveries_account ON webhook_deliveries(account_id);
CREATE INDEX idx_webhook_deliveries_success ON webhook_deliveries(success);
```

---

## Arquivos Afetados

- `src/app/api/public/tickets/route.ts` — GET (form HTML), POST (create ticket)
- `src/app/public/tickets/page.tsx` — public form page (or rendered by API)
- `src/app/api/webhooks/tickets/create/route.ts` — webhook ingestion
- `src/lib/services/webhookService.ts` — signature validation, retry logic
- `src/lib/schemas/publicTicket.schema.ts` — Zod validation
- `src/lib/utils/hmacValidator.ts` — HMAC-SHA256 validation
- `scripts/jobs/webhook-retry.ts` — background job for retries

---

## Padrões a Seguir

**Public Form API:**
```typescript
// src/app/api/public/tickets/route.ts
export async function POST(request: Request) {
  const { email, subject, description, priority } = await request.json();

  // Rate limit check
  const origin = request.headers.get('origin');
  const rateLimitKey = `form:${origin}`;
  const count = await redis.incr(rateLimitKey);
  if (count > 100) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
  }
  if (count === 1) {
    await redis.expire(rateLimitKey, 60); // 1-min window
  }

  // Validate
  const validation = publicTicketSchema.safeParse({ email, subject, description, priority });
  if (!validation.success) {
    return new Response(JSON.stringify({ error: 'Invalid input' }), { status: 400 });
  }

  // Create ticket (lookup account by email domain or default account)
  const ticket = await createTicket({
    email,
    subject,
    description,
    priority: priority || 'medium',
    source: 'form'
  });

  // Send confirmation email
  await sendEmail({
    to: email,
    subject: `Ticket ${ticket.id} criado`,
    body: confirmationEmailTemplate(ticket)
  });

  return new Response(JSON.stringify({ ticket_id: ticket.id }), { status: 200 });
}
```

**Webhook Signature Validation:**
```typescript
// src/lib/utils/hmacValidator.ts
import { createHmac } from 'crypto';

export function validateWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const hash = createHmac('sha256', secret).update(payload).digest('hex');
  return `sha256=${hash}` === signature;
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**P (Pequeno)** — 0.75 sessões BMAD

- Public form + HTML rendering (straightforward)
- Webhook validation + ingestion (standard pattern)
- Rate limiting (Redis)
- Email confirmation (simple template)

---

## Dependências

**Precisa que:** F1-01 (support_tickets), email service configured

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Public form accessible at `/api/public/tickets` without auth
- [ ] F2 — Form fields: email, subject, description, priority (required, required, optional, optional)
- [ ] F3 — Submit valid form → ticket created in DB with source='form'
- [ ] F4 — Confirmation email sent to customer email (subject + ticket ID)
- [ ] F5 — Response: 200 with `{ ticket_id }` on success
- [ ] F6 — Invalid form (missing required field) → 400 error
- [ ] F7 — Webhook endpoint `/api/webhooks/tickets/create` accepts POST
- [ ] F8 — Webhook validates HMAC signature (reject 401 if invalid)
- [ ] F9 — Valid webhook payload → creates ticket atomically
- [ ] F10 — Rate limit: 100 req/min per origin (return 429 if exceeded)

### Edge Cases

- [ ] E1 — Email field with invalid format (not email): 400 error
- [ ] E2 — Subject > 200 chars: truncate or 400 error? (Define: truncate)
- [ ] E3 — Description > 2000 chars: truncate or 400? (Define: truncate)
- [ ] E4 — Webhook fails temporarily (timeout): retry 3x with exponential backoff
- [ ] E5 — Webhook account_key doesn't match known account: 400 error
- [ ] E6 — Same form submitted twice (duplicate email+subject): allow or dedupe? (Define: allow, CSM handles)

### Performance

- [ ] P1 — Form submission < 2s (including email send)
- [ ] P2 — Webhook ingestion < 1s
- [ ] P3 — Rate limit check < 50ms

### Isolation

- [ ] T1 — Form ticket creation linked to correct account (via email domain or default)
- [ ] T2 — Webhook account_key validation prevents cross-account ticket creation

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Public Endpoint + Webhook:**
- [ ] F1-F6: Public form end-to-end
- [ ] F7-F10: Webhook validation + ingestion
- [ ] P1-P2: Latency acceptable for external integrations

**Testes obrigatórios:**
```
E2E:
1. POST form: valid email/subject/description → ticket created
2. Verify confirmation email sent
3. POST webhook: valid signature + payload → ticket created
4. POST webhook: invalid signature → 401 error
5. Rate limit: 101 requests in 60s → 101st returns 429

Unit:
- Form validation: email format, max lengths
- HMAC validation: correct signature passes, wrong signature fails
- Account lookup: email domain maps to account

Edge cases:
- Missing required fields return 400
- Webhook retry: simulate failure, verify retries
```

**Fixtures:**
- Valid webhook secret key
- Sample webhook payloads (valid + invalid signatures)
- Email templates (text + HTML)

---

## Notas

1. **Account mapping** — form submission needs to find account. Options:
   - Email domain (john@acme.com → find account where domain=acme.com)
   - Query parameter (?account_id=...)
   - Default account for unmatched domains
   MVP: use email domain, fallback to first account

2. **Email service** — use existing mail provider (Resend, SendGrid, AWS SES). Async send (don't block API).

3. **Webhook secret** — generate per account in settings, admin can regenerate. Document in webhook docs.

4. **Public form URL** — consider subdomain (form.csplataform.io) or path (/submit/ticket). MVP: /api/public/tickets.

5. **Spam prevention** — rate limit + CAPTCHA (future F2). Current MVP: rely on rate limiting.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md)
- Anterior: [F1-12 Reopen Manual](F1-12-reopen-manual.md)
- Próximo: [F1-14 Fila com Capacidade](F1-14-fila-capacidade.md)
