# F3-02: Motor de Alertas Proativos

## Contexto

CSM waits for problems to surface (late SLA, negative sentiment, silent customer). Proactive alerts fire early: "Account ABC hasn't engaged in 30 days — send check-in email" or "NPS score dropped from 8 to 4 — escalate".

Alert engine: define conditions (filters) + actions (Slack, task, email). Runs daily or hourly per alert type. Respects feature flags for control.

---

## Escopo

**É:**
- Alert types: churn_risk, silent_customer, renewal_due, adoption_anomaly, expansion_signal, nps_detractor_no_action
- Each alert: condition (saved filter from F2-03), action (Slack, create task, email), frequency
- Cron job: daily/hourly per alert type
- Respects feature flags per org (enable/disable alert types)
- Alert history: log which accounts triggered which alerts
- Dashboard: "Alertas ativos", show alert count per type

**Não é (MVP):**
- Custom alert conditions (fixed set only)
- Alert weighting (all equal priority)
- Alert suppression per account (F3+)
- A/B testing alerts (F3+)

---

## Decisões de Design (UX)

**Alert Types (Predefined):**

1. **Churn Risk** — account health score declining 20+ points in 7 days
   - Action: create task "Call ABC to understand concerns"
   - Frequency: daily check

2. **Silent Customer** — no activity (ticket/email/call) for 30+ days
   - Action: send Slack to CSM "Time to check in with ABC"
   - Frequency: daily check

3. **Renewal Due** — contract expires in 30 days
   - Action: create task "Prepare renewal for ABC"
   - Frequency: daily check (60-day window)

4. **Adoption Anomaly** — product usage dropped 50% week-over-week
   - Action: send email "We noticed lower usage — how can we help?"
   - Frequency: weekly check (requires F4 telemetry)

5. **Expansion Signal** — new user roles added, increased API calls
   - Action: send Slack to CSM "Expansion opportunity in ABC"
   - Frequency: weekly check

6. **NPS Detractor No Action** — NPS score < 7 and no follow-up within 7 days
   - Action: create task "Follow up NPS detractor ABC"
   - Frequency: daily check

**Dashboard:**
- Alert center: "Alertas ativos hoje"
- Cards per alert type: count, list of affected accounts, action buttons
- "Marcar como resolvido" for each alert

---

## Schema / Migrações

**Tabela nova:**

```sql
CREATE TABLE proactive_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN (
    'churn_risk', 'silent_customer', 'renewal_due', 
    'adoption_anomaly', 'expansion_signal', 'nps_detractor_no_action'
  )),
  triggered_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id),
  action_taken text, -- 'email_sent', 'task_created', 'slack_sent', 'ignored'
  action_taken_at timestamptz,
  metadata jsonb, -- trigger details (e.g. health score change)
  UNIQUE(account_id, alert_type, DATE(triggered_at)) -- one alert per day per type
);

CREATE INDEX idx_proactive_alerts_account ON proactive_alerts(account_id);
CREATE INDEX idx_proactive_alerts_type ON proactive_alerts(alert_type);
CREATE INDEX idx_proactive_alerts_resolved ON proactive_alerts(resolved_at);
```

**Feature flags (enable/disable alerts):**
```sql
-- In feature_flags table or as config
-- alert:churn_risk:enabled = true/false
```

---

## Arquivos Afetados

- `src/lib/services/alertService.ts` — alert condition evaluation
- `scripts/jobs/evaluate-proactive-alerts.ts` — cron job (runs hourly/daily)
- `src/app/(dashboard)/alerts/page.tsx` — alert dashboard
- `src/app/(dashboard)/alerts/components/AlertCenter.tsx` — alert display
- `src/app/api/alerts/[id]/resolve/route.ts` — mark alert resolved

---

## Padrões a Seguir

**Alert Evaluation Cron:**
```typescript
// scripts/jobs/evaluate-proactive-alerts.ts
export async function evaluateProactiveAlerts() {
  const supabase = createClient(url, key);

  // Get accounts
  const accounts = await getAllAccounts();

  for (const account of accounts) {
    // Check each alert type
    if (isFeatureEnabled('alert:churn_risk')) {
      await checkChurnRisk(account);
    }
    if (isFeatureEnabled('alert:silent_customer')) {
      await checkSilentCustomer(account);
    }
    // ... other alert types
  }
}

async function checkChurnRisk(account: Account) {
  const currentScore = account.health_score;
  const weekAgoScore = await getHealthScoreSnapshot(account.id, 7);
  
  if (weekAgoScore - currentScore >= 20) {
    // Create alert
    await supabase.from('proactive_alerts').insert({
      account_id: account.id,
      alert_type: 'churn_risk',
      metadata: {
        previous_score: weekAgoScore,
        current_score: currentScore,
        decline: weekAgoScore - currentScore
      }
    });

    // Send action
    await sendSlackToCSM(account.csm_id, 
      `⚠️ Churn risk for ${account.name}: health declined ${weekAgoScore - currentScore} points`);
    
    await createTask(account.id, 'Call to understand concerns');
  }
}

async function checkSilentCustomer(account: Account) {
  const lastActivity = await getLastActivityDate(account.id);
  const daysSilent = daysDifference(new Date(), lastActivity);

  if (daysSilent >= 30) {
    await supabase.from('proactive_alerts').insert({
      account_id: account.id,
      alert_type: 'silent_customer',
      metadata: { days_silent: daysSilent, last_activity: lastActivity }
    });

    await sendSlackToCSM(account.csm_id, 
      `🤐 Time to check in with ${account.name} (silent for ${daysSilent} days)`);
  }
}

// ... other alert type evaluations
```

**Alert Dashboard:**
```typescript
// src/app/(dashboard)/alerts/components/AlertCenter.tsx
export function AlertCenter() {
  const { data: alerts } = useQuery({
    queryKey: ['proactive-alerts'],
    queryFn: () => fetch('/api/alerts?resolved=false').then(r => r.json()),
    refetchInterval: 60000 // every minute
  });

  const byType = groupBy(alerts, 'alert_type');

  return (
    <div className="alert-center">
      {Object.entries(byType).map(([type, typeAlerts]) => (
        <AlertCard 
          key={type} 
          type={type} 
          count={typeAlerts.length} 
          alerts={typeAlerts} 
        />
      ))}
    </div>
  );
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**M (Médio)** — 1-1.5 sessões BMAD

- Alert condition logic (multiple algorithms)
- Cron job + batch processing
- Dashboard UI
- Action execution (reuses playbook tasks)

---

## Dependências

**Precisa que:** F2-02 (health score), F1-20 (sentiment), F3-01 (playbooks for actions), F4 (telemetry for adoption anomaly)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Cron evaluates churn risk alert daily
- [ ] F2 — Churn risk triggered: alert created, task created, Slack sent
- [ ] F3 — Silent customer alert triggered after 30 days inactivity
- [ ] F4 — Renewal due alert triggered 30 days before expiry
- [ ] F5 — NPS detractor alert triggered on score < 7
- [ ] F6 — Alert dashboard shows active alerts grouped by type
- [ ] F7 — Click "Marcar como resolvido" → alert marked resolved + timestamp
- [ ] F8 — Feature flag: disable alert type → doesn't fire
- [ ] F9 — Duplicate prevention: max 1 alert per account per day per type
- [ ] F10 — Alert history logged for auditing

### Edge Cases

- [ ] E1 — Account with no CSM assigned: alert still created (CSM TBD)
- [ ] E2 — Feature flag toggled mid-day: respects new state immediately
- [ ] E3 — Cron fails for 1 account: continues with others
- [ ] E4 — Renewal due but contract already signed (updated): alert suppressed?
- [ ] E5 — Multiple alerts triggered same time: deduped correctly

### Performance

- [ ] P1 — Cron evaluates 100 accounts in < 5 min
- [ ] P2 — Alert dashboard loads in < 1s
- [ ] P3 — Action execution (Slack, task, email) < 2s per alert

### Isolation

- [ ] T1 — Alerts isolated by account (RLS)
- [ ] T2 — CSM A doesn't see CSM B account alerts

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Proactive System:**
- [ ] F1-F5: Alert types evaluation complete
- [ ] F6-F8: Dashboard + feature flags
- [ ] P1-P2: Performance acceptable

**Testes obrigatórios:**
```
E2E:
1. Create account, decline health 20 points in 7 days
2. Run cron
3. Verify churn_risk alert created
4. Verify action (task + Slack) executed
5. Click "Marcar como resolvido" → status updated

Unit:
- checkChurnRisk: test with 20pt decline (trigger), 15pt decline (no trigger)
- checkSilentCustomer: test 29 days (no trigger), 30 days (trigger)
- Feature flag: alert disabled doesn't fire

Alert dashboard:
- Load unresolved alerts grouped by type
- Count per type correct
- Drill-in shows affected accounts
```

**Fixtures:**
- 10 accounts with various health/activity/NPS states
- Pre-configured feature flags
- Mock Slack/email services

---

## Notas

1. **Alert fatigue** — 6 alert types could be noisy. Mitigate:
   - Smart batching (combine related alerts in one message)
   - Configurable thresholds per account
   - "Snooze alert" button (F3+)

2. **Frequency tuning** — daily runs cover most cases. Consider:
   - Churn risk: hourly (early detection)
   - Silent customer: daily
   - Renewal due: daily
   - Adoption anomaly: weekly (needs data aggregation)

3. **Adoption anomaly** — depends on F4 product telemetry. Until then, use proxy signals (API calls via support tickets, feature usage mentions).

4. **Action routing** — alerts can trigger playbooks (F3-01) for complex workflows:
   - "Churn risk" → run "Churn Prevention" playbook

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `AlertCenter`, `AlertCard`
- Anterior: [F3-01 Playbooks MVP](F3-01-playbooks-mvp.md)
- Próximo: [F3-03 Success Plans MVP](F3-03-success-plans-mvp.md)
