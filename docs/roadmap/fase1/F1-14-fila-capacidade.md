# F1-14: Fila com Capacidade

## Contexto

CSM queue today: list of unassigned tickets. No visibility into CSM workload. Alice already has 20 tickets, system assigns 21st. Alice drowns. Queue needs capacity awareness: show only tickets that fit CSM's available capacity.

Queue view filters by csm_queue_config.max_concurrent_tickets. Sidebar shows "[N/max]" counter per CSM. When Alice's queue is full, system won't auto-assign new (F1-15).

---

## Escopo

**É:**
- Queue view: list of unassigned tickets filtered by CSM availability
- Sidebar counter: "Fila Alice [15/20]" shows assigned_count / max_concurrent_tickets
- Logic: assigned_count = COUNT(tickets assigned_to=CSM AND status != 'closed')
- Alert: "Fila cheia para Alice (20/20)" when hovering counter
- Configuration: csm_queue_config table with max_concurrent_tickets per CSM
- Real-time: counter updates when ticket assigned/closed (TanStack React Query)
- Capacity check: CSM can override (force-assign to full queue, generates warning)

**Não é (MVP):**
- Weighted capacity (some tickets count as 2x)
- SLA-aware capacity (high-SLA tickets limit others)
- Team capacity pools (F2)
- Capacity forecasting (F3)

---

## Decisões de Design (UX)

**Queue View:**
- Filters to: only unassigned tickets
- Dropdown: "Mostrar Fila para: [CSM dropdown]"
- Table: unassigned tickets, ready for assignment to selected CSM
- Alert bar: if CSM queue full, "Fila cheia para Alice. Assign anyway?" with toggle

**Sidebar:**
- Per CSM item: "Alice [15/20]"
- Color coding:
  - 🟢 Green (< 75% full): 0-15
  - 🟡 Yellow (75-99% full): 15-19
  - 🔴 Red (full): 20/20
- Click CSM name: navigate to queue view for that CSM
- Hover counter: tooltip "15 open tickets / 20 max capacity"

**Configuration:**
- Settings page (future F2): CSM list with editable max_concurrent_tickets
- Default: 20 tickets per CSM (configurable globally)
- Min/max: 5-50 tickets

---

## Schema / Migrações

**Tabela nova:**

```sql
CREATE TABLE csm_queue_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  csm_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  max_concurrent_tickets int DEFAULT 20 CHECK (max_concurrent_tickets >= 5 AND <= 50),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(account_id, csm_id)
);

CREATE INDEX idx_csm_queue_config_account ON csm_queue_config(account_id);
CREATE INDEX idx_csm_queue_config_csm ON csm_queue_config(csm_id);
```

**View para calcular fila:**

```sql
CREATE VIEW csm_queue_stats AS
SELECT
  cqc.csm_id,
  cqc.account_id,
  cqc.max_concurrent_tickets,
  COUNT(st.id) as current_ticket_count,
  cqc.max_concurrent_tickets - COUNT(st.id) as available_capacity
FROM csm_queue_config cqc
LEFT JOIN support_tickets st ON st.assigned_to = cqc.csm_id AND st.status != 'closed'
GROUP BY cqc.csm_id, cqc.account_id, cqc.max_concurrent_tickets;
```

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/QueueView.tsx` — novo componente queue
- `src/app/(dashboard)/suporte/components/Sidebar.tsx` — update CSM list with capacity counter
- `src/app/(dashboard)/suporte/components/QueueCapacityAlert.tsx` — alert for full queues
- `src/app/api/csm-queue-config/route.ts` — GET config, POST/PATCH (settings — F2)
- `src/app/api/csm-queue-stats/route.ts` — GET stats (assigned_count per CSM)
- `src/lib/hooks/useQueueStats.ts` — custom hook for real-time counter

---

## Padrões a Seguir

**Queue View Component:**
- Filter unassigned tickets
- Show selected CSM + capacity
- TanStack React Query for stats + list

**Sidebar Integration:**
```typescript
// src/app/(dashboard)/suporte/components/Sidebar.tsx
export function CSMQueueCounter({ csmId }: { csmId: string }) {
  const { data: stats } = useQuery({
    queryKey: ['csm-queue-stats', csmId],
    queryFn: () => fetch(`/api/csm-queue-stats?csm_id=${csmId}`).then(r => r.json()),
    refetchInterval: 30000 // every 30s
  });

  const capacity = stats?.current_ticket_count / stats?.max_concurrent_tickets;
  const color = capacity < 0.75 ? 'green' : capacity < 1 ? 'yellow' : 'red';

  return (
    <div className={`text-${color}-600`}>
      {stats?.current_ticket_count}/{stats?.max_concurrent_tickets}
    </div>
  );
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**P (Pequeno)** — 0.75 sessões BMAD

- Queue view component (straightforward)
- Queue stats calculation (SQL view)
- Sidebar integration (reuses existing patterns)

---

## Dependências

**Precisa que:** F1-01 (support_tickets)

**Bloqueia:** F1-15 (auto-assign depends on capacity)

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Queue view shows only unassigned tickets
- [ ] F2 — Queue view has dropdown "Mostrar fila para: [CSM dropdown]"
- [ ] F3 — Sidebar shows CSM list with capacity counter "[N/max]"
- [ ] F4 — Counter color: green < 75%, yellow 75-99%, red >= 100%
- [ ] F5 — Hover counter → tooltip "N open tickets / max capacity"
- [ ] F6 — Click CSM name in sidebar → navigate to queue view for that CSM
- [ ] F7 — When ticket assigned, sidebar counter updates (no page reload)
- [ ] F8 — When ticket closed, sidebar counter updates
- [ ] F9 — Assign ticket to full queue: warning alert, "Assign anyway?" toggle
- [ ] F10 — Force-assign to full queue: ticket assigned, warning logged

### Edge Cases

- [ ] E1 — CSM with 0 tickets assigned: shows "0/20" (green)
- [ ] E2 — CSM with 20 tickets assigned: shows "20/20" (red, full)
- [ ] E3 — CSM with no config entry: use default max_concurrent_tickets = 20
- [ ] E4 — Unassigned ticket count doesn't match available capacity: graceful (recalc)
- [ ] E5 — Delete CSM: orphaned config cleaned up? (FK CASCADE)

### Performance

- [ ] P1 — Queue view loads with 1000 unassigned tickets in < 2s
- [ ] P2 — Sidebar counter updates < 500ms after assignment
- [ ] P3 — Stats query < 100ms (indexed)

### Isolation

- [ ] T1 — Queue stats isolated by account (RLS)
- [ ] T2 — CSM A can't see CSM B queue (if private)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Business Logic + Real-time UI:**
- [ ] F1-F6: Queue view + sidebar complete
- [ ] P1-P2: Real-time updates performant
- [ ] T1-T2: RLS verified

**Testes obrigatórios:**
```
E2E:
1. Queue view: show unassigned tickets
2. Select CSM from dropdown: queue filters to that CSM
3. Sidebar: shows capacity counter for each CSM
4. Assign ticket: counter updates in real-time
5. Close ticket: counter decrements

Unit:
- Queue capacity calculation: correct ratio
- Color coding: green/yellow/red thresholds
- Stats query performance (< 100ms)
```

**Fixtures:**
- 3 CSMs with different configs (15, 20, 25 max)
- 20 unassigned tickets
- 40 assigned tickets across CSMs

---

## Notas

1. **Real-time updates** — refetchInterval 30s is MVP. F2 can add Supabase Realtime for instant updates.
2. **Capacity logic** — current_count includes open + in_progress, excludes closed. Clear in implementation.
3. **Configuration** — admin-only (F2 adds Settings page). MVP: hardcoded default 20.
4. **Force-assign override** — CSM can assign to full queue with warning. Future (F3) can block via feature flag.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `QueueView`, `QueueCapacityAlert`
- Anterior: [F1-13 Formulário Público/Webhook](F1-13-formulario-publico.md)
- Próximo: [F1-15 Atribuição Automática](F1-15-atribuicao-automatica.md)
