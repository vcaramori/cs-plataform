# F1-18: Categorização Automática

## Contexto

New tickets arrive. Each one needs a category: Technical, Billing, Feature Request, Bug, Other. CSM manually selects every time. Auto-categorization uses Gemini to classify — "What type is this?" — in 1 second. CSM can override (AIBadge that's rejectable).

---

## Escopo

**É:**
- Auto-categorize new tickets on creation via Gemini LLM
- Categories: technical, billing, feature_request, bug, other
- Store in support_tickets.category column
- Display in list as rejectable AIBadge
- Confidence threshold: >= 0.75 to show category badge, else "uncategorized"
- Batch E2E test: 20 tickets with known categories, verify accuracy
- CSM can override: click badge → dropdown to change category
- Log change: ticket_events if category changed by CSM

**Não é (MVP):**
- Custom categories per account (F2)
- Category templates/actions (F2)
- Subcategories (F2)

---

## Decisões de Design (UX)

**Auto-Categorization Flow:**
1. New ticket created (status='open', category=NULL, confidence=NULL)
2. Async: call Gemini "Categorize this ticket: [subject + description]"
3. Response: { category: 'technical', confidence: 0.92 }
4. If confidence >= 0.75: store category + confidence
5. Else: set category='uncategorized'
6. UI shows badge on list

**Category Badge in List:**
- Display: colored badge with category name (or icon)
- Colors:
  - 🔵 Technical (blue)
  - 💳 Billing (green)
  - ⭐ Feature Request (purple)
  - 🐛 Bug (red)
  - ⚪ Other (gray)
  - ❓ Uncategorized (light gray)
- Hover: tooltip "AI classified as [category] (92% confidence)"
- Click: opens dropdown to change category

**Override:**
- Click badge → dropdown with options
- Select new category → updates category + logs event_type='category_changed'
- AI badge persists (shows "was classified as [original]")

**Edit in Detail:**
- Ticket detail has category field (read-only badge) + override button
- Shows: AI classification + CSM's actual category (if overridden)

---

## Schema / Migrações

**Coluna nova:**

```sql
ALTER TABLE support_tickets ADD COLUMN (
  category text CHECK (category IN ('technical', 'billing', 'feature_request', 'bug', 'other', 'uncategorized')),
  category_confidence float, -- 0-1, confidence of categorization
  category_ai_suggestion text, -- original AI suggestion (for audit)
  category_overridden_at timestamptz, -- timestamp if CSM changed category
  category_overridden_by uuid REFERENCES auth.users(id)
);

CREATE INDEX idx_support_tickets_category ON support_tickets(category);
```

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/CategoryBadge.tsx` — nuevo componente badge (rejectable)
- `src/app/(dashboard)/suporte/components/TicketListRow.tsx` — render category column
- `src/lib/services/categorizationService.ts` — Gemini categorization logic
- `src/app/api/tickets/[id]/category/route.ts` — PATCH to update category
- `src/lib/prompts/categorizationPrompt.ts` — system + user prompt

---

## Padrões a Seguir

**Categorization Service:**
```typescript
// src/lib/services/categorizationService.ts
import { getGateway } from '@/lib/gateway';

export async function categorizeTicket(ticket: {
  subject: string;
  description: string;
}): Promise<{ category: string; confidence: number }> {
  const gateway = await getGateway();
  
  const response = await gateway.post('/llm/complete', {
    system: categorizationPrompt.system,
    user: categorizationPrompt.user(ticket),
    model: 'claude-opus',
    temperature: 0.3 // lower temp for consistent classification
  });

  try {
    const result = JSON.parse(response.text);
    return {
      category: result.category || 'other',
      confidence: result.confidence || 0
    };
  } catch (e) {
    console.error('Categorization parse error:', e);
    return { category: 'uncategorized', confidence: 0 };
  }
}
```

**Categorization Prompt:**
```typescript
// src/lib/prompts/categorizationPrompt.ts
export const categorizationPrompt = {
  system: `You are a support ticket categorizer. Classify the ticket into exactly one category: technical, billing, feature_request, bug, or other. Respond with JSON: {"category": "...", "confidence": 0.0-1.0}`,
  user: (ticket) => `
    Subject: ${ticket.subject}
    Description: ${ticket.description}

    Categorize this ticket. Return JSON with category and confidence (0-1).
  `
};
```

**Category Badge Component:**
```typescript
// src/app/(dashboard)/suporte/components/CategoryBadge.tsx
export function CategoryBadge({
  category,
  confidence,
  onOverride
}: {
  category: string;
  confidence?: number;
  onOverride?: (newCategory: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`badge badge-${category}`}
        title={`AI classified (${(confidence * 100).toFixed(0)}%)`}
      >
        {categoryLabel[category]}
      </button>
      {isOpen && (
        <div className="dropdown-menu">
          {Object.keys(categoryLabel).map(cat => (
            <button
              key={cat}
              onClick={() => {
                onOverride?.(cat);
                setIsOpen(false);
              }}
            >
              {categoryLabel[cat]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**LLM:** Gemini or Claude, temperature 0.3 (deterministic)

---

## Complexidade Estimada

**P (Pequeno)** — 0.5-1 sessão BMAD

- Categorization logic + prompt (straightforward)
- Badge component (simple UI)
- Override endpoint (PATCH)
- Event logging (reuses pattern)

---

## Dependências

**Precisa que:** F1-01 (support_tickets), gateway LLM configured

**Bloqueia:** Nenhum (optional feature, standalone)

---

## Critérios de Aceite

### Funcional

- [ ] F1 — New ticket auto-categorized within 2s
- [ ] F2 — Category badge displayed in list (colored by category)
- [ ] F3 — Confidence >= 0.75: show category, < 0.75: show "uncategorized"
- [ ] F4 — Hover badge → tooltip "AI classified as [category] (92% confidence)"
- [ ] F5 — Click badge → dropdown with category options
- [ ] F6 — Select new category → updates category, logs event
- [ ] F7 — Ticket detail shows category badge + override button
- [ ] F8 — Override sets category_overridden_at + category_overridden_by
- [ ] F9 — Accuracy: test dataset 20 tickets, >= 80% correct (benchmark)
- [ ] F10 — Error: Gemini fails → category='uncategorized', no failure

### Edge Cases

- [ ] E1 — Ticket with empty description: still categorize (use subject only)
- [ ] E2 — Very long description (5000+ chars): truncate to 1000 before sending
- [ ] E3 — Subject ambiguous (e.g. "Help"): returns "other" or high confidence?
- [ ] E4 — Multiple tickets same subject: consistent categorization? (not guaranteed)
- [ ] E5 — CSM overrides category, then ticket is reopened: category persists

### Performance

- [ ] P1 — Categorization < 2s per ticket (async, don't block creation)
- [ ] P2 — Badge render < 100ms
- [ ] P3 — Override action < 1s

### Isolation

- [ ] T1 — Categorization respects ticket visibility (RLS)
- [ ] T2 — CSM A overrides ticket of CSM B (if same account): allowed

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para IA Feature:**
- [ ] F1-F4: Auto-categorization end-to-end
- [ ] F9: Accuracy >= 80% on test dataset
- [ ] P1: Async, non-blocking categorization

**Testes obrigatórios:**
```
E2E:
1. Create ticket (known category)
2. Wait 2s for categorization
3. Verify category badge appears
4. Click badge, override category
5. Verify override logged in ticket_events

Unit:
- Categorization service: test 5 scenarios (technical, billing, bug, etc)
- Badge component: color coding correct
- Confidence threshold: >= 0.75 shows category

Accuracy test:
- 20 manually-labeled tickets
- Run categorization on each
- Compare to labels, calculate accuracy
- Target: >= 80%
```

**Fixtures:**
- 20 sample tickets with known categories
- Mix: technical (DB errors, integration issues)
- Billing (payment, invoice, plan)
- Feature request (enhancement, new feature)
- Bug (crash, data loss)
- Other (miscellaneous)

---

## Notas

1. **Prompt tuning** — initial prompt is generic. May need:
   - Category definitions (what counts as "technical"?)
   - Examples (few-shot learning — F2)
   - Temperature: 0.3 for consistent results

2. **Accuracy benchmark** — 80% is MVP target. Post-launch:
   - Collect CSM overrides (where AI was wrong)
   - Analyze patterns
   - Refine prompt or add training data

3. **Async categorization** — call in background (don't block ticket creation).
   - Use background job or edge function
   - Retry on failure (3 attempts)

4. **Confidence filtering** — 0.75 threshold:
   - If model says 0.92 → show
   - If model says 0.68 → show "uncategorized"
   - Tunable post-MVP based on false positive rate

5. **Batch training** — F2 can add:
   - Fine-tune model on company's categorized tickets
   - Custom categories per account
   - Category-specific actions (auto-assign to team)

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `CategoryBadge`
- Decisões: [_decisions.md](_decisions.md) → LLM gateway
- Anterior: [F1-17 "O que Responder?" RAG](F1-17-rag-sugestoes.md)
- Próximo: [F1-19 Resumo do Ticket](F1-19-resumo-ticket.md)
