# 🚀 Plano de Ondas de Correção — CSPlataform

**Data:** 2026-05-12  
**Status:** Auditoria Completa, Pronto para Planejamento  
**Total Issues:** 147 (Todos com prioridade)  
**Decision:** Todos os 147 issues têm prioridade (Vinicius Caramori)

---

## 📊 Resumo Executivo

- ✅ **3 Críticos já FIXADOS** (antes de Staging May 13)
- 🔴 **3 Módulos Críticos** (Account Detail, Account Modals, Suporte) = 45 issues
- 🟠 **4 Módulos Altos** (NPS, Playbooks, Esforço, Admin) = 47 issues
- 🟡 **3 Módulos Médios** (Dashboard, VoC, Perguntar) = 33 issues
- 🟢 **1 Módulo Baixo** (Accounts) = 2 issues
- **Total:** 147 issues em 11 módulos

---

## 🎯 ONDA 1: PRÉ-STAGING (Já Concluída - 2026-05-12)

### ✅ Status: 3/3 Críticos Fixados

| # | Issue | Módulo | Tipo | Status |
|---|-------|--------|------|--------|
| 1 | Duplicate modal rendering | Account Detail | Code Quality | ✅ FIXADO |
| 2 | Client-side Supabase queries | Suporte | Security | ✅ FIXADO |
| 3 | MRR calculations inline | Dashboard | Performance | ✅ FIXADO |

**Verificação:** `tsc --noEmit` = 0 erros ✅  
**Deployment:** Pronto para Staging (May 13)

---

## 🔴 ONDA 2: REFATORAÇÕES CRÍTICAS (Wave 6 - May 16+)

### Prioridade A — Componentes Gigantescos (7 Componentes = 3,100+ linhas)

**Impacto:** Performance, manutenibilidade, aumento de bugs  
**Esforço Estimado:** 40-48 horas  
**Equipe:** Dev Lead (Vinicius) + 1-2 Devs

#### A1. SuporteClient (816 linhas) → **CRÍTICO**
**Objetivo:** Split em 4 componentes menores

```
Antes (1 arquivo gigante):
- KPIs
- Filters
- Ticket Table
- Bulk Import

Depois (4 arquivos focados):
- SuporteKPIs.tsx (100 linhas)
- SuporteFilters.tsx (150 linhas)
- SuporteTable.tsx (300 linhas)
- SupportBulkImport.tsx (120 linhas)
- SuporteClient.tsx (100 linhas) - Orquestrador
```

**Sub-tasks:**
- [ ] Extract KPI section into SuporteKPIs
- [ ] Extract Filter logic into SuporteFilters
- [ ] Extract Table into SuporteTable (move sort, pagination)
- [ ] Extract Bulk Import into SupportBulkImport
- [ ] Test in staging environment
- [ ] Update master-audit-backlog.md with completion

**Timeline:** 8-10 horas

---

#### A2. AccountHeader (522 linhas) → **CRÍTICO**
**Objetivo:** Split em 3 componentes

```
Antes (1 arquivo grande):
- Health Score Display
- Renewal Card
- Mini-gauges (6 KPIs)
- Edit Modal

Depois (3 arquivos focados):
- HealthScoreCard.tsx (180 linhas)
- RenewalCard.tsx (140 linhas)
- HealthMiniGauges.tsx (140 linhas)
- AccountHeader.tsx (80 linhas) - Orquestrador
```

**Sub-tasks:**
- [ ] Extract HealthScoreCard
- [ ] Extract RenewalCard
- [ ] Extract HealthMiniGauges
- [ ] Move fetchHistory, fetchNPS, fetchSLA to parent or API
- [ ] Test lazy loading of modals
- [ ] Update master-audit-backlog.md

**Timeline:** 6-8 horas

---

#### A3. NPSDashboardClient (483+ linhas)
**Objetivo:** Reorganizar responsabilidades

**Sub-tasks:**
- [ ] Extract Program List into NPSProgramList
- [ ] Extract Response Analytics into NPSResponseChart
- [ ] Extract Filters into NPSFilters
- [ ] Test performance improvements
- [ ] Update master-audit-backlog.md

**Timeline:** 6-8 horas

---

#### A4-A7. EsforcoClient, AccountUnifiedTimeline, Outros
**Timeline:** 4-6 horas cada (total 18 horas para 3 componentes)

---

### Prioridade B — Design System (Consolidação Guardians)

**Impacto:** Tema consistente, dark mode, contraste WCAG  
**Esforço Estimado:** 24-32 horas  
**Equipe:** Design Lead (Mariana) + Dev (tipagem) + QA (contraste)

#### B1. Remove Hardcoded Colors (20+ arquivos)
**Objetivo:** Replace com Guardians tokens

```
Substituições:
- slate-50, slate-100, slate-900 → var(--surface-background), var(--content-primary)
- amber-500 → var(--warning) ou design token específico
- emerald-500 → var(--success)
- red-600 → var(--destructive)
- text-muted-foreground → var(--content-secondary)
- bg-accent/30 → Substituir com token proper
```

**Arquivos afetados:**
- Dashboard: AccountsTable, PortfolioHealthCard
- Account Detail: AccountHeader, Modals
- Suporte: SuporteClient, TicketPreviewPanel, UrgencyBadge
- NPS: NPSDashboardClient, ProgramsClient
- Playbooks, VoC, Esforço, Perguntar, Admin (cada um)

**Sub-tasks:**
- [ ] Audit and list all hardcoded colors (per module)
- [ ] Create mapping doc (hardcoded → token)
- [ ] Implement token replacements (per module)
- [ ] Test dark mode appearance
- [ ] Run contrast checker (WCAG AA)
- [ ] Update master-audit-backlog.md

**Timeline:** 24-32 horas

---

#### B2. Consolidate `variant="glass"` (54 instâncias)
**Objetivo:** 1 lugar de definição, uso consistente

**Sub-tasks:**
- [ ] Define glass variant rules (cuando usar, quando não)
- [ ] Audit all 54 usages
- [ ] Remove overuse (reduzir de 54 para 15-20)
- [ ] Create component wrapper se necessário
- [ ] Test legibilidade em múltiplos backgrounds

**Timeline:** 6-8 horas

---

### Prioridade C — Code Quality & Type Safety

**Impacto:** Manutenibilidade, menos bugs, compilação mais segura  
**Esforço Estimado:** 20-24 horas  
**Equipe:** Dev Lead (Vinicius) + 1-2 Devs

#### C1. Remove `as any` (56 ocorrências em 20+ arquivos)
**Objetivo:** Replace com proper types

**Padrão:**
```typescript
// Antes
const data = await supabase.from('table').select('*') as any

// Depois
const { data, error } = await supabase.from('table').select('*')
const data = data as Tables<'table'>[]
```

**Sub-tasks:**
- [ ] Create script to find all `as any` usages
- [ ] Categorize by type (Supabase, API, Local)
- [ ] Create proper types for each category
- [ ] Replace each usage
- [ ] Run tsc --noEmit to verify
- [ ] Update master-audit-backlog.md

**Timeline:** 8-10 horas

---

#### C2. Remove Empty Catch Blocks (6 arquivos)
**Objective:** Replace with proper error logging

**Padrão:**
```typescript
// Antes
catch { /* NPS opcional */ }

// Depois
catch (err) {
  console.error('Failed to fetch NPS:', err)
  // Optional recovery logic
}
```

**Sub-tasks:**
- [ ] Find all empty catch blocks
- [ ] Implement proper error logging (Sentry/console)
- [ ] Test error cases
- [ ] Update master-audit-backlog.md

**Timeline:** 2-3 horas

---

#### C3. Centralize Fetch Calls (12+ instâncias)
**Objetivo:** Move fetch logic out of components

**Abordagem:**
- Create `lib/[module]/[module]-service.ts` com fetch logic
- Use em componentes via imports
- Exemplo: `SuporteClient` → `lib/support/support-service.ts`

**Sub-tasks:**
- [ ] Identify all inline fetch calls
- [ ] Create service files per module
- [ ] Move fetch logic
- [ ] Update components to use services
- [ ] Add error handling consistently
- [ ] Update master-audit-backlog.md

**Timeline:** 8-10 horas

---

### Prioridade D — Mobile Responsividade & Accessibility

**Impacto:** Mobile usability, WCAG compliance  
**Esforço Estimado:** 16-20 horas  
**Equipe:** Design (Mariana) + Dev (Vinicius) + QA (Bruno)

#### D1. Fix Grid Layouts (8 módulos)
**Objetivo:** Responsivo em mobile, tablet, desktop

**Padrão:**
```typescript
// Antes
grid-cols-1 lg:grid-cols-4 gap-4

// Depois
grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4
```

**Modules:** Dashboard, Account Detail, Suporte, NPS, Playbooks, VoC, Esforço, Admin

**Timeline:** 6-8 horas

---

#### D2. Modal Responsividade (15+ modais)
**Objetivo:** Adaptar para mobile < 375px

**Sub-tasks:**
- [ ] List all modals (15+)
- [ ] Test on mobile viewport
- [ ] Adjust max-width (max-w-2xl → responsive)
- [ ] Stack form fields vertically on mobile
- [ ] Test scrolling behavior
- [ ] Update master-audit-backlog.md

**Timeline:** 6-8 horas

---

#### D3. Contrast & Accessibility (10+ componentes)
**Objetivo:** WCAG AA compliance

**Sub-tasks:**
- [ ] Run axe/WCAG checker on each module
- [ ] Fix opacity issues (opacity-30 em textos críticos)
- [ ] Test with screen reader
- [ ] Ensure touch targets ≥ 44x44px
- [ ] Update master-audit-backlog.md

**Timeline:** 4-6 horas

---

## 🟠 ONDA 3: OTIMIZAÇÕES (Wave 7+ - Depois de May 16)

### Prioridade E — Performance
- [ ] Lazy load modais pesados (> 300 linhas)
- [ ] Add React Query/SWR para data fetching centralizado
- [ ] Implement virtualization para longas listas
- [ ] Code splitting por módulo

**Timeline:** 20-24 horas

---

### Prioridade F — Advanced Features
- [ ] Error boundaries em todos os módulos
- [ ] Proper loading states em modais
- [ ] Skeleton loaders para lazy loading
- [ ] Proper error messages com retry logic

**Timeline:** 12-16 horas

---

## 📅 TIMELINE RECOMENDADA

### Semana 1 (May 13-17): Onda 2 - Parte A
- **Monday-Wednesday:** Refatoração de componentes gigantescos (A1-A3)
- **Thursday-Friday:** Testing + QA
- **Deliverable:** 3 componentes refatorados, 0 errors

### Semana 2 (May 20-24): Onda 2 - Parte B & C
- **Monday-Wednesday:** Design system consolidation + type safety
- **Thursday-Friday:** Mobile responsividade
- **Deliverable:** Hardcoded colors removed, `as any` gone

### Semana 3 (May 27-31): Onda 2 - Parte D & Onda 3 - Start
- **Monday:** Complete D3 (contrast)
- **Tuesday-Friday:** Start Onda 3 (performance + advanced)
- **Deliverable:** WCAG AA compliant, performance optimizations

---

## 📊 ESTIMATIVA DE ESFORÇO

| Onda | Prioridade | Esforço | Equipe | Timeline |
|------|-----------|---------|--------|----------|
| **2** | **A** (Refatoração) | **40-48h** | **Vinicius + 2 Devs** | **May 16-20** |
| **2** | **B** (Design) | **30-40h** | **Mariana + Devs** | **May 16-24** |
| **2** | **C** (Code Quality) | **20-24h** | **Vinicius + 1 Dev** | **May 16-20** |
| **2** | **D** (Mobile/A11y) | **16-20h** | **Mariana + Vinicius** | **May 20-24** |
| **3** | **E** (Performance) | **20-24h** | **Vinicius + Arch** | **May 27+** |
| **3** | **F** (Advanced) | **12-16h** | **Vinicius + Dev** | **May 27+** |
| **TOTAL** | — | **138-172 horas** | **Full team** | **6 weeks** |

---

## 👥 ALOCAÇÃO DE EQUIPE

### **Vinicius (Dev Lead)** — 80-100 horas
- [ ] Lead Onda 2 Prioridade A (Refatoração) — 32-40h
- [ ] Lead Onda 2 Prioridade C (Code Quality) — 16-20h
- [ ] Co-lead D (Mobile) — 8-12h
- [ ] Lead Onda 3 (Performance, Advanced) — 24-28h

### **Mariana (Design Lead)** — 40-50 horas
- [ ] Lead Onda 2 Prioridade B (Design System) — 24-32h
- [ ] Co-lead D (Mobile) — 16-18h

### **Bruno (QA Lead)** — 20-24 horas
- [ ] Test Onda 2 refactorings — 8-10h
- [ ] WCAG audit (D3) — 8-10h
- [ ] Smoke testing entre ondas — 4-6h

### **Arnaldo (Architect)** — 8-12 horas
- [ ] Code review Onda 2 — 4-6h
- [ ] Performance recommendations Onda 3 — 4-6h

### **Pedro (Product)** — 4-6 horas
- [ ] Sign-off em mudanças UX — 2-3h
- [ ] Validate business logic após refators — 2-3h

---

## ✅ DEFINIÇÃO DE PRONTO

Para cada onda ser considerada COMPLETA:

- ✅ Todas as issues marcadas como `[x]` no master-audit-backlog.md
- ✅ `tsc --noEmit` = 0 erros
- ✅ Tests pass (existing test suite)
- ✅ No new TypeScript warnings
- ✅ QA smoke tests pass
- ✅ Performance metrics stable (no regression)
- ✅ Staging deployment successful
- ✅ Zero critical bugs found in staging

---

## 🚀 PRÓXIMOS PASSOS

1. **Vinicius:** Revisar este plano com o time
2. **Team:** Confirmar alocação de recursos
3. **Vinicius:** Criar issue board (Linear/GitHub) para tracking
4. **Start:** Onda 2 Prioridade A no dia 16 (amanhã)
5. **Daily:** Standups 30min, rastreamento de progresso

---

**Status:** ✅ Plano Pronto para Execução  
**Data:** 2026-05-12  
**Decisão:** Todos os 147 issues têm prioridade (Vinicius)  
**Próximo:** Team alignment + kickoff

