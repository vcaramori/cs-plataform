# F1-02: Filtros Compostos

## Contexto

Hoje em F1-01, os filtros são salvos como JSONB simples, mas a UI só suporta filtros básicos (status, prioridade). CSMs precisam de lógica AND/OR: "Mostrar tickets SLA em risco E não atribuídos OU de alta prioridade". 

FilterBuilder é um componente headless, schema-driven, reutilizável em F2-03 (segmentação de contas), F3-02 (alertas), e F4-01 (insights). Será a espinha dorsal do sistema de filtros.

---

## Escopo

**É:**
- Componente headless FilterBuilder (sem UI prescritiva, suporta extensão)
- Suporta AND/OR logic com nested groups
- Schema-driven: define campos disponíveis (status, prioridade, agente, etc) via prop
- Integra com saved_views.filters de F1-01
- Preview em tempo real: mostra quantos tickets match enquanto CSM constrói
- Valida com Zod schema (`filter.schema.ts`)
- UI: React components para condicional, grupos, e botões de ação (adicionar/remover linha)

**Não é (MVP):**
- Salvar filtros predefinidos por categoria (F2)
- Drag-to-reorder condições (F2)
- Filtros por data relativa (e.g. "últimos 7 dias") — apenas comparações diretas
- Suporte a filtros por custom fields (apenas campos built-in)

---

## Decisões de Design (UX)

**Interface do FilterBuilder:**
- Estrutura: visualização de árvore (AND/OR groups expandível)
- Cada linha tem: [campo dropdown] [operador dropdown] [valor input] [botão remover]
- Botão "Adicionar condição" dentro de grupo
- Botão "Adicionar grupo" (AND/OR)
- Preview: "Resultado: 47 tickets" atualizado a cada mudança
- Estados de loading: debounce 300ms antes de atualizar preview

**Integração com saved_views:**
- FilterBuilder renderizado em modal/popover "Editar filtros"
- Ao salvar view, passa `filters` objeto do builder para saved_views.filters
- Ao abrir view existente, carrega filtros em FilterBuilder

**Campos suportados (v1):**
- `status` (multi-select: open, in_progress, resolved, closed)
- `priority` (select: low, medium, high)
- `assigned_to` (select: list of CSMs)
- `created_at` (date range: from/to)
- `updated_at` (date range)
- `sla_status` (multi-select: ok, atencao, vencido)
- `customer_email` (text search)
- `tags` (multi-select from list)

---

## Schema / Migrações

**JSONB Filter Structure (nenhuma migração nova, reutiliza saved_views.filters):**

```typescript
// Zod schema em src/lib/schemas/filter.schema.ts
type FilterCondition = {
  field: string; // 'status', 'priority', 'assigned_to', etc
  op: 'eq' | 'neq' | 'in' | 'nin' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'is_null';
  value?: any;
  values?: any[];
};

type FilterGroup = {
  type: 'AND' | 'OR';
  conditions: (FilterCondition | FilterGroup)[];
};

// Root é sempre um group OR de groups AND (normalized)
type FilterRoot = FilterGroup;

// Exemplo:
{
  type: 'AND',
  conditions: [
    { field: 'status', op: 'in', values: ['open', 'in_progress'] },
    {
      type: 'OR',
      conditions: [
        { field: 'priority', op: 'eq', value: 'high' },
        { field: 'sla_status', op: 'in', values: ['atencao', 'vencido'] }
      ]
    }
  ]
}
```

**No banco:** reutiliza coluna `saved_views.filters jsonb`, nenhuma mudança estrutural.

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/FilterBuilder.tsx` — novo componente headless
- `src/app/(dashboard)/suporte/components/FilterBuilderUI.tsx` — UI components (inputs, dropdowns, buttons)
- `src/app/(dashboard)/suporte/components/FilterPreview.tsx` — preview com contador
- `src/app/(dashboard)/suporte/components/FilterEditorModal.tsx` — modal que encapsula builder
- `src/lib/schemas/filter.schema.ts` — Zod schema validação
- `src/lib/utils/filterQueryBuilder.ts` — converte FilterRoot em SQL WHERE clause para queries
- `src/app/api/support-tickets/route.ts` — atualizar query para aceitar `filters` parameter

---

## Padrões a Seguir

**Componente de referência:** [src/app/(dashboard)/suporte/components/SuporteClient.tsx](../../src/app/(dashboard)/suporte/components/SuporteClient.tsx)
- Componente Client-side
- Use TanStack React Query para preview (debounce 300ms)
- Componentes reutilizáveis: `<FilterGroup>`, `<FilterCondition>`, `<FieldSelector>`

**API reference:** [src/app/api/support-tickets/route.ts](../../src/app/api/support-tickets/route.ts)
- Aceita `filters` como query param (JSON stringified ou form data)
- Valida com Zod, retorna 400 se inválido
- RLS sempre ativo

**LLM:** Não aplica

---

## Complexidade Estimada

**M (Médio)** — 1-1.5 sessões BMAD

- Schema Zod + tipos TypeScript (straightforward)
- 3-4 componentes UI (alguns reutilizados depois)
- Query builder SQL (conversão de FilterRoot → WHERE)
- Testes: validação schema, preview accuracy, RLS

---

## Dependências

**Precisa que:** F1-01 (saved_views tabela já existe)

**Bloqueia:**
- F2-03 Segmentação dinâmica (reutiliza FilterBuilder)
- F3-02 Motor de alertas (triggers com filters)
- F4-01 Portfolio analytics (segment selection)

---

## Critérios de Aceite

### Funcional

- [ ] F1 — CSM consegue criar filtro AND: [status = open] AND [priority = high]
- [ ] F2 — CSM consegue criar filtro OR: [status = open] OR [status = in_progress]
- [ ] F3 — FilterBuilder renderiza 2+ grupos aninhados corretamente
- [ ] F4 — Preview mostra contador correto: "Resultado: 47 tickets" atualizado em tempo real
- [ ] F5 — Salvar filtro persiste em saved_views.filters como JSONB válido
- [ ] F6 — Abrir view existente carrega filtros no builder (desserializa JSONB)
- [ ] F7 — Botão "Remover condição" apaga linha e atualiza preview
- [ ] F8 — Botão "Adicionar grupo" cria novo OR group aninhado
- [ ] F9 — Validação Zod rejeita filtro malformado (tipo de valor inválido)
- [ ] F10 — Query result é idêntico com filtro via UI vs hardcoded SQL

### Edge Cases

- [ ] E1 — Grupo vazio (sem condições): preview mostra 0 ou todos? (definir comportamento)
- [ ] E2 — Tentar salvar com nome duplicado: erro claro (já faz em F1-01)
- [ ] E3 — Campo doesn't exist: Zod erro 400, não tenta query
- [ ] E4 — Operador `contains` com valor nulo: rejeita ou ignora condição?

### Performance

- [ ] P1 — Preview debounced 300ms (não roda query a cada keystroke)
- [ ] P2 — Builder renderiza com 5+ grupos + 20+ condições sem lag (< 200ms)
- [ ] P3 — Query com filtros complexos executa em < 1s (mesmo 10k+ tickets)

### Isolamento

- [ ] T1 — Query sempre filtra por auth.uid (RLS)
- [ ] T2 — CSM A não vê tickets de CSM B mesmo se filtro vazio

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para List/Filtro:**
- [ ] F9: Validação Zod coverage > 90%
- [ ] T1-T2: RLS verificado com 2 usuários

**Testes obrigatórios:**
```
E2E:
1. Criar filtro AND [status=open] AND [priority=high] → preview mostra subset correto
2. Salvar como view → reabrir view → filtro carrega no builder
3. Editar filtro existente → preview atualiza

Unit:
- FilterBuilder serializa/desserializa JSONB sem loss
- filterQueryBuilder gera SQL correto para 3 exemplos (AND, OR, nested)
```

**Fixtures:**
- 100 tickets com mix de status/prioridade/SLA
- 3 CSMs
- 5+ views existentes com filtros complexos

---

## Notas

1. **Query builder SQL** — usar Knex.js ou escrever manualmente. Sugiro knex por clareza.
2. **Preview performance** — se querys > 1s, mover para background polling em vez de sync.
3. **Reutilização** — FilterBuilder será exportado como `components/shared/FilterBuilder` após F1-02, vira import em F2-03/F3-02/F4-01.
4. **Extensibilidade** — schema de campos definido via prop `fieldSchema: FieldDefinition[]`, permite adicionar campos custom sem tocar componente.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `FilterBuilder`, `FilterBuilderUI`
- Decisões: [_decisions.md](_decisions.md) → JSONB filter structure
- Anterior: [F1-01 Views Salvas](F1-01-views-salvas.md)
- Próximo: [F1-03 Bulk Actions](F1-03-bulk-actions.md)
