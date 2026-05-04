# F1-01: Views Salvas

## Contexto

Hoje o CSM abre a lista de tickets e precisa aplicar filtros manualmente toda sessão. Com 47 linhas de tickets, isso consome 3+ minutos — tempo que poderia estar resolvendo problemas.

Views salvas são filtros nomeados que persistem entre sessões, funcionando como "lentes" personalizadas sobre a lista. Ele abre o Suporte, clica em "SLA em risco", e 5 tickets críticos aparecem imediatamente.

---

## Escopo

**É:**
- Criar, editar, deletar views salvas (persistidas em DB por usuário)
- 4 views padrão não deletáveis: Todos, Meus tickets, SLA em risco, Não atribuídos
- Sidebar com contadores ao vivo (atualizam sem reload)
- Ícone opcional por view (set de 8 predefinidos)
- Visibilidade: pessoal (só eu) ou compartilhada com time
- Fluxo de criação: montar filtros → "Salvar como view" → digitar nome (nenhum formulário separado)

**Não é (MVP):**
- Drag-to-reorder (F2)
- Folders/organizadores de views (F2)
- Views de time com permissões granulares (F2)
- Board/Calendar/Gallery views (nenhuma fase — lista só)

---

## Decisões de Design (UX)

**Sidebar com views:**
- Máximo 8 views visíveis, resto em "Ver todas"
- Cada view com ícone + nome + contador de registros
- Item ativo tem background `bg-surface-card` com borda `border-border-divider`
- Clique em view = URL muda, lista recarrega com filtros da view
- Deep link funciona: `/suporte?view=sla-em-risco` abre a view correta

**Criar view (in-situ):**
1. Usuário aplica filtros na lista (via F1-02 quando pronto)
2. Botão "Salvar como view" aparece no FilterBar (só se filtros diferentes de default)
3. Clique abre popover simples: campo de texto (nome) + radio (pessoal / time) + botão confirmar
4. Sem modal separado, sem página de settings

**Estados:**
- Loading: skeleton loaders nos contadores
- Empty: se view tem 0 registros, contador mostra "0", lista vazia mas com empty state claro
- Error: se query falha, contador mostra "?" e lista varia error state (já existe em suporte)

---

## Schema / Migrações

**Tabela nova:**
```sql
CREATE TABLE saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES accounts(id),
  name text NOT NULL,
  entity_type text DEFAULT 'support_ticket', -- 'support_ticket', 'account', etc (para reutilizar em F2)
  filters jsonb NOT NULL, -- estrutura via _decisions.md (JSONB com AND/OR)
  icon text DEFAULT 'list', -- 'list', 'alert', 'user', 'checkmark', 'star', 'clock', 'zap', 'filter'
  visibility text DEFAULT 'personal', -- 'personal', 'team'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name, entity_type),
  CHECK (visibility IN ('personal', 'team'))
);

CREATE INDEX idx_saved_views_user_id ON saved_views(user_id);
CREATE INDEX idx_saved_views_user_entity ON saved_views(user_id, entity_type);
```

**Tabela de views padrão (seed):**
```sql
-- Inserir após criar saved_views
-- Esta tabela é lida apenas para "exibir padrão" — não é criada por usuário
-- As 4 views padrão são hardcoded na UI, não em DB
```

**Views padrão (hardcoded em componente):**
```typescript
const DEFAULT_VIEWS = [
  {
    id: 'all-tickets',
    name: 'Todos',
    icon: 'list',
    filters: {} // nenhum filtro = todos
  },
  {
    id: 'my-tickets',
    name: 'Meus tickets',
    icon: 'user',
    filters: { "field": "assigned_to", "op": "eq", "value": "{currentUserId}" }
  },
  {
    id: 'sla-at-risk',
    name: 'SLA em risco',
    icon: 'alert',
    filters: { "field": "sla_status", "op": "in", "values": ["atencao", "vencido"] }
  },
  {
    id: 'unassigned',
    name: 'Não atribuídos',
    icon: 'filter',
    filters: { "field": "assigned_to", "op": "is_null" }
  }
];
```

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/page.tsx` — importar `SavedViewSidebar`, renderizar na layout
- `src/app/(dashboard)/suporte/components/SavedViewSidebar.tsx` — novo componente
- `src/app/(dashboard)/suporte/components/ViewCreationPopover.tsx` — novo componente (popover de criação)
- `src/app/api/saved-views/route.ts` — GET (listar views do user) e POST (criar)
- `src/app/api/saved-views/[id]/route.ts` — PATCH (editar) e DELETE
- `src/lib/schemas/savedView.schema.ts` — Zod schema de validação
- `supabase/migrations/[timestamp]_create_saved_views.sql` — migration DDL

---

## Padrões a Seguir

**Componente de referência:** [src/app/(dashboard)/suporte/components/SuporteClient.tsx](../../src/app/(dashboard)/suporte/components/SuporteClient.tsx)
- Use `<PageContainer>` wrapper
- Use tokens semânticos (`bg-surface-background`, `bg-surface-card`)
- Componente deve ser Client-side (interatividade via useState, useQuery)

**API route de referência:** [src/app/api/support-tickets/route.ts](../../src/app/api/support-tickets/route.ts)
- RLS na query (onde `auth.users.id = current_user_id()`)
- Return 200 on success, 400 on validation error, 401 on auth fail

**LLM:** Não aplica (sem IA neste card)

---

## Complexidade Estimada

**M (Médio)** — 1-2 sessões BMAD

- Nova tabela + migrations (straightforward)
- 2 componentes UI simples (sidebar + popover)
- 2 API routes básicas (CRUD)
- Testes E2E (create, select, delete view)

---

## Dependências

**Bloqueia:**
- F1-02 Filtros Compostos (vai usar `saved_views` para persistir filterBuilder)
- F2-03 Segmentação dinâmica (reutiliza mesmo `SavedViewSidebar` e schema de filters)

**Precisa que:** Nenhum (pode rodar independente em paralelo com F1-18, F1-19)

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Usuário consegue criar view salva: seleciona ícone, digita nome, salva (sem modal separado)
- [ ] F2 — View salva persiste após reload (F5) e logout/login
- [ ] F3 — View salva com filtros que o usuário não tem mais permissão de ver exibe alerta (RLS)
- [ ] F4 — View padrão "SLA em risco" exibe 3-5 tickets com SLA breach corretos (testar com fixture)
- [ ] F5 — Clique em view muda URL (`?view=view-id`) e recarrega lista com filtros corretos
- [ ] F6 — Deep link funciona: acessar `/suporte?view=sla-em-risco` abre view correta
- [ ] F7 — Deletar view remove da sidebar, não afeta tickets (zero side-effect)
- [ ] F8 — Contador ao vivo: quando ticket muda status, contador de view muda sem reload manual
- [ ] F9 — Máximo 8 views na sidebar, 9ª aparece em "Ver todas"
- [ ] F10 — Views de outro usuário não aparecem na minha sidebar (tenant isolation)

### Edge Cases

- [ ] E1 — Criar view com mesmo nome: erro claro "View com este nome já existe"
- [ ] E2 — Tentar acessar view deletada: redireciona para "Todos" com toast informativo
- [ ] E3 — Sidebar vazio (zero views criadas): exibe 4 views padrão, "+" botão para criar nova
- [ ] E4 — Nome de view muito longo (200 chars): truncado na UI, completo no tooltip

### Performance

- [ ] P1 — Lista carrega em < 2s mesmo com 10+ views (não N queries)
- [ ] P2 — Sidebar com contadores não bloqueia renderização da lista

### Isolamento

- [ ] T1 — Query de views do user A nunca retorna views do user B (RLS)
- [ ] T2 — View compartilhada com team: somente usuários da mesma org vêem

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para List/Filtro:**
- [ ] F7: Deletar view não toca nenhum ticket (zero side-effect)
- [ ] F9: Máximo 8 views visíveis, resto "Ver todas"
- [ ] T1-T2: Tenant isolation verificado com 2 usuários em Playwright

**Testes obrigatórios:**
```
E2E:
1. Create view com filtro → view aparece na sidebar → clique abre lista filtrada
2. Delete view → desaparece da sidebar
3. Deep link: abrir /suporte?view=sla-em-risco → abre view correta
4. Tenant isolation: user A não vê views de user B
```

**Fixtures:**
- 50 tickets no DB com mix de status/prioridade
- 2 usuários de teste
- Views padrão seedadas

---

## Estimativa de Tokens

- Estrutura do documento: ~200 tokens
- Componentes React: ~400 tokens
- API routes: ~300 tokens
- Testes Playwright: ~400 tokens
- **Total esperado:** 1.5k tokens por sessão BMAD

---

## Notas

1. **FilterBuilder não existe ainda** — F1-01 vai usar filtros simples (status, prioridade, agente). FilterBuilder genérico vem em F1-02.
2. **Contadores ao vivo** — usar TanStack React Query com `staleTime: 0` para refetch automático, ou Supabase Realtime (mais complexo).
3. **Ícones** — usar Lucide React, já no projeto. Set de 8 suficiente para MVP.
4. **Sidebar responsiva** — em viewport < 768px, sidebar vira menu collapse (ou desaparece em mobile MVP).

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `SavedViewSidebar`, `FilterBuilder` (vem em F1-02)
- Decisões: [_decisions.md](_decisions.md) → Schema de filtros JSONB
- Próximo card: [F1-02 Filtros Compostos](F1-02-filtros-compostos.md)
