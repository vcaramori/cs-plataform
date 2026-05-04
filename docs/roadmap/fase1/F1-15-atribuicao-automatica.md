# F1-15: Atribuição Automática

## Contexto

New ticket arrives. CSM lead manually assigns to available CSM: "Alice has 8 tickets, Bob has 12, assign to Alice." Every ticket requires decision. With auto-assign, new tickets route to lowest-capacity CSM automatically.

Cron job: new unassigned tickets → find CSM with lowest assigned_count (respecting capacity from F1-14) → assign.

---

## Escopo

**É:**
- Cron job: every 5 minutes, scan for unassigned tickets
- Selection logic: assign to CSM with lowest assigned_count (weighted by capacity)
- Condition: target CSM not at capacity (assigned_count < max_concurrent_tickets)
- Fallback: if all CSMs at capacity, leave unassigned (queue builds)
- Log: ticket_events with event_type='auto_assigned', payload={assigned_to: CSM_ID}
- CSM override: CSM can reassign to different CSM manually (updates assigned_to)
- Load balancing: distribute evenly across multiple CSMs at same capacity level

**Não é (MVP):**
- Skills-based routing (assign billing expert to billing tickets — F2)
- Customer preference (assign to "their" CSM if available — F2)
- Account-based assignment (assign account specialists — F2)

---

## Decisões de Design (UX)

**Auto-assign Flow:**
1. New ticket created (status='open', assigned_to=NULL)
2. Cron runs every 5 min, finds unassigned tickets
3. Query CSM queue stats: find CSM with min(assigned_count) where assigned_count < max_concurrent
4. If tie (multiple CSMs with same count), pick randomly for load distribution
5. Update ticket: assigned_to = selected_CSM
6. Log event: ticket_events with 'auto_assigned'
7. CSM sees ticket in their queue (F1-14)

**User Notification:**
- CSM receives toast/notification: "[N] new tickets assigned to you"
- Sidebar counter updates in real-time
- Bulk notification (not per ticket)

**Override:**
- CSM can click "Reassign" in ticket detail (reuses action from F1-05 preview)
- Modal: "Assign to [CSM dropdown]"
- On reassign: update assigned_to, log event_type='reassigned'

---

## Schema / Migrações

**Nenhuma tabela nova** — reutiliza support_tickets + ticket_events.

**Event exemplo:**
```json
{
  "event_type": "auto_assigned",
  "payload": {
    "assigned_to": "alice-uuid",
    "reason": "auto_assign_cron",
    "queue_position": 8,
    "max_capacity": 20
  }
}
```

---

## Arquivos Afetados

- `scripts/jobs/auto-assign-tickets.ts` — cron job
- `src/lib/services/assignmentService.ts` — logic to find available CSM
- `src/app/api/cron/auto-assign-tickets/route.ts` — HTTP trigger endpoint
- Existing: F1-05 preview + F1-14 queue already handle reassign UI

---

## Padrões a Seguir

**Auto-assign Cron Job:**
```typescript
// scripts/jobs/auto-assign-tickets.ts
import { createClient } from '@supabase/supabase-js';

export async function autoAssignTickets() {
  const supabase = createClient(url, key);

  // Get unassigned tickets
  const { data: unassigned } = await supabase
    .from('support_tickets')
    .select('id, account_id')
    .is('assigned_to', null)
    .eq('status', 'open')
    .limit(100); // process max 100 per run

  if (!unassigned || unassigned.length === 0) {
    console.log('No unassigned tickets');
    return { assigned: 0 };
  }

  // Group by account
  const byAccount = new Map();
  for (const ticket of unassigned) {
    if (!byAccount.has(ticket.account_id)) {
      byAccount.set(ticket.account_id, []);
    }
    byAccount.get(ticket.account_id).push(ticket);
  }

  let assignedCount = 0;

  // For each account, find available CSM
  for (const [accountId, tickets] of byAccount.entries()) {
    // Get CSM queue stats for this account
    const { data: stats } = await supabase
      .from('csm_queue_stats')
      .select('csm_id, current_ticket_count, max_concurrent_tickets')
      .eq('account_id', accountId)
      .order('current_ticket_count', { ascending: true });

    if (!stats || stats.length === 0) {
      console.log(`No CSMs configured for account ${accountId}`);
      continue;
    }

    // Find first CSM with available capacity
    const availableCsm = stats.find(s => s.current_ticket_count < s.max_concurrent_tickets);

    if (!availableCsm) {
      console.log(`All CSMs at capacity for account ${accountId}`);
      continue;
    }

    // Assign tickets to this CSM
    for (const ticket of tickets) {
      try {
        await supabase
          .from('support_tickets')
          .update({ assigned_to: availableCsm.csm_id })
          .eq('id', ticket.id);

        // Log event
        await supabase.from('ticket_events').insert({
          ticket_id: ticket.id,
          event_type: 'auto_assigned',
          payload: { assigned_to: availableCsm.csm_id, reason: 'auto_assign_cron' }
        });

        assignedCount++;
      } catch (e) {
        console.error(`Error assigning ticket ${ticket.id}:`, e);
      }
    }
  }

  console.log(`Auto-assigned ${assignedCount} tickets`);
  return { assigned: assignedCount };
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**P (Pequeno)** — 0.5 sessões BMAD

- Cron job script (straightforward)
- Queue stats + CSM selection logic (SQL)
- Event logging (reuses pattern)

---

## Dependências

**Precisa que:** F1-14 (csm_queue_config + stats)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — New unassigned ticket created
- [ ] F2 — Cron runs, ticket is auto-assigned to lowest-capacity CSM
- [ ] F3 — ticket_events logs 'auto_assigned' with CSM ID
- [ ] F4 — CSM sees ticket in their queue (sidebar counter updates)
- [ ] F5 — If all CSMs at capacity, ticket remains unassigned (queue builds)
- [ ] F6 — Tie-breaking: if 2 CSMs have same capacity, pick randomly (load distribute)
- [ ] F7 — CSM can reassign to different CSM (manual override)
- [ ] F8 — Reassign logs event_type='reassigned' with new assignee
- [ ] F9 — Cron processes up to 100 unassigned tickets per run
- [ ] F10 — Account-specific: auto-assign respects account boundaries (no cross-account)

### Edge Cases

- [ ] E1 — No CSMs configured for account: ticket stays unassigned
- [ ] E2 — Only 1 CSM, at capacity: ticket waits (builds queue)
- [ ] E3 — Reassign to same CSM: logs event (idempotent reassign)
- [ ] E4 — Concurrent auto-assign + manual assign: prevent race (lock ticket)
- [ ] E5 — CSM deleted: orphaned assigned tickets not reassigned (F3 can add cleanup)

### Performance

- [ ] P1 — Cron processes 100 tickets in < 5s
- [ ] P2 — Queue stats query < 200ms
- [ ] P3 — Auto-assign doesn't block new ticket creation (async)

### Isolation

- [ ] T1 — Auto-assign respects account isolation (RLS)
- [ ] T2 — CSM A tickets not reassigned to CSM B (if cross-org)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Business Rule + Async Job:**
- [ ] F1-F4: Auto-assign flow complete
- [ ] F5-F6: Capacity + load distribution logic correct
- [ ] P1-P2: Cron performance acceptable

**Testes obrigatórios:**
```
E2E:
1. Create 3 unassigned tickets
2. Run cron job
3. Verify all 3 assigned to lowest-capacity CSM
4. Verify events logged

Unit:
- CSM selection: picks lowest capacity
- Tie-breaking: random among tied
- Capacity check: respects max_concurrent_tickets

Edge cases:
- No CSMs: tickets stay unassigned
- All at capacity: tickets stay unassigned
- Account isolation: respects account boundaries
```

**Fixtures:**
- 3 CSMs with different configs (15, 20, 25 max)
- 5 unassigned tickets
- Various assigned ticket counts across CSMs

---

## Notas

1. **Cron frequency** — every 5 min is reasonable MVP. Can be tuned post-launch based on queue depth.
2. **Tie-breaking strategy** — random is simplest. Future (F2) can use CSM preference (who volunteered), or round-robin.
3. **Load distribution** — if 5 CSMs all have 10 tickets, random pick means even distribution over time.
4. **Notification** — CSM gets bulk notification per 5-min interval (e.g. "3 new tickets assigned"). Avoid spam.
5. **Rollback** — if auto-assign goes wrong, CSM can manually reassign. No automatic undo.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md)
- Decisões: [_decisions.md](_decisions.md) → ticket_events schema
- Anterior: [F1-14 Fila com Capacidade](F1-14-fila-capacidade.md)
- Próximo: [F1-16 Escalonamento SLA](F1-16-escalonamento-sla.md)
