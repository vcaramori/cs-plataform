# F2-01: Timeline Unificada

## Contexto

CSM opens account detail, needs full context: ticket history (last 3 months), NPS responses, health score changes, renewal dates, contract events. Currently scattered across views. Timeline unificada consolidates all events chronologically on account detail page.

---

## Escopo

**É:**
- Account detail page with unified timeline
- Event sources: support_tickets, nps_responses, contract_changes, account_health_updates, interactions (future)
- Chronological ordering (newest first or oldest first — user choice)
- Icon per event type (🎫 ticket, ⭐ NPS, 📋 contract, 💪 health)
- Filter by event type: dropdown "Mostrar: [All, Tickets, NPS, Contracts, Health]"
- Detail drill-in: click event → expanded view (ticket detail, NPS modal, contract, etc)
- Search: timeline search by event content

**Não é (MVP):**
- Full event customization (F2+)
- Export timeline (F2)
- Timeline collaboration (F3)
- Sub-timelines per entity (account level only, not customer-level sub-account)

---

## Decisões de Design (UX)

**Timeline Layout:**
- Vertical timeline (center line with events on left/right alternating)
- Event card: icon, type label, date, brief summary
- Hover: expand with more details
- Click: open detailed view (modal or panel)

**Event Types:**
- 🎫 **Ticket**: "Ticket #123 created" / "resolved" / "closed"
- ⭐ **NPS**: "NPS response: [score]" + sentiment (positive/neutral/detractor)
- 📋 **Contract**: "Contract renewed" / "Upsell $5k ARR" / "Churn warning"
- 💪 **Health**: "Health score: [prev] → [new]" (color-coded)
- 🔔 **Alert**: "Churn risk" / "Adoption concern" (from F3 alerts)

**Filtering:**
- Dropdown: "Mostrar: All / Tickets / NPS / Contracts / Health"
- Default: All
- Persists in sidebar view (remember user preference)

**Sorting:**
- Toggle: "Mais recente" vs "Mais antigo"
- Default: Mais recente (newest first)

---

## Schema / Migrações

**Tabela nova (or view agregating existing):**

```sql
-- Option 1: Create unified timeline_events table
CREATE TABLE timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type text NOT NULL, -- 'ticket', 'nps', 'contract', 'health', 'alert'
  event_source text NOT NULL, -- table source: 'support_tickets', 'nps_responses', etc
  source_id uuid, -- FK to source table
  title text NOT NULL,
  description text,
  metadata jsonb, -- extra data (ticket_id, score, etc)
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) -- who triggered this event
);

CREATE INDEX idx_timeline_events_account ON timeline_events(account_id);
CREATE INDEX idx_timeline_events_type ON timeline_events(event_type);
CREATE INDEX idx_timeline_events_created ON timeline_events(created_at DESC);
```

**Option 2: Create VIEW agregating existing tables (no new table):**
```sql
CREATE VIEW timeline_events AS
SELECT 
  id::text, account_id, 'ticket' as event_type, 'support_tickets' as event_source,
  id as source_id, subject as title, description, NULL as metadata, created_at, NULL as created_by
FROM support_tickets

UNION ALL

SELECT 
  id::text, account_id, 'nps' as event_type, 'nps_responses' as event_source,
  id as source_id, 'NPS Response' as title, score::text as description, 
  jsonb_build_object('score', score, 'sentiment', sentiment) as metadata,
  created_at, respondent_id as created_by
FROM nps_responses

UNION ALL

SELECT 
  id::text, account_id, 'contract' as event_type, 'contracts' as event_source,
  id as source_id, 'Contract Event' as title, status as description, 
  jsonb_build_object('arr', arr, 'status', status) as metadata,
  created_at, NULL as created_by
FROM contracts;
```

---

## Arquivos Afetados

- `src/app/(dashboard)/accounts/[id]/page.tsx` — add timeline section
- `src/app/(dashboard)/accounts/components/UnifiedTimeline.tsx` — nuevo componente
- `src/app/(dashboard)/accounts/components/TimelineEvent.tsx` — event card
- `src/app/api/accounts/[id]/timeline/route.ts` — GET timeline events (with filters/sorting)
- `supabase/migrations/[timestamp]_create_timeline_events.sql` (if using table, not view)

---

## Padrões a Seguir

**Timeline Endpoint:**
```typescript
// src/app/api/accounts/[id]/timeline/route.ts
export async function GET(request, { params }) {
  const { eventType, sort } = request.nextUrl.searchParams;

  const query = supabase
    .from('timeline_events')
    .select('*')
    .eq('account_id', params.id)
    .order('created_at', { ascending: sort === 'asc' });

  if (eventType && eventType !== 'all') {
    query.eq('event_type', eventType);
  }

  const { data } = await query.limit(100);
  return new Response(JSON.stringify(data), { status: 200 });
}
```

**Timeline Component:**
```typescript
// src/app/(dashboard)/accounts/components/UnifiedTimeline.tsx
export function UnifiedTimeline({ accountId }: { accountId: string }) {
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('desc');

  const { data: events } = useQuery({
    queryKey: ['timeline', accountId, filter, sort],
    queryFn: () =>
      fetch(`/api/accounts/${accountId}/timeline?eventType=${filter}&sort=${sort}`)
        .then(r => r.json())
  });

  return (
    <div className="timeline-container">
      <div className="flex gap-4 mb-6">
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="all">Mostrar: Todos</option>
          <option value="ticket">Tickets</option>
          <option value="nps">NPS</option>
          <option value="contract">Contratos</option>
          <option value="health">Health</option>
        </select>
        <button onClick={() => setSort(sort === 'asc' ? 'desc' : 'asc')}>
          {sort === 'asc' ? '🔼 Mais antigo' : '🔽 Mais recente'}
        </button>
      </div>

      <div className="timeline">
        {events?.map(event => (
          <TimelineEvent key={event.id} event={event} />
        ))}
      </div>
    </div>
  );
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**M (Médio)** — 1 sessão BMAD

- Timeline view/table (straightforward aggregation)
- Timeline component (UI pattern)
- Filter/sort logic (simple)
- Event detail drill-in (reuses existing modals)

---

## Dependências

**Precisa que:** F1-01 (support_tickets), NPS schema, contracts schema

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Account detail page has "Timeline" section
- [ ] F2 — Timeline shows events chronologically (newest first by default)
- [ ] F3 — Event icons: 🎫 ticket, ⭐ NPS, 📋 contract, 💪 health
- [ ] F4 — Filter dropdown: "Mostrar: All / Tickets / NPS / Contracts / Health"
- [ ] F5 — Select filter → timeline reloads (only selected event types)
- [ ] F6 — Sort toggle: "Mais recente" / "Mais antigo"
- [ ] F7 — Click event → detail view opens (modal/panel depending on type)
- [ ] F8 — Timeline search (future — not MVP)
- [ ] F9 — Timeline scrollable, loads first 50 events
- [ ] F10 — Event metadata visible (ticket ID, NPS score, contract ARR, etc)

### Edge Cases

- [ ] E1 — Account with 0 events: show empty state "Nenhum evento no timeline"
- [ ] E2 — Very long timeline (1000+ events): pagination or lazy load?
- [ ] E3 — Event source deleted (ticket deleted): handle gracefully (show deleted placeholder)
- [ ] E4 — Mixed timezones: display in user's timezone (set in settings)
- [ ] E5 — Very old events (> 2 years): archive or filter by date range?

### Performance

- [ ] P1 — Timeline loads first 50 events in < 1s
- [ ] P2 — Filter/sort updates < 500ms
- [ ] P3 — Event detail drill-in < 200ms

### Isolation

- [ ] T1 — Timeline respects RLS (CSM A doesn't see account B timeline)
- [ ] T2 — Event source access control (CSM can't see event if no ticket access)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Timeline/Unified View:**
- [ ] F1-F6: Timeline display + filtering complete
- [ ] T1-T2: RLS verified

**Testes obrigatórios:**
```
E2E:
1. Open account detail
2. Scroll to timeline
3. Verify events from different sources (tickets + NPS + contracts)
4. Filter by event type → timeline updates
5. Sort ascending → order changes

Unit:
- Timeline query: aggregates 3+ sources correctly
- Filter logic: respects event_type
- Drill-in: opens correct detail view per event type
```

**Fixtures:**
- 1 account with 30 events:
  - 10 tickets (created/resolved/closed)
  - 5 NPS responses (mix scores)
  - 3 contract events (renewal/upsell)
  - 5 health updates

---

## Notas

1. **Timeline table vs view** — view is simpler (no new table), but may have performance issues with large datasets. Post-MVP: measure and consider materialized view or table.

2. **Event enrichment** — timeline_events should include enough context to avoid N+1 queries. Store title, description, metadata to reduce lookups.

3. **Custom events** — F3 can add custom timeline events (e.g. "CSM note added", "Playbook triggered"). Current schema supports via event_type extensibility.

4. **Retention** — consider archiving old events (> 2 years) to manage table size.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `UnifiedTimeline`, `TimelineEvent`
- Anterior: [F1-20 Sentiment Trend](../fase1/F1-20-sentiment-trend.md)
- Próximo: [F2-02 Health Score Ponderado](F2-02-health-score-ponderado.md)
