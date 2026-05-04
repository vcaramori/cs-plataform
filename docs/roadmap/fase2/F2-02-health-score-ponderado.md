# F2-02: Health Score Ponderado

## Contexto

Single health score (0-100) is too simplistic. Account could be thriving in adoption but silent in NPS. Weighted health score combines multidimensional signals: adoption (30%), support SLA compliance (25%), relationship strength (20%), financial growth (15%), NPS (10%).

Dashboard shows: Saudável (>75) / Em risco (50-75) / Crítico (<50) with color badges and breakdown.

---

## Escopo

**É:**
- Weighted formula: 30% adoption + 25% support_sla_compliance + 20% relationship + 15% financial_growth + 10% nps
- Components sourced from:
  - **Adoption**: feature usage, API calls (from F4 telemetry or manual score)
  - **SLA compliance**: breach count / total tickets (last 30 days)
  - **Relationship**: CSM touchpoints, meeting frequency, escalations (future tracking)
  - **Financial growth**: ARR change YoY (from billing)
  - **NPS**: latest score (if < 30 days old)
- Status: Saudável (>75, 🟢) / Em risco (50-75, 🟡) / Crítico (<50, 🔴)
- Display: account list with health badge, account detail with breakdown
- Cron job: daily recalculation

**Não é (MVP):**
- Custom weights per account (F2+)
- Predictive health trend (F3)
- Health alerts (F3)
- Peer benchmarking (F3)

---

## Decisões de Design (UX)

**Health Badge:**
- Position: account card (list view), account header (detail view)
- Style: circular progress badge
- Color: green (>75) / yellow (50-75) / red (<50)
- Label: "Saudável" / "Em risco" / "Crítico"
- Hover: breakdown "(Adoção 28/30, SLA 24/25, ...)"

**Health Breakdown (Detail View):**
- Section: "Health Score Breakdown"
- Chart: stacked bar or radial (optional visual)
- Rows: each component
  - Adoção: [score/30]
  - SLA Compliance: [score/25]
  - Relacionamento: [score/20]
  - Crescimento Financeiro: [score/15]
  - NPS: [score/10]
- Total: [total/100]
- Actionable notes:
  - If SLA low: "Focus on support quality"
  - If NPS low: "Schedule check-in"
  - If adoption low: "Proactive training"

**Filters in Account List:**
- Filter by health status: "Saudável" / "Em risco" / "Crítico"
- Useful for CSM dashboard (see at-risk accounts at a glance)

---

## Schema / Migrações

**Coluna nova em accounts:**

```sql
ALTER TABLE accounts ADD COLUMN (
  health_score float DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
  health_score_breakdown jsonb DEFAULT '{}'::jsonb, -- { adoption: 28, sla_compliance: 24, ... }
  health_status text DEFAULT 'neutral' CHECK (health_status IN ('healthy', 'at_risk', 'critical')),
  health_scored_at timestamptz DEFAULT now(),
  health_previous_score float, -- for trend tracking
  health_trend text DEFAULT 'stable' -- 'improving', 'stable', 'declining'
);

CREATE INDEX idx_accounts_health_status ON accounts(health_status);
CREATE INDEX idx_accounts_health_score ON accounts(health_score DESC);
```

**Components calculation:**

```sql
-- Query to calculate components (used in cron job)
WITH adoption_score AS (
  SELECT account_id, COALESCE(SUM(usage_count) / 10000, 0) as adoption_normalized
  FROM timeline_events
  WHERE event_type = 'product_usage' AND created_at > now() - interval '30 days'
  GROUP BY account_id
),
sla_score AS (
  SELECT account_id, 
    COALESCE(
      100 * (
        (SELECT COUNT(*) FROM support_tickets 
         WHERE account_id = accounts.id AND sla_status != 'vencido' AND status != 'closed')::float /
        NULLIF((SELECT COUNT(*) FROM support_tickets WHERE account_id = accounts.id), 0)
      ), 100
    ) as sla_normalized
  FROM accounts
),
nps_score AS (
  SELECT account_id, COALESCE(AVG(score), 50) as nps_normalized
  FROM nps_responses
  WHERE created_at > now() - interval '30 days'
  GROUP BY account_id
)
-- Combine in health calculation
SELECT 
  a.id,
  (a.adoption_score * 0.30 + a.sla_score * 0.25 + a.relationship_score * 0.20 + a.financial_score * 0.15 + nps.nps_normalized * 0.10) as health_score
FROM accounts a
LEFT JOIN nps_score nps ON a.id = nps.account_id;
```

---

## Arquivos Afetados

- `src/app/(dashboard)/accounts/components/HealthScoreBadge.tsx` — novo componente badge
- `src/app/(dashboard)/accounts/components/HealthBreakdown.tsx` — detail breakdown
- `src/app/(dashboard)/accounts/components/AccountListCard.tsx` — add health badge
- `src/lib/services/healthScoreService.ts` — calculation logic
- `scripts/jobs/calculate-health-scores.ts` — cron job (daily)
- `src/app/api/accounts/[id]/health-score/route.ts` — GET health info

---

## Padrões a Seguir

**Health Score Service:**
```typescript
// src/lib/services/healthScoreService.ts
export interface HealthScoreBreakdown {
  adoption: number;
  sla_compliance: number;
  relationship: number;
  financial_growth: number;
  nps: number;
}

export async function calculateHealthScore(
  accountId: string
): Promise<{ score: number; breakdown: HealthScoreBreakdown }> {
  // Fetch components
  const adoption = await getAdoptionScore(accountId); // 0-30
  const slaCompliance = await getSLAComplianceScore(accountId); // 0-25
  const relationship = await getRelationshipScore(accountId); // 0-20
  const financialGrowth = await getFinancialGrowthScore(accountId); // 0-15
  const nps = await getNPSScore(accountId); // 0-10

  const breakdown = { adoption, sla_compliance, relationship, financial_growth, nps };
  const score = adoption + slaCompliance + relationship + financialGrowth + nps;

  return { score, breakdown };
}

async function getSLAComplianceScore(accountId: string): Promise<number> {
  const tickets = await getTickets(accountId, { 
    where: 'created_at > now() - interval 30 days' 
  });
  
  const breached = tickets.filter(t => t.sla_status === 'vencido').length;
  const percentage = 1 - (breached / tickets.length);
  
  return percentage * 25; // scale to 0-25
}
```

**Health Badge Component:**
```typescript
// src/app/(dashboard)/accounts/components/HealthScoreBadge.tsx
const statusConfig = {
  healthy: { color: 'bg-green-100 text-green-800', label: 'Saudável', icon: '✅' },
  at_risk: { color: 'bg-yellow-100 text-yellow-800', label: 'Em risco', icon: '⚠️' },
  critical: { color: 'bg-red-100 text-red-800', label: 'Crítico', icon: '🚨' }
};

export function HealthScoreBadge({ 
  score, 
  status, 
  breakdown 
}: { 
  score: number; 
  status: string; 
  breakdown: HealthScoreBreakdown;
}) {
  const config = statusConfig[status];
  
  return (
    <div className={`health-badge ${config.color} px-3 py-2 rounded`}>
      <div className="flex items-center gap-2">
        <div className="text-lg">{config.icon}</div>
        <div>
          <div className="font-semibold">{config.label}</div>
          <div className="text-sm">{score.toFixed(0)}/100</div>
        </div>
      </div>
      <div className="tooltip" title={`Adoção: ${breakdown.adoption}, SLA: ${breakdown.sla_compliance}, ...`}>
        Ver detalhes
      </div>
    </div>
  );
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**M (Médio)** — 1-1.5 sessões BMAD

- Component calculation logic (multiple queries)
- Health score aggregation (formula)
- Badge + breakdown UI
- Cron job

---

## Dependências

**Precisa que:** 30 days of F1 production data (SLA, NPS, adoption), billing integration for ARR

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Cron calculates health score daily
- [ ] F2 — Score breakdown: adoption + SLA + relationship + financial + NPS = total
- [ ] F3 — Status: Saudável (>75) / Em risco (50-75) / Crítico (<50)
- [ ] F4 — Account list shows health badge with color coding
- [ ] F5 — Account detail shows breakdown: each component visible
- [ ] F6 — Hover badge → breakdown tooltip
- [ ] F7 — Filter account list by health status
- [ ] F8 — Health score updates daily (check timestamp)
- [ ] F9 — Previous score stored (for trend calculation)
- [ ] F10 — Missing component defaults to neutral (50) — graceful

### Edge Cases

- [ ] E1 — Account with < 30 days data: still calculate (use available)
- [ ] E2 — Account with 0 tickets (new): SLA score = neutral (50%)
- [ ] E3 — Account with no NPS data: NPS component = neutral (5/10)
- [ ] E4 — Account with no adoption data: adoption = neutral (15/30)
- [ ] E5 — Health score exactly 75.0: classified as "healthy" or "at_risk"? (Define boundary)

### Performance

- [ ] P1 — Cron calculates 100 accounts in < 30s
- [ ] P2 — Health badge render < 100ms
- [ ] P3 — Breakdown modal opens < 200ms

### Isolation

- [ ] T1 — Health score visible only to CSM's org (RLS)
- [ ] T2 — Components sourced from account's own data only

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Multidimensional Score:**
- [ ] F1-F5: Health score calculation + display complete
- [ ] F9-F10: Data resilience (missing components handled)
- [ ] P1: Cron performance acceptable

**Testes obrigatórios:**
```
E2E:
1. Run health score cron
2. Verify accounts updated with health_score
3. Account list shows badges with correct colors
4. Open account detail → breakdown visible

Unit:
- healthScoreService: test component calculations (SLA, NPS, adoption)
- Score aggregation: weights sum correctly (30+25+20+15+10=100)
- Status classification: >75=healthy, 50-75=at_risk, <50=critical

Edge cases:
- Missing NPS: defaults to 50
- Zero tickets: SLA = 50
- New account (no data): health = 50 (neutral)
```

**Fixtures:**
- 5 accounts with various health profiles:
  - Healthy (adoption 28, SLA 24, relationship 18, financial 13, NPS 8 = 91)
  - At-risk (adoption 20, SLA 15, relationship 10, financial 8, NPS 4 = 57)
  - Critical (adoption 8, SLA 5, relationship 5, financial 2, NPS 2 = 22)

---

## Notas

1. **Weights rationale**:
   - Adoption (30%) — most important, indicates actual product value realization
   - SLA (25%) — operationally critical, CSM job is to support well
   - Relationship (20%) — softer metric, influences renewal likelihood
   - Financial (15%) — ultimate goal, but lagging indicator
   - NPS (10%) — important but volatile, survey-dependent

2. **Component sources**:
   - **Adoption**: requires F4 product telemetry, or manual scoring
   - **SLA**: calculated from existing support_tickets
   - **Relationship**: future tracking (CSM touchpoints)
   - **Financial**: from billing integration
   - **NPS**: from nps_responses table

3. **Trend tracking**:
   - health_trend: improving/stable/declining (compare to previous week average)
   - Post-MVP: chart showing health over time

4. **Actionable insights**:
   - CSM sees health badge, should see recommended actions:
     - Low SLA → "Improve response time"
     - Low adoption → "Schedule training"
     - Declining trend → "At-risk alert"

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `HealthScoreBadge`, `HealthBreakdown`
- Anterior: [F2-01 Timeline Unificada](F2-01-timeline-unificada.md)
- Próximo: [F2-03 Segmentação Dinâmica](F2-03-segmentacao-dinamica.md)
