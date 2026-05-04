# F3-03: Success Plans MVP

## Contexto

CSM creates success plan for customer: "Q1 goals: adoption 40%, SLA < 5%, NPS > 8". Shares as shared doc/email. Lacks visibility, no progress tracking. Success Plans MVP: playbook-based plan shared via public link, embeddable iframe, RAG integration shows relevant docs.

---

## Escopo

**É:**
- Success plan: template with goals, milestones, actions
- Created from playbook (F3-01) or manual entry
- Shared via public link (no auth required)
- Embedded iframe: customer can view progress
- RAG integration (F1-17): suggest resources/docs per goal
- Progress tracking: CSM marks milestones complete
- Visibility: customer sees CSM's commitments

**Não é (MVP):**
- Collaboration (customer edits — F3+)
- Video tutorials embedded (F3+)
- Signature/approval workflow (F3+)
- Multiple versions/templates (F3+)

---

## Decisões de Design (UX)

**Plan Creation:**
- Form: goals, milestones, owner, due date
- Template options: "Enterprise Onboarding", "Adoption Boost", etc (hardcoded)
- Save → generates shareable link

**Shared Link:**
- Public URL: `/public/success-plans/[token]`
- No auth required
- Shows: goals, progress, milestones, timeline
- Customer can see CSM progress (read-only)
- Embeddable: iframe for customer portal

**Progress Tracking:**
- CSM marks milestones "In Progress" → "Complete"
- Timeline shows actual completion dates
- Customer sees real-time updates

**RAG Integration:**
- Per milestone: "Suggested resources" section
- Uses F1-17 RAG to find docs/tickets related to goal
- Links to knowledge base

---

## Schema / Migrações

**Tabela nova:**

```sql
CREATE TABLE success_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  title text NOT NULL,
  description text,
  shared_token uuid DEFAULT gen_random_uuid() UNIQUE,
  shared_at timestamptz,
  template_type text, -- 'enterprise_onboarding', 'adoption_boost', etc
  metadata jsonb, -- goals, milestones, etc
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE success_plan_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES success_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  due_date date,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'failed')),
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_success_plans_account ON success_plans(account_id);
CREATE INDEX idx_success_plans_shared_token ON success_plans(shared_token);
CREATE INDEX idx_success_plan_milestones_plan ON success_plan_milestones(plan_id);
```

---

## Arquivos Afetados

- `src/app/(dashboard)/accounts/[id]/components/SuccessPlanSection.tsx` — CSM view
- `src/app/(dashboard)/success-plans/page.tsx` — success plans list (future)
- `src/app/public/success-plans/[token]/page.tsx` — public shared view
- `src/lib/services/successPlanService.ts` — CRUD + RAG integration
- `src/app/api/success-plans/route.ts` — POST create, GET list
- `src/app/api/success-plans/[id]/route.ts` — PATCH update
- `src/app/api/success-plans/[id]/share/route.ts` — generate share link
- `src/app/api/public/success-plans/[token]/route.ts` — public API
- `src/app/api/success-plans/[id]/rag-suggestions/route.ts` — RAG endpoints per milestone

---

## Padrões a Seguir

**Success Plan Creation:**
```typescript
// src/lib/services/successPlanService.ts
export async function createSuccessPlan(plan: {
  accountId: string;
  title: string;
  templateType: string;
  milestones: Array<{ title: string; dueDate: Date }>;
}) {
  const supabase = createClient(url, key);

  // Create plan
  const { data: newPlan } = await supabase
    .from('success_plans')
    .insert({
      account_id: plan.accountId,
      title: plan.title,
      template_type: plan.templateType,
      status: 'draft'
    })
    .select()
    .single();

  // Create milestones
  for (const milestone of plan.milestones) {
    await supabase.from('success_plan_milestones').insert({
      plan_id: newPlan.id,
      title: milestone.title,
      due_date: milestone.dueDate
    });
  }

  return newPlan;
}

export async function shareSuccessPlan(planId: string) {
  const supabase = createClient(url, key);

  const { data } = await supabase
    .from('success_plans')
    .update({ shared_at: new Date(), status: 'active' })
    .eq('id', planId)
    .select()
    .single();

  return `${process.env.NEXT_PUBLIC_URL}/public/success-plans/${data.shared_token}`;
}
```

**Public Shared View:**
```typescript
// src/app/public/success-plans/[token]/page.tsx
export async function SuccessPlanPublicView({ params }) {
  const plan = await getSuccessPlanByToken(params.token);

  return (
    <div className="success-plan-view">
      <h1>{plan.title}</h1>
      <p>{plan.description}</p>

      <section className="milestones">
        <h2>Milestones</h2>
        {plan.milestones.map(m => (
          <div key={m.id} className={`milestone milestone-${m.status}`}>
            <h3>{m.title}</h3>
            <p>Due: {formatDate(m.due_date)}</p>
            <p>Status: {m.status}</p>
            {m.status === 'completed' && <p>Completed: {formatDate(m.completed_at)}</p>}
          </div>
        ))}
      </section>

      <section className="timeline">
        <h2>Progress Timeline</h2>
        {/* Milestones as timeline */}
      </section>
    </div>
  );
}
```

**RAG Suggestions (Per Milestone):**
```typescript
// src/app/api/success-plans/[id]/rag-suggestions/route.ts
export async function GET(request, { params }) {
  const { milestone_id } = request.nextUrl.searchParams;

  const milestone = await getMilestone(milestone_id);

  // Use RAG to find relevant docs
  const suggestions = await generateRAGSuggestions(milestone.title);

  return new Response(JSON.stringify(suggestions), { status: 200 });
}
```

**LLM:** Reuses F1-17 RAG for suggestions

---

## Complexidade Estimada

**M (Médio)** — 1 sessão BMAD

- Plan CRUD operations
- Share link generation + public view
- Milestone progress tracking
- RAG integration (reuses F1-17)

---

## Dependências

**Precisa que:** F1-17 (RAG), F3-01 (playbook templates optional)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — CSM creates success plan (title, goals, milestones)
- [ ] F2 — CSM shares plan → generates public shareable link
- [ ] F3 — Public link accessible without auth
- [ ] F4 — Public view shows plan goals, milestones, progress
- [ ] F5 — CSM marks milestone "In Progress" → visible in public view
- [ ] F6 — CSM marks milestone "Completed" → shows completion date
- [ ] F7 — Per milestone: RAG shows "Suggested resources" (linked docs)
- [ ] F8 — Embeddable iframe: `/public/success-plans/[token]?embed=true`
- [ ] F9 — Plan status: draft → active on share, completed when all milestones done
- [ ] F10 — Archive plan: hides from active list, link still works (read-only)

### Edge Cases

- [ ] E1 — Plan with 0 milestones: valid (flexible template)
- [ ] E2 — Milestone due date in past: shown with warning
- [ ] E3 — RAG no suggestions found: show "No suggestions available"
- [ ] E4 — Customer accesses deleted plan: 404 error
- [ ] E5 — Share link expires (future): optional feature (MVP = no expiry)

### Performance

- [ ] P1 — Public plan view loads in < 1s (cached)
- [ ] P2 — RAG suggestions load in < 3s
- [ ] P3 — Create plan < 1s

### Isolation

- [ ] T1 — Public plan URL doesn't expose account details (token-based)
- [ ] T2 — CSM A can't edit CSM B plan (unless shared explicitly)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Shared/Public Feature:**
- [ ] F1-F3: Plan creation + sharing end-to-end
- [ ] F4-F7: Public view + RAG complete
- [ ] T1-T2: Access control verified

**Testes obrigatórios:**
```
E2E:
1. Create success plan with 3 milestones
2. Share → generate link
3. Access link (no auth) → public view shows all content
4. Mark milestone complete in CSM view
5. Refresh public view → completion visible
6. Check RAG suggestions per milestone

Unit:
- Plan CRUD: create, update, delete
- Share link: token generation unique
- Public view: read-only (no edits)

Public access:
- Auth not required
- Account/CSM details not exposed
- Proper error handling (404 on invalid token)
```

**Fixtures:**
- 2 predefined templates (Enterprise Onboarding, Adoption Boost)
- Sample success plan with 5 milestones

---

## Notas

1. **Template system** — hardcoded MVP templates:
   - Enterprise Onboarding: goals + 10 milestones
   - Adoption Boost: goals + 6 milestones
   - Custom: user-defined (future)

2. **RAG context** — F1-17 already does RAG. Reuse same service:
   - For each milestone, search knowledge base + similar tickets
   - Return top 3 resources

3. **Public sharing strategy** — token-based (random UUID):
   - Secure: not enumerable
   - No expiry (MVP), can be revoked by CSM
   - Can be embedded in customer portal (iframe)

4. **Collaboration** — F3+ can add:
   - Customer can mark milestones complete (CSM approves)
   - Comments/discussion per milestone
   - Customer signature of plan

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `SuccessPlanSection`, public view
- Anterior: [F3-02 Motor de Alertas Proativos](F3-02-motor-alertas.md)
- Próximo: [F4-01 Portfolio Analytics](../fase4/F4-01-portfolio-analytics.md)
