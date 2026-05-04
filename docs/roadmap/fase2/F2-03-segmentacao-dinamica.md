# F2-03: Segmentação Dinâmica

## Contexto

CSM wants to run playbook on "all enterprise accounts with high NPS but declining health". Today: manual spreadsheet filtering. Tomorrow: saved segments via FilterBuilder (F1-02), reused on accounts instead of tickets.

Segmentação dinâmica is SavedViewSidebar + FilterBuilder applied to accounts. Same UX as F1-01 views, different entity.

---

## Escopo

**É:**
- Reuses SavedViewSidebar (F1-01) + FilterBuilder (F1-02) components
- entity_type = 'account' (instead of 'support_ticket')
- Filters on account fields: health_status, arr, industry, csm_assigned, nps_score, churn_risk, etc
- Saved segments: personal or team-shared
- Account list filtered by segment
- Default segments: All, At-Risk, Healthy, Enterprise, SMB, etc
- Live counter: "55 accounts match this segment"

**Não é (MVP):**
- Segment-based automation (triggers — F3 playbooks)
- Segment analytics (F3)
- Segment marketplace (F3+)

---

## Decisões de Design (UX)

**Segment Sidebar:**
- Same layout as F1-01 SavedViewSidebar
- Max 8 visible, rest in "Ver todas"
- Each segment: name, icon, counter
- Click: filter account list to segment

**FilterBuilder on Accounts:**
- Same FilterBuilder component as F1-02
- Available fields:
  - health_status (eq: healthy/at_risk/critical)
  - health_score (range: 0-100)
  - arr (range: 0-10M)
  - industry (multi-select: tech, finance, etc)
  - csm_assigned (select: list of CSMs)
  - nps_score (range: -100 to 100, or null)
  - churn_risk (eq: yes/no)
  - contract_status (select: active/expired/upcoming)
  - customer_count (range: 1-1000)

**Default Segments (Hardcoded):**
- "Todos" (no filter)
- "Em Risco" (health_status = 'at_risk' or 'critical')
- "Saudável" (health_status = 'healthy')
- "Enterprise" (arr > 100k)
- "SMB" (arr <= 100k)
- "Sem NPS" (nps_score = null)
- "Detratores" (nps_score < 7)
- "Promotores" (nps_score >= 9)

**Create Segment:**
- Apply filters → "Salvar segmento" button
- Modal: name + visibility (personal/team)
- Segment saved to saved_views (entity_type='account')

---

## Schema / Migrações

**Nenhuma tabela nova** — reutiliza saved_views com entity_type='account'.

**Default segments exemplo:**
```sql
-- Insert in seed or fixture
INSERT INTO saved_views (user_id, account_id, name, entity_type, filters, visibility, icon)
VALUES
  (admin_id, NULL, 'Todos', 'account', '{}', 'team', 'list'),
  (admin_id, NULL, 'Em Risco', 'account', 
    '{"field": "health_status", "op": "in", "values": ["at_risk", "critical"]}', 'team', 'alert'),
  (admin_id, NULL, 'Enterprise', 'account',
    '{"field": "arr", "op": "gte", "value": 100000}', 'team', 'star'),
  ...;
```

---

## Arquivos Afetados

- `src/app/(dashboard)/accounts/page.tsx` — add SavedViewSidebar
- `src/app/(dashboard)/accounts/components/AccountSegmentSidebar.tsx` — renamed/reused from ticket sidebar
- `src/app/(dashboard)/accounts/components/AccountList.tsx` — filter by segment
- `src/app/(dashboard)/accounts/components/AccountFilterBuilder.tsx` — FilterBuilder for accounts
- `src/lib/schemas/accountFilters.schema.ts` — Zod schema (account-specific fields)
- Reuse: `src/app/(dashboard)/suporte/components/FilterBuilder.tsx` (component from F1-02)

---

## Padrões a Seguir

**Reuse FilterBuilder:**
- Same component as F1-02
- Pass `fieldSchema` prop with account fields
- Return filters in same JSONB format

**Segment Sidebar:**
- Same SavedViewSidebar component
- Pass entity_type='account'
- Rest of logic is identical

**Account Filter Schema:**
```typescript
// src/lib/schemas/accountFilters.schema.ts
export const accountFilterSchema = z.array(
  z.object({
    field: z.enum(['health_status', 'health_score', 'arr', 'industry', 'csm_assigned', 'nps_score', 'churn_risk', 'contract_status']),
    op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'nin', 'is_null']),
    value: z.any().optional(),
    values: z.array(z.any()).optional()
  })
);
```

**Account List with Segment Filter:**
```typescript
// src/app/(dashboard)/accounts/components/AccountList.tsx
export function AccountList({ segmentId }: { segmentId?: string }) {
  const [filters, setFilters] = useState({});

  useEffect(() => {
    if (segmentId) {
      // Load segment filters from saved_views
      const segment = await getSegment(segmentId);
      setFilters(segment.filters);
    }
  }, [segmentId]);

  // Apply filters to query
  const queryString = new URLSearchParams({ filters: JSON.stringify(filters) });
  const { data: accounts } = useQuery({
    queryKey: ['accounts', filters],
    queryFn: () => fetch(`/api/accounts?${queryString}`).then(r => r.json())
  });

  return <AccountTable accounts={accounts} />;
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**P (Pequeno)** — 0.5 sessões BMAD

- Reuses F1-01 SavedViewSidebar component
- Reuses F1-02 FilterBuilder component
- Only new: account-specific field schema + sidebar integration
- Minimal new code

---

## Dependências

**Precisa que:** F1-01 (SavedViewSidebar), F1-02 (FilterBuilder), F2-02 (health_status field)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Account list page has segment sidebar (same UX as F1-01)
- [ ] F2 — Default segments: "Todos", "Em Risco", "Saudável", etc
- [ ] F3 — Click segment → account list filters (shows matching accounts only)
- [ ] F4 — Counter: "55 contas" shows matching count
- [ ] F5 — Apply FilterBuilder filters → "Salvar segmento" appears
- [ ] F6 — Save segment persists in saved_views (entity_type='account')
- [ ] F7 — Saved segment appears in sidebar after creation
- [ ] F8 — Delete segment removes from sidebar
- [ ] F9 — Deep link: `/accounts?segment=at-risk` opens segment
- [ ] F10 — Default segments cannot be deleted (hardcoded)

### Edge Cases

- [ ] E1 — Empty segment (0 matching accounts): show empty state
- [ ] E2 — User creates segment with same name as existing: error "Segment já existe"
- [ ] E3 — Filter by non-existent CSM: graceful (return 0 accounts)
- [ ] E4 — Segment with ARR range 100k-500k: boundary conditions tested
- [ ] E5 — Segment with complex AND/OR logic: properly nested filters

### Performance

- [ ] P1 — Segment list loads in < 1s (counters for all segments)
- [ ] P2 — Filter account list < 500ms (with 1000 accounts)
- [ ] P3 — Create new segment < 2s

### Isolation

- [ ] T1 — Personal segments visible only to creator (RLS)
- [ ] T2 — Team segments visible to org members only
- [ ] T3 — CSM A's data not exposed in CSM B's segments

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Reusable Component + Filter:**
- [ ] F1-F3: Segment sidebar + filtering complete
- [ ] F6-F7: Save/load segments
- [ ] T1-T3: RLS verified

**Testes obrigatórios:**
```
E2E:
1. Open account list
2. Apply filter: health_status = 'at_risk' AND arr > 50k
3. Save as segment "At-Risk Enterprise"
4. Verify segment appears in sidebar
5. Click segment → filters applied
6. Delete segment → removed from sidebar

Unit:
- accountFilterSchema validates correctly
- FilterBuilder reused (same component)
- SavedViewSidebar reused (entity_type='account')

Integration:
- Segment filters map correctly to SQL WHERE clause
- Counter updates when new account matches segment
```

**Fixtures:**
- 10 accounts with various health/arr/industry combinations
- 3 test CSMs
- Pre-created default segments

---

## Notas

1. **Field extensibility** — FilterBuilder is generic, easy to add new account fields in future (churn_probability, mrr, etc).

2. **Segment reuse** — same SavedViewSidebar component works for:
   - Tickets (F1-01)
   - Accounts (F2-03)
   - Future: Customers, Opportunities (F3+)
   Just pass `entity_type` prop.

3. **Automation** — F3 Playbooks can trigger on segment:
   - "When account is in 'At-Risk' segment → send CSM alert"
   - "Run playbook on all 'SMB' accounts monthly"

4. **Benchmarking** — F3 can add "compare segment X to segment Y" analytics.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → Reuses `SavedViewSidebar`, `FilterBuilder`
- Anterior: [F2-02 Health Score Ponderado](F2-02-health-score-ponderado.md)
- Próximo: [F3-01 Playbooks MVP](../fase3/F3-01-playbooks-mvp.md)
