# F1-20: Sentiment Trend

## Contexto

CSM reads ticket and wonders: "Is customer happy, frustrated, or neutral?" Customer sentiment evolves: starts frustrated, gets solution, ends positive. CSM needs visibility: sparkline showing sentiment curve over ticket lifecycle.

Sentiment analysis via Gemini on each reply. Display in list (emoji indicator) + detail (sparkline with sentiment curve).

---

## Escopo

**É:**
- Sentiment analysis: run Gemini on each reply (positive/neutral/negative)
- Store: support_replies.sentiment column
- Batch job: daily recompute sentiment for open tickets (replies may change meaning)
- Display in list: sentiment emoji (🔴 negative, 🟡 neutral, 🟢 positive)
- Display in detail: sparkline of last 5 replies with sentiment curve
- Emoji logic: primary = last customer reply sentiment
- No notifications (silent logging, CSM sees visually)

**Não é (MVP):**
- Sentiment score (scale 0-1, only classify positive/neutral/negative)
- NLP-based sentiment (only Gemini classification)
- Alert on negative sentiment shift (F2)
- Customer satisfaction score (similar but different — F2)

---

## Decisões de Design (UX)

**Sentiment in List:**
- Column: small emoji indicator
- Logic: most recent customer reply sentiment
- Hover: tooltip "Customer sentiment: positive — [date]"
- Colors/icons:
  - 🟢 Positive (customer satisfied, happy, thankful)
  - 🟡 Neutral (factual, requesting info, no emotion)
  - 🔴 Negative (frustrated, angry, urgent tone)

**Sentiment in Detail:**
- Section: below summary (F1-19)
- Title: "Sentiment Trend"
- Chart: sparkline (5 horizontal points) representing last 5 replies
- Each point: colored dot (green/yellow/red)
- Hover on point: tooltip with reply date + text snippet + sentiment
- Axis: optional (left=old → right=recent)

**Badge Logic:**
- If no replies yet: "⚪ Sem análise"
- If all replies same sentiment: solid color
- If mixed: gradient or multi-colored

---

## Schema / Migrações

**Coluna nova em support_replies:**

```sql
ALTER TABLE support_replies ADD COLUMN (
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  sentiment_score float, -- 0-1 confidence
  sentiment_analyzed_at timestamptz
);

CREATE INDEX idx_support_replies_sentiment ON support_replies(sentiment);
CREATE INDEX idx_support_replies_analyzed_at ON support_replies(sentiment_analyzed_at);
```

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/SentimentBadge.tsx` — emoji badge for list
- `src/app/(dashboard)/suporte/components/SentimentTrend.tsx` — sparkline detail view
- `src/lib/services/sentimentService.ts` — Gemini sentiment classification
- `src/app/api/replies/[id]/sentiment/route.ts` — POST to analyze sentiment (on demand)
- `scripts/jobs/analyze-sentiment.ts` — cron job (daily batch)
- `src/lib/prompts/sentimentPrompt.ts` — system + user prompt

---

## Padrões a Seguir

**Sentiment Analysis Service:**
```typescript
// src/lib/services/sentimentService.ts
export async function analyzeSentiment(text: string): Promise<{
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
}> {
  const gateway = await getGateway();

  const response = await gateway.post('/llm/complete', {
    system: sentimentPrompt.system,
    user: sentimentPrompt.user(text),
    model: 'claude-opus',
    temperature: 0.0 // deterministic
  });

  try {
    const result = JSON.parse(response.text);
    return {
      sentiment: result.sentiment,
      score: result.score || 0.5
    };
  } catch (e) {
    return { sentiment: 'neutral', score: 0.5 };
  }
}
```

**Sentiment Prompt:**
```typescript
// src/lib/prompts/sentimentPrompt.ts
export const sentimentPrompt = {
  system: `Analyze the sentiment of the support ticket reply. Classify as positive, neutral, or negative. Respond with JSON: {"sentiment": "...", "score": 0.0-1.0}`,
  user: (text) => `
    Analyze sentiment of this reply:
    
    "${text}"
    
    Respond with JSON: {"sentiment": "positive|neutral|negative", "score": 0.0-1.0}
  `
};
```

**Sentiment Badge Component:**
```typescript
// src/app/(dashboard)/suporte/components/SentimentBadge.tsx
const sentimentConfig = {
  positive: { emoji: '🟢', label: 'Positivo', color: 'text-green-600' },
  neutral: { emoji: '🟡', label: 'Neutro', color: 'text-yellow-600' },
  negative: { emoji: '🔴', label: 'Negativo', color: 'text-red-600' },
  none: { emoji: '⚪', label: 'Sem análise', color: 'text-gray-400' }
};

export function SentimentBadge({ sentiment }: { sentiment?: string }) {
  const config = sentimentConfig[sentiment] || sentimentConfig.none;
  
  return (
    <span title={config.label} className={config.color}>
      {config.emoji}
    </span>
  );
}
```

**Sentiment Trend Component:**
```typescript
// src/app/(dashboard)/suporte/components/SentimentTrend.tsx
export function SentimentTrend({ ticketId }: { ticketId: string }) {
  const { data: sentiments } = useQuery({
    queryKey: ['sentiment-trend', ticketId],
    queryFn: async () => {
      const res = await fetch(`/api/tickets/${ticketId}/sentiment-trend`);
      return res.json();
    }
  });

  if (!sentiments || sentiments.length === 0) {
    return <div className="text-sm text-gray-500">Sem análise de sentimento</div>;
  }

  return (
    <div className="sentiment-card bg-surface-card p-4 rounded">
      <h3 className="text-sm font-semibold mb-3">Sentiment Trend</h3>
      <div className="flex gap-2">
        {sentiments.map((s, i) => (
          <div
            key={i}
            className={`sentiment-dot w-2 h-8 rounded bg-${sentimentColor[s.sentiment]}`}
            title={`${s.date}: ${s.sentiment}`}
          />
        ))}
      </div>
      <p className="text-xs text-gray-500 mt-2">Últimas 5 respostas</p>
    </div>
  );
}
```

**Cron Job (Daily Batch):**
```typescript
// scripts/jobs/analyze-sentiment.ts
export async function analyzeSentimentBatch() {
  const supabase = createClient(url, key);

  // Get unanalyzed or stale sentiment replies
  const { data: replies } = await supabase
    .from('support_replies')
    .select('id, text')
    .is('sentiment', null)
    .limit(1000);

  let analyzed = 0;

  for (const reply of replies) {
    try {
      const result = await analyzeSentiment(reply.text);
      
      await supabase
        .from('support_replies')
        .update({
          sentiment: result.sentiment,
          sentiment_score: result.score,
          sentiment_analyzed_at: new Date()
        })
        .eq('id', reply.id);

      analyzed++;
    } catch (e) {
      console.error(`Error analyzing reply ${reply.id}:`, e);
    }
  }

  console.log(`Analyzed ${analyzed} replies`);
  return { analyzed };
}
```

**LLM:** Claude Opus, temperature 0.0 (deterministic)

---

## Complexidade Estimada

**P (Pequeno)** — 0.5-1 sessão BMAD

- Sentiment analysis logic (straightforward prompt)
- Badge component (simple emoji display)
- Sparkline component (basic chart)
- Cron batch job (standard pattern)

---

## Dependências

**Precisa que:** F1-01 (support_replies, support_tickets)

**Bloqueia:** Nenhum (complements F1-07 urgency, F1-17 RAG)

---

## Critérios de Aceite

### Funcional

- [ ] F1 — New reply created → sentiment analyzed within 2 min (async)
- [ ] F2 — Reply sentiment stored in DB (positive/neutral/negative)
- [ ] F3 — List view shows sentiment emoji for most recent customer reply
- [ ] F4 — Hover emoji → tooltip "Sentiment: [type] — [date]"
- [ ] F5 — Ticket detail shows sentiment trend (sparkline with last 5 replies)
- [ ] F6 — Sparkline points colored by sentiment (🟢 positive, 🟡 neutral, 🔴 negative)
- [ ] F7 — Hover sparkline point → tooltip with reply date + sentiment
- [ ] F8 — Cron job runs daily, analyzes unanalyzed replies
- [ ] F9 — Sentiment accuracy: test dataset 20 replies, >= 85% correct
- [ ] F10 — No customer notification (silent logging)

### Edge Cases

- [ ] E1 — Empty reply (no text): sentiment = neutral (graceful)
- [ ] E2 — Automated/system reply: can be tagged (system flag), skip sentiment?
- [ ] E3 — Reply in mixed language (PT + EN): still analyze (LLM handles)
- [ ] E4 — Very long reply (5000+ chars): truncate or analyze full?
- [ ] E5 — Ticket with 0 customer replies (CSM only): no sentiment data (OK)

### Performance

- [ ] P1 — Sentiment analysis < 2s per reply (async, background)
- [ ] P2 — Badge render < 100ms
- [ ] P3 — Sparkline render < 200ms
- [ ] P4 — Batch sentiment job: 1000 replies in < 5 min

### Isolation

- [ ] T1 — Sentiment data isolated by account (RLS)
- [ ] T2 — CSM A can't see sentiment of CSM B replies

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para IA Feature + Batch Processing:**
- [ ] F1-F6: Sentiment analysis + display end-to-end
- [ ] F8-F9: Batch job + accuracy benchmark
- [ ] P1-P3: Performance acceptable

**Testes obrigatórios:**
```
E2E:
1. Create reply with known sentiment (positive customer feedback)
2. Wait 2 min for sentiment analysis
3. List view: verify emoji shows correct sentiment
4. Detail view: verify sparkline includes new point
5. Batch job: analyze 100 unanalyzed replies in < 5 min

Unit:
- sentimentService: test 5 scenarios (positive, negative, neutral, sarcasm, mixed)
- Badge component: emoji correct per sentiment
- Sparkline: render with 5 points, colors correct

Accuracy test:
- 20 manually-labeled replies
- Run sentiment analysis on each
- Compare to labels, calculate accuracy
- Target: >= 85%
```

**Fixtures:**
- 20 sample replies with known sentiments
- Mix: positive (thanks, solved), negative (frustration, angry), neutral (info request)
- Edge: sarcasm, mixed (frustrated then satisfied)

---

## Notas

1. **Sentiment classification** — only 3 categories (positive/neutral/negative). Consider:
   - Expand to 5-scale (very positive → very negative) in F2
   - Add sarcasm detection (tricky for LLM)
   - Per-sentence sentiment (for long replies)

2. **Batch timing** — daily job runs at off-peak hours (midnight). Sentiment data ~1 day stale, acceptable for MVP.

3. **Real-time sentiment** — F2 can switch to real-time (analyze on reply creation). Current MVP is async for cost/performance.

4. **Accuracy benchmark** — 85% target on known dataset. Post-launch:
   - Collect CSM feedback (was sentiment correct?)
   - Refine prompt based on false positives/negatives

5. **Sentiment in filters/searches** — F2 can add:
   - "Show frustrated customers" filter
   - "Sentiment = negative" in saved views
   - Alert on sentiment shift (positive → negative = escalation signal)

6. **Customer-facing** — F2 might expose sentiment in customer-facing portal (don't share):
   - CSM's emotional tone matters
   - Could bias customer perception
   - Recommend: internal only

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `SentimentBadge`, `SentimentTrend`
- Decisões: [_decisions.md](_decisions.md) → LLM gateway, support_replies schema
- Anterior: [F1-19 Resumo do Ticket](F1-19-resumo-ticket.md)
- Próximo: [F2-01 Timeline Unificada](../fase2/F2-01-timeline-unificada.md)
