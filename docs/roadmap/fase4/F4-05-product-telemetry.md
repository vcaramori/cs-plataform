# F4-05: Integração Product Telemetry

## Contexto

CSM needs visibility into customer product usage: "Is ABC using the API? How many reports per week? Which features unused?" Product telemetry from customer's product feeds usage data to CSPlataform, enables adoption scoring and expansion signals.

---

## Escopo

**É:**
- Webhook endpoint: `/api/webhooks/telemetry/usage`
- Payload: account_id, feature_name, usage_count, timestamp
- Storage: usage events in database
- Aggregation: daily/weekly usage metrics per account/feature
- Usage trends: sparklines in account detail
- Adoption scoring: features used / features available = adoption %
- Alerts: if usage drops 50% week-over-week, trigger alert
- API: public endpoint for product to POST usage events (rate-limited)

**Não é (MVP):**
- Custom event properties (fixed schema only)
- Machine learning on usage patterns (F4+)
- Predictive churn based on usage (F4+)

---

## Decisões de Design (UX)

**Account Detail - Product Usage Section:**
- "Uso do Produto" tab
- Summary: adoption score (0-100%), last 7 days summary
- Features table: feature name, last used, times used (last 7d), trend sparkline
- Usage chart: 30-day usage by feature (stacked bar or area chart)
- Usage events timeline: recent events (feature_x used 5 times, etc)

**Adoption Score Calculation:**
- Total features available (from product)
- Features used in last 30 days
- Score = (features_used / total_features) * 100
- Color-coded: < 30% red, 30-60% yellow, > 60% green

**Alerts:**
- Usage drop alert: if usage_7d < usage_7d_prev * 0.5
- Feature not used: if feature has 0 uses in 30 days
- In F3-02 alert dashboard: "Usage concern: Feature X not used for 30 days"

---

## Schema / Migrações

**Tabelas novas:**

```sql
CREATE TABLE product_usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  feature_name text NOT NULL,
  usage_count int NOT NULL DEFAULT 1,
  event_metadata jsonb, -- extensible: { user_id, action, etc }
  recorded_at timestamptz DEFAULT now()
);

CREATE TABLE product_features (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  category text, -- 'core', 'advanced', 'integration', 'admin'
  created_at timestamptz DEFAULT now()
);

-- Aggregated view (daily)
CREATE MATERIALIZED VIEW product_usage_daily AS
SELECT 
  account_id,
  DATE(recorded_at) as usage_date,
  feature_name,
  SUM(usage_count) as daily_usage_count,
  COUNT(*) as event_count
FROM product_usage_events
GROUP BY account_id, DATE(recorded_at), feature_name;

-- Adoption score per account
CREATE VIEW account_adoption_score AS
SELECT 
  a.id as account_id,
  a.name,
  COUNT(DISTINCT CASE WHEN pud.daily_usage_count > 0 AND pud.usage_date >= NOW() - INTERVAL '30 days' THEN pud.feature_name END) as features_used_30d,
  (SELECT COUNT(*) FROM product_features) as total_features,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN pud.daily_usage_count > 0 AND pud.usage_date >= NOW() - INTERVAL '30 days' THEN pud.feature_name END) /
    NULLIF((SELECT COUNT(*) FROM product_features), 0),
    0
  ) as adoption_score_pct
FROM accounts a
LEFT JOIN product_usage_daily pud ON a.id = pud.account_id
GROUP BY a.id, a.name;

CREATE INDEX idx_product_usage_events_account ON product_usage_events(account_id);
CREATE INDEX idx_product_usage_events_feature ON product_usage_events(feature_name);
CREATE INDEX idx_product_usage_daily_account ON product_usage_daily(account_id);
```

---

## Arquivos Afetados

- `src/app/api/webhooks/telemetry/usage/route.ts` — usage event receiver
- `src/app/(dashboard)/accounts/[id]/components/ProductUsageSection.tsx` — usage display
- `src/app/(dashboard)/accounts/[id]/components/AdoptionScore.tsx` — adoption badge
- `src/app/(dashboard)/accounts/[id]/components/UsageChart.tsx` — usage trends
- `src/lib/services/telemetryService.ts` — usage aggregation + adoption calculation
- `src/lib/services/alertService.ts` — extend with usage drop detection
- `supabase/migrations/[timestamp]_create_product_usage.sql` — migration

---

## Padrões a Seguir

**Webhook Receiver (Public API):**
```typescript
// src/app/api/webhooks/telemetry/usage/route.ts
const WEBHOOK_SECRET = process.env.TELEMETRY_WEBHOOK_SECRET!;

// Rate limit: 100 requests per minute per origin
const rateLimiter = new RateLimiter('telemetry', 100, 60000);

export async function POST(request: Request) {
  const origin = request.headers.get('x-forwarded-for') || 'unknown';

  // Check rate limit
  if (!rateLimiter.allow(origin)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429 });
  }

  // Verify HMAC signature
  const signature = request.headers.get('x-telemetry-signature')!;
  const body = await request.text();
  
  const expectedSignature = createHmac('sha256', WEBHOOK_SECRET)
    .update(body)
    .digest('hex');

  if (signature !== expectedSignature) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
  }

  const { account_id, feature_name, usage_count, timestamp } = JSON.parse(body);

  // Validate payload
  if (!account_id || !feature_name || !usage_count) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400 });
  }

  // Store event
  await supabase
    .from('product_usage_events')
    .insert({
      account_id,
      feature_name,
      usage_count,
      recorded_at: timestamp || new Date()
    });

  // Check for usage drop alert
  await checkUsageDropAlert(account_id, feature_name);

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}

async function checkUsageDropAlert(accountId: string, featureName: string) {
  const usage7d = await getFeatureUsage(accountId, featureName, 7);
  const usage7d_prev = await getFeatureUsage(accountId, featureName, 14, 7);

  if (usage7d < usage7d_prev * 0.5) {
    // Create alert
    await createAlert(accountId, 'usage_drop', {
      feature: featureName,
      previous_usage: usage7d_prev,
      current_usage: usage7d
    });
  }
}
```

**Adoption Score Service:**
```typescript
// src/lib/services/telemetryService.ts
export async function calculateAdoptionScore(accountId: string): Promise<{
  score: number;
  featuresUsed: number;
  totalFeatures: number;
  usageByFeature: Record<string, number>;
}> {
  const [features, usage] = await Promise.all([
    getProductFeatures(),
    getAccountUsage30d(accountId)
  ]);

  const featuresUsed = usage.filter(u => u.usage_count > 0).length;
  const score = Math.round((featuresUsed / features.length) * 100);

  return {
    score,
    featuresUsed,
    totalFeatures: features.length,
    usageByFeature: Object.fromEntries(
      usage.map(u => [u.feature_name, u.total_usage])
    )
  };
}

async function getAccountUsage30d(accountId: string) {
  return supabase
    .from('product_usage_daily')
    .select('feature_name, daily_usage_count')
    .eq('account_id', accountId)
    .gte('usage_date', new Date(Date.now() - 30 * 86400000))
    .order('feature_name');
}
```

**Usage Chart Component:**
```typescript
// src/app/(dashboard)/accounts/[id]/components/UsageChart.tsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

export function UsageChart({ accountId }: { accountId: string }) {
  const { data: usage } = useQuery({
    queryKey: ['productUsage', accountId],
    queryFn: () => fetch(`/api/accounts/${accountId}/usage/30d`).then(r => r.json())
  });

  const chartData = usage?.map(u => ({
    feature: u.feature_name,
    usage: u.total_usage,
    trend: u.trend // previous period for comparison
  })) || [];

  return (
    <BarChart data={chartData} width={500} height={300}>
      <CartesianGrid strokeDasharray="3 3" />
      <XAxis dataKey="feature" />
      <YAxis />
      <Tooltip />
      <Bar dataKey="usage" fill="#8884d8" name="Usage (30d)" />
    </BarChart>
  );
}
```

**LLM:** Não aplica (data-driven, no analysis)

---

## Complexidade Estimada

**M (Médio)** — 1-1.5 sessões BMAD

- Public webhook receiver (HMAC verification, rate limiting)
- Usage event storage + aggregation
- Adoption score calculation
- Usage drop detection (alert integration)
- UI components (adoption badge, chart, timeline)
- Testes: unit (score calculation), E2E (webhook posting)

---

## Dependências

**Precisa que:**
- F3-02 Motor de Alertas (usage drop alerts)
- Accounts table

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Webhook receiver at `/api/webhooks/telemetry/usage`
- [ ] F2 — Verify HMAC signature on incoming webhook
- [ ] F3 — Parse payload: account_id, feature_name, usage_count
- [ ] F4 — Store usage event in product_usage_events table
- [ ] F5 — Rate limit: 100 requests/min per origin, return 429 if exceeded
- [ ] F6 — Adoption score: (features_used_30d / total_features) * 100
- [ ] F7 — Account detail: show adoption score badge (0-100%) with color
- [ ] F8 — Usage chart: 30-day usage per feature (bar chart)
- [ ] F9 — Features table: feature, last used date, usage count (7d/30d)
- [ ] F10 — Usage drop alert: if usage_7d < usage_7d_prev * 0.5, trigger alert

### Edge Cases

- [ ] E1 — Unknown feature_name: store event anyway (feature list can be updated)
- [ ] E2 — Usage count = 0: don't store (or store with validation)
- [ ] E3 — Timestamp missing in payload: use server received_at
- [ ] E4 — Account_id doesn't exist: return 404 or 400?

### Performance

- [ ] P1 — Webhook processing: < 500ms per event
- [ ] P2 — Adoption score calculation: < 1s
- [ ] P3 — Usage chart rendering (30d, 20+ features): < 2s

### Data Quality

- [ ] Q1 — Duplicate events (same feature, same minute): deduplicate?
- [ ] Q2 — Timestamp validation: reject future dates
- [ ] Q3 — Usage count validation: must be positive integer

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Telemetry:**
- [ ] F1-F5: Webhook receiver complete
- [ ] F6-F8: Adoption calculation + UI
- [ ] F10: Alert integration
- [ ] Q1-Q3: Data validation

**Testes obrigatórios:**
```
E2E:
1. POST /api/webhooks/telemetry/usage with valid HMAC
2. Verify event stored in database
3. Account detail: verify usage section shows data
4. Verify adoption score calculated and displayed
5. Verify usage chart renders

Unit:
- HMAC verification: correct/incorrect signature
- Rate limiter: allow first 100, reject 101st
- Adoption calculation: correct score formula
- Timestamp validation: reject future dates
- Feature unknown: store successfully
```

**Fixtures:**
- 3 accounts with different usage patterns
- 10 predefined features
- 30 days of synthetic usage events

---

## Estimativa de Tokens

- Webhook receiver: ~300 tokens
- Rate limiter: ~150 tokens
- Adoption service: ~250 tokens
- UI components: ~350 tokens
- Alert integration: ~200 tokens
- Tests: ~350 tokens
- **Total esperado:** 1.6k tokens por sessão BMAD

---

## Notas

1. **Feature catalog** — Product team maintains list of available features. Can be seeded in migration or fetched from external system.
2. **Privacy** — Telemetry is usage only, no user data or sensitive content. GDPR compliant.
3. **Scaling** — Usage events can grow quickly. Consider partitioning by account_id or time for large deployments.
4. **Adoption threshold** — MVP uses features_used/total_features. Can be weighted (some features more important) in F4+.

---

## Links Relacionados

- Anterior: [F4-04 Billing Integration](F4-04-billing-integration.md)
- Próximo: [F4-06 Slack Integration](F4-06-slack-integration.md)
- Integrations: [_components-map.md](_components-map.md) → `ProductUsageSection`, `AdoptionScore`
