# F1-09: Auto-close por Prioridade

## Contexto

CSM tem 100+ tickets, 30 são low-priority resolved (customer asked for minor feature, CSM resolved with workaround). Tickets languish in "resolved" state. They clutter the queue — no one closes them, they consume mental energy.

Auto-close low-priority resolved tickets after 14 days. Keeps queue healthy. Rule-based, no IA, deterministic.

---

## Escopo

**É:**
- Cron job: daily, scans resolved tickets
- Condition: priority='low' AND status='resolved' AND updated_at < 14 days ago
- Action: change status='resolved' → 'closed'
- Log: ticket_events with event_type='auto_closed', payload={reason: 'auto_close_14d_low_priority'}
- No notification (silent, logged only)
- Applies to: all resolved low-priority tickets >= 14 days

**Não é (MVP):**
- Configurable threshold (fixed 14d)
- Per-account rules (F2)
- Auto-close medium priority (only low)
- Exclude high-touch customers (F2+)

---

## Decisões de Design (UX)

**Cron Job:**
1. Daily at midnight (or configurable time)
2. Query: `SELECT * FROM support_tickets WHERE status='resolved' AND priority='low' AND updated_at < now() - interval '14 days'`
3. For each ticket: update status='closed'
4. Log event
5. Report: log count closed, any errors
6. Graceful: if error, log and continue (don't block other tickets)

**Audit Trail:**
- ticket_events shows "Auto-closed (14d low-priority rule)"
- CSM can reopen manually if needed (F1-12)
- No email/notification to customer

**Dashboard (future F2):**
- Widget: "Auto-closed this month: [N]"
- Breakdown by priority

---

## Schema / Migrações

**Nenhuma tabela nova** — reutiliza ticket_events.

**Event payload exemplo:**
```json
{
  "reason": "auto_close_14d_low_priority",
  "rule_version": 1,
  "days_since_update": 14
}
```

---

## Arquivos Afetados

- `scripts/jobs/auto-close-low-priority.ts` — cron job script
- `src/lib/services/ticketService.ts` — update status + log event
- `src/app/api/cron/auto-close-low-priority/route.ts` — HTTP endpoint (trigger)

---

## Padrões a Seguir

**Cron Job Pattern (Next.js):**
```typescript
// scripts/jobs/auto-close-low-priority.ts
import { createClient } from '@supabase/supabase-js';

export async function autoCloseLowPriority() {
  const supabase = createClient(url, key);

  const { data: tickets, error: queryError } = await supabase
    .from('support_tickets')
    .select('id, account_id')
    .eq('status', 'resolved')
    .eq('priority', 'low')
    .lt('updated_at', new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString());

  if (queryError) {
    console.error('Query error:', queryError);
    return;
  }

  let closedCount = 0;
  for (const ticket of tickets) {
    try {
      // Update status
      await supabase
        .from('support_tickets')
        .update({ status: 'closed' })
        .eq('id', ticket.id);

      // Log event
      await supabase.from('ticket_events').insert({
        ticket_id: ticket.id,
        event_type: 'auto_closed',
        payload: { reason: 'auto_close_14d_low_priority' }
      });

      closedCount++;
    } catch (e) {
      console.error(`Error closing ticket ${ticket.id}:`, e);
    }
  }

  console.log(`Auto-closed ${closedCount} tickets`);
  return { closedCount };
}
```

**API Route (HTTP trigger):**
```typescript
// src/app/api/cron/auto-close-low-priority/route.ts
import { autoCloseLowPriority } from '@/scripts/jobs/auto-close-low-priority';

export async function GET(request: Request) {
  // Verify cron token if using external scheduler
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const result = await autoCloseLowPriority();
  return new Response(JSON.stringify(result), { status: 200 });
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**P (Pequeno)** — 0.5 sessões BMAD

- Cron job script (straightforward SQL query)
- API route (simple wrapper)
- Event logging (reuses pattern)

---

## Dependências

**Precisa que:** F1-01 (support_tickets, ticket_events)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Cron job finds resolved low-priority tickets >= 14 days old
- [ ] F2 — Cron job updates status from 'resolved' to 'closed' for all matches
- [ ] F3 — ticket_events logged for each auto-closed ticket
- [ ] F4 — Event payload includes reason + days_since_update
- [ ] F5 — High-priority resolved tickets are NOT auto-closed
- [ ] F6 — Medium-priority resolved tickets are NOT auto-closed
- [ ] F7 — Closed tickets are NOT affected (already closed)
- [ ] F8 — Cron runs daily at midnight (or configurable time)
- [ ] F9 — Partial failure: if one ticket fails, others still process (no all-or-nothing)
- [ ] F10 — Log report: stdout "Auto-closed N tickets"

### Edge Cases

- [ ] E1 — Ticket updated manually 13d ago, marked low-priority 1d ago: still closed? (Clarify: use priority at close time)
- [ ] E2 — Ticket has SLA: auto-close anyway? (Yes, SLA irrelevant for resolved)
- [ ] E3 — Ticket reassigned after 13d: doesn't prevent close (update_at not reset)
- [ ] E4 — Cron runs twice (duplicate trigger): idempotent? (Already closed, no-op)

### Performance

- [ ] P1 — Cron queries 1000 tickets in < 2s
- [ ] P2 — Update + logging 500 tickets in < 5s
- [ ] P3 — Cron does not block other DB queries (background job)

### Isolation

- [ ] T1 — Cron respects account isolation (closed by org RLS)
- [ ] T2 — CSM A auto-closed tickets not visible to CSM B

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Business Rule:**
- [ ] F1-F3: Auto-close logic end-to-end
- [ ] F5-F6: Only closes matching criteria
- [ ] P1-P2: Latency acceptable for background job

**Testes obrigatórios:**
```
E2E:
1. Create resolved low-priority ticket, set updated_at = 15 days ago
2. Run cron job
3. Verify status → 'closed'
4. Verify ticket_events logged

Unit:
- Query filter: priority, status, age
- Event logging: payload correct
- Partial failure: continue on error

Edge cases:
- High/medium priority not affected
- Already closed tickets ignored
- Idempotent (run twice, same result)
```

**Fixtures:**
- 10 resolved tickets: 3 low-priority (15d old), 2 low-priority (5d old), 3 high-priority (20d old), 2 already closed

---

## Notas

1. **Time zone** — cron job runs in server TZ (UTC). Document clearly.
2. **Threshold** — 14 days is arbitrary. Can be tuned post-MVP based on support queue health metrics.
3. **Monitoring** — log detailed report daily (count, errors). Setup alert if count > 1000 (anomaly).
4. **Rollback** — if job goes wrong, CSM can manually reopen (F1-12). No automatic undo.
5. **Customer impact** — customer sees ticket closed but was never notified. Consider sending closure email (F2).

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md)
- Decisões: [_decisions.md](_decisions.md) → ticket_events schema
- Anterior: [F1-08 Reopen Automático](F1-08-reopen-automatico.md)
- Próximo: [F1-10 Merge de Tickets](F1-10-merge-tickets.md)
