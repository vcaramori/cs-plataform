# F1-17: "O que Responder?" RAG

## Contexto

CSM reads ticket: "How do I backup my database?" CSM needs to compose response. She searches Google, finds docs, synthesizes. Takes 10 minutes. With RAG, CSM clicks "Sugerir resposta", system retrieves similar tickets + docs, Gemini generates suggestion in 2 seconds.

RAG (Retrieval-Augmented Generation) combines semantic search (F1-04 embeddings) + LLM generation (Gemini) to suggest contextual responses.

---

## Escopo

**É:**
- Button in ticket detail: "Sugerir resposta"
- Backend: retrieve similar closed tickets + knowledge base docs (vector search)
- Generation: call Gemini with context (ticket + similar cases)
- UI: modal with suggested response (marked "Sugestão IA")
- Actions: copy, edit, reject, or send
- Trace logging: every suggestion call logged for auditability
- Fallback: if Gemini fails, show generic "Sugestão indisponível"

**Não é (MVP):**
- Knowledge base management (use existing docs/FAQ — F2 expands)
- Fine-tuning model on company data (F3)
- A/B testing suggestions (F2)
- Feedback loop (user rates suggestion — F2)

---

## Decisões de Design (UX)

**Suggest Action:**
- Button in ticket detail: "Sugerir resposta" (or via "/" command in reply composer — F2)
- Icon: 💡
- Color: secondary button

**Suggestion Modal:**
- Title: "Sugestão de Resposta"
- Content: suggested reply text
- Header badge: "Sugestão gerada pela IA — revise antes de enviar"
- Actions:
  - Copy (to clipboard)
  - Edit (open in reply composer)
  - Send (post immediately as reply)
  - Reject (close, don't use)
- Loading state: spinner with "Analisando contexto..."
- Error state: "Sugestão não disponível. Tente novamente." with retry button

**Generation Context:**
- Include: current ticket (description + replies), similar tickets (top 3), customer profile
- Limit context: token budget ~2000 tokens (stay within model limits)

**Trace Logging:**
- Every suggestion call logged: ticket_id, model_call_id, timestamp, user_id
- Links to: ticket_events or separate suggestion_traces table
- Used for: auditing, improving prompts, user training

---

## Schema / Migrações

**Tabela nova (optional, for audit):**

```sql
CREATE TABLE ai_suggestion_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id),
  suggestion_type text DEFAULT 'response', -- 'response', 'summary', etc
  user_id uuid NOT NULL REFERENCES auth.users(id),
  model_call_id text, -- Gemini request ID
  prompt_tokens int,
  response_tokens int,
  context_sources jsonb, -- which tickets/docs used
  generated_response text,
  user_feedback text, -- 'sent', 'edited', 'rejected'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ai_suggestion_traces_ticket ON ai_suggestion_traces(ticket_id);
CREATE INDEX idx_ai_suggestion_traces_user ON ai_suggestion_traces(user_id);
```

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/SuggestResponseButton.tsx` — button + trigger
- `src/app/(dashboard)/suporte/components/SuggestedResponseModal.tsx` — modal + display
- `src/app/api/suggestions/response/route.ts` — POST generate suggestion
- `src/lib/services/ragService.ts` — retrieval + context building
- `src/lib/services/suggestionService.ts` — Gemini call + formatting
- `src/lib/prompts/responsePrompt.ts` — system + user prompt template
- `supabase/migrations/[timestamp]_create_ai_suggestion_traces.sql` — optional

---

## Padrões a Seguir

**Suggestion Endpoint:**
```typescript
// src/app/api/suggestions/response/route.ts
export async function POST(request: Request) {
  const { ticketId } = await request.json();

  try {
    // 1. Fetch ticket context
    const ticket = await getTicket(ticketId);
    
    // 2. Retrieve similar closed tickets (vector search, top 3)
    const similar = await searchSimilarTickets(ticket.description, {
      limit: 3,
      excludeTicketId: ticketId,
      whereStatus: 'closed'
    });

    // 3. Build context
    const context = {
      current_ticket: ticket.description + ticket.replies,
      similar_cases: similar.map(t => `${t.subject}: ${t.resolution}`),
      customer_profile: { account: ticket.account_id, industry: ticket.industry }
    };

    // 4. Call Gemini with RAG prompt
    const gateway = await getGateway();
    const response = await gateway.post('/llm/complete', {
      system: responsePrompt.system,
      user: responsePrompt.user(context),
      model: 'claude-opus'
    });

    // 5. Log trace
    await logSuggestionTrace({
      ticket_id: ticketId,
      suggestion_type: 'response',
      generated_response: response.text,
      context_sources: similar.map(t => t.id)
    });

    return new Response(JSON.stringify({ suggestion: response.text }), { status: 200 });
  } catch (error) {
    console.error('Suggestion error:', error);
    return new Response(JSON.stringify({ error: 'Sugestão indisponível' }), { status: 500 });
  }
}
```

**RAG Prompt:**
```typescript
// src/lib/prompts/responsePrompt.ts
export const responsePrompt = {
  system: `You are a helpful customer support assistant. Generate a professional, empathetic response to the customer's question. Keep it concise (under 200 words). Use information from similar resolved cases to inform your answer.`,
  user: (context) => `
    CURRENT TICKET:
    ${context.current_ticket}

    SIMILAR RESOLVED CASES (for reference):
    ${context.similar_cases.join('\n')}

    CUSTOMER PROFILE:
    Account: ${context.customer_profile.account}
    Industry: ${context.customer_profile.industry}

    Generate a concise, professional response to the customer's question.
  `
};
```

**LLM Integration:**
- Model: Claude Opus (or Gemini if preferred)
- Token budget: ~2000 tokens (1000 input, 500 output, 500 buffer)
- Temperature: 0.7 (balanced creativity/consistency)
- Timeout: 10s

---

## Complexidade Estimada

**M (Médio)** — 1 sessão BMAD

- RAG context retrieval (uses F1-04 similarity search)
- LLM integration (straightforward gateway call)
- Modal UI (displays text with copy/send actions)
- Prompt engineering (iterative tuning)

---

## Dependências

**Precisa que:** F1-04 (embeddings + similarity search), gateway Gemini/Claude

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Open ticket, click "Sugerir resposta" → modal opens
- [ ] F2 — Modal shows loading spinner + "Analisando contexto..."
- [ ] F3 — Suggestion appears: relevant response to customer's question
- [ ] F4 — Modal header shows "Sugestão gerada pela IA — revise antes de enviar"
- [ ] F5 — Click "Copy" → response copied to clipboard
- [ ] F6 — Click "Edit" → open reply composer with suggestion pre-filled
- [ ] F7 — Click "Send" → suggestion posted as reply (with IA badge)
- [ ] F8 — Click "Reject" → modal closes, suggestion discarded
- [ ] F9 — On error (Gemini timeout): show "Sugestão indisponível" + retry button
- [ ] F10 — Every suggestion call logged to ai_suggestion_traces with trace ID

### Edge Cases

- [ ] E1 — Ticket with < 20 tokens description: still generate (use short context)
- [ ] E2 — No similar tickets found: RAG with just ticket context (graceful)
- [ ] E3 — Gemini timeout (> 10s): show error, don't hang
- [ ] E4 — User rejects 5 suggestions: no pattern matching (don't learn from rejection)
- [ ] E5 — CSM edits suggestion before sending: still logged as "edited" in traces

### Performance

- [ ] P1 — Suggestion generated < 5s (including retrieval + Gemini)
- [ ] P2 — Modal loads < 1s (skeleton/placeholder)
- [ ] P3 — Token count tracked (ensure < model limits)

### Isolation

- [ ] T1 — Suggestion only visible to CSM who requested it (not public)
- [ ] T2 — RAG context respects RLS (similar tickets from same account only)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para IA Feature + RAG:**
- [ ] F1-F4: Suggestion generation end-to-end
- [ ] F9-F10: Error handling + audit logging
- [ ] P1-P2: Latency acceptable for user experience

**Testes obrigatórios:**
```
E2E:
1. Open ticket, click "Sugerir resposta"
2. Modal loads, suggestion appears
3. Click "Send" → suggestion posted as reply
4. Verify ai_suggestion_traces logged
5. Error case: mock Gemini timeout → show error + retry works

Unit:
- RAG context building: includes ticket + similar + customer
- Token budget: suggestion < 2000 tokens
- Prompt format: user readable, clear instructions

Prompt testing:
- Benchmark: 10 diverse tickets, human review quality (subjective)
- Tone: professional, empathetic, concise
```

**Fixtures:**
- 10 sample tickets (mix of technical, billing, feature requests)
- 5 similar closed tickets per sample (for RAG)
- Mock Gemini responses (for unit tests)

---

## Notas

1. **Prompt tuning** — initial prompt is template. Will need iterative refinement:
   - Test with diverse ticket types
   - Measure CSM satisfaction (F2: add feedback button)
   - Adjust tone/length based on feedback

2. **Context retrieval** — hybrid approach:
   - Vector search: get semantically similar tickets
   - BM25: get keyword-matching tickets
   - Combine top K from each (diversity)

3. **Model selection** — Claude Opus vs Gemini:
   - Opus: better reasoning, costlier
   - Gemini: faster, cheaper
   - MVP: try both, measure latency + quality

4. **Fine-tuning future** — F3 can collect suggestion traces, fine-tune model on accepted suggestions.

5. **Hallucination risk** — LLM may invent facts. Mitigate:
   - Badge "Sugestão IA — revise antes"
   - Ground truth: only use existing tickets + docs
   - Monitor rejection rate

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `SuggestResponseButton`, `SuggestedResponseModal`
- Decisões: [_decisions.md](_decisions.md) → LLM gateway, embeddings
- Anterior: [F1-16 Escalonamento SLA](F1-16-escalonamento-sla.md)
- Próximo: [F1-18 Categorização Automática](F1-18-categorizacao-automatica.md)
