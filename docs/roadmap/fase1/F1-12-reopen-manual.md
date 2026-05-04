# F1-12: Reopen Manual

## Contexto

CSM closes ticket. Day later, realizes they shouldn't have. Need to reopen. Currently, no way to do it directly — must contact admin or edit DB. Solution: button "Reabrir com justificativa" — CSM enters reason (audit), status changes to open.

---

## Escopo

**É:**
- Button in ticket detail: "Reabrir com justificativa"
- Modal: required textarea for reason (min 10 chars)
- On confirm: status='closed' → 'open', log to ticket_events
- Audit: CSM name + reason visible in timeline
- Applies to: closed tickets only
- No RLS restriction (CSM can reopen own tickets)

**Não é (MVP):**
- Reopen resolved tickets (only closed)
- Auto-notify customer on reopen
- Limit number of reopens (F2 can add policy)

---

## Decisões de Design (UX)

**Reopen Action:**
- Button in ticket detail (near top, prominent)
- Text: "Reabrir com justificativa"
- Icon: 🔄 (reopen)

**Modal:**
- Title: "Reabrir ticket #123?"
- Body: "Por que você está reabrindo este ticket?"
- Input: textarea, min 10 chars, placeholder "Ex. Customer respondeu, devemos continuar..."
- Buttons: "Cancelar" | "Confirmar"
- Error: if < 10 chars, show "Mínimo 10 caracteres"

**Confirmation:**
- Toast: "Ticket reaberto com sua justificativa"
- Ticket list updates: status changes to 'open'
- Timeline shows: event "Reaberto por [CSM] — [reason]"

**Timeline Event:**
- Icon: 🔄
- Text: "Reaberto — [CSM name] — [reason]"
- Full reason visible on click (if long)

---

## Schema / Migrações

**Nenhuma tabela nova** — reutiliza ticket_events.

**Event payload:**
```json
{
  "reason": "Customer respondeu, precisa continuar investigation",
  "reopened_by": "alice@...",
  "reopened_at": "2025-01-15T10:30:00Z"
}
```

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/TicketDetail.tsx` — add button
- `src/app/(dashboard)/suporte/components/ReopenModal.tsx` — novo componente
- `src/app/api/tickets/[id]/reopen/route.ts` — POST endpoint
- `src/lib/schemas/reopenTicket.schema.ts` — Zod validation

---

## Padrões a Seguir

**Reopen endpoint:**
```typescript
// src/app/api/tickets/[id]/reopen/route.ts
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { reason } = await request.json();
  
  // Validate
  if (!reason || reason.length < 10) {
    return new Response(JSON.stringify({ error: 'Reason min 10 chars' }), { status: 400 });
  }

  // Get ticket
  const ticket = await getTicket(params.id);
  if (ticket.status !== 'closed') {
    return new Response(JSON.stringify({ error: 'Only closed tickets can reopen' }), { status: 400 });
  }

  // Update status
  await updateTicketStatus(params.id, 'open');

  // Log event
  await logTicketEvent(params.id, 'manual_reopened', {
    reason,
    reopened_by: currentUser.id
  });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**P (Pequeno)** — 0.25 sessões BMAD

- Modal component (straightforward)
- Validation (simple)
- API endpoint + event logging (reuses patterns)

---

## Dependências

**Precisa que:** F1-01 (support_tickets, ticket_events)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Open closed ticket, see button "Reabrir com justificativa"
- [ ] F2 — Click button → modal appears
- [ ] F3 — Textarea is required (min 10 chars)
- [ ] F4 — Type < 10 chars → "Confirmar" disabled (or error on click)
- [ ] F5 — Type reason, click "Confirmar" → status changes to 'open'
- [ ] F6 — Toast: "Ticket reaberto com sua justificativa"
- [ ] F7 — Timeline shows event: "Reaberto — [CSM] — [reason]"
- [ ] F8 — ticket_events logs event_type='manual_reopened' with reason payload
- [ ] F9 — Reopen timestamp recorded in event
- [ ] F10 — Ticket visible in queue (no longer closed, unless resolved)

### Edge Cases

- [ ] E1 — Open ticket (not closed): button hidden or disabled?
- [ ] E2 — Resolved ticket (not closed): button hidden or disabled?
- [ ] E3 — Reopen same ticket twice: both events logged (no limit MVP)
- [ ] E4 — Paste very long reason (5000+ chars): truncate or allow?

### Performance

- [ ] P1 — Reopen action < 1s
- [ ] P2 — Modal opens < 200ms
- [ ] P3 — List updates < 500ms after reopen

### Isolation

- [ ] T1 — CSM can only reopen own tickets (RLS verifies ownership or same org)
- [ ] T2 — CSM A can't reopen CSM B ticket (if private)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Simple UI Action:**
- [ ] F1-F5: Full flow end-to-end
- [ ] F7-F9: Audit trail complete
- [ ] T1-T2: RLS verified

**Testes obrigatórios:**
```
E2E:
1. Close ticket #123
2. Open detail, click "Reabrir com justificativa"
3. Modal opens
4. Type reason (15 chars)
5. Click "Confirmar"
6. Verify status → 'open'
7. Verify timeline shows event with reason
8. Verify ticket_events logged

Unit:
- Validation: 9 chars rejected, 10 chars accepted
- Event payload: reason + actor included
```

**Fixtures:**
- 5 closed tickets
- 2 CSMs

---

## Notas

1. **Button visibility** — only show on closed tickets. Resolved/open/in_progress have no button.
2. **Reason length** — 10 char min prevents empty/gibberish. Max 1000 chars reasonable.
3. **Escalation** — F1-16 (SLA escalation) can use reopens as signal (recurring reopens = issue).
4. **Future enhancement** — F2 can add policy: "Prevent reopen if closed > 30 days ago" per account.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `ReopenModal`
- Anterior: [F1-11 Detecção de Duplicata](F1-11-deteccao-duplicata.md)
- Próximo: [F1-13 Formulário Público/Webhook](F1-13-formulario-publico.md)
