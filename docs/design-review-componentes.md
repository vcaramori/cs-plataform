# Design Review — Componentes CS-Continuum

> Levantamento crítico gerado em 2026-04-22. Uso interno para decisões de redesign.

---

## Resumo Executivo

O projeto tem ~100 arquivos `.tsx` organizados em App Router pages + componentes. A arquitetura de alto nível é clara, mas existem padrões problemáticos repetidos que vão comprometer escalabilidade e manutenção conforme o produto cresce.

---

## 1. Layout & Providers

### Arquivos
`app/layout.tsx`, `app/(dashboard)/layout.tsx`, `ClientDashboardLayout.tsx`, `Sidebar.tsx`, `ReactQueryProvider.tsx`

### O que fazem
- **RootLayout**: setup global — fontes Outfit + Inter, ThemeProvider, TooltipProvider, Sonner toaster
- **DashboardLayout**: auth check server-side, protege rotas `/dashboard/*`
- **ClientDashboardLayout**: estado do sidebar em mobile, overlay, notificações
- **Sidebar**: navegação com collapse animation, submenu settings, perfil do usuário
- **ReactQueryProvider**: configura TanStack Query (staleTime 60s, retry 1)

### Problemas
- Auth sem cache: `getSupabaseServerClient()` é chamado a cada layout render, sem aproveitamento do cache do App Router
- Sidebar sem swipe gesture em mobile (só botão)
- Notification center renderizada mas implementação incompleta

---

## 2. AccountForm

**Arquivo:** `src/app/(dashboard)/accounts/new/components/AccountForm.tsx` (~908 linhas)

### O que faz
Formulário CRUD completo para accounts (LOGOs). 4 seções: Identificação, Localização, Gestão Comercial, Faturamento. Gerencia contratos dinamicamente com `useFieldArray`.

### Problemas
- **CEP sem debounce**: `watch()` trigga fetch a cada keystroke — risco real de rate limit na ViaCEP
- **SLA inline massivo**: 150+ linhas de markup para SLA por contrato dentro do mesmo arquivo. Deveria ser um sub-componente
- **Erros silenciados**: `loadContractSLA` ignora erros com `catch { /* silently ignore */ }` — usuário não sabe que campos estão stale
- **`as any` explícito**: schema complexo quebra inferência do Zod resolver
- **Sem versioning de contrato**: mudanças sobrescrevem sem histórico

---

## 3. AccountHeader

**Arquivo:** `src/app/(dashboard)/accounts/[id]/components/AccountHeader.tsx` (~497 linhas)

### O que faz
Exibe resumo de saúde da account com KPIs: MRR, renovação, health score, NPS, SLA. Inclui shadow score gerado por IA.

### Problemas
- **3 fetches sequenciais**: `fetchHistory()`, `fetchNPS()`, `fetchSLA()` sem `Promise.all` — waterfall desnecessário
- **5 `dynamic()` separados do Recharts**: deveria ser um único import com destructuring
- **Shadow score sem timeout**: se falhar, fica em estado "Proc." para sempre
- **`<HealthScoreDetailsModal>` renderizado 2x**: copy-paste bug
- **Fonte da verdade ambígua**: `currentAdoptionScore` prop vs `latestHealthScore.engagement_component` — qual prevalece?

---

## 4. AccountChat

**Arquivo:** `src/app/(dashboard)/accounts/[id]/components/AccountChat.tsx` (~178 linhas)

### O que faz
Chat flutuante de IA para Q&A sobre a account.

### Problemas
- **Sem streaming**: espera resposta completa antes de renderizar
- **Sem persistência**: conversa some ao refresh
- **`document.body.style.overflow` frágil**: se houver múltiplas modals abertas, conflita
- **Sem rate limiting**: usuário pode spammar requests

---

## 5. AccountDetailPageClient

**Arquivo:** `src/app/(dashboard)/accounts/[id]/components/AccountDetailPageClient.tsx` (~290 linhas)

### O que faz
Layout de 3 colunas para a detail page — timeline, success plan, adoption, tickets.

### Problemas
- **9 props passados por drilling**: sem Context API, se mudar estrutura tudo quebra em cascata
- **Sem error boundaries**: crash em qualquer filho derruba toda a página
- **Grid com frações não-redondas** (`31fr 45fr 24fr`): pode quebrar em breakpoints intermediários

---

## 6. AccountUnifiedTimeline

**Arquivo:** `src/app/(dashboard)/accounts/[id]/components/AccountUnifiedTimeline.tsx` (~180 linhas)

### O que faz
Timeline unificada de interações + time entries com filtro de tipo.

### Problemas
- **Merge sem memoização**: combina arrays a cada render sem `useMemo`
- **Sem paginação**: mostra apenas últimos 10 itens, sem indicação ao usuário
- **`router.refresh()` para state local**: dispara refetch server-side para dados que já estão no client
- **Cores hardcoded**: `plannera-orange`, `plannera-sop` sem fallback

---

## 7. ContactsPowerMap

**Arquivo:** `src/app/(dashboard)/accounts/[id]/components/ContactsPowerMap.tsx` (~204 linhas)

### O que faz
Mapa de stakeholders com níveis de influência (Champion, Neutral, Detractor, Blocker).

### Problemas
- **3 fontes de avatar**: LinkedIn, `photo_url`, initials — sem precedência clara
- **Influence config não tem fallback**: novo nível quebra silenciosamente
- **Sem edit/delete inline de contato**: obriga usar modal separado

---

## 8. AccountsTable

**Arquivo:** `src/app/(dashboard)/accounts/page-components/AccountsTable.tsx` (~232 linhas)

### O que faz
Tabela de LOGOs com busca, filtro por segmento e sort.

### Problemas
- **Filtro sem memoização**: com 100 accounts × 5 contratos cada, recalcula a cada render
- **Sem virtualização**: 500+ accounts = scroll travado
- **`String.includes()` sem normalização diacrítica**: "São Paulo" ≠ "Sao Paulo"
- **Discrepancy alert sem contexto**: ícone animado sem tooltip explicando o que é a discrepância

---

## 9. PortfolioHealthCard

**Arquivo:** `src/app/(dashboard)/dashboard/components/PortfolioHealthCard.tsx` (~191 linhas)

### O que faz
Grid de 6 KPIs com animação odometer: MRR, contratos ativos, health score médio, contas em risco, renewals, NPS.

### Problemas
- **Odometer reinicia do zero** a cada remount (sem persistência entre navegações)
- **MRR sem formatação K**: valores entre 1k–999k mostram inteiro ao invés de "500k"
- **Color split frágil**: `bgClass.split(' ')` assume sempre 2 classes
- **Sem comparação de período**: não há delta vs mês anterior

---

## 10. SuporteClient

**Arquivo:** `src/app/(dashboard)/suporte/components/SuporteClient.tsx` (~577 linhas)

### O que faz
Gestão de tickets com import via CSV, texto ou PDF + listagem com filtros.

### Problemas
- **3 endpoints de import**: PDF, text/AI, CSV com formatos de request/response inconsistentes
- **Local state stale pós-import**: filtra array local sem refetch do servidor
- **Exemplos de formato hardcoded**: desincronizados do parser do backend
- **Sem detecção de duplicatas** no import
- **Sync de email sem feedback** se falhou

---

## 11. NPSDashboardClient

**Arquivo:** `src/app/(dashboard)/nps/components/NPSDashboardClient.tsx` (~622 linhas)

### O que faz
Dashboard NPS com filtros, stats, pareto chart e carrossel de respostas.

### Problemas
- **12 `useState` hooks**: deveriam virar `useReducer` ou custom hook
- **`useEffect` com dependências gigantes** recalcula pareto/chart toda vez que qualquer filtro muda
- **ResponseCarousel**: `setInterval` sem cleanup pode vazar memória se componente desmontar
- **Gauge default silencioso**: `score ?? 75` não avisa que dado está ausente
- **Goal dialog** sem validação de range (-100 a 100)
- **Export limitado**: apenas últimos 12 itens por slice

---

## 12. EsforcoClient

**Arquivo:** `src/app/(dashboard)/esforco/components/EsforcoClient.tsx` (~367 linhas)

### O que faz
Registro de time entries via linguagem natural + listagem agrupada por conta.

### Problemas
- **Parse 100% dependente do backend**: sem fallback se IA falhar
- **Suggestions sempre iguais**: 4 exemplos fixos, sem base no histórico do usuário
- **Entry órfã**: se `account_id` não existe mostra "LOGO removido" sem notificar o usuário
- **Cap local de 50 itens** pode divergir do servidor

---

## 13. SLATimer

**Arquivo:** `src/app/(dashboard)/accounts/[id]/components/SLATimer.tsx` (~54 linhas)

### O que faz
Countdown para deadline de SLA com cores de urgência.

### Problemas
- **Intervalo fixo de 60s**: impreciso para deadlines < 1h (deveria ser dinâmico)
- **Timezone implícito**: `new Date(deadline)` sem handling explícito de UTC
- **Sem alerta visual/sonoro** quando deadline passa

---

## 14. Sidebar

**Arquivo:** `src/app/(dashboard)/components/Sidebar.tsx` (~279 linhas)

### Problemas
- **`NavLink` definido inline**: recriado a cada render do Sidebar — deveria ser extraído ou memoizado
- **Logout sem error handling**: `router.push('/login')` executa mesmo se `signOut` falhar
- **Settings submenu**: lógica de `pathname.startsWith()` pode ativar item errado em rotas aninhadas
- **Sem collapse do submenu ao colapsar sidebar**: UX inconsistente

---

## Padrões Anti-Pattern Recorrentes

| Anti-pattern | Onde aparece | Consequência |
|---|---|---|
| Props drilling sem Context | AccountDetailPageClient, SuporteClient, NPSDashboardClient | Fragilidade estrutural |
| Fetches sequenciais sem `Promise.all` | AccountHeader (3x), NPSDashboard | Latência desnecessária (waterfall) |
| Sem error boundaries | Todos client components | Crash de um filho derruba tudo |
| `as any` / disable eslint | AccountForm, múltiplos | Perde segurança de tipos |
| Cálculos pesados sem `useMemo` | AccountsTable, UnifiedTimeline | Rerenders desnecessários |
| `setInterval` sem cleanup | NPSDashboard, SLATimer | Memory leak potencial |
| Valores hardcoded mágicos | PortfolioHealthCard, Sidebar | Frágil a mudanças de config |

---

## Problemas por Severidade

| Severidade | Problema | Impacto |
|---|---|---|
| CRÍTICO | Props drilling sem Context | Escalabilidade |
| CRÍTICO | Sem error boundaries em nenhum client component | Estabilidade |
| CRÍTICO | Fetches sequenciais no AccountHeader | UX / latência |
| CRÍTICO | 12 useState no NPSDashboard | Manutenibilidade |
| ALTO | CEP sem debounce | Rate limit / bugs de timing |
| ALTO | Sem virtualização nas tabelas | Performance com dados reais |
| ALTO | `as any` espalhado | Bugs silenciosos em produção |
| MÉDIO | SLATimer timezone implícito | Inconsistência de dados |
| MÉDIO | Cálculos inline sem memoização | Performance em renders frequentes |

---

## Notas para Redesign

- Os componentes de account (`AccountHeader`, `AccountDetailPageClient`, `AccountUnifiedTimeline`) compartilham o mesmo dado `account` mas cada um faz seu próprio fetch. Um Context de account resolveria isso e abriria caminho para cache unificado.
- A separação entre `interactions` e `efforts` na timeline não é explicada ao usuário — pode ser oportunidade de redesign de UX.
- O fluxo de import de tickets (CSV / texto / PDF) poderia virar um wizard em etapas em vez de um tab com opções.
- O NPSDashboard tem densidade de estado muito alta — candidato a ser dividido em componentes menores com state próprio (filtros, pareto, carousel).
- AccountChat tem potencial de ser um painel persistente global (tipo Intercom), não apenas por conta individual.
