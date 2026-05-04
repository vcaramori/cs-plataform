# Mapa de Componentes Reutilizáveis — CS-Continuum

**Autor:** Sally (UX Designer)

O mapa abaixo mostra quais componentes são criados em uma fase e reutilizados nas seguintes. **Objetivo:** economizar tokens de IA e tempo de desenvolvimento através da composição.

---

## Componentes Core a Criar

### `<FilterBuilder />`
**Criado em:** F1-02 (Filtros Compostos)  
**Reusado em:**
- F2-03: Segmentação dinâmica (mesmo FilterBuilder, `entity_type: 'account'`)
- F3-02: Motor de alertas (gatilhos baseados em filtros)
- F4-01: Portfolio analytics (filtros de dashboard)

**Props:**
```typescript
<FilterBuilder
  schema={fieldSchema}  // { field, operators, valueType }[]
  initialFilters={filters}
  onChange={(filters) => setPersisted(filters)}
  onSave={(filters, name) => saveView(name, filters)}
/>
```

**Nota:** Deve ser headless (não conhecer sobre tickets, contas, etc) — recebe schema dinâmico via prop.

---

### `<SavedViewSidebar />`
**Criado em:** F1-01 (Views Salvas)  
**Reusado em:**
- F2-03: Segmentos de contas
- F3-02: Playbooks ativos

**Props:**
```typescript
<SavedViewSidebar
  views={savedViews}
  activeViewId={currentViewId}
  onSelectView={(viewId) => setContext(viewId)}
  onCreateView={() => openCreateModal()}
  entityType="tickets" // ou "accounts", "playbooks"
/>
```

**Comportamento:**
- Máximo 8 views visíveis, resto em "Ver todas"
- Contadores ao vivo
- Ícone por view (set de 8 predefinidos)
- Drag-to-reorder (nice-to-have F2)

---

### `<StatusBadge />`
**Existe em:** src/components/ui/badge.tsx (revisar e formalizar)  
**Criado em:** F1-01 (Views Salvas, coluna Status)  
**Reusado em:**
- F2-02: Health Score (variantes: Saudável / Em risco / Crítico)
- F3-02: Status de Playbook
- F3-03: Status de Success Plan

**Variantes:**
```typescript
<StatusBadge variant="open" />
<StatusBadge variant="in_progress" />
<StatusBadge variant="pending_client" />
<StatusBadge variant="pending_product" />
<StatusBadge variant="resolved" />
<StatusBadge variant="closed" />
// F2: Health Score
<StatusBadge variant="healthy" />
<StatusBadge variant="at-risk" />
<StatusBadge variant="critical" />
```

---

### `<PriorityBadge />`
**Existe em:** src/components/support/... (revisar localização)  
**Criado em:** F1-01 (Views Salvas, coluna Prioridade)  
**Reusado em:**
- F1-15: Atribuição automática (display)
- F4-02: Renewal management (prioridade de renovação)

**Variantes:**
```typescript
<PriorityBadge priority="low" />
<PriorityBadge priority="medium" />
<PriorityBadge priority="high" />
<PriorityBadge priority="critical" />
```

---

### `<InlineActionMenu />`
**Criado em:** F1-05 (Preview Inline)  
**Reusado em:**
- F2-02: Ações rápidas na lista de contas (Agendar QBR, Escalar)
- F3-02: Ações em Playbook (Ativar/pausar)

**Props:**
```typescript
<InlineActionMenu
  actions={[
    { label: 'Atribuir', icon: 'User', onSelect: () => ... },
    { label: 'Mudar status', icon: 'AlertCircle', onSelect: () => ... },
    { label: 'Adicionar tag', icon: 'Tag', onSelect: () => ... }
  ]}
  trigger="hover-or-click"
/>
```

---

### `<BulkActionBar />`
**Criado em:** F1-03 (Bulk Actions)  
**Reusado em:**
- F2-02: Ações em lote de contas
- F4-02: Renewal management em lote

**Props:**
```typescript
<BulkActionBar
  selectedCount={5}
  actions={[
    { label: 'Fechar', icon: 'X', variant: 'destructive', onConfirm: () => ... },
    { label: 'Atribuir', icon: 'User', onConfirm: () => openAssignModal() }
  ]}
  onClearSelection={() => setSelected([])}
/>
```

**Comportamento:**
- Slide-up from bottom (position fixed)
- Barra de progresso durante execução
- Toast de sucesso/falha
- Undo button (5s timeout)

---

### `<SortableColumnHeader />`
**Criado em:** F1-01 (Views Salvas, ordenação)  
**Reusado em:**
- F2-02: Lista de contas (ordenar por Health, ARR, Risk)
- F4-01: Portfolio analytics (ordenar colunas)

**Props:**
```typescript
<SortableColumnHeader
  column="priority"
  sortKey={sortKey}
  sortOrder={sortOrder}
  onSort={(col, order) => setSortState(col, order)}
>
  Prioridade
</SortableColumnHeader>
```

---

### `<SkeletonList />`
**Criado em:** F1-01 (Views Salvas, loading state)  
**Reusado em:**
- Toda lista com loading (F2, F3, F4)

**Props:**
```typescript
<SkeletonList count={8} columns={['id', 'name', 'status', 'priority']} />
```

---

## Componentes de IA / Sugestão

### `<AIBadge />` (Sugestão da IA)
**Criado em:** F1-18 (Categorização automática)  
**Reusado em:**
- F1-11: Detecção de duplicata ("87% similar a #123")
- F1-19: Resumo do ticket ("Assistente sugeriu...")
- F1-20: Sentiment trend ("Frustrado → neutro")
- F1-17: "O que responder?" ("Resposta sugerida")

**Props:**
```typescript
<AIBadge
  label="Sugestão IA"
  confidence={0.87}
  onReject={() => dismissSuggestion()}
/>
```

**Regra:** NUNCA aparece como "oficial" — sempre com disclaimer visual claro.

---

### `<AIReviewModal />`
**Existe em:** src/app/(dashboard)/suporte/[id]/components/ReplyReviewModal.tsx  
**Reusado em:** (nenhum por enquanto — específico de reply review)

---

## Padrão: Como Usar Componentes Existentes Sem Reinventar

Antes de criar um componente novo, checklist de reutilização:

1. **Buscar em `src/components/`:** Existe algo similar?
2. **Verificar interface:** Props são compatíveis ou pode evoluir com breaking change documentado?
3. **Evolução segura:** Se precisa de nova prop, usar `@deprecated` na antiga versão, não remover
4. **Teste de regressão:** Componente existente ainda funciona em contexto antigo após mudança?

---

## Mapa de Fase a Fase

| Componente | F1 | F2 | F3 | F4 |
|---|---|---|---|---|
| FilterBuilder | ✅ Criar | 🔄 Reutilizar | 🔄 Reutilizar | 🔄 Reutilizar |
| SavedViewSidebar | ✅ Criar | 🔄 Reutilizar | 🔄 Reutilizar | — |
| StatusBadge | ✅ Formalizar | 🔄 Variantes novas | — | — |
| PriorityBadge | ✅ Formalizar | — | — | 🔄 Reutilizar |
| InlineActionMenu | ✅ Criar | 🔄 Reutilizar | 🔄 Reutilizar | — |
| BulkActionBar | ✅ Criar | 🔄 Reutilizar | — | 🔄 Reutilizar |
| SortableColumnHeader | ✅ Criar | 🔄 Reutilizar | — | 🔄 Reutilizar |
| SkeletonList | ✅ Criar | 🔄 Reutilizar | 🔄 Reutilizar | 🔄 Reutilizar |
| AIBadge | ✅ Criar | 🔄 Reutilizar | 🔄 Reutilizar | — |

---

## Impacto em Tokens de IA

Se F1-01 (Views Salvas) bem documentar o `FilterBuilder`, F2-03 (Segmentação) economiza:
- **3-4 sessões BMAD** (não reconstrói FilterBuilder, só adapta schema)
- **50-60% dos tokens** que seria gasto recriando query builder

**Recomendação:** Quando implementar componente novo, documentar sua interface em `docs/roadmap/_components-map.md` para futuras ondas.

---

## Checklist de Criação de Componente

Ao criar um novo componente core:

```markdown
## Componente [Nome]

**Primeira criação:** [Card]
**Reutilizável em:**
- [ ] [Feature 1]
- [ ] [Feature 2]

**Interface:**
```typescript
interface Props { ... }
```

**Variantes / Estados:**
- [ ] [Estado 1]
- [ ] [Estado 2]

**Arquivo:** src/components/[categoria]/[Nome].tsx

**Testes E2E:**
- [ ] Comportamento padrão
- [ ] Todos os estados
- [ ] Acessibilidade (keyboard nav, ARIA labels)

**Documentação:**
- [ ] JSDoc no componente
- [ ] Storybook story (nice-to-have)
- [ ] Exemplo de uso em docs/roadmap/_components-map.md
```

---

## Princípio de Design: Composição sobre Customização

**Não faça isso:**
```typescript
// Ruim — componente cresce infinitamente
<TicketListWithFiltersAndViewsAndBulkActionsAndEverything ... />
```

**Faça isso:**
```typescript
// Bom — composição clara
<TicketListLayout>
  <SavedViewSidebar views={views} />
  <TicketList>
    <FilterBar schema={schema} />
    <SortableTable columns={columns} />
    <BulkActionBar actions={actions} />
  </TicketList>
</TicketListLayout>
```

---

## Próximas Revisões

- **F2-início:** Revisar se componentes de F1 precisam de variantes novas
- **F3-início:** Idem F2
- **F4-início:** Idem F3

Toda nova fase começa com: "Qual componente de F anterior reutilizo?"
