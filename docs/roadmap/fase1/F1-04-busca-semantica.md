# F1-04: Busca Semântica

## Contexto

Hoje CSM busca por palavra-chave exata. Digita "laranja" mas o ticket tem "cenoura" e "fruta" — não acha. Com busca semântica, digita "cor de frutas" e encontra tickets sobre cor, frutas, laranjas. 

Busca semântica usa embeddings (Gemini text-embedding-004) + pgvector para encontrar tickets semanticamente similares. Hybrid search combina keyword (exato) + semantic (fuzzy) para melhor relevância.

---

## Escopo

**É:**
- Busca de texto: CSM digita na search bar, obtém resultados hybrid (keyword + semantic)
- Embeddings: gerar embedding (768 dims) para cada novo ticket via Gemini
- pgvector search: query similar vectors com threshold configurable (padrão: 0.85)
- Debounce 300ms: não roda query a cada keystroke
- Ranking: combina BM25 (keyword) + cosine similarity (semantic), return top 20
- Teste com dataset 50 tickets, validar recall > 90%

**Não é (MVP):**
- Busca por campos específicos (e.g. "customer:john" — syntax sugar)
- Typo correction (fuzzy matching)
- Search history / saved searches (F2)
- Re-embed existing tickets (V1 only processes new)

---

## Decisões de Design (UX)

**Search Bar:**
- Ubicación: top of ticket list (reusa search input, upgrade com semântica)
- Placeholder: "Buscar por palavras-chave ou contexto..." (sinaliza semântica)
- On type: debounce 300ms, mostra "Buscando..." spinner
- Results: dropdown com top 10 results (nome, snippet, relevância score)
- Click result: navega para ticket detail

**Ranking UI:**
- Result item: [score/badge: relevância] [ticket name] [preview de matching text]
- Badge colors: 🟢 verde (>0.95 relevância), 🟡 amarelo (0.80-0.95), 🔴 vermelho (<0.80)
- Preview snippet: highlighting da keyword match (se keyword search) ou "... relevant context ..." (semantic)

**Results Display:**
- Initial search: dropdown suggestion list (max 10)
- Full results page: if user clicks "Ver todos [N] resultados"
- Pagination: 20 per page

**Empty state:**
- 0 resultados: "Nenhum ticket encontrado. Tente outras palavras-chave ou contexto diferente."

---

## Schema / Migrações

**Coluna nova em support_tickets:**

```sql
ALTER TABLE support_tickets ADD COLUMN embedding vector(768);

CREATE INDEX idx_support_tickets_embedding ON support_tickets USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100); -- adjust lists based on data size

-- Para búsqueda por keyword, se não tiver full-text search ativo:
ALTER TABLE support_tickets ADD COLUMN tsv tsvector GENERATED ALWAYS AS (
  to_tsvector('portuguese', coalesce(subject, '') || ' ' || coalesce(description, ''))
) STORED;

CREATE INDEX idx_support_tickets_tsv ON support_tickets USING GIN (tsv);
```

**Nenhuma tabela nova** — reutiliza support_tickets, adiciona coluna embedding.

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/TicketSearchBar.tsx` — upgrade com semantic search
- `src/app/api/search/hybrid-search/route.ts` — novo endpoint POST com query + embedding
- `src/lib/services/embeddings.service.ts` — novo serviço (Gemini text-embedding-004 client)
- `src/lib/utils/rankingUtils.ts` — combina BM25 + cosine similarity scores
- `supabase/migrations/[timestamp]_add_embedding_to_tickets.sql` — migration

---

## Padrões a Seguir

**Componente de referência:** [src/app/(dashboard)/suporte/components/TicketSearchBar.tsx](../../src/app/(dashboard)/suporte/components/TicketSearchBar.tsx)
- Client-side debounce (useCallback + timer)
- TanStack React Query para queries

**API reference:** [src/app/api/support-tickets/route.ts](../../src/app/api/support-tickets/route.ts)
- RLS sempre ativo
- Return 200 com array de resultados ranked
- Timeout 5s (embeddings podem ser lento)

**LLM Integration:**
```typescript
// src/lib/services/embeddings.service.ts
import { getGateway } from '@/lib/gateway';

async function generateEmbedding(text: string): Promise<number[]> {
  const gateway = await getGateway();
  const response = await gateway.post('/embeddings/generate', {
    text,
    model: 'text-embedding-004'
  });
  return response.embedding; // 768-dim vector
}
```

---

## Complexidade Estimada

**M (Médio)** — 1.5 sessões BMAD

- Integração com Gemini embeddings (straightforward via gateway)
- Setup pgvector em Supabase (busca no Supabase docs)
- Ranking logic (combinar BM25 + cosine, não trivial mas formulaic)
- Testes: recall, latency, RLS

---

## Dependências

**Precisa que:** F1-01 (support_tickets schema), gateway Gemini configurado

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Novo ticket cria embedding automaticamente via Gemini (768 dims)
- [ ] F2 — CSM busca "laranja" → encontra tickets com "laranja" (exact match)
- [ ] F3 — CSM busca "cor de fruta" → encontra tickets com "laranja", "cenoura" (semantic match)
- [ ] F4 — Resultados são ranked por relevância (score > 0.9 no topo)
- [ ] F5 — Búsqueda debounced 300ms: não roda query a cada keystroke
- [ ] F6 — Dropdown mostra top 10 resultados com preview + score badge
- [ ] F7 — Clique em resultado navega para ticket detail
- [ ] F8 — Full results page mostra todos [N] resultados com paginação (20 per page)
- [ ] F9 — Búsqueda com 0 resultados mostra empty state amigável
- [ ] F10 — Benchmark: 100 tickets, búsqueda executa em < 500ms

### Edge Cases

- [ ] E1 — Busca vazia (só espaços): ignora, mostra "Digite algo para buscar"
- [ ] E2 — Busca muito longa (1000+ chars): trunca para 512 chars antes de embeddings
- [ ] E3 — Embedding fail (Gemini timeout): fallback para keyword-only search
- [ ] E4 — User busca palavra em ticket que ele não tem permissão de ver: não aparece resultado (RLS)

### Performance

- [ ] P1 — Embedding generation: < 1s per ticket (async, background)
- [ ] P2 — Hybrid search query: < 500ms com 10k tickets
- [ ] P3 — Ranking scores computed < 100ms for top 100 candidates

### Isolamento

- [ ] T1 — Búsqueda sempre filtra por auth.uid (RLS)
- [ ] T2 — CSM A não vê tickets de CSM B mesmo se búsqueda match

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para List/Filtro:**
- [ ] F1: Embedding generation automatic on ticket create/update
- [ ] F4: Ranking formula documented (BM25 weight vs cosine weight)
- [ ] T1-T2: RLS verificado com 2 usuários

**Testes obrigatórios:**
```
E2E:
1. Create ticket with text X → search "X" → encontra ticket
2. Search "semantic phrase not in any ticket" → encontra semantically similar via embedding
3. Tenant isolation: user A search não vê user B results

Unit:
- rankingUtils: BM25 + cosine normalization
- embeddings.service: handles Gemini errors gracefully
```

**Fixtures:**
- 50 tickets com texto variado (português + keywords)
- 2 CSMs com diferente acesso
- Test queries: 5 keyword, 5 semantic

---

## Notas

1. **pgvector setup** — Supabase já suporta, enable extension via Dashboard ou via migration.
2. **Embedding generation** — rodar async na criação do ticket (não bloqueia API). Se Gemini falha, ticket salva sem embedding (fallback para keyword).
3. **Ranking formula** — sugerir: `final_score = 0.4 * bm25_norm + 0.6 * cosine_sim`. Ajustar weights baseado em feedback.
4. **Batch re-embedding** — após F1-04 estabilizado, adicionar job para re-embed existing 10k+ tickets (fase 2).
5. **Monitor latency** — setup tracing em embeddings.service e search route, observe P99 latency.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `TicketSearchBar`
- Decisões: [_decisions.md](_decisions.md) → Gemini embedding model, pgvector
- Anterior: [F1-03 Bulk Actions](F1-03-bulk-actions.md)
- Próximo: [F1-05 Preview Inline](F1-05-preview-inline.md)
