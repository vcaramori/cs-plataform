# F1-16: Escalonamento SLA

## Contexto

Ticket SLA expires in 1 hour. CSM doesn't notice. Ticket breaches SLA. Manager doesn't know until end-of-month report. Solution: automatic escalation — cron detects SLA status 'atencao' or 'vencido', alerts manager via Slack + creates escalation event.

Escalation is pure notification + logging, no auto-assignment (that's manual intervention).

---

## Escopo

**É:**
- Cron job: hourly, scan for tickets with sla_status='atencao' or 'vencido'
- Action: create ticket_event with event_type='sla_escalated'
- Notification: send Slack message to manager + toast in CSP
- Log: include ticket ID, customer, assigned CSM, SLA deadline
- Condition: only escalate once per ticket per SLA period (no spam)
- Manager can: review ticket, reassign, extend SLA (future F2)

**Não é (MVP):**
- Auto-assign to different CSM (manual reassign only)
- Email notification (Slack only)
- Custom escalation rules per account (F2)
- Escalation to exec (F3)

---

## Decisões de Design (UX)

**Escalation Event:**
- ticket_events: event_type='sla_escalated', payload with reason, deadline, manager_id
- Timeline shows: "🚨 Escalated to manager — SLA em [X] horas"
- No customer notification (internal only)

**Slack Notification:**
- Channel: #cs-alerts (or configurable)
- Message format:
  ```
  ⚠️ SLA ESCALATION
  Ticket #123 — Customer Account Name
  Assigned to: Alice
  Status: [Atencao/Vencido]
  Deadline: 2025-01-15 14:30 UTC
  [Link to ticket in CSP]
  ```
- Thread: manager can reply with action (reply in Slack links to ticket)

**CSP Notification:**
- Toast to manager: "Ticket #123 SLA escalated — Customer Account (Alice)"
- Bell icon counter includes escalations
- Filter/view: "Escalações recentes"

**De-escalation:**
- If CSM resolves ticket before SLA breach: no escalation fired
- If SLA breach happened but CSM fixes within X hours: can mark "SLA resolved" (F2)

---

## Schema / Migrações

**Nenhuma tabela nova** — reutiliza ticket_events.

**Event exemplo:**
```json
{
  "event_type": "sla_escalated",
  "payload": {
    "reason": "approaching_deadline",
    "sla_status": "atencao",
    "deadline_at": "2025-01-15T14:30:00Z",
    "time_remaining_minutes": 60,
    "manager_id": "...",
    "assigned_csm": "alice"
  }
}
```

**Flag to prevent spam:**
- ticket_events: check if last 'sla_escalated' event < 2 hours ago for this ticket. If yes, skip.
- Or: add column `last_escalated_at` to support_tickets for quick check.

---

## Arquivos Afetados

- `scripts/jobs/escalate-sla-tickets.ts` — cron job
- `src/lib/services/slaeScalationService.ts` — query + notification logic
- `src/lib/services/slackService.ts` — send Slack message
- `src/app/api/cron/escalate-sla/route.ts` — HTTP trigger endpoint
- `src/lib/utils/slaCalculator.ts` — already exists, used for checking status

---

## Padrões a Seguir

**Escalation Cron:**
```typescript
// scripts/jobs/escalate-sla-tickets.ts
export async function escalateSlaTickets() {
  const supabase = createClient(url, key);

  // Get tickets with SLA approaching/breached
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, customer_email, assigned_to, account_id, sla_deadline')
    .in('sla_status', ['atencao', 'vencido'])
    .neq('assigned_to', null); // only assigned tickets

  let escalatedCount = 0;

  for (const ticket of tickets) {
    // Check if already escalated recently
    const { data: recentEvent } = await supabase
      .from('ticket_events')
      .select('id')
      .eq('ticket_id', ticket.id)
      .eq('event_type', 'sla_escalated')
      .gt('created_at', new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString())
      .limit(1);

    if (recentEvent && recentEvent.length > 0) {
      console.log(`Ticket ${ticket.id} already escalated recently`);
      continue;
    }

    // Get manager (account owner or default manager)
    const { data: manager } = await supabase
      .from('accounts')
      .select('manager_id')
      .eq('id', ticket.account_id)
      .single();

    // Log escalation event
    await supabase.from('ticket_events').insert({
      ticket_id: ticket.id,
      event_type: 'sla_escalated',
      payload: {
        sla_status: ticket.sla_status,
        deadline_at: ticket.sla_deadline,
        manager_id: manager?.manager_id
      }
    });

    // Send Slack notification
    await sendSlackNotification({
      managerId: manager?.manager_id,
      ticketId: ticket.id,
      customerEmail: ticket.customer_email,
      deadline: ticket.sla_deadline,
      status: ticket.sla_status
    });

    escalatedCount++;
  }

  console.log(`Escalated ${escalatedCount} SLA tickets`);
  return { escalated: escalatedCount };
}
```

**Slack Service:**
```typescript
// src/lib/services/slackService.ts
export async function sendSlackNotification(opts: {
  managerId: string;
  ticketId: string;
  customerEmail: string;
  deadline: Date;
  status: 'atencao' | 'vencido';
}) {
  const managerSlackId = await getSlackUserId(opts.managerId);
  
  const message = {
    channel: '#cs-alerts', // or from config
    text: `SLA Escalation: Ticket #${opts.ticketId}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚠️ *SLA ESCALATION*\nTicket #${opts.ticketId} — ${opts.customerEmail}\nStatus: ${opts.status}\nDeadline: ${opts.deadline}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Ticket' },
            url: `https://csplataform.io/tickets/${opts.ticketId}`
          }
        ]
      }
    ]
  };

  await slackClient.chat.postMessage(message);
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**P (Pequeno)** — 0.5 sessões BMAD

- Cron job script (straightforward)
- SLA status checking (already have SLA calculator)
- Slack integration (use existing SDK)
- De-duplication logic (simple check)

---

## Dependências

**Precisa que:** F1-14 (queue config, to identify manager), SLA schema (assumed in F1-01)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Cron finds ticket with sla_status='atencao' or 'vencido'
- [ ] F2 — Cron creates ticket_event with event_type='sla_escalated'
- [ ] F3 — Slack notification sent to manager channel
- [ ] F4 — Slack message includes ticket ID, customer, deadline
- [ ] F5 — Slack message has "View Ticket" button (link to CSP)
- [ ] F6 — If ticket escalated < 2h ago, skip (prevent spam)
- [ ] F7 — Cron runs hourly (or configurable interval)
- [ ] F8 — Resolved/closed tickets not escalated (check status != 'resolved/closed')
- [ ] F9 — Unassigned tickets not escalated (assigned_to is NOT null)
- [ ] F10 — Escalation logged with ticket ID + manager ID + deadline

### Edge Cases

- [ ] E1 — Manager has no Slack ID: notification fails gracefully (log, continue)
- [ ] E2 — SLA deadline in past but ticket still open: still escalate (vencido)
- [ ] E3 — Multiple SLA escalations for same ticket (different reasons): one event per interval
- [ ] E4 — Ticket assigned to CSM with no manager: fallback to account owner or global manager
- [ ] E5 — Slack API timeout: retry with exponential backoff or log for manual review

### Performance

- [ ] P1 — Cron scans 1000 tickets in < 5s
- [ ] P2 — De-duplication check < 100ms per ticket
- [ ] P3 — Slack notification < 2s per message

### Isolation

- [ ] T1 — Escalation isolated by account (RLS)
- [ ] T2 — Manager sees only their org escalations

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Business Rule + External Integration:**
- [ ] F1-F6: Escalation logic complete
- [ ] F7-F8: Cron filtering correct
- [ ] P1-P3: Performance acceptable

**Testes obrigatórios:**
```
E2E:
1. Create ticket with SLA deadline in 1h
2. Run cron (mock SLA status = 'atencao')
3. Verify ticket_events logged with 'sla_escalated'
4. Verify Slack notification sent
5. Run cron again: no duplicate notification (de-dup check)

Unit:
- De-duplication: same ticket within 2h not escalated
- SLA status filtering: only atencao/vencido
- Manager lookup: correct manager for account

Edge cases:
- Missing Slack ID: handled gracefully
- Unassigned ticket: not escalated
```

**Fixtures:**
- 3 tickets with SLA status atencao/vencido
- Manager with Slack ID configured
- Mock Slack API

---

## Notas

1. **Cron frequency** — hourly is MVP. Can be 30min if needed more responsiveness. SLA windows are typically hours, so hourly is reasonable.
2. **Slack integration** — use bot token with chat:write permission. Store in env vars.
3. **De-duplication** — 2-hour window prevents spam. Adjust based on feedback.
4. **Manager assignment** — need to determine who is "manager" for escalation. Options:
   - Account.manager_id field
   - CSM's team lead
   - Global CS manager (fallback)
   MVP: use accounts.manager_id, fallback to first user with 'manager' role.

5. **SLA extension** — F2 can add "Extend SLA" button in CSP, clears escalation event.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md)
- Decisões: [_decisions.md](_decisions.md) → SLA schema
- Anterior: [F1-15 Atribuição Automática](F1-15-atribuicao-automatica.md)
- Próximo: [F1-17 "O que Responder?" RAG](F1-17-rag-sugestoes.md)
