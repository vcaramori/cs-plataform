# F1-10: Merge de Tickets

## Contexto

Customer opened ticket #100 about database issue. Later, realizes same issue and opens #102. Two parallel conversations, no context cross-reference. CSM manually synchronizes responses, confusing timeline.

Merge consolidates: #102 becomes shadow of #100, all replies/attachments unified in timeline, SLA clock resets on primary to avoid abuse.

---

## Escopo

**É:**
- Action in ticket detail: "Mesclar em outro ticket"
- Modal: field to enter target ticket ID (with search/autocomplete)
- On merge: secondary ticket becomes read-only, redirects to primary
- Consolidation: all replies + attachments appear in primary timeline (chronological)
- SLA: primary ticket SLA resets on merge (clock restarts)
- Log: ticket_merge_history table with before/after state
- Audit: CSM name + timestamp in merge event
- Cross-account: prevent merging across different accounts (RLS)

**Não é (MVP):**
- Undo merge (log history for manual reversal post-MVP)
- Merge > 2 tickets (only binary merge)
- Auto-merge detection (F1-11 detects, F1-10 merges manually)

---

## Decisões de Design (UX)

**Merge Action:**
- Button in ticket detail: "Mesclar com outro ticket"
- Opens modal: "Mesclar em qual ticket?"
- Input: ticket ID or autocomplete search by subject
- Preview: shows target ticket (subject, customer, reply count)
- Confirm: "Mesclar #102 em #100? (Reversível via audit log)"
- On confirm: status='merged', redirects to #100 with toast "Tickets mesclados"

**Secondary Ticket UI:**
- Badge: "Mesclado com #100" (prominent, top of page)
- Content: grayed out, not editable
- Link: "Ver ticket principal #100"
- All replies accessible via #100

**Primary Ticket Timeline:**
- New section: "Respostas de ticket mesclado (#102)"
- Chronological order
- Merge event logged as: [icon] "Ticket #102 mesclado — 5 replies consolidadas"

**SLA Reset:**
- On merge: ticket.created_at updated to now()? Or new field merged_at?
- Decision: keep created_at, add merged_at. SLA calculation uses merged_at if present.

---

## Schema / Migrações

**Coluna nova em support_tickets:**

```sql
ALTER TABLE support_tickets ADD COLUMN (
  merged_into uuid REFERENCES support_tickets(id) ON DELETE SET NULL,
  merged_at timestamptz DEFAULT NULL,
  merge_count int DEFAULT 0 -- how many tickets merged into this one
);

CREATE INDEX idx_support_tickets_merged_into ON support_tickets(merged_into);
```

**Tabela nova:**

```sql
CREATE TABLE ticket_merge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ticket_id uuid NOT NULL REFERENCES support_tickets(id),
  target_ticket_id uuid NOT NULL REFERENCES support_tickets(id),
  merged_by uuid NOT NULL REFERENCES auth.users(id),
  merged_at timestamptz DEFAULT now(),
  source_reply_count int,
  target_reply_count_before int,
  target_reply_count_after int,
  notes text,
  CONSTRAINT no_self_merge CHECK (source_ticket_id != target_ticket_id)
);

CREATE INDEX idx_ticket_merge_history_source ON ticket_merge_history(source_ticket_id);
CREATE INDEX idx_ticket_merge_history_target ON ticket_merge_history(target_ticket_id);
```

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/MergeTicketModal.tsx` — novo componente modal
- `src/app/(dashboard)/suporte/components/TicketDetail.tsx` — add button "Mesclar"
- `src/app/(dashboard)/suporte/components/MergedTicketBanner.tsx` — banner for merged tickets
- `src/app/api/tickets/[id]/merge/route.ts` — POST endpoint
- `src/lib/schemas/mergeTicket.schema.ts` — Zod validation
- `supabase/migrations/[timestamp]_add_ticket_merge.sql`

---

## Padrões a Seguir

**Merge endpoint:**
```typescript
// src/app/api/tickets/[id]/merge/route.ts
// POST: { targetTicketId: string }
// 1. Validate both tickets exist and in same account (RLS check)
// 2. Update source: merged_into = targetTicketId
// 3. Consolidate replies (order by created_at)
// 4. Update target: merge_count++
// 5. Log to ticket_merge_history
// 6. Return 200 with { sourceId, targetId }
```

**Timeline consolidation:**
- Fetch all replies from source + target
- Sort by created_at
- Display source replies with origin label: "[From merged ticket #102]"

**LLM:** Não aplica

---

## Complexidade Estimada

**P (Pequeno)** — 0.5-1 sessão BMAD

- Modal component + autocomplete (straightforward)
- Merge logic (validation + updates)
- Timeline consolidation (sorting + display)

---

## Dependências

**Precisa que:** F1-01 (support_tickets)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Open ticket #102, click "Mesclar", modal appears
- [ ] F2 — Search/type target ticket ID, autocomplete shows results
- [ ] F3 — Select target #100, preview shows subject + reply count
- [ ] F4 — Confirm → status='merged', merged_into=#100
- [ ] F5 — Redirect to #100, toast "2 tickets mesclados"
- [ ] F6 — View #102: banner "Mesclado com #100" + link to primary
- [ ] F7 — #102 is read-only (no replies allowed)
- [ ] F8 — #100 timeline shows replies from #102 (chronological, labeled)
- [ ] F9 — ticket_merge_history logged with both ticket IDs + merged_by
- [ ] F10 — Merge count visible in #100: "3 tickets mesclados neste"

### Edge Cases

- [ ] E1 — Merge ticket into itself: error "Não pode mesclar em si mesmo"
- [ ] E2 — Merge across accounts: 403 error (RLS)
- [ ] E3 — Target ticket doesn't exist: 404 error
- [ ] E4 — Merge when target is also merged: chain merge? (Prevent, error "Target já foi mesclado")
- [ ] E5 — Two CSMs merge same ticket simultaneously: prevent race condition (lock)

### Performance

- [ ] P1 — Merge executes in < 2s
- [ ] P2 — Consolidation of 100+ replies doesn't lag (< 500ms)
- [ ] P3 — Timeline render with merged replies in < 200ms

### Isolation

- [ ] T1 — RLS prevents cross-account merge
- [ ] T2 — CSM A can't merge CSM B tickets (if private tickets)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Operação Destrutiva (Merge):**
- [ ] F1-F4: Merge flow end-to-end
- [ ] E2-E4: Cross-account, non-existent, chained merges prevented
- [ ] Audit: ticket_merge_history comprehensive

**Testes obrigatórios:**
```
E2E:
1. Create 2 tickets, merge #2 into #1
2. Verify #2 has merged_into=#1, read-only
3. Verify #1 timeline includes #2 replies (chronological)
4. Deep link #2 redirects to #1

Unit:
- Merge validation: cross-account blocked, self-merge blocked
- Consolidation: replies ordered by created_at
- Merge count incremented

Edge cases:
- Chain merge prevented (target already merged)
- Simultaneous merge (race condition)
```

**Fixtures:**
- 3 tickets: 2 in same account (mergeable), 1 in different account (not)
- 10 replies across tickets with various timestamps

---

## Notas

1. **SLA reset** — merged_at used for SLA calc. Decision: SLA "restarts" (clock counts from merge time). Alternative: keep original SLA. MVP uses restart.
2. **Undo** — ticket_merge_history is audit log only. Manual undo requires running SQL script to reverse. Post-MVP: add "Undo merge" button.
3. **Notification** — when merging, no auto-notify customer. CSM must send reply explaining consolidation.
4. **Bulk merge** — F3 could add bulk merge (select multiple tickets + merge all into one).

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `MergeTicketModal`, `MergedTicketBanner`
- Anterior: [F1-09 Auto-close por Prioridade](F1-09-auto-close-prioridade.md)
- Próximo: [F1-11 Detecção de Duplicata](F1-11-deteccao-duplicata.md)
