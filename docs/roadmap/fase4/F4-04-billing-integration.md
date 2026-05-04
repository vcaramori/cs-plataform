# F4-04: Integração Billing (Stripe/Omie)

## Contexto

CSPlataform needs MRR/ARR data for accounts but currently sourced from contracts table (static, manual entry). Real-time billing sync from Stripe (SaaS) or Omie (ERP) keeps revenue data fresh, enables Portfolio Analytics (F4-01), and surfaces expansion opportunities.

---

## Escopo

**É:**
- Stripe integration: pull subscriptions, invoices, events (payment_intent.succeeded, customer.subscription.updated)
- Omie integration: pull invoices, customers, payment status (for Brazilian users)
- Webhook receivers: Stripe and Omie notify CSPlataform of subscription/payment changes
- Data mapping: Stripe customer/subscription → CSPlataform account
- Contract sync: update contract ARR/MRR based on billing data
- Billing history: store invoices, payment events for audit trail
- Metrics: MRR, ARR, revenue per account, churn detection

**Não é (MVP):**
- Invoice generation (billing system external)
- Revenue recognition (accounting system external)
- Multi-currency support (F4+)

---

## Decisões de Design (UX)

**Setup Flow:**
1. Settings > Integrations > Billing
2. Choose Stripe or Omie
3. "Conectar Stripe" / "Conectar Omie" button
4. Stripe: OAuth popup
5. Omie: API key input
6. Initial sync: pull all customers + subscriptions
7. Status: "Sincronizado em XX minutos"

**Billing Dashboard (in Portfolio):**
- ARR by account
- MRR trend (30-day, 90-day, YTD)
- Payment health: overdue invoices, failed payments
- Expansion signals: subscriptions upgraded, new products

**Account Detail - Billing Section:**
- Current subscriptions (product, quantity, price, renewal date)
- Recent invoices (date, amount, status, link to PDF)
- Payment history: last 12 months payments
- Usage metrics (if available from Stripe)

---

## Schema / Migrações

**Tabelas novas:**

```sql
CREATE TABLE billing_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'stripe', 'omie'
  config jsonb NOT NULL, -- { api_key, webhook_secret, ... }
  enabled boolean DEFAULT true,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(org_id, provider)
);

CREATE TABLE billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider text NOT NULL, -- 'stripe', 'omie'
  external_subscription_id text NOT NULL,
  product_name text NOT NULL,
  quantity int DEFAULT 1,
  unit_price decimal(12, 2) NOT NULL,
  mrr decimal(12, 2) NOT NULL, -- monthly recurring revenue
  status text NOT NULL, -- 'active', 'paused', 'canceled', 'trialing'
  started_at timestamptz NOT NULL,
  renewed_at timestamptz,
  cancels_at timestamptz,
  
  UNIQUE(provider, external_subscription_id)
);

CREATE TABLE billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_invoice_id text NOT NULL,
  amount decimal(12, 2) NOT NULL,
  status text NOT NULL, -- 'draft', 'sent', 'paid', 'past_due', 'void', 'uncollectible'
  issued_at date NOT NULL,
  due_at date,
  paid_at date,
  pdf_url text,
  
  UNIQUE(provider, external_invoice_id)
);

CREATE TABLE billing_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_payment_id text NOT NULL,
  amount decimal(12, 2) NOT NULL,
  status text NOT NULL, -- 'succeeded', 'pending', 'failed'
  payment_method text, -- 'credit_card', 'boleto', 'bank_transfer'
  processed_at timestamptz NOT NULL,
  
  UNIQUE(provider, external_payment_id)
);

-- MRR/ARR calculated view
CREATE VIEW account_revenue_summary AS
SELECT 
  a.id as account_id,
  a.name,
  SUM(bs.mrr) as current_mrr,
  SUM(bs.mrr) * 12 as current_arr,
  (SELECT SUM(amount) FROM billing_payments bp 
   WHERE bp.account_id = a.id AND bp.processed_at >= NOW() - INTERVAL '30 days') 
   as revenue_30d,
  (SELECT COUNT(*) FROM billing_invoices bi 
   WHERE bi.account_id = a.id AND bi.status = 'past_due') as overdue_invoices_count
FROM accounts a
LEFT JOIN billing_subscriptions bs ON a.id = bs.account_id AND bs.status = 'active'
GROUP BY a.id, a.name;

CREATE INDEX idx_billing_subscriptions_account ON billing_subscriptions(account_id);
CREATE INDEX idx_billing_invoices_account ON billing_invoices(account_id);
CREATE INDEX idx_billing_payments_account ON billing_payments(account_id);
```

---

## Arquivos Afetados

- `src/app/(dashboard)/settings/integrations/billing/page.tsx` — billing setup
- `src/app/api/auth/stripe/callback/route.ts` — Stripe OAuth callback
- `src/app/api/integrations/billing/sync/route.ts` — manual sync trigger
- `src/app/api/webhooks/stripe/route.ts` — Stripe webhook receiver
- `src/app/api/webhooks/omie/route.ts` — Omie webhook receiver
- `src/lib/services/billingService.ts` — Stripe/Omie API interactions
- `src/lib/services/syncService.ts` — extend with billing sync
- `src/app/(dashboard)/accounts/[id]/components/BillingSection.tsx` — account billing detail
- `src/app/(dashboard)/portfolio/components/BillingMetrics.tsx` — portfolio billing view

---

## Padrões a Seguir

**Stripe Service:**
```typescript
// src/lib/services/billingService.ts
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function syncStripeCustomers() {
  const customers = await stripe.customers.list({ limit: 100 });
  const synced = [];

  for (const customer of customers.data) {
    // Find or create account by email
    let account = await findAccountByEmail(customer.email);
    if (!account) {
      account = await createAccount({
        name: customer.name,
        email: customer.email,
        externalBillingId: customer.id,
        externalBillingSystem: 'stripe'
      });
    }

    // Sync subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id
    });

    for (const subscription of subscriptions.data) {
      await saveBillingSubscription(account.id, {
        externalId: subscription.id,
        product: subscription.items.data[0].price.product,
        quantity: subscription.items.data[0].quantity,
        mrr: (subscription.items.data[0].price.unit_amount || 0) / 100,
        status: subscription.status,
        startedAt: new Date(subscription.start_date * 1000),
        renewedAt: subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : null
      });
    }

    synced.push(account.id);
  }

  return { synced, count: customers.data.length };
}

export async function syncStripeInvoices() {
  const invoices = await stripe.invoices.list({ limit: 100, status: 'all' });

  for (const invoice of invoices.data) {
    const account = await findAccountByExternalId('stripe', invoice.customer);
    if (!account) continue;

    await saveBillingInvoice(account.id, {
      externalId: invoice.id,
      amount: (invoice.amount_paid || 0) / 100,
      status: invoice.status,
      issuedAt: new Date(invoice.created * 1000),
      dueAt: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
      paidAt: invoice.paid_at ? new Date(invoice.paid_at * 1000) : null,
      pdfUrl: invoice.invoice_pdf
    });
  }
}
```

**Webhook Handler:**
```typescript
// src/app/api/webhooks/stripe/route.ts
export async function POST(request: Request) {
  const signature = request.headers.get('stripe-signature')!;
  const body = await request.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 400 });
  }

  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncStripeCustomers(); // re-fetch updated customer
      break;
    case 'invoice.payment_succeeded':
    case 'invoice.payment_failed':
      const invoice = event.data.object;
      const account = await findAccountByExternalId('stripe', invoice.customer);
      if (account) {
        await saveBillingInvoice(account.id, mapStripeInvoice(invoice));
      }
      break;
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

**LLM:** Não aplica (data-driven sync)

---

## Complexidade Estimada

**M (Médio)** — 1-1.5 sessões BMAD

- Stripe/Omie API clients
- Sync orchestration (customers, subscriptions, invoices)
- Webhook receivers (2)
- Data mapping + reconciliation
- Account linking (by email, external ID)
- Testes: unit (sync logic), E2E (OAuth, webhook simulation)

---

## Dependências

**Precisa que:**
- Accounts table
- OAuth/API key storage (integrations table)

**Bloqueia:**
- F4-01 Portfolio Analytics (uses MRR/ARR data)
- F4-02 Renewal Management (renewal forecast uses ARR)

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Setup: click "Conectar Stripe" → OAuth flow → token saved
- [ ] F2 — Initial sync: pull all Stripe customers + subscriptions + invoices
- [ ] F3 — Subscription mapping: Stripe subscription → CSPlataform billing_subscriptions
- [ ] F4 — Invoice mapping: Stripe invoice → CSPlataform billing_invoices
- [ ] F5 — Payment mapping: Stripe payment_intent → CSPlataform billing_payments
- [ ] F6 — Account linking: Stripe customer.email → existing account or create
- [ ] F7 — Webhook receiver: stripe event → sync updated subscription/invoice
- [ ] F8 — MRR calculation: SUM(subscriptions.mrr) = current_mrr
- [ ] F9 — ARR calculation: current_mrr * 12 = current_arr
- [ ] F10 — Account detail: show current subscriptions, recent invoices, payment history

### Edge Cases

- [ ] E1 — Multiple Stripe customers map to same email: merge or link?
- [ ] E2 — Stripe customer with no subscriptions: create account with $0 ARR
- [ ] E3 — Invoice without valid customer: skip or log error?
- [ ] E4 — Payment refers to unknown invoice: create placeholder invoice

### Performance

- [ ] P1 — Initial sync (1000 customers): < 5 minutes
- [ ] P2 — Webhook processing (subscription event): < 1s
- [ ] P3 — MRR calculation (query account_revenue_summary): < 500ms

### Data Quality

- [ ] Q1 — Subscription status: only 'active' subs count in MRR
- [ ] Q2 — Invoice reconciliation: invoices match subscriptions
- [ ] Q3 — Currency handling: all amounts in USD or org currency

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Billing:**
- [ ] F1-F6: Sync mapping complete
- [ ] F8-F9: Revenue calculation correct
- [ ] F7: Webhook processing reliable
- [ ] Q1-Q3: Data quality checks

**Testes obrigatórios:**
```
E2E:
1. Settings > Billing > Conectar Stripe
2. OAuth flow
3. Verify sync: customers, subscriptions, invoices
4. Account detail: verify Billing section shows subscriptions
5. Webhook simulation: POST to /webhooks/stripe with subscription.updated

Unit:
- Stripe sync: maps customer → account
- Invoice sync: correct status/amounts
- MRR calculation: correct from subscriptions
- Webhook: parses event, calls sync
```

**Fixtures:**
- Stripe test API key configured
- 3 test customers with different subscription statuses
- 5 invoices (paid, pending, overdue)

---

## Estimativa de Tokens

- Stripe service: ~400 tokens
- Webhook handlers (2): ~300 tokens
- Sync orchestration: ~300 tokens
- Data mapping: ~200 tokens
- UI components: ~300 tokens
- Tests: ~400 tokens
- **Total esperado:** 1.9k tokens por sessão BMAD

---

## Notas

1. **Currency handling** — For MVP, assume USD. F4+ adds multi-currency support with conversion rates.
2. **Reconciliation** — Monthly billing reconciliation job: match invoices to subscriptions, flag mismatches.
3. **Churn detection** — Subscription canceled → flag account as churn risk.
4. **Trial subscriptions** — Stripe trials don't have MRR until converted. Handle gracefully.
5. **Omie specifics** — Omie uses different API structure. May need separate sync logic or adapter pattern.

---

## Links Relacionados

- Anterior: [F4-03 HubSpot Integration](F4-03-hubspot-integration.md)
- Próximo: [F4-05 Product Telemetry](F4-05-product-telemetry.md)
- Integrations: [_components-map.md](_components-map.md) → `BillingSection`, `BillingMetrics`
