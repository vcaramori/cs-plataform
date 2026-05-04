# F4-01: Portfolio Analytics

## Contexto

Liderança de CS quer entender portfolio: "Qual é meu ARR por segmento? Quantos contas estão em risco? Qual é a taxa de renovação?" Portfolio Analytics consolida métricas de todas as contas em dashboard executivo: coortes, trends, health distribution, SLA compliance.

---

## Escopo

**É:**
- Portfolio dashboard: CSM view (suas contas) + Manager view (time)
- Métricas: total ARR, contas by segment, health distribution, renewal forecast
- Cohorts: contas signed nos últimos 3/6/12 meses, by segment
- Trends: ARR, renewal rate, NPS average, SLA compliance (últimos 90 dias)
- SLA compliance: % de tickets resolvidos within SLA per CSM
- Sparklines: visual trend para cada métrica
- Ai insights: "3 contas em risco de churn", "Renovações em 30 dias: $150k"
- Export: CSV export de portfolio data

**Não é (MVP):**
- Forecasting model (ML-based)
- Custom KPIs (fixed set only)
- Benchmarking vs industry (F4+)

---

## Decisões de Design (UX)

**Layout:**
- Top section: KPI cards (ARR, Contas, Health distribution, SLA compliance)
- Middle: Cohort table (signed_date ranges, segment, count, ARR)
- Bottom: Trends chart (90-day ARR, renewal rate, NPS, SLA)
- Right sidebar: AI insights cards

**Filters:**
- Date range: last 3/6/12 months, custom range
- Segment: dropdown (or multi-select)
- Health: checkbox "Mostrar apenas contas críticas"
- CSM: for manager view (dropdown or multi-select)

**Cohorts Table:**
- Columns: Período (Últimos 3m, 6m, 12m, 12m+), Segmento, Contas, ARR, Health Avg
- Sortable by count/ARR
- Click row → drill into specific cohort

**Trends Chart:**
- X-axis: time (90 days)
- Y-axis: metric value (ARR, %, score)
- Toggle: ARR / Renewal rate / NPS / SLA compliance
- Tooltip on hover

**AI Insights:**
- "3 contas em risco: ABC, DEF, GHI"
- "Renovações em 60 dias: $150k (5 contas)"
- "SLA compliance: 92% (2% below target)"
- "Expansion oportunidade: 2 contas com crescimento"

---

## Schema / Migrações

**Reutiliza migration/008** — tables exist (accounts, support_tickets, contracts, nps_responses)

**Views para analytics:**
```sql
-- Portfolio summary per CSM
CREATE VIEW portfolio_csm_summary AS
SELECT 
  a.assigned_csm_id,
  COUNT(*) as account_count,
  SUM(c.arr) as total_arr,
  AVG(a.health_score) as avg_health_score,
  COUNT(CASE WHEN a.health_score < 40 THEN 1 END) as at_risk_count
FROM accounts a
LEFT JOIN contracts c ON a.id = c.account_id AND c.is_active
GROUP BY a.assigned_csm_id;

-- Cohort analysis
CREATE VIEW accounts_by_cohort AS
SELECT 
  CASE 
    WHEN a.created_at >= NOW() - INTERVAL '3 months' THEN '0-3m'
    WHEN a.created_at >= NOW() - INTERVAL '6 months' THEN '3-6m'
    WHEN a.created_at >= NOW() - INTERVAL '12 months' THEN '6-12m'
    ELSE '12m+'
  END as cohort,
  a.segment,
  COUNT(*) as account_count,
  SUM(c.arr) as total_arr,
  AVG(a.health_score) as avg_health
FROM accounts a
LEFT JOIN contracts c ON a.id = c.account_id AND c.is_active
GROUP BY cohort, a.segment;

-- SLA compliance per CSM
CREATE VIEW sla_compliance_summary AS
SELECT 
  st.assigned_to as csm_id,
  COUNT(*) as total_tickets,
  COUNT(CASE WHEN st.sla_status IN ('atendido', 'atencao') THEN 1 END) as compliant_count,
  ROUND(
    100.0 * COUNT(CASE WHEN st.sla_status IN ('atendido', 'atencao') THEN 1 END) / 
    NULLIF(COUNT(*), 0),
    1
  ) as compliance_percentage
FROM support_tickets st
WHERE st.created_at >= NOW() - INTERVAL '90 days'
GROUP BY st.assigned_to;
```

---

## Arquivos Afetados

- `src/app/(dashboard)/portfolio/page.tsx` — main portfolio page
- `src/app/(dashboard)/portfolio/components/PortfolioChart.tsx` — trends chart
- `src/app/(dashboard)/portfolio/components/CohortTable.tsx` — cohort breakdown
- `src/app/(dashboard)/portfolio/components/AIInsights.tsx` — insights cards
- `src/app/(dashboard)/portfolio/components/KPICards.tsx` — top metrics
- `src/app/api/portfolio/summary/route.ts` — portfolio KPIs endpoint
- `src/app/api/portfolio/cohorts/route.ts` — cohort data endpoint
- `src/app/api/portfolio/trends/route.ts` — trends chart data
- `src/app/api/portfolio/insights/route.ts` — AI insights endpoint
- `src/lib/services/portfolioService.ts` — business logic for aggregations

---

## Padrões a Seguir

**Portfolio API Pattern:**
```typescript
// src/app/api/portfolio/summary/route.ts
export async function GET(request) {
  const { csmId, segment, healthFilter } = request.nextUrl.searchParams;

  const query = supabase
    .from('portfolio_csm_summary')
    .select('*');

  if (csmId) query.eq('assigned_csm_id', csmId);
  if (segment) query.eq('segment', segment);

  const { data } = await query;
  return new Response(JSON.stringify(data), { status: 200 });
}
```

**Trends Chart Component:**
- Use Recharts (already in project)
- 90-day data bucketed by week
- Tooltip shows exact values
- Responsive (full width on mobile)

**AI Insights Service:**
```typescript
// src/lib/services/portfolioService.ts
export async function generateAIInsights(csmId: string): Promise<string[]> {
  const [summary, churnRisk, renewals, expansion] = await Promise.all([
    getPortfolioSummary(csmId),
    getChurnRiskAccounts(csmId),
    getUpcomingRenewals(csmId),
    getExpansionOpportunities(csmId)
  ]);

  const insights = [];
  
  if (churnRisk.length > 0) {
    insights.push(
      `${churnRisk.length} contas em risco de churn: ${churnRisk.map(a => a.name).join(', ')}`
    );
  }

  if (renewals.arr > 0) {
    insights.push(
      `Renovações em 60 dias: $${renewals.arr}k (${renewals.count} contas)`
    );
  }

  return insights;
}
```

**LLM:** Gemini para gerar insights (2-3 insights por portfolio view)

---

## Complexidade Estimada

**M (Médio)** — 1-1.5 sessões BMAD

- 4 componentes UI (KPICards, CohortTable, TrendsChart, AIInsights)
- 4 API routes (summary, cohorts, trends, insights)
- Analytics views/queries
- Testes: unit (data aggregation), E2E (dashboard loads, filters work)

---

## Dependências

**Precisa que:**
- F2-02 Health Score Ponderado (health_score usado nas métricas)
- F4-04 Billing Integration (ARR data from contracts)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Dashboard renders KPI cards: ARR, Conta count, Health distribution, SLA %
- [ ] F2 — Cohort table shows accounts grouped by signed_date (0-3m, 3-6m, etc)
- [ ] F3 — Trends chart: toggle between ARR / Renewal rate / NPS / SLA compliance
- [ ] F4 — AI Insights: at least 2 insights displayed (churn risk, renewals due)
- [ ] F5 — Date filter: select 3m/6m/12m range → data updates
- [ ] F6 — Segment filter: select segment → cohorts and KPIs update
- [ ] F7 — CSM filter (manager view): select CSM → shows only their portfolio
- [ ] F8 — Click cohort row → drill into accounts in that cohort
- [ ] F9 — Export button: download portfolio data as CSV
- [ ] F10 — Sparklines on KPI cards show 90-day trend

### Edge Cases

- [ ] E1 — CSM with 0 accounts: empty state "Nenhuma conta atribuída"
- [ ] E2 — No contract data for account: ARR shows 0, not error
- [ ] E3 — Division by zero (0 total tickets for SLA %): display "N/A"
- [ ] E4 — Very large portfolio (1000+ accounts): pagination or virtualization?

### Performance

- [ ] P1 — Dashboard loads in < 2s (all KPIs + chart + table)
- [ ] P2 — Filter change (segment, CSM): updates in < 1s
- [ ] P3 — Trends chart with 90 days data: renders smoothly

### Isolation

- [ ] T1 — CSM sees only own accounts (manager sees team)
- [ ] T2 — Manager can't see CSM A's dashboard from CSM B view (RLS)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Analytics:**
- [ ] F1-F4: Dashboard rendering complete
- [ ] T1-T2: RLS verified
- [ ] P1-P3: Performance acceptable

**Testes obrigatórios:**
```
E2E:
1. Open portfolio dashboard
2. Verify KPI cards render with correct data
3. Verify cohort table shows accounts by period
4. Toggle trends chart (ARR → NPS → SLA)
5. Filter by segment → data updates
6. Manager view: select CSM → portfolio changes
7. Export CSV → file downloads

Unit:
- Portfolio aggregation: correct ARR sum, account count
- Cohort grouping: correct period assignment
- SLA compliance: correct % calculation
- AI insights: at least 2 generated
```

**Fixtures:**
- 50 accounts with mix of:
  - Segments: SMB, Mid-market, Enterprise
  - Created dates: 0-3m, 3-6m, 6-12m, 12m+ ago
  - Health scores: 20-90 (mix of healthy, at-risk, critical)
  - Contracts with ARR: $5k-$50k
  - Tickets: 5-20 per account

---

## Estimativa de Tokens

- 4 UI components: ~600 tokens
- 4 API routes: ~400 tokens
- Analytics service/queries: ~300 tokens
- E2E tests: ~400 tokens
- **Total esperado:** 1.7k tokens por sessão BMAD

---

## Notas

1. **Data freshness** — KPIs can be cached (5-minute TTL), trends updated hourly
2. **Scaling** — if 1000+ accounts, consider materialized views or data warehouse
3. **Cohort analysis** — signed_date is immutable, cohort assignment is stable
4. **Export** — CSV should include all details (account name, segment, ARR, health, CSM)

---

## Links Relacionados

- Anterior: [F3-03 Success Plans MVP](../fase3/F3-03-success-plans-mvp.md)
- Próximo: [F4-02 Renewal Management Workflow](F4-02-renewal-management.md)
- Analytics: [_components-map.md](_components-map.md) → `PortfolioChart`, `CohortTable`
