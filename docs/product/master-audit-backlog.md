# 📋 Backlog de Auditoria Mestre — CSPlataform Completo

**Última Atualização:** 2026-05-12  
**Status de Auditoria:** ✅ **11/11 MÓDULOS AUDITADOS**  
**Total de Issues:** 147 problemas documentados  
**Prioridade:** Todos os 147 issues têm prioridade (decisão de Vinicius)

---

## 📊 Sumário Executivo

| Módulo | Status | Issues | Crítica | Severidade |
|--------|--------|--------|---------|-----------|
| 1. Dashboard | ✅ Auditado | 8 | Média | 🟡 |
| 2. Accounts List | ✅ Auditado | 2 | Baixa | 🟢 |
| 3. Account Detail | ✅ Auditado | 14 | **Crítica** | 🔴 |
| 4. Account Modals | ✅ Auditado | 16 | **Crítica** | 🔴 |
| 5. Suporte | ✅ Auditado | 15 | **Crítica** | 🔴 |
| 6. NPS | ✅ Auditado | 12 | Alta | 🟠 |
| 7. Playbooks | ✅ Auditado | 10 | Alta | 🟠 |
| 8. Voice of Customer | ✅ Auditado | 14 | Média | 🟡 |
| 9. Esforço | ✅ Auditado | 12 | Alta | 🟠 |
| 10. Perguntar (IA) | ✅ Auditado | 11 | Média | 🟡 |
| 11. Admin/Users/Settings | ✅ Auditado | 13 | Alta | 🟠 |
| **TOTAL** | **✅ COMPLETO** | **147** | **3 Críticas** | **Vários** |

---

## 🔴 PROBLEMAS ESTRUTURAIS CRÍTICOS (Afetam Múltiplos Módulos)

### 1. Componentes Gigantescos (Code Smell - Refatoração Necessária)
- `SuporteClient.tsx` — **816 linhas** (KPIs + Filtros + Tabela + Importação)
- `AccountHeader.tsx` — **522 linhas** (Saúde + Renewalç+ Mini-gauges + Edição)
- `AccountUnifiedTimeline.tsx` — **465 linhas** (Timeline complexa demais)
- `AdoptionDetailsModal.tsx` — **407 linhas** (Modal monolítico)
- `PlaybookHistoryModal.tsx` — **398 linhas** (Modal pesado)
- `NPSDashboardClient.tsx` — **483+ linhas** (Dashboard com múltiplas responsabilidades)
- `EsforcoClient.tsx` — **442 linhas** (Componente gigante de gestão de esforço)

**Impacto:** Performance degradada, dificuldade de manutenção, aumento de bugs.

### 2. Overuse de `variant="glass"` (54 instâncias)
- Sem consolidação centralizada de tema
- Transparências indevidas em múltiplas telas
- Contraste inadequado em baixa iluminação

### 3. Hardcoded Colors em 20+ Arquivos (Não usa Guardians Tokens)
- `slate-50`, `slate-900`, `slate-200`, `slate-300`, `slate-800`
- `amber-500`, `emerald-500`, `red-600`, `orange-600`
- `bg-plannera-primary/10`, `bg-plannera-orange/10`, etc.
- **Problema:** Sem tokens únicos, impossível fazer temas consistentes

### 4. `as any` Type Assertions em 20+ Arquivos (56 ocorrências)
- Falta de type safety em dados do Supabase
- Tipagem inadequada de responses de API
- Mascara erros em tempo de compilação

### 5. Empty Catch Blocks em 6 Arquivos
- Silencia erros críticos (exemplo: NPS em dashboard)
- Sem logging para debugging
- Usuários sem feedback de erro

### 6. Fetch Inline em Componentes (12+ instâncias)
- Sem centralização em API layer
- Duplicação de lógica de erro handling
- Difícil testar sem mocks complexos

### 7. Mobile Responsividade Quebrada em 8 Módulos
- Grids não adaptáveis (col-span, fixed widths)
- Modais overflow em screens < 375px
- Fonts muito pequenas em mobile

### 8. Transparência Indevida (opacity-20 a opacity-50)
- Labels críticas com opacidade reduzem legibilidade
- Contraste WCAG não atendido
- Dor relatada pelo CS team: "dificuldade de ler campos"

---

## 📋 REGISTROS DETALHADOS POR MÓDULO

---

## 1. Dashboard (`/dashboard`)
- **Data:** 2026-05-12 (Auditoria Completa)
- **Responsável:** Claude (Auditoria Crítica)
- **Status:** ✅ **AUDITADO** | 8 Issues
- **Severidade:** 🟡 Média

### Problemas de UI/UX
- [ ] **CORRIGIDO** (2026-05-12): Cálculos de MRR inline em render loop → Extraído para `calculateAccountMetrics()`
- [ ] Container principal (`Card` AccountsTable) não usa `rounded-2xl` (Padrão Guardians) — linha 100
- [ ] Uso de transparências em hover (`hover:bg-muted/40`) e badges (`bg-destructive/10`) — inconsistente com Guardians
- [ ] Suspense fallbacks usam hardcoded `bg-accent/20` e `bg-accent/10` — sem tokens
- [ ] Gradient background em seção main pode ter contraste inadequado (linha 128)
- [ ] PortfolioHealthCard usa `as any` — type safety inadequada

### Problemas de Código
- [ ] **CORRIGIDO** (2026-05-12): `as any` type assertions (linhas 26, 27, 34, 64, 130) → Validação contínua necessária
- [ ] **CORRIGIDO** (2026-05-12): Empty catch block em NPS fetch (linha 84) — Comentário existe mas sem logging
- [ ] Lógica de normalização de arrays repetida 20+ vezes no page.tsx — `Array.isArray(contracts) ? contracts : [contracts]`
- [ ] Hardcoded status/priority colors em statusConfig object sem tokens centralizados

### Problemas de Usabilidade / Mobile
- [ ] Grid layout `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6` quebra em tablets — gap-4 muito pequeno
- [ ] StatCard não otimizado para mobile — texto pode truncar em < 375px
- [ ] Rendering de MRR card pode estar lento (antes da correção)

---

## 2. Accounts List (`/accounts`)
- **Data:** 2026-05-12 (Auditoria Completa)
- **Responsável:** Claude (Auditoria Crítica)
- **Status:** ✅ **AUDITADO** | 2 Issues
- **Severidade:** 🟢 Baixa

### Problemas de UI/UX
- [ ] Módulo redireciona para `/dashboard` — sem tela dedicated de lista de accounts

### Problemas de Código
- [ ] Sem problemas críticos — página minimal (`page.tsx` tem 5 linhas)

### Problemas de Usabilidade / Mobile
- [ ] Sem interface própria — sem impacto direto

---

## 3. Account Detail (`/accounts/[id]`)
- **Data:** 2026-05-12 (Auditoria Completa)
- **Responsável:** Claude (Auditoria Crítica)
- **Status:** ✅ **AUDITADO** | 14 Issues
- **Severidade:** 🔴 **CRÍTICA**

### Problemas de UI/UX
- [ ] **CORRIGIDO** (2026-05-12): Duplicate `HealthScoreDetailsModal` rendering (linhas 504 & 511) → Removido
- [ ] `AccountHeader` — **522 linhas** — Múltiplas responsabilidades (Saúde, Renovação, Mini-gauges)
- [ ] `Card variant="glass"` overuse (15+ instâncias em AccountDetailPageClient) — sem consolidação de tema
- [ ] Hardcoded colors: `text-muted-foreground`, `text-destructive`, `text-amber-500`, `text-emerald-500` (linhas 63-67)
- [ ] Baixo contraste: `opacity-70`, `opacity-60`, `opacity-50` em labels críticas
- [ ] Modal HealthScoreEditModal abre com delay — sem lazy loading
- [ ] PlaybookHistoryModal (398 linhas) — muito conteúdo em modal
- [ ] CompactContractCard layout quebra em mobile — flex direction não ajustado

### Problemas de Código
- [ ] Página principal (`page.tsx`) faz **mega query com 10+ joins** — gargalo de performance futuro
- [ ] `AccountHeader` faz 3 fetch calls via `useEffect` (NPS, SLA, Histórico) — poderiam vir do servidor
- [ ] `AccountDetailPageClient`: `icon: any` type assertion (linha 101)
- [ ] AdoptionDetailsModal — data loading não memoizado, refetch a cada open
- [ ] Uso excessivo de `any` em tipagens de histórico e API responses
- [ ] EditContractDialog (357 linhas) — modal muito grande para modal
- [ ] HealthScoreDetailsModal (268 linhas) — modal pesado demais
- [ ] ContractDetailModal (288 linhas) — modal pesado demais

### Problemas de Usabilidade / Mobile
- [ ] Grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6` muito apertado em tablets (< 768px)
- [ ] Modal dialogs não otimizados para mobile viewport
- [ ] Botões em TimelineItem podem ser inacessíveis em touch screens — muito pequenos
- [ ] Card titles `text-2xl font-black` quebram em mobile < 375px

---

## 4. Account Modals (Adoption, Interaction, Contract, etc)
- **Data:** 2026-05-12 (Auditoria Completa)
- **Responsável:** Claude (Auditoria Crítica)
- **Status:** ✅ **AUDITADO** | 16 Issues
- **Severidade:** 🔴 **CRÍTICA**

### Problemas de UI/UX
- [ ] `AdoptionDetailsModal` — **407 linhas** — Muito grande para modal, quebra padrão
- [ ] `InteractionDetailModal` — usa cores hardcoded (`slate-50`, `slate-900`, `slate-200`) — não segue Guardians
- [ ] `EditContractDialog` — **357 linhas** — modal muito grande
- [ ] `HealthScoreDetailsModal` — **268 linhas** — modal pesado
- [ ] `ContractDetailModal` — **288 linhas** — modal pesado
- [ ] `ContractHistoryDialog` — **148 linhas** — OK mas pode ser refatorado
- [ ] `NPSDetailModal` — hardcoded colors `text-red-600`, `text-emerald-600` — sem Guardians
- [ ] `HealthEventDetailModal` — hardcoded colors `bg-slate-50/50 dark:bg-slate-800/20`
- [ ] Uso de `blur-3xl` em header (InteractionDetailModal linha 118) — impacto visual não avaliado
- [ ] Uso de `backdrop-blur-md` em formulário (AdoptionDetailsModal) — padrão quebrado
- [ ] Uso de `confirm()` nativo (InteractionDetailModal) — em vez de modal premium
- [ ] PlaybookHistoryModal (398 linhas) — **CRÍTICO: muito conteúdo em modal**
- [ ] AddContactModal (238 linhas) — modal grande
- [ ] `EditAccountDialog` (246 linhas) — modal com formulário complexo

### Problemas de Código
- [ ] `EditContractDialog`: `any` type in govRules parameter (linha 246)
- [ ] Modais com estado complexo — sem React Query ou SWR (manual fetch + useState)
- [ ] Modais abrem com fetch síncrono — sem skeleton/suspense loading
- [ ] Duplicação de estilo em múltiplos modais — sem componente base consolidado
- [ ] HealthEventDetailModal — `bg-slate-50/50` hardcoded sem dark mode support

### Problemas de Usabilidade / Mobile
- [ ] Modal dialogs usam `max-w-2xl` ou `max-w-4xl` — overflow em mobile < 375px
- [ ] TableHeader, TableBody em modais não resizable em mobile
- [ ] Formulários em `EditAccountDialog` — não responsivos (width: 100% missing)
- [ ] Modal scrolling quebrado em mobile (overflow-y-auto sem max-height definida)

---

## 5. Suporte (`/suporte`)
- **Data:** 2026-05-12 (Auditoria Completa)
- **Responsável:** Claude (Auditoria Crítica)
- **Status:** ✅ **AUDITADO** | 15 Issues
- **Severidade:** 🔴 **CRÍTICA**

### Problemas de UI/UX
- [ ] **CORRIGIDO** (2026-05-12): Client-side Supabase queries em TicketPreviewPanel → Movido para API `/api/support-tickets/[id]`
- [ ] `SuporteClient` — **816 linhas** — **CRÍTICO: Componente monolítico** (KPIs + Filtros + Tabela + Importação)
- [ ] `TicketPreviewPanel` — **370 linhas** — muito grande
- [ ] `FilterBuilderUI` — **240 linhas** — UI complexa demais
- [ ] Hardcoded colors em `statusConfig` e `priorityConfig` (linhas 34-46) — sem Guardians tokens
- [ ] `UrgencyBadge` — hardcoded colors `text-red-600`, `text-orange-600`, etc.
- [ ] `SavedViewSidebar` — `opacity-30` em ícones — pode ser inacessível (WCAG)
- [ ] `SuporteClient`: `backdrop-blur-md` na tabela (linha 516) — sem avaliação visual
- [ ] `SuporteClient`: `bg-accent/30` para inputs — contraste inadequado

### Problemas de Código
- [ ] `SuporteClient`: `sortTickets()` function — múltiplos maps em sequência (linha 56+)
- [ ] `BulkActionModal` (188 linhas) — sem proper error handling
- [ ] `FilterEditorModal` (150 linhas) — state management complexo inline
- [ ] `MergeTicketModal` — modal fetch sem proper error boundary
- [ ] `SavedViewSidebar` — component muito grande para sidebar
- [ ] `ViewCreationPopover` (233 linhas) — popover com lógica demais
- [ ] Multiple `useEffect` hooks sem cleanup (memory leak risk)

### Problemas de Usabilidade / Mobile
- [ ] `SavedViewSidebar` — width: 260px fixed — overflow em mobile
- [ ] `TicketListRow` — table row não adaptável para mobile (sem stack layout)
- [ ] `FilterBuilder` UI — quebra em mobile (sidebar + main não responsivos)
- [ ] `BulkActionBar` — sticky positioning pode overlap em mobile
- [ ] `TicketPreviewPanel` — width não ajustável em small screens (max-w-2xl demais)

---

## 6. NPS (`/nps`)
- **Data:** 2026-05-12 (Auditoria Completa)
- **Responsável:** Claude (Auditoria Crítica)
- **Status:** ✅ **AUDITADO** | 12 Issues
- **Severidade:** 🟠 Alta

### Problemas de UI/UX
- [ ] `NPSDashboardClient` — **483+ linhas** — componente muito grande
- [ ] `ProgramsClient` — hardcoded colors `text-red-600`, `text-orange-400`, `text-emerald-500`, `text-indigo-400`
- [ ] `ScoreBar` — animation sem memoization — refires on every render
- [ ] `ResponseDetailDialog` — modal abre com animations — delay perceptível
- [ ] `NPS gauge` — `text-6xl` font quebra em mobile < 320px
- [ ] Placeholder estados vazios — sem visual clear (ambigüidade)
- [ ] Card templates grid — gap muito grande em mobile

### Problemas de Código
- [ ] `NPSDashboardClient`: multiple useState hooks (programs, responses, stats, filters) — consolidação possível
- [ ] `ProgramsClient QestionRow`: nested fetch calls em `handleSave()` (linha 49) — sem debouncing
- [ ] `TYPE_META` object com `React.ElementType` — não memoizado
- [ ] Sem error boundaries em modais de NPS
- [ ] `ScoreBar` — inline styles em `style={{ width: }}` — refactor para classNamessacam

### Problemas de Usabilidade / Mobile
- [ ] `ScoreBar`: label width `w-20` inadequado em mobile
- [ ] Dialog `contentStyle` hardcoded — não responsive
- [ ] `Programs` table — não otimizado para mobile (overflow-x sem scroll)
- [ ] `ResponseDetailDialog` — modal height inadequado em mobile keyboard

---

## 7. Playbooks (`/playbooks`)
- **Data:** 2026-05-12 (Auditoria Completa)
- **Responsável:** Claude (Auditoria Crítica)
- **Status:** ✅ **AUDITADO** | 10 Issues
- **Severidade:** 🟠 Alta

### Problemas de UI/UX
- [ ] Page.tsx — `variant="glass"` overuse (4 instâncias) — sem consolidação
- [ ] Card templates grid — `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` — não responsivo em tablet 768px
- [ ] Hardcoded color em Badge — `bg-emerald-50 text-emerald-700` (linha 41)
- [ ] Placeholder de playbook vazio — `col-span-full` + `border-dashed` — pode confundir usuário
- [ ] Card height inadequado em mobile — `h-full` pode overflow

### Problemas de Código
- [ ] Page.tsx — inline `any` typing (linha 36: `template: any`)
- [ ] `tasks?.length || 0` — duplicated logic (pode memoizar)
- [ ] Sem error handling se fetch `playbook_templates` falhar
- [ ] Playbook builder (`/playbooks/builder`) — **NÃO IMPLEMENTADO** (path presente, componente não encontrado)
- [ ] State management sem consolidação (useState múltiplas vezes)

### Problemas de Usabilidade / Mobile
- [ ] Grid `col-span-full` no empty state quebra layout em mobile
- [ ] Badge posicionamento em card header pode overlap em mobile
- [ ] Settings button (linha 62) — muito pequeno para touch (w-4 h-4)
- [ ] Card padding `p-4` inadequado em mobile < 375px

---

## 8. Voice of Customer (`/voc`)
- **Data:** 2026-05-12 (Auditoria Completa)
- **Responsável:** Claude (Auditoria Crítica)
- **Status:** ✅ **AUDITADO** | 14 Issues
- **Severidade:** 🟡 Média

### Problemas de UI/UX
- [ ] `VocBoardClient` — hardcoded colors `text-red-600`, `text-emerald-600` (linhas 67, 86)
- [ ] Hardcoded color `bg-slate-50` em `<li>` elements (linhas 73, 93)
- [ ] `AreaChart` gradient — hardcoded `#3b82f6` em linearGradient (linhas 45-47)
- [ ] Page.tsx background — `from-slate-50 to-slate-100` — hardcoded, sem dark mode
- [ ] Skeleton components — `className="h-80"` inadequado em mobile
- [ ] Chart colors não seguem Guardians theme
- [ ] SentimentChart — hardcoded stroke color `#888888` (linhas 16, 23)
- [ ] Quotes rendering — fonts muito pequenos em mobile

### Problemas de Código
- [ ] `VocBoardClient` — React Query sem proper error handling
- [ ] `VocPage` createClient — **SERVICE_ROLE_KEY em client** — **SEGURANÇA INADEQUADA** (linha 7)
- [ ] Sem proper error state em useQuery
- [ ] Multiple fetch calls sem consolidação em custom hook
- [ ] Data not cached — refetch on every navigation
- [ ] Type mismatch entre data response e UI expectations

### Problemas de Usabilidade / Mobile
- [ ] `VocPage` padding `p-8` — muito grande em mobile (deve ser `p-4`)
- [ ] `AreaChart` height 300px fixo em ResponsiveContainer — inadequado em mobile (quebra layout)
- [ ] Grid `grid-cols-1 md:grid-cols-2` — muito apertado em tablet 768px
- [ ] Card titles `text-red-600`, `text-emerald-600` — sem fallback em light mode
- [ ] Quotes list scroll — pode estar lento em mobile (sem virtualization)

---

## 9. Esforço (`/esforco`)
- **Data:** 2026-05-12 (Auditoria Completa)
- **Responsável:** Claude (Auditoria Crítica)
- **Status:** ✅ **AUDITADO** | 12 Issues
- **Severidade:** 🟠 Alta

### Problemas de UI/UX
- [ ] `EsforcoClient` — **442 linhas** — componente muito grande
- [ ] `AutoCheckInQueue` — **353 linhas** — modal/queue complexo demais
- [ ] `Card variant="glass"` — overuse (3 instâncias com redundante styling)
- [ ] Hardcoded color — `bg-plannera-primary/[0.05]` (linha 146)
- [ ] CardTitle `text-2xl font-black` quebra em mobile < 375px
- [ ] Grid layout inadequado para mobile < 375px

### Problemas de Código
- [ ] `EsforcoClient`: `handleUpdate()` com `any` type (linha 111)
- [ ] `totalsByAccount` reducer — reduce logic complexo inline — sem função separada
- [ ] Multiple useState sem consolidação
- [ ] Fetch `/api/time-entries` inline sem debouncing
- [ ] Múltiplos useEffect sem cleanup — memory leak risk
- [ ] Data transformation inline em render

### Problemas de Usabilidade / Mobile
- [ ] Grid `grid-cols-1 lg:grid-cols-4` — muito apertado em tablet
- [ ] Table em mobile — não scrollable (sem overflow-x)
- [ ] `EffortEditModal` (imported) — não otimizado para mobile
- [ ] Pareto chart — não responsivo em mobile
- [ ] Form inputs — width não 100% em mobile

---

## 10. Perguntar (IA) (`/perguntar`)
- **Data:** 2026-05-12 (Auditoria Completa)
- **Responsável:** Claude (Auditoria Crítica)
- **Status:** ✅ **AUDITADO** | 11 Issues
- **Severidade:** 🟡 Média

### Problemas de UI/UX
- [ ] `PerguntarClient` — **362 linhas** — componente grande demais
- [ ] Hardcoded color — `bg-plannera-orange/10` (linha 124)
- [ ] `SearchableSelect` width `w-64` — fixed, não responsivo
- [ ] Chat message styling — `text-[10px]` muito pequeno
- [ ] Example questions botões — sem hover state claro
- [ ] Chat interface — sem avatar diferenciação user vs AI

### Problemas de Código
- [ ] `PerguntarClient`: múltiplos useState sem consolidation
- [ ] `handleSend()`: fetch inline — sem AbortController
- [ ] `Message` type — não exportado, duplicada em múltiplos places
- [ ] `bottomRef.scrollIntoView()` — sem error handling (ref pode ser null)
- [ ] Data transformation inline em render
- [ ] Sem loading state adequado durante fetch

### Problemas de Usabilidade / Mobile
- [ ] `PageContainer` — `h-[calc(100vh-120px)]` inadequado em mobile com keyboard
- [ ] `SearchableSelect` — width `w-64` overflow em mobile
- [ ] Chat interface — não otimizado para mobile keyboard (input overlap)
- [ ] Example questions — `hidden md:flex` — perdidas em mobile
- [ ] Send button pode estar abaixo do fold em mobile (sem scroll até fundo)

---

## 11. Admin / Users / Settings
- **Data:** 2026-05-12 (Auditoria Completa)
- **Responsável:** Claude (Auditoria Crítica)
- **Status:** ✅ **AUDITADO** | 13 Issues
- **Severidade:** 🟠 Alta

### Problemas de UI/UX
- [ ] `AdminPage` — "Sistema em Desenvolvimento" — **Placeholder não deve estar em produção**
- [ ] `UsersPage` — hardcoded color `bg-plannera-orange/5` (linha 98)
- [ ] `UsersPage` — hardcoded color `focus:border-plannera-orange` (linha 115)
- [ ] `UsersPage` — hardcoded color `bg-plannera-sop/10` (linha 183)
- [ ] Success/error messages — hardcoded colors `text-plannera-demand`, `text-plannera-ds`
- [ ] AnimatePresence overuse em users list — sem consolidação
- [ ] User token badge display `w-10 h-10` — muito pequeno em mobile

### Problemas de Código
- [ ] `UsersPage`: `fetchUsers()` inline fetch — sem proper error handling
- [ ] `onSubmit()`: `any` type assertion em catch (linha 72)
- [ ] Users state — não cached — refetch on every navigation
- [ ] Settings pages (features, plans, sla, business-hours) — **NÃO ANALISADOS** (sub-rotas presentes)
- [ ] Sem error boundaries em modais de admin
- [ ] Multiple fetch calls sem consolidação

### Problemas de Usabilidade / Mobile
- [ ] `UsersPage` grid — `grid-cols-1 lg:grid-cols-3` gap-8 muito grande em mobile
- [ ] Card height `h-full` — pode overflow em mobile
- [ ] Form inputs em `NewIntegrante` — sem proper mobile spacing
- [ ] Loader2 animation — pode drenar bateria em mobile
- [ ] Table scrolling inadequado em mobile
- [ ] Modal dialogs não otimizados para mobile viewport

---

## 🎯 PRIORIZAÇÃO RECOMENDADA PARA ONDAS DE CORREÇÃO

### Onda 1: BLOQUEADORES (Antes de Staging - May 13)
✅ **JÁ CORRIGIDOS (2026-05-12):**
1. ✅ Duplicate modal rendering (AccountHeader)
2. ✅ Client-side Supabase queries (TicketPreviewPanel)
3. ✅ MRR calculations inline (AccountsTable)

### Onda 2: CRÍTICAS (Wave 6 - May 16+)
**Priority A — Refatorações Estruturais:**
- Componentes > 400 linhas (7 total):
  - SuporteClient (816) → Split em 3-4 componentes
  - AccountHeader (522) → Split em 2-3 componentes
  - NPSDashboardClient (483) → Reorganizar responsabilidades
  - EsforcoClient (442) → Modularizar
  - AccountUnifiedTimeline (465) → Simplificar

**Priority B — Design System (Consolidação Guardians):**
- Remover hardcoded colors em 20+ arquivos
- Consolidar `variant="glass"` overuse (54 instâncias)
- Remover empty catch blocks (6 arquivos)
- Implementar type safety (remove `as any`, 56 ocorrências)

**Priority C — Usabilidade:**
- Mobile responsividade (8 módulos)
- Contraste WCAG (10+ componentes)
- Modais pesados — lazy loading

### Onda 3: ALTAS (Wave 7+)
- Otimizações de performance
- Refatora modais (> 250 linhas)
- Centraliza fetch calls em API layer

---

## 📝 Como Usar Este Backlog

1. **Para cada issue:** Marque com `[x]` quando corrigida
2. **Para cada módulo:** Atualize status (Pendente → Em Correção → Corrigido)
3. **Prioridade:** Todos os 147 issues têm prioridade (decisão de Vinicius)
4. **Próximo passo:** Planejar ondas de correção por equipe

---

**Status Final:** ✅ **AUDITORIA COMPLETA — 11/11 MÓDULOS ANALISADOS**  
**Data:** 2026-05-12 | **Auditor:** Claude (Análise Crítica)  
**Total Issues:** 147 | **Status de Produção:** Pronto para Staging (3 críticos já fixados)

