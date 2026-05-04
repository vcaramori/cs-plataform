# F1-07: Urgency Scoring

## Contexto

CSM abre lista, vê 47 tickets. Qual é mais urgente? Prioridade pode estar errada (customer marked "low" mas é crítico). 

Urgency Scoring usa IA para rank tickets por urgência real: leva em conta age, customer sentiment, SLA proximity, e prioridade. Resultado: badge "Muito urgente" / "Urgente" / "Normal" na lista, CSM foca no que importa.

---

## Escopo

**É:**
- Score urgência por ticket via Gemini prompt
- Inputs: age (hours), priority, SLA status, sentiment (negativo/positivo), customer account size
- Output: urgency badge (high/medium/low)
- Display: coluna na lista com badge cor-coded
- Cache: per-ticket, invalidate on status/priority/sentiment change
- Batch job: daily recalculation (stale scores > 48h)
- Confidence: score only if confidence > 0.75

**Não é (MVP):**
- Custom urgency rules por account (F2)
- Predictive escalation (F3)
- Machine learning retraining (post-MVP)

---

## Decisões de Design (UX)

**Urgency Badge:**
- 🔴 Red: High urgency (high priority OR SLA at risk OR negative sentiment + age > 8h)
- 🟡 Yellow: Medium urgency (medium priority OR mild SLA concern OR neutral sentiment + age > 24h)
- 🟢 Green: Low urgency (low priority AND SLA ok AND positive sentiment OR age < 4h)
- Display in list: [icon + label] or just icon (depends on column width)

**On hover:** tooltip "Urgência: Alta — motivo: SLA em 2h, cliente frustrado"

**In preview/detail:** show scoring inputs + result

**Empty state:** if Gemini fails to score, show "?" (gray) with tooltip "Score não disponível"

---

## Schema / Migrações

**Coluna nova:**

```sql
ALTER TABLE support_tickets ADD COLUMN (
  urgency_score text DEFAULT NULL CHECK (urgency_score IN ('high', 'medium', 'low')),
  urgency_scored_at timestamptz DEFAULT NULL,
  urgency_reasoning jsonb DEFAULT NULL
);

CREATE INDEX idx_support_tickets_urgency_score ON support_tickets(urgency_score);
```

**urgency_reasoning exemplo:**
```json
{
  "factors": {
    "age_hours": 12,
    "priority": "high",
    "sla_status": "atencao",
    "sentiment": "negative",
    "account_size": "enterprise",
    "confidence": 0.92
  },
  "score": "high",
  "reasoning": "High priority, SLA in 2h, customer frustrated"
}
```

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/UrgencyBadge.tsx` — novo componente badge
- `src/app/(dashboard)/suporte/components/TicketListRow.tsx` — add urgency column
- `src/lib/services/urgencyScoring.service.ts` — Gemini prompt + scoring logic
- `src/app/api/urgency-score/route.ts` — POST para calcular score (on demand)
- `scripts/jobs/recalculate-urgency-scores.ts` — cron job (daily)
- `supabase/migrations/[timestamp]_add_urgency_scoring.sql`

---

## Padrões a Seguir

**LLM Integration:**
```typescript
// src/lib/services/urgencyScoring.service.ts
import { getGateway } from '@/lib/gateway';

async function calculateUrgency(ticket: SupportTicket): Promise<UrgencyResult> {
  const prompt = `
    Analyze ticket urgency:
    - Priority: ${ticket.priority}
    - Age: ${ticket.ageHours} hours
    - SLA Status: ${ticket.slaStatus}
    - Customer Sentiment: ${ticket.sentiment}
    - Account Size: ${ticket.accountSize}
    
    Score as: high, medium, or low
    Respond with JSON: { score: string, confidence: number, reasoning: string }
  `;

  const gateway = await getGateway();
  const response = await gateway.post('/llm/complete', {
    prompt,
    model: 'claude-opus' // or appropriate model
  });

  return JSON.parse(response.text);
}
```

**Cron job:** Use Next.js Background Jobs or external scheduler (later.sh, supabase functions)

---

## Complexidade Estimada

**P (Pequeno)** — 0.5-1 sessão BMAD

- Scoring logic (straightforward prompt)
- Badge component (simple UI)
- Cron job setup (standard pattern)

---

## Dependências

**Precisa que:** F1-01 (support_tickets), sentiment data (from F1-20 or external)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — New ticket gets urgency score calculated within 2 minutes
- [ ] F2 — High priority + SLA at risk = "High" badge
- [ ] F3 — Low priority + fresh + positive sentiment = "Low" badge
- [ ] F4 — List displays urgency column with colored badge
- [ ] F5 — Change priority → urgency score recalculates
- [ ] F6 — Close ticket → urgency score clears (or stops updating)
- [ ] F7 — Hover badge → tooltip with reasoning "Urgência alta: SLA em 2h, cliente frustrado"
- [ ] F8 — Confidence < 0.75 → show "?" badge (unavailable)
- [ ] F9 — Daily cron recalculates stale scores (> 48h old)
- [ ] F10 — Benchmark: 1000 tickets scored within 5 minutes

### Edge Cases

- [ ] E1 — Gemini timeout on score: gracefully set to NULL, retry daily
- [ ] E2 — Missing data (no sentiment yet): still score based on other factors
- [ ] E3 — User updates sentiment: urgency should recalculate
- [ ] E4 — Two concurrent score requests: prevent duplicate work (lock/flag)

### Performance

- [ ] P1 — Score calculation < 2s per ticket
- [ ] P2 — Badge render < 100ms
- [ ] P3 — List sort by urgency < 200ms (with 1000 tickets)

### Isolation

- [ ] T1 — Scoring isolates by org (RLS on ticket reads)
- [ ] T2 — CSM A doesn't see urgency for CSM B tickets

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para IA Feature:**
- [ ] F1-F4: Scoring end-to-end
- [ ] F8: Graceful fallback (? badge)
- [ ] P1: Latency < 2s per ticket

**Testes obrigatórios:**
```
E2E:
1. Create ticket (high priority, SLA at risk) → score "high" within 2min
2. Change priority to low → score updates to "low"
3. List sorts correctly by urgency

Unit:
- urgencyScoring.service: test 3 scenarios (high/medium/low)
- Confidence < 0.75 returns null
- Cron job test: mock 10 stale tickets, verify recalculation
```

**Fixtures:**
- 20 tickets with various priority/age/sentiment combinations
- Test dataset for LLM prompt validation

---

## Notas

1. **Sentiment dependency** — F1-20 (Sentiment Trend) computes sentiment. Se F1-20 not done, use placeholder (neutral).
2. **Cron scheduling** — usar Next.js API route + external cron (e.g., later.sh), ou Supabase Functions. MVP: simple setTimeout in dev.
3. **Confidence threshold** — 0.75 pode ser tuned depois baseado em accuracy metrics.
4. **Reasoning storage** — urgency_reasoning JSONB helpful para debugging + future audit trail.
5. **Cache invalidation** — on_ticket_update trigger should clear score, next read recalculates.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `UrgencyBadge`
- Decisões: [_decisions.md](_decisions.md) → LLM gateway
- Anterior: [F1-06 Detecção de Colisão](F1-06-deteccao-colisao.md)
- Próximo: [F1-08 Reopen Automático](F1-08-reopen-automatico.md)
