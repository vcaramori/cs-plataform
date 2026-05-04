# F4-02: Renewal Management Workflow

## Contexto

Renovação é momento crítico: CSM precisa confirmar com cliente, preparar QBR, negociar termos. Atualmente tudo em spreadsheet. Renewal Management consolida: contatos que devem assinar, timeline de preparação (QBR, deck, termos), status tracking, handoff para sales.

---

## Escopo

**É:**
- Renewal workspace: timeline view (contract expiry − 120 days até date)
- QBR template: sections (exec summary, business outcomes, metrics, next steps, risks/opportunities)
- Renewal prep checklist: 15 tasks (QBR prepared, terms drafted, customer sign-off, sales handoff, etc)
- Renewal status: upcoming (120+ days), in_progress (30-120 days), critical (< 30 days), completed, lost
- Contact management: link customer contacts to renewal, email/Slack notifications
- Sales handoff: pass renewal to sales with full context (QBR, terms, contact list)
- Renewal forecast: predicted ARR/NRR for next period (if upsell/downsell planned)

**Não é (MVP):**
- Advanced negotiation workflow (e.g. multiple round approvals)
- Renewal analytics (F4+)
- Automated renewal outreach (F4+)

---

## Decisões de Design (UX)

**Renewal Timeline:**
- Account detail page: "Renovação" tab
- Timeline: days until expiry, color-coded status badges
- 120 days before: "upcoming", yellow
- 30-120 days: "in_progress", orange
- < 30 days: "critical", red
- After expiry: "completed" or "lost", gray

**Renewal Workspace:**
1. **Status overview:** contract details (start, expiry, current ARR)
2. **QBR section:** button "Editar QBR" → opens modal/side panel
3. **Prep checklist:** 15 tasks (radio checks)
4. **Contacts:** customer contacts assigned to renewal (email list)
5. **Forecast:** input fields (ARR next period, NRR %, reason for change)
6. **Sales handoff:** button "Transferir para Sales" → creates task in CRM or sends Slack

**QBR Template:**
- Sections: Exec summary, Business outcomes, Metrics review, Risks/Opportunities, Next steps
- Free-form text + bullet points
- Auto-save on input change
- Share link: password-protected PDF export for customer review

**Contacts:**
- Multi-select from account contacts
- Send email: template chooser (QBR reminder, terms review request, etc)
- Slack notification: post renewal status to CSM's Slack channel

---

## Schema / Migrações

**Tabelas novas:**

```sql
CREATE TABLE renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contract_id uuid NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'upcoming' CHECK (
    status IN ('upcoming', 'in_progress', 'critical', 'completed', 'lost')
  ),
  
  -- QBR
  qbr_content jsonb, -- { sections: { exec_summary: string, ... } }
  qbr_completed boolean DEFAULT false,
  
  -- Forecast
  forecasted_arr decimal(12, 2),
  forecasted_nrr decimal(5, 2), -- %
  forecast_reason text,
  
  -- Sales handoff
  handed_to_sales_at timestamptz,
  handed_to_csm_id uuid REFERENCES auth.users(id),
  crm_opportunity_id text, -- link to external CRM if applicable
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE renewal_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id uuid NOT NULL REFERENCES renewals(id) ON DELETE CASCADE,
  task_name text NOT NULL, -- e.g. "QBR prepared", "Terms drafted", "Customer approval"
  completed boolean DEFAULT false,
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  
  UNIQUE(renewal_id, task_name)
);

CREATE TABLE renewal_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  renewal_id uuid NOT NULL REFERENCES renewals(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  is_primary boolean DEFAULT false,
  
  UNIQUE(renewal_id, contact_id)
);

CREATE INDEX idx_renewals_account ON renewals(account_id);
CREATE INDEX idx_renewals_status ON renewals(status);
CREATE INDEX idx_renewals_contract ON renewals(contract_id);
CREATE INDEX idx_renewal_checklist_renewal ON renewal_checklist(renewal_id);
```

**Predefined checklist tasks:**
```sql
INSERT INTO renewal_checklist (renewal_id, task_name) VALUES
('renewal_id', 'QBR prepared'),
('renewal_id', 'Terms drafted'),
('renewal_id', 'Customer review'),
('renewal_id', 'Customer approval'),
('renewal_id', 'Renewal agreement signed'),
('renewal_id', 'Pricing finalized'),
('renewal_id', 'Implementation plan'),
('renewal_id', 'Support renewal confirmed'),
('renewal_id', 'License allocation verified'),
('renewal_id', 'Contacts updated'),
('renewal_id', 'Sales handoff completed');
```

---

## Arquivos Afetados

- `src/app/(dashboard)/accounts/[id]/renewal/page.tsx` — renewal workspace
- `src/app/(dashboard)/accounts/[id]/components/RenewalTimeline.tsx` — timeline visualization
- `src/app/(dashboard)/accounts/[id]/components/RenewalWorkspace.tsx` — main container
- `src/app/(dashboard)/accounts/[id]/components/RenewalQBREditor.tsx` — QBR editor modal
- `src/app/(dashboard)/accounts/[id]/components/RenewalChecklist.tsx` — checklist component
- `src/app/(dashboard)/accounts/[id]/components/RenewalContacts.tsx` — contact management
- `src/app/(dashboard)/accounts/[id]/components/RenewalForecast.tsx` — ARR/NRR forecast
- `src/app/(dashboard)/accounts/[id]/components/RenewalHandoff.tsx` — sales handoff button
- `src/app/api/renewals/route.ts` — CRUD for renewals
- `src/app/api/renewals/[id]/qbr/route.ts` — QBR save/load
- `src/app/api/renewals/[id]/checklist/route.ts` — checklist update
- `src/app/api/renewals/[id]/handoff/route.ts` — sales handoff trigger

---

## Padrões a Seguir

**Renewal Workspace Component:**
```typescript
// src/app/(dashboard)/accounts/[id]/components/RenewalWorkspace.tsx
export function RenewalWorkspace({ accountId }: { accountId: string }) {
  const { data: renewal } = useQuery({
    queryKey: ['renewal', accountId],
    queryFn: () => fetch(`/api/renewals?account_id=${accountId}`).then(r => r.json())
  });

  const statusColor = {
    upcoming: 'bg-yellow-100 text-yellow-800',
    in_progress: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    lost: 'bg-gray-100 text-gray-800'
  };

  return (
    <div className="renewal-workspace">
      <div className="status-banner">
        <span className={statusColor[renewal?.status]}>
          {renewal?.status.toUpperCase()}
        </span>
        <span className="days-until">
          {Math.ceil((new Date(renewal?.contract.expiry_date) - new Date()) / 86400000)} days until renewal
        </span>
      </div>

      <RenewalQBREditor renewal={renewal} />
      <RenewalChecklist renewal={renewal} />
      <RenewalContacts renewal={renewal} />
      <RenewalForecast renewal={renewal} />
      <RenewalHandoff renewal={renewal} />
    </div>
  );
}
```

**QBR Save Endpoint:**
```typescript
// src/app/api/renewals/[id]/qbr/route.ts
export async function PATCH(request, { params }) {
  const { qbrContent } = await request.json();
  
  const { error } = await supabase
    .from('renewals')
    .update({
      qbr_content: qbrContent,
      qbr_completed: true,
      updated_at: new Date()
    })
    .eq('id', params.id);

  if (error) return new Response(JSON.stringify(error), { status: 400 });
  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
```

**LLM:** No AI for this card, but QBR content can be reviewed by Gemini for completeness (F4+)

---

## Complexidade Estimada

**M (Médio)** — 1-1.5 sessões BMAD

- 6 componentes UI (Timeline, Workspace, QBREditor, Checklist, Contacts, Forecast, Handoff)
- 4 tables + indexes
- 3 API routes
- Testes: E2E (create renewal, fill QBR, mark checklist, handoff)

---

## Dependências

**Precisa que:**
- F1-01 Views Salvas (contacts list can use saved views)
- F4-04 Billing Integration (contract data)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Create renewal: contract expiry ± 120 days → auto-create renewal record
- [ ] F2 — Renewal status: upcoming / in_progress / critical based on days until expiry
- [ ] F3 — Timeline shows contract start, expiry, days remaining
- [ ] F4 — QBR editor: edit sections (exec summary, outcomes, metrics, risks, next steps)
- [ ] F5 — QBR auto-saves on input (no explicit save button needed)
- [ ] F6 — Checklist: 11 tasks, toggle completion checkbox → update completed_at/completed_by
- [ ] F7 — Contact management: add/remove customer contacts from renewal
- [ ] F8 — Contact email: send email template to selected contacts
- [ ] F9 — Forecast: input ARR/NRR/reason, save
- [ ] F10 — Sales handoff: click button → create task/Slack/email to sales team

### Edge Cases

- [ ] E1 — Contract with no renewal yet: auto-create when 120 days until expiry
- [ ] E2 — Multiple renewals for same account (multi-year contracts): each renewal separate
- [ ] E3 — No contacts on account: show "Nenhum contato", allow adding
- [ ] E4 — QBR section empty: still allows save (optional free-form)

### Performance

- [ ] P1 — Renewal workspace loads in < 1s
- [ ] P2 — QBR save (autosave): response < 500ms
- [ ] P3 — Checklist task toggle: instant visual, async API call

### Isolation

- [ ] T1 — CSM A doesn't see CSM B's renewals (RLS on account)
- [ ] T2 — Sales can see renewal only if account assigned/handed off to them

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Renewal Workflow:**
- [ ] F1-F4: Renewal creation + QBR editing
- [ ] F6: Checklist completion tracking
- [ ] F10: Sales handoff workflow
- [ ] T1-T2: Isolation verified

**Testes obrigatórios:**
```
E2E:
1. Account detail: navigate to "Renovação" tab
2. Verify renewal record created (or create manually)
3. Edit QBR: fill sections, verify auto-save
4. Checklist: toggle 5 tasks, verify checkboxes persist
5. Add contacts: select 2 contacts, send email template
6. Forecast: input ARR $50k, NRR 10%, save
7. Handoff: click "Transferir para Sales", verify Slack sent

Unit:
- Status calculation: correct color/label based on expiry date
- Checklist: completion timestamp recorded
- Forecast: ARR/NRR validation (must be positive)
```

**Fixtures:**
- 2 accounts with contracts expiring in 60 days, 30 days
- 5 contacts per account
- Predefined checklist tasks

---

## Estimativa de Tokens

- 6 UI components: ~700 tokens
- 4 API routes: ~400 tokens
- Database schema: ~200 tokens
- E2E tests: ~400 tokens
- **Total esperado:** 1.7k tokens por sessão BMAD

---

## Notas

1. **Auto-create renewals** — Cron job 120 days before contract expiry auto-creates renewal record
2. **QBR PDF export** — Can be added as secondary feature (use puppeteer or similar)
3. **Sales CRM integration** — F4-03 (HubSpot) can pass renewal ID to CRM opportunity
4. **Renewal history** — Store old renewals (archive = don't delete) for reference

---

## Links Relacionados

- Anterior: [F4-01 Portfolio Analytics](F4-01-portfolio-analytics.md)
- Próximo: [F4-03 HubSpot Integration](F4-03-hubspot-integration.md)
- Componentes: [_components-map.md](_components-map.md) → `RenewalWorkspace`, `RenewalQBREditor`
