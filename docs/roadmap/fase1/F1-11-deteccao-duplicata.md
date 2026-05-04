# F1-11: Detecção de Duplicata

## Contexto

Customer opened two tickets on same issue, 3 hours apart. CSM doesn't realize until day later. Two separate replies sent, confusion. Solution: Identify likely duplicates via semantic similarity (embeddings from F1-04), flag to CSM.

Daily cron scores all open ticket pairs via embeddings. Writes candidates (similarity > 0.85) to ticket_similarity_candidates. CSM sees banner: "Possível duplicata: Ticket #123 é similar" with merge button.

---

## Escopo

**É:**
- Cron job: daily, computes embeddings similarity for all open tickets
- Similarity threshold: > 0.85 (cosine distance)
- Output: ticket_similarity_candidates table (one_id, other_id, score)
- UI: "Possível duplicata" banner in ticket detail with link to candidate
- Action: CSM can "Confirmar duplicata" (mark for manual merge) or "Descartar" (false positive)
- Dashboard (future F2): "Duplicatas detectadas esta semana: [N]"

**Não é (MVP):**
- Auto-merge (only detection + suggestion)
- Threshold customization per account (F2)
- NLP-based similarity (only embeddings cosine)
- Batch detection on historical tickets (only daily going forward)

---

## Decisões de Design (UX)

**Detection Flow:**
1. Daily cron computes similarity matrix
2. For each pair (A, B) with similarity > 0.85: create ticket_similarity_candidates row
3. CSM opens ticket detail
4. Banner appears: "⚠️ Possível duplicata: [Other ticket] é 92% similar"
5. CSM can: "Mesclar em [Other]" (link to F1-10) or "Não é duplicata" (dismiss)

**Candidate Scoring:**
- Display score: "92% similar"
- On hover: breakdown (same customer? similar subject? both SLA at risk?)

**Dismissal:**
- Button "Não é duplicata" → marks candidate as `dismissed_by` + `dismissed_at`
- Candidate removed from banner (not shown again)
- Can be re-enabled (F2)

**List View (future):**
- Filter: "Mostrar tickets com duplicatas"
- Badge: [2] next to ticket (2 possible duplicates)

---

## Schema / Migrações

**Tabela nova:**

```sql
CREATE TABLE ticket_similarity_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_a_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  ticket_b_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  similarity_score float NOT NULL, -- 0-1, cosine similarity
  detected_at timestamptz DEFAULT now(),
  dismissed_by uuid REFERENCES auth.users(id),
  dismissed_at timestamptz,
  merged_in_ticket_id uuid REFERENCES support_tickets(id), -- if user confirms and merges
  CONSTRAINT no_self_similarity CHECK (ticket_a_id != ticket_b_id),
  CONSTRAINT no_duplicate_candidates UNIQUE(
    LEAST(ticket_a_id, ticket_b_id),
    GREATEST(ticket_a_id, ticket_b_id)
  ) -- Avoid duplicate rows (A,B) and (B,A)
);

CREATE INDEX idx_similarity_candidates_ticket_a ON ticket_similarity_candidates(ticket_a_id);
CREATE INDEX idx_similarity_candidates_ticket_b ON ticket_similarity_candidates(ticket_b_id);
CREATE INDEX idx_similarity_candidates_score ON ticket_similarity_candidates(similarity_score DESC);
```

---

## Arquivos Afetados

- `scripts/jobs/detect-duplicate-tickets.ts` — cron job
- `src/app/(dashboard)/suporte/components/DuplicateTicketBanner.tsx` — novo componente
- `src/app/(dashboard)/suporte/components/TicketDetail.tsx` — render banner
- `src/app/api/tickets/[id]/similarity-candidates/route.ts` — GET candidates, POST dismiss
- `supabase/migrations/[timestamp]_create_ticket_similarity_candidates.sql`

---

## Padrões a Seguir

**Cron Job (Similarity Detection):**
```typescript
// scripts/jobs/detect-duplicate-tickets.ts
import { createClient } from '@supabase/supabase-js';

export async function detectDuplicateTickets() {
  const supabase = createClient(url, key);

  // Get all open tickets with embeddings
  const { data: tickets } = await supabase
    .from('support_tickets')
    .select('id, embedding')
    .eq('status', 'open')
    .not('embedding', 'is', null);

  let candidatesFound = 0;

  // Compute pairwise similarity
  for (let i = 0; i < tickets.length; i++) {
    for (let j = i + 1; j < tickets.length; j++) {
      const score = cosineSimilarity(tickets[i].embedding, tickets[j].embedding);

      if (score > 0.85) {
        // Upsert candidate
        await supabase.from('ticket_similarity_candidates').upsert({
          ticket_a_id: tickets[i].id,
          ticket_b_id: tickets[j].id,
          similarity_score: score
        });
        candidatesFound++;
      }
    }
  }

  console.log(`Detected ${candidatesFound} duplicate candidates`);
  return { candidatesFound };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dotProduct = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

**LLM:** Não aplica (embeddings computed in F1-04)

---

## Complexidade Estimada

**P (Pequeno)** — 0.5-1 sessão BMAD

- Similarity detection logic (straightforward cosine)
- Cron job (standard pattern)
- Banner component + dismiss action

---

## Dependências

**Precisa que:** F1-04 (embeddings on tickets), F1-10 (merge capability)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Two similar open tickets (similarity = 0.90) trigger candidate creation
- [ ] F2 — Candidate appears in both tickets as banner
- [ ] F3 — Score displayed: "90% similar"
- [ ] F4 — Click "Mesclar" → opens merge dialog (F1-10)
- [ ] F5 — Click "Não é duplicata" → dismissed, banner removed
- [ ] F6 — Dismissed candidate doesn't reappear (unless re-enabled)
- [ ] F7 — Cron runs daily, detects candidates for all open tickets
- [ ] F8 — Threshold: 0.87 score shows, 0.72 score doesn't appear
- [ ] F9 — Similarity score rounded to nearest % for display (0.877 → 88%)
- [ ] F10 — Candidate with similarity > 1.0: error (invalid score)

### Edge Cases

- [ ] E1 — Ticket A and B are similar, B merges into C: candidate should be updated/deleted?
- [ ] E2 — Two identical tickets (score = 1.0): shown as "100% similar"
- [ ] E3 — No embeddings on ticket: skipped in similarity scan
- [ ] E4 — Open ticket becomes closed: old candidates with that ticket hidden?
- [ ] E5 — CSM dismisses, then same tickets get new replies: re-check similarity?

### Performance

- [ ] P1 — Cron with 1000 open tickets: similarity detection < 30s
- [ ] P2 — Banner render < 200ms
- [ ] P3 — Dismiss action < 1s

### Isolation

- [ ] T1 — Candidates isolated by account (RLS)
- [ ] T2 — CSM A doesn't see CSM B similar tickets (if private)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para IA Feature + Detection:**
- [ ] F1-F4: Similarity detection and UI end-to-end
- [ ] F8: Threshold correctly applied (0.85 cutoff verified)
- [ ] P1-P2: Performance acceptable

**Testes obrigatórios:**
```
E2E:
1. Create 2 similar tickets (manually set embedding)
2. Run cron job
3. Verify candidate created with score
4. Open ticket → see banner
5. Click "Não é duplicata" → banner gone
6. Click "Mesclar" → merge modal opens

Unit:
- Cosine similarity calculation (test with known vectors)
- UNIQUE constraint prevents (A,B) and (B,A) duplicates
- Threshold filtering: 0.87 included, 0.72 excluded

Edge cases:
- Self-similarity (score = 1.0) should NOT create candidate
- Missing embeddings skipped gracefully
```

**Fixtures:**
- 5 ticket pairs with pre-computed embeddings (0.75, 0.85, 0.90, 0.95, 1.0 scores)
- 2 accounts with different tickets (isolation test)

---

## Notas

1. **Computational cost** — O(n²) pairwise similarity. With 1000 tickets, 499,500 comparisons. Consider:
   - Batch processing (divide into chunks)
   - Approximate nearest neighbors (ANN) via pgvector plugin (future optimization)
   - Run during low-traffic hours (midnight)

2. **Threshold tuning** — 0.85 is MVP. Post-launch, monitor false positive rate and adjust.
3. **Embedding freshness** — if ticket updated, embedding may be stale. F1-04 should re-embed on significant changes.
4. **Merge feedback loop** — when CSM confirms merge, log confidence metric for future threshold tuning.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `DuplicateTicketBanner`
- Decisões: [_decisions.md](_decisions.md) → Embeddings schema
- Anterior: [F1-10 Merge de Tickets](F1-10-merge-tickets.md)
- Próximo: [F1-12 Reopen Manual](F1-12-reopen-manual.md)
