# F1-03: Bulk Actions

## Contexto

CSM tem 47 tickets, 20 deles resolvidos. Hoje ela clica em cada um, muda status manualmente — 20 cliques. Com bulk actions, ela seleciona 20 tickets e clica "Fechar tudo", operação completa em 2 cliques.

Bulk Actions oferece multi-select na lista + action bar flutuante (slide-up desde rodapé) com operações atômicas: change status, assign, add tags, add notes.

---

## Escopo

**É:**
- Multi-select checkboxes em lista (header checkbox seleciona tudo, individual checkboxes por linha)
- Ação bar flutuante no rodapé (fixo, slide-up com animação)
- Ações: change status (open→resolved), assign to CSM, add tags, bulk close
- Operações atômicas: tudo sucede ou nada (transação ou rollback)
- Undo button (5s timeout, reverte todas mudanças)
- Confirmação modal antes de executar (exceto tags)
- Log de ação em ticket_events para auditoria

**Não é (MVP):**
- Batch email (enviar reply para todos — F3)
- Smart selection (e.g. "select by filter") — apenas manual
- Drag-to-reorder na action bar
- Save action history/replay

---

## Decisões de Design (UX)

**Multi-select UI:**
- Checkbox in list header (select all / deselect all)
- Checkbox per row (toggle individual)
- Row highlight on selection (subtle background color: `bg-surface-card/50`)
- Counter: "[N] tickets selecionados" displayed in header
- Selection state persists even if user navigates filter/view (store in client state)

**Action Bar:**
- Position: fixed bottom, width 100%, z-index high
- Animation: slide-up 300ms ease-out on first selection, slide-down 300ms on deselect all
- Content: [counter] [buttons: Change Status | Assign | Add Tags | Close All] [X to dismiss]
- Button styling: primary/secondary buttons (design tokens)
- Disabled state if no selection or insufficient permissions

**Confirmation Modal:**
- Title: "Fechar [N] tickets?"
- Body: List first 5 tickets (name/id), "+ N mais" if > 5
- Action: "Confirmar" + "Cancelar"
- Undo toast: "20 tickets fechados. [Desfazer] (5s timeout)"

**Atomic Operations:**
- API endpoint: `POST /api/bulk-actions` with `{ action, ticket_ids, payload }`
- Wrap in transaction: if any ticket fails, rollback all
- Return: `{ success: boolean, updated_count: int, errors?: [{ ticket_id, reason }] }`
- If partial failure (some tickets already closed), still return 200 but with error details

**Undo:**
- Store original state snapshot before bulk op
- Undo button in toast reverts to snapshot (transaction)
- 5s timeout auto-dismiss (no auto-revert)

---

## Schema / Migrações

**Nenhuma migração nova** — reutiliza ticket_events (já existe em F1-01 ou similar).

**ticket_events (existing):**
```sql
-- Assuming já existe, senão criar:
CREATE TABLE ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id),
  event_type text NOT NULL, -- 'status_changed', 'assigned', 'tagged', 'bulk_action', etc
  actor_id uuid NOT NULL REFERENCES auth.users(id),
  payload jsonb, -- { action: 'bulk_close', bulk_id: '...', reason?: '...' }
  created_at timestamptz DEFAULT now()
);
```

**Bulk action snapshot (optional, in-memory or Redis):**
- Ephemeral store: `bulk_actions:{session_id}:{timestamp}` with original state
- TTL: 5 minutes
- Used for undo only, not persisted long-term

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/SuporteClient.tsx` — add multi-select state
- `src/app/(dashboard)/suporte/components/TicketListHeader.tsx` — checkbox select-all
- `src/app/(dashboard)/suporte/components/TicketListRow.tsx` — checkbox per row, selection highlight
- `src/app/(dashboard)/suporte/components/BulkActionBar.tsx` — novo componente (action bar flutuante)
- `src/app/(dashboard)/suporte/components/BulkActionModal.tsx` — confirmation modal
- `src/app/api/bulk-actions/route.ts` — POST endpoint (atomic operations)
- `src/lib/schemas/bulkAction.schema.ts` — Zod schema validação

---

## Padrões a Seguir

**Componente de referência:** [src/app/(dashboard)/suporte/components/SuporteClient.tsx](../../src/app/(dashboard)/suporte/components/SuporteClient.tsx)
- Client-side state management (useState for selection)
- TanStack React Query for mutations

**API reference:** [src/app/api/support-tickets/route.ts](../../src/app/api/support-tickets/route.ts)
- Return 200 with `{ success, updated_count, errors }`
- RLS verification: check that actor is CSM in same org

**LLM:** Não aplica

---

## Complexidade Estimada

**M (Médio)** — 1-1.5 sessões BMAD

- Multi-select state management (straightforward)
- BulkActionBar component + animations (CSS)
- API endpoint with transaction handling
- Undo mechanism (snapshot store)
- Testes: atomic ops, RLS, undo

---

## Dependências

**Precisa que:** F1-01 (ticket_events table)

**Bloqueia:** Nenhum (parallelizável)

---

## Critérios de Aceite

### Funcional

- [ ] F1 — CSM seleciona 1 ticket via checkbox, BulkActionBar aparece com animação slide-up
- [ ] F2 — CSM clica "Selecionar tudo" (header checkbox), todos 47 tickets ficam checked
- [ ] F3 — Clique em "Change Status" abre modal com opções (open, in_progress, resolved, closed)
- [ ] F4 — Modal "Fechar 20 tickets?" mostra listagem e botão confirmar
- [ ] F5 — Confirmar atualiza status de todos 20 em < 2s (atomic transaction)
- [ ] F6 — Toast aparece: "[20] tickets fechados. [Desfazer] (5s)" 
- [ ] F7 — Clique em Desfazer reverte status para anterior
- [ ] F8 — Assign action: abre dropdown, seleciona CSM, atualiza assigned_to para todos
- [ ] F9 — Add Tags: modal com tag checkboxes, multi-select, salva em todos tickets
- [ ] F10 — Ticket_events registra bulk action com actor_id e payload

### Edge Cases

- [ ] E1 — Selecionar mix de tickets (5 open, 5 closed): "Change Status" desabilitado (status inconsistente)?
- [ ] E2 — Durante bulk op, um ticket é deletado por outro user: error 404, rollback outros
- [ ] E3 — User sem permissão tenta bulk action: erro 403, lista não é afetada
- [ ] E4 — Undo após 5s timeout: timeout dismisses toast, lista já atualizou (graceful degrade)

### Performance

- [ ] P1 — Selection toggle (checkbox) não bloqueia lista (< 100ms per toggle)
- [ ] P2 — Bulk action com 100 tickets executa em < 3s
- [ ] P3 — Undo snapshot < 1MB para 100 tickets (compression se needed)

### Isolamento

- [ ] T1 — Bulk action verifica RLS: CSM A não consegue fechar tickets de CSM B
- [ ] T2 — Undo snapshot isolado por session (não afeta outro usuário)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para List/Filtro:**
- [ ] F5: Transação atomic (all-or-nothing)
- [ ] T1: RLS verificado com 2 CSMs
- [ ] P2: Bulk 100 tickets < 3s

**Testes obrigatórios:**
```
E2E:
1. Select 5 tickets → click "Fechar tudo" → modal → confirm → all 5 closed
2. Undo → all 5 reopen
3. Select mix of statuses → Change Status disabled (or warn)
4. Tenant isolation: CSM A bulk action não afeta CSM B tickets

Unit:
- BulkActionBar animates on selection
- Transaction rollback on partial failure
```

**Fixtures:**
- 50 tickets across 3 CSMs
- 2 test CSMs
- Mix of open/in_progress/resolved/closed

---

## Notas

1. **Atomic operations** — use Supabase RPC or explicit transaction in Next.js API route. Recomendo RPC em Postgres para garantir atomicidade.
2. **Snapshot storage** — usar Memory em dev, Redis em prod. TTL 5min suficiente.
3. **Selection persistence** — se user navega para outra view, selection limpa (não ideal mas simples MVP). F2 pode melhorar com session storage.
4. **Animations** — usar Framer Motion ou CSS transitions. Design system tokens já tem timing.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `BulkActionBar`, `BulkActionModal`
- Anterior: [F1-02 Filtros Compostos](F1-02-filtros-compostos.md)
- Próximo: [F1-04 Busca Semântica](F1-04-busca-semantica.md)
