# Roadmap de Refatoração Estrutural de UI

> **Status:** Em andamento
> **Iniciado em:** 2026-04-22
> **Objetivo:** Eliminar dívida técnica de hardcoded colors (41 arquivos, ~500 violações) e estabelecer fundação semântica de tema Light/Dark.

---

## Diagnóstico

- **41 arquivos** com classes de cor hardcoded (`bg-slate-900`, `text-gray-500`, `bg-white`, etc.) no `(dashboard)`
- **2 PageContainer coexistindo** em conflito: `src/components/layout/` (sem tokens) vs `src/components/ui/` (correto)
- Tokens semânticos definidos mas **não adotados** pelas telas existentes

---

## PASSO 0 — Consolidação Arquitetural ✅ Concluído (2026-04-22)

- [x] Mesclar animação Framer Motion do `layout/PageContainer.tsx` no `ui/page-container.tsx`
- [x] Adicionar re-export temporário em `src/components/layout/PageContainer.tsx` (Strangler Fig)
- [ ] Deletar `src/components/layout/PageContainer.tsx` após todas as telas migrarem (Onda 1+)

---

## PASSO 1 — Tokens Semânticos ✅ Concluído (2026-04-22)

- [x] `globals.css`: tokens `--surface-background`, `--surface-card`, `--content-primary`, `--content-secondary`, `--border-divider` para `:root` e `.dark`
- [x] `tailwind.config.ts`: classes `bg-surface-card`, `text-content-primary`, `text-content-secondary`, `bg-surface-background`, `border-border-divider` mapeadas

---

## PASSO 2 — Componentes Guardiões ✅ Concluído (2026-04-22)

- [x] `<PageContainer>` — prop `animate?: boolean` integrada (Framer Motion), prop `noPadding`, tokens semânticos
- [x] `<Card>` — tokens semânticos aplicados (`bg-surface-card`, `border-border-divider`)
- [x] `<Text>` (`typography.tsx`) — criado com `variant="primary|secondary|accent|destructive"`
- [x] `<SectionHeader>` — criado com `title`, `subtitle`, `action` slot

**Arquivos canônicos:**
- `src/components/ui/page-container.tsx` ← fonte única do PageContainer
- `src/components/ui/card.tsx`
- `src/components/ui/typography.tsx`
- `src/components/ui/section-header.tsx`
- `src/components/layout/PageContainer.tsx` ← re-export temporário (Strangler Fig)

---

## PASSO 3 — Refatoração das Telas

### Onda 1 — Telas Simples (Risco Baixo) ✅ Concluída (2026-04-22)

| # | Tela | Arquivo | Matches | Status |
|---|------|---------|---------|--------|
| 1 | Users | `src/app/(dashboard)/users/page.tsx` | ~11 | [x] |
| 2 | Settings / SLA | `src/app/(dashboard)/settings/sla/page.tsx` | ~18 | [x] |
| 3 | Settings / Plans | `src/app/(dashboard)/settings/plans/page.tsx` | baixo | [x] |
| 4 | Settings / Features | `src/app/(dashboard)/settings/features/page.tsx` | baixo | [x] |
| 5 | Accounts (lista) | `src/app/(dashboard)/accounts/page.tsx` | — | [x] só redirect, sem mudanças |

### Onda 2 — Telas Médias (Risco Médio) ✅ Concluída (2026-04-22)

| # | Tela | Arquivo | Matches | Status |
|---|------|---------|---------|--------|
| 6 | Esforço | `src/app/(dashboard)/esforco/page.tsx` | médio | [x] |
| 7 | Perguntar | `src/app/(dashboard)/perguntar/components/PerguntarClient.tsx` | ~16 | [x] |
| 8 | Dashboard principal | `src/app/(dashboard)/dashboard/components/AccountsTable.tsx` | ~15 | [x] |
| 9 | Suporte (lista) | `src/app/(dashboard)/suporte/page.tsx` | médio | [x] |
| 10 | NPS Dashboard | `src/app/(dashboard)/nps/NPSDashboardClient.tsx` | ~18 | [x] |

### Onda 3 — Telas Críticas (Risco Alto)

| # | Tela | Arquivo | Matches | Status |
|---|------|---------|---------|--------|
| 11 | NPS Programs | `src/app/(dashboard)/nps/programs/ProgramsClient.tsx` | ~53 | [x] |
| 12 | Suporte Detalhe | `src/app/(dashboard)/suporte/[id]/components/TicketDetailClient.tsx` | ~48 | [x] |
| 13 | Suporte Dashboard | `src/app/(dashboard)/suporte/dashboard/page.tsx` | ~31 | [x] |
| 14a | Account Detail — AdoptionDetailsModal | `...accounts/[id]/components/AdoptionDetailsModal.tsx` | ~26 | [x] |
| 14b | Account Detail — AddContactModal | `...accounts/[id]/components/AddContactModal.tsx` | ~17 | [x] |
| 14c | Account Detail — ContractHistoryDialog | `...accounts/[id]/components/ContractHistoryDialog.tsx` | ~15 | [x] |
| 14d | Account Detail — HealthScoreDetailsModal | `...accounts/[id]/components/HealthScoreDetailsModal.tsx` | ~12 | [x] |
| 14e | Account Detail — AccountUnifiedTimeline | `...accounts/[id]/components/AccountUnifiedTimeline.tsx` | ~11 | [x] |
| 14f | Account Detail — todos sub-componentes | `...accounts/[id]/components/` (16 arquivos) | variado | [x] |

---

## Protocolo por Tela (Onda 2 e 3)

Para cada arquivo, aplicar nesta ordem — **sem tocar em lógica de negócio**:

1. Substituir wrapper raiz por `<PageContainer>`
2. Substituir divs de painel por `<Card>`
3. Substituir textos de apoio por `<Text variant="secondary">`
4. Substituir títulos de seção por `<SectionHeader>` (quando aplicável)

**Nunca tocar:** `useState`, `useQuery`, `useMutation`, handlers de form, `router.push`, `onSubmit`.

---

## Sessões de Execução

| Sessão | Escopo | Status |
|--------|--------|--------|
| 1 | Passo 0 + Passo 2 completo (guardiões blindados) | [x] Concluída 2026-04-22 |
| 2 | Onda 1 — 5 telas simples | [ ] |
| 3 | Onda 2 — 5 telas médias | [ ] |
| 4 | Onda 3 — itens 11–13 (NPS Programs, Suporte) | [x] Concluída 2026-04-22 |
| 5 | Onda 3 — item 14 (Account Detail completo, 16 componentes) | [x] Concluída 2026-04-22 |
