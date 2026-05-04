# F1-19: Resumo do Ticket

## Contexto

CSM opens ticket with 15 replies spanning 2 weeks. Needs to understand context quickly. Instead of reading 3000 words, see AI summary: "Customer had DB timeout, tried workaround, still fails, needs escalation."

Summary section appears above timeline in ticket detail. Generated via Gemini on first view, cached, regenerate button available.

---

## Escopo

**É:**
- Summary section in ticket detail (above timeline)
- Generated via Gemini: "Summarize this ticket in 1-2 sentences"
- Display: marked as "Resumo gerado pela IA"
- Cache: per-ticket, invalidate when new reply added
- UI: read-only text + regenerate button
- On regenerate: show spinner, replace text
- Context: subject + all replies (latest 10 or all if < 10)

**Não é (MVP):**
- Customizable summary style (formal/casual — F2)
- Multi-language summaries (F2)
- Summary in list view (F2)
- Exportable summary (F2)

---

## Decisões de Design (UX)

**Summary Display:**
- Section: above timeline, below ticket header
- Card styling: `bg-surface-card`, padding, subtle border
- Header: "Resumo" + icon 📝
- Badge: "Gerado pela IA"
- Content: 1-2 sentence summary (max 200 chars)
- Button: "Regenerar" (outline button, right side)

**On Regenerate:**
- Click → spinner appears
- Call Gemini (async)
- Replace text with new summary
- Toast: "Resumo atualizado"
- Fade-in animation for new text

**Empty State:**
- If summary generation fails: show "Resumo não disponível" + retry button
- Graceful fallback: don't block ticket detail

**Caching:**
- Store summary in DB: `support_tickets.summary` (text field)
- TTL: none (persist until invalidated)
- Invalidation: on new reply added, set summary=NULL
- Lazy regeneration: on next ticket view, if summary=NULL, generate

---

## Schema / Migrações

**Coluna nova:**

```sql
ALTER TABLE support_tickets ADD COLUMN (
  summary text,
  summary_generated_at timestamptz,
  summary_source text DEFAULT 'ai' -- 'ai', 'customer' (future)
);

CREATE INDEX idx_support_tickets_summary_generated_at ON support_tickets(summary_generated_at);
```

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/TicketSummary.tsx` — nuevo componente
- `src/app/(dashboard)/suporte/components/TicketDetail.tsx` — render summary section
- `src/lib/services/summaryService.ts` — Gemini summary generation
- `src/app/api/tickets/[id]/summary/route.ts` — GET summary (with lazy generation), POST regenerate
- `src/lib/prompts/summaryPrompt.ts` — system + user prompt
- `supabase/migrations/[timestamp]_add_summary_to_tickets.sql`

---

## Padrões a Seguir

**Summary Service:**
```typescript
// src/lib/services/summaryService.ts
export async function generateSummary(ticket: {
  subject: string;
  description: string;
  replies: Array<{ author: string; text: string; created_at: Date }>;
}): Promise<string> {
  const gateway = await getGateway();

  // Format context
  const context = `
    SUBJECT: ${ticket.subject}
    
    DESCRIPTION: ${ticket.description}
    
    REPLIES:
    ${ticket.replies.slice(-10).map(r => `[${r.created_at}] ${r.author}: ${r.text}`).join('\n')}
  `;

  const response = await gateway.post('/llm/complete', {
    system: summaryPrompt.system,
    user: summaryPrompt.user(context),
    model: 'claude-opus',
    temperature: 0.5
  });

  return response.text.trim();
}
```

**Summary Prompt:**
```typescript
// src/lib/prompts/summaryPrompt.ts
export const summaryPrompt = {
  system: `You are a ticket summarization expert. Summarize the support ticket in 1-2 sentences. Be concise and capture the key issue and resolution status.`,
  user: (context) => `
    Summarize this ticket in 1-2 sentences:
    
    ${context}
  `
};
```

**Summary Endpoint:**
```typescript
// src/app/api/tickets/[id]/summary/route.ts
export async function GET(request, { params }) {
  const ticket = await getTicket(params.id);

  // If summary cached, return it
  if (ticket.summary && ticket.summary_generated_at) {
    return new Response(JSON.stringify({ summary: ticket.summary }), { status: 200 });
  }

  // Otherwise, generate lazily
  const summary = await generateSummary(ticket);
  
  // Cache in DB
  await updateTicket(params.id, {
    summary,
    summary_generated_at: new Date()
  });

  return new Response(JSON.stringify({ summary }), { status: 200 });
}

export async function POST(request, { params }) {
  // Regenerate endpoint
  const ticket = await getTicket(params.id);
  const summary = await generateSummary(ticket);

  await updateTicket(params.id, {
    summary,
    summary_generated_at: new Date()
  });

  return new Response(JSON.stringify({ summary }), { status: 200 });
}
```

**Component:**
```typescript
// src/app/(dashboard)/suporte/components/TicketSummary.tsx
export function TicketSummary({ ticketId }: { ticketId: string }) {
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      setLoading(true);
      const res = await fetch(`/api/tickets/${ticketId}/summary`);
      const data = await res.json();
      setSummary(data.summary);
      setLoading(false);
    };
    fetchSummary();
  }, [ticketId]);

  const handleRegenerate = async () => {
    setLoading(true);
    const res = await fetch(`/api/tickets/${ticketId}/summary`, { method: 'POST' });
    const data = await res.json();
    setSummary(data.summary);
    setLoading(false);
  };

  return (
    <div className="summary-card bg-surface-card p-4 mb-4 rounded border border-border-divider">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-semibold">Resumo</h3>
          <p className="text-xs text-foreground-secondary">Gerado pela IA</p>
        </div>
        <button onClick={handleRegenerate} disabled={loading} className="btn btn-sm btn-outline">
          {loading ? 'Regenerando...' : 'Regenerar'}
        </button>
      </div>
      {loading && <div className="spinner mt-2" />}
      {!loading && <p className="mt-2 text-sm">{summary}</p>}
    </div>
  );
}
```

**LLM:** Claude Opus, temperature 0.5 (balanced)

---

## Complexidade Estimada

**P (Pequeno)** — 0.5 sessões BMAD

- Summary generation logic (straightforward)
- Component (simple display + regenerate)
- Caching (update ticket field)
- Invalidation (on reply add)

---

## Dependências

**Precisa que:** F1-01 (support_tickets, ticket replies)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Open ticket → summary section appears above timeline
- [ ] F2 — First view: summary is generated (call Gemini)
- [ ] F3 — Summary is 1-2 sentences, < 200 chars
- [ ] F4 — Badge shows "Gerado pela IA"
- [ ] F5 — Click "Regenerar" → spinner appears
- [ ] F6 — Spinner finishes → new summary displayed (fade-in)
- [ ] F7 — Add new reply to ticket → summary clears (invalidated)
- [ ] F8 — Refresh page → summary regenerated (lazy)
- [ ] F9 — Error: Gemini fails → show "Resumo não disponível" + retry
- [ ] F10 — Summary cached in DB, subsequent views don't call Gemini

### Edge Cases

- [ ] E1 — Ticket with 0 replies (only description): still summarize
- [ ] E2 — 50+ replies: use last 10 (avoid token overflow)
- [ ] E3 — Ticket with attachments/images: ignore, summarize text only
- [ ] E4 — Very long description (5000+ chars): truncate intelligently before summarizing
- [ ] E5 — Ticket in different language (Portuguese mixed with English): handle gracefully

### Performance

- [ ] P1 — First summary generation < 5s (including Gemini call)
- [ ] P2 — Cached summary display < 500ms
- [ ] P3 — Regenerate button < 5s
- [ ] P4 — Component render < 200ms (with cached summary)

### Isolation

- [ ] T1 — Summary visible only to CSMs with ticket access (RLS)
- [ ] T2 — CSM A can't access summary of CSM B ticket (if private)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para IA Feature + Caching:**
- [ ] F1-F6: Summary generation + display end-to-end
- [ ] F7-F8: Cache invalidation + lazy regeneration
- [ ] P1-P3: Latency acceptable

**Testes obrigatórios:**
```
E2E:
1. Open ticket (no summary) → wait 5s → summary appears
2. Click "Regenerar" → new summary appears
3. Add reply → summary clears
4. Refresh page → summary regenerated
5. Error case: mock Gemini failure → show fallback + retry works

Unit:
- summaryService: test with 3 sample tickets
- Component: render with/without summary
- Cache invalidation: triggered on new reply

Integration:
- Lazy generation: first GET with null summary triggers generation
- Caching: second GET returns cached value (no Gemini call)
```

**Fixtures:**
- 3 sample tickets with 5-20 replies each
- Mix: technical, billing, feature request

---

## Notas

1. **Prompt quality** — initial prompt is generic. May need:
   - Category-specific summaries (technical vs billing)
   - Tone (professional, concise, empathetic)
   - Benchmark on real tickets

2. **Context limit** — Gemini has token limits. Current approach:
   - Use last 10 replies (covers recent context)
   - Truncate very long texts (subject + description + last 10 replies)

3. **Invalidation strategy** — on new reply:
   - Option 1: set summary=NULL (lazy regeneration on next view)
   - Option 2: immediately regenerate (more fresh but costly)
   - MVP: Option 1 (lazy)

4. **Regenerate frequency** — CSM can regenerate anytime. Consider:
   - Rate limit: max 5 regenerations per ticket per day? (prevent abuse)
   - F2 can add: "Regenerate" if summary > 24h old

5. **Summary in exports** — F2 can add summary to ticket export/PDF.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `TicketSummary`
- Decisões: [_decisions.md](_decisions.md) → LLM gateway
- Anterior: [F1-18 Categorização Automática](F1-18-categorizacao-automatica.md)
- Próximo: [F1-20 Sentiment Trend](F1-20-sentiment-trend.md)
