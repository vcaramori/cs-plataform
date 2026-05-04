# F1-08: Reopen Automático

## Contexto

CSM marca ticket como resolved. Customer responde 3 horas depois — ticket é closed, customer não sabe que CSM nunca viu. CSM descobre dias depois. Solução: if ticket status=closed + customer replies, auto-reopen.

Reopen automático triggered via ticket_events listener quando nova reply é adicionada. Log completo para auditoria.

---

## Escopo

**É:**
- Trigger: nova customer reply chegando em ticket status='closed'
- Action: auto-change status='closed' → 'open'
- Condition: reply é do customer, não do CSM/system
- Log: ticket_events com event_type='auto_reopened', payload={reason: 'customer_reply', reply_id}
- Notification: CSM recebe notificação "Ticket #123 foi reaberto por customer reply"
- Applies to: tickets closed no máximo 30 dias atrás

**Não é (MVP):**
- Auto-reopen se internal note (apenas customer)
- Auto-reopen se attachment sem texto
- Prevent auto-reopen (user-configurable setting — F2)

---

## Decisões de Design (UX)

**Reopen Flow:**
1. Customer sends reply via email/widget
2. System processes reply, creates ticket_reply record
3. Trigger checks: if ticket.status='closed' AND reply.from=customer_email → auto-reopen
4. ticket status changes to 'open'
5. ticket_events logged
6. Toast/notification to CSM: "Ticket #123 reaberto por resposta do cliente"

**Timeline UI:**
- Event in ticket timeline: "Ticket reopened automatically — customer replied"
- Icon: 🔄 (reopen)
- Link to reply that triggered reopen

**Notification:**
- Bell icon in sidebar
- Toast: "[Customer Name] respondeu em ticket fechado. Ticket #123 reaberto."
- Email optional (F2)

---

## Schema / Migrações

**Nenhuma tabela nova** — reutiliza ticket_events.

**Exemplo de evento:**
```sql
INSERT INTO ticket_events (ticket_id, event_type, actor_id, payload, created_at) 
VALUES (
  '123...',
  'auto_reopened',
  NULL, -- system action
  '{"reason": "customer_reply", "reply_id": "456...", "customer_email": "john@acme.com"}',
  now()
);
```

---

## Arquivos Afetados

- `src/app/api/ticket-replies/route.ts` — POST endpoint (create reply)
- `src/lib/services/replyService.ts` — logic to check auto-reopen conditions
- `src/lib/services/ticketService.ts` — update status + log event
- `src/app/api/webhooks/ticket-reply-created/route.ts` — trigger endpoint (if webhook-based)
- `scripts/triggers/auto-reopen.ts` — Supabase trigger function (if using Postgres)

---

## Padrões a Seguir

**Supabase Trigger (Postgres):**
```sql
CREATE OR REPLACE FUNCTION auto_reopen_on_customer_reply()
RETURNS TRIGGER AS $$
DECLARE
  v_ticket_status TEXT;
  v_is_customer BOOLEAN;
  v_customer_email TEXT;
BEGIN
  -- Check if reply is from customer (not CSM)
  SELECT st.status, st.customer_email 
  INTO v_ticket_status, v_customer_email
  FROM support_tickets st WHERE st.id = NEW.ticket_id;

  v_is_customer := NEW.author_email = v_customer_email;

  IF v_ticket_status = 'closed' AND v_is_customer THEN
    -- Update ticket status
    UPDATE support_tickets SET status = 'open' WHERE id = NEW.ticket_id;
    
    -- Log event
    INSERT INTO ticket_events (ticket_id, event_type, payload, created_at)
    VALUES (
      NEW.ticket_id,
      'auto_reopened',
      jsonb_build_object('reason', 'customer_reply', 'reply_id', NEW.id),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_reopen_on_reply
AFTER INSERT ON ticket_replies
FOR EACH ROW
EXECUTE FUNCTION auto_reopen_on_customer_reply();
```

**API Route pattern:** Similar to create ticket reply

**LLM:** Não aplica

---

## Complexidade Estimada

**P (Pequeno)** — 0.5 sessões BMAD

- Supabase trigger function (straightforward)
- Event logging (reuses existing pattern)
- Test edge cases

---

## Dependências

**Precisa que:** F1-01 (support_tickets, ticket_events)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Customer replies to closed ticket → system auto-reopens within 5s
- [ ] F2 — Ticket status changes from 'closed' to 'open' visible in list
- [ ] F3 — ticket_events logs 'auto_reopened' with correct payload
- [ ] F4 — CSM receives notification "Ticket #123 reaberto por resposta do cliente"
- [ ] F5 — Timeline shows "Reopened automatically" event with icon
- [ ] F6 — Reply that triggered reopen is linked in timeline event
- [ ] F7 — Internal note (CSM reply) does NOT auto-reopen closed ticket
- [ ] F8 — System reply (automated, no author_email) does NOT auto-reopen
- [ ] F9 — Closed > 30 days old: auto-reopen still happens (or configurable cutoff)
- [ ] F10 — Multiple replies from customer: only first one triggers reopen

### Edge Cases

- [ ] E1 — Customer replies to ticket that's already reopening (race condition): handle gracefully
- [ ] E2 — Reply from unrecognized email (not customer_email): treat as internal, don't reopen
- [ ] E3 — Ticket is deleted during reply ingestion: handle orphan reply (FK constraint)
- [ ] E4 — Trigger fires but status update fails: event still logged? (Define behavior)

### Performance

- [ ] P1 — Auto-reopen executes within 5s of reply ingestion
- [ ] P2 — Trigger does not slow down reply creation (< 100ms overhead)
- [ ] P3 — 1000 concurrent replies: no deadlock or timeout

### Isolation

- [ ] T1 — Auto-reopen respects RLS (ticket visibility)
- [ ] T2 — Event logging includes org isolation (implicit via ticket RLS)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Business Rule:**
- [ ] F1-F3: Auto-reopen logic end-to-end
- [ ] F7-F8: Edge cases handled correctly
- [ ] P1: Latency < 5s

**Testes obrigatórios:**
```
E2E:
1. Create closed ticket
2. Customer sends reply
3. Verify status → 'open' within 5s
4. Verify ticket_events logged

Unit:
- Trigger function: test customer vs CSM reply
- Event logging: payload structure correct

Edge cases:
- Internal note doesn't reopen
- System reply doesn't reopen
- Orphan reply handled
```

**Fixtures:**
- 5 closed tickets
- 2 customers with different email domains

---

## Notas

1. **Customer identification** — current: match on customer_email. Future (F2): use ticket.customer_id if available.
2. **30-day window** — configurable threshold. MVP default is infinite (any closed ticket).
3. **Notification routing** — CSM gets toast. Future: email + Slack notification.
4. **Prevent spam** — if customer replies 5x in 1 hour, still log each reopen (no deduplication). Future: batch notifications.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md)
- Decisões: [_decisions.md](_decisions.md) → ticket_events schema
- Anterior: [F1-07 Urgency Scoring](F1-07-urgency-scoring.md)
- Próximo: [F1-09 Auto-close por Prioridade](F1-09-auto-close-prioridade.md)
