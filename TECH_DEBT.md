# Registro de Débitos Técnicos — cs-plataform

Levantamento inicial em 2026-06-01. Marque `[x]` ao resolver. Severidade:
🔴 crítico · 🟠 alto · 🟡 médio · 🟢 baixo.

> Rodada 1 (chore/tech-debt-round1) já resolveu: #5, #6, #13. Ver seção "Resolvido".

## 🔴 Críticos (correção / segurança)

- [x] **#1 — `ignoreBuildErrors` no `next.config.mjs`.** ✅ Resolvido: `database.types.ts` regenerado, **0 erros de TS** e a flag está `false` — o build agora valida tipos de verdade. Ver "Resolvido — Rodada 4".
- [x] **#2 — Endpoint `exec_sql` arbitrário.** Ver "Resolvido — Rodada 2".
- [x] **#3 — Fallback silencioso de credenciais.** Ver "Resolvido — Rodada 2".
- [ ] **#4 — RLS a auditar.** ~20 migrations com `USING (true)`/service_role. Confirmar quais são realmente só service_role vs. expostas a `authenticated` (ex.: policy "Service role can do everything" em `profiles`). _Ação:_ auditoria de RLS.

## 🟠 Altos (dados / comportamento incorreto)

- [x] **#5 — Placeholders chumbados em CS-Ops.** Ver "Resolvido".
- [x] **#6 — Stubs Wave 5/6 retornando dados inventados.** Ver "Resolvido".

## 🟡 Médios (qualidade / manutenção)

- [~] **#7 — Testes automatizados.** _Iniciado:_ Vitest configurado (`vitest.config.ts`, scripts `test`/`test:watch`) + 6 testes do `ProductivityService` (períodos e cálculo com dados vazios). Falta ampliar cobertura (cs-ops-service, SLA, health-score). Ver "Resolvido — Rodada 5".
- [~] **#8 — `as any`** (padrão `const db = supabase as any`). _Em andamento (303 → 284):_ removido o cast de 14 arquivos onde o client tipado já compila; mantido (com comentário `TECH_DEBT #8`) em 4 onde há divergência real de schema. _Ação restante:_ continuar removendo em blocos, sempre com `tsc` a 0. Ver "Resolvido — Rodada 6".
  - **Bugs latentes revelados pelo cast** (ver #18/#19/#20 abaixo).
- [x] **#18 — `AtividadesClient.tsx`** usava `db.rpc` como valor de filtro na lixeira (visão de time). Corrigido: filtro de dono aplicado só quando `teamFilter==='mine'`. Ver "Resolvido — Rodada 7".
- [x] **#19 — `health-score-daily/route.ts`** filtrava por `accounts.contract_status` (inexistente) → o cron falhava. Corrigido: processa todas as contas. Ver "Resolvido — Rodada 7".
- [x] **#20 — `calcAdoptionScore` (`weighted-score.ts`)** lia um JSONB inexistente em `adoption_metrics` e sempre retornava 50. Reescrito para usar `account_feature_adoption` (% adotadas). Ver "Resolvido — Rodada 7".
- [ ] **#20b — RPC SQL `calc_adoption_score`** tem o mesmo defeito do #20 (lê `adoption_metrics.adoption_metrics` JSONB inexistente). Se o cálculo de health usar o RPC em vez da função TS, ainda retorna 50. _Ação:_ corrigir via migration (apontar para `account_feature_adoption`).
- [~] **#9 — `console.log/debug`.** _Quase fechado:_ removidas 101 ocorrências de uma linha (114 → **13**); restam só casos multilinha/inline. `console.error/warn` mantidos. _Ação:_ tratar os 13 restantes e, idealmente, adotar um logger com nível.
- [x] **#10 — Tipos duplicados `CockpitData`.** Ver "Resolvido — Rodada 2".
- [x] **#11 — Rota fantasma `cs-ops/tasks`.** Não existe em `src/` — é apenas artefato de cache em `.next/`. Resolve com `rm -rf .next`. Sem mudança de código necessária.
- [ ] **#12 — `csm_scorecard`/`team_velocity` nunca populadas.** Tabelas-snapshot sem gravação → sem histórico/tendência real. _Ação:_ popular via cron (`shadow-score-weekly`) ou remover.
- [x] **#6b — Filtro de adoção no-op.** Ver "Resolvido — Rodada 2".

## 🟢 Baixos (higiene)

- [x] **#13 — `supabase/.temp/` versionado.** Ver "Resolvido".
- [ ] **#14 — Pasta-fonte `Logotipos/` na raiz.** Já no `.gitignore`; remover do disco quando conveniente (cópias usadas estão em `public/brand`).
- [ ] **#15 — TODO real:** `TicketPreviewPanel.tsx:41` — collision detection via Supabase Presence (edição concorrente de tickets sem proteção).
- [ ] **#16 — ~42 `eslint-disable`** (muitos `no-img-element`: `<img>` em vez de `next/image`). _Ação:_ revisar caso a caso.
- [~] **#17 — Documentação divergente.** _Parcial:_ adicionado "Mapa de Módulos" canônico e atualizado no `README.md` (todas as rotas/menu atuais) + corrigida a rota stale `/product` → `/adoption`/`/settings/products`. Resta enxugar o changelog/roadmap histórico longo. Ver "Resolvido — Rodada 3".

## Nota positiva
Os 16 crons estão autenticados via header `x-api-secret` contra `API_SECRET` — não são endpoints abertos.

---

## Resolvido

### Rodada 7 — bugs latentes revelados pelo #8 (2026-06-01)
- **#18:** `AtividadesClient` — query da lixeira na visão de time não filtra mais por
  `id == db.rpc` (função usada como valor); agora aplica `csm_id` só quando "mine".
- **#19:** `health-score-daily` — removido filtro `accounts.contract_status` (coluna
  inexistente que fazia a query/cron falhar); processa todas as contas.
- **#20:** `calcAdoptionScore` — passa a calcular % de features adotadas a partir de
  `account_feature_adoption` (antes lia um JSONB inexistente em `adoption_metrics` e
  sempre devolvia 50). Cast localizado por a tabela ainda não estar em `database.types`.
- Aberto **#20b** (mesmo defeito no RPC SQL `calc_adoption_score`, exige migration).
- Build estrito 0 erros; testes verdes.

### Rodada 6 — remoção parcial de `as any` (2026-06-01)
- **#8 (em andamento):** removido `const db = supabase as any` de 14 arquivos onde o
  client tipado compila limpo (303 → 284 `as any`). Correções pontuais: callbacks de
  leitura em `AccountActivitiesWidget` e `HomePrioritiesClient` passaram a usar
  `data as CsmTask[]` em vez do cast de client. Mantido o cast (com comentário) em 4
  arquivos com divergência real de schema. Build estrito 0 erros, testes verdes.
- Revelados 3 bugs latentes que o cast escondia → registrados como #18, #19, #20.

### Rodada 5 — testes + limpeza de logs (2026-06-01)
- **#7 (iniciado):** Vitest instalado e configurado; `npm test` roda 6 testes do
  `ProductivityService` (resolvePeriod + getPersonProductivity/getTeamProductivity
  com mock vazio). Build estrito mantém 0 erros com os arquivos de teste.
- **#9 (quase fechado):** 101 `console.log/debug` de uma linha removidos (114 → 13)
  via script conservador; `console.error/warn` preservados. Verificado: nenhum
  control-flow sem chaves perdeu corpo; tsc 0 e testes verdes.

### Rodada 4 — types + build estrito (2026-06-01)
- **#1 — `ignoreBuildErrors`:** `database.types.ts` regenerado (`supabase gen types`),
  todos os erros de TS zerados (62 → 0) e `next.config.mjs` com `ignoreBuildErrors: false`.
  O build de produção agora falha em erro de tipo, protegendo contra regressões.
  Correções de coluna na esteira: `support-tickets/similarity-candidates`
  (`dismissed_*` → `reviewed_*`) e `email-sync` (`author_id`).
- _Ressalva:_ parte dos erros foi silenciada com `as any` adicional (ver #8, agora ~302).

### Rodada 3 — docs/readme-reconcile (2026-06-01)
- **#17 (parcial):** `README.md` ganhou tabela "Mapa de Módulos" canônica (todas as
  rotas e itens de menu atuais, incl. Capacidade & Produtividade) + nota sobre a
  nova aba de Produtividade; corrigida a seção que apontava para a rota inexistente
  `/product`. Verificado que o menu não tem mais link quebrado de Playbooks (aponta `/fluxos`).

### Rodada 2 — chore/tech-debt-round2 (2026-06-01)
- **#2 — exec_sql:** `migrations/apply-all` e `migrations/wave4` agora exigem `ENABLE_MIGRATION_ENDPOINT=true` (desligado por padrão → 404) e validam `API_SECRET` presente. Recomendação: usar `supabase db push`.
- **#3 — env:** `src/lib/env.ts` ganhou `requiredStrict()` — em produção (servidor) a ausência de `SUPABASE_URL`/`ANON_KEY` lança erro fatal em vez de usar dummy; escape hatch `SKIP_ENV_VALIDATION=true` para build.
- **#6b — filtro de adoção:** implementado em `accounts/route.ts` (média de `adoption_pct` de `account_feature_adoption`) — antes o filtro da UI era silenciosamente ignorado.
- **#9 (parcial):** removido log sensível em `PortalSetupClient.tsx`.
- **#10 — CockpitData:** tipo exportado de `CockpitDashboard` e reusado em `CSOpsClient` (elimina duplicata / TS2719).
- TS errors: 79 → 77.

### Rodada 1 — chore/tech-debt-round1 (2026-06-01)
- **#5 — Placeholders CS-Ops:**
  - `api/cs-ops/metrics/route.ts`: devolvia shape aninhado que **não batia** com o que o `CSOpsClient` lia (`teamSize`/`avgCapacityUtilization`/… → `undefined` nos cards) e tinha `velocity`/`burnout` chumbados. Agora retorna shape flat **100% real**; schema `CSOpsMetricsResponseSchema` atualizado.
  - `lib/cs-ops/cs-ops-service.ts`: `calculateHealth.avgResponseTimeHours` (era 4.5) agora real; `calculateScorecard` (NPS/CSAT/TRT/interações/`overallScore`/destaques) agora real via colunas corretas (`assigned_to`, `csat_responses`, NPS por conta); `calculateTeamVelocity` (TTV/health/support/utilização) agora real (TTV=0 por falta de fonte).
- **#6 — Stubs:**
  - `api/accounts/[id]/adoption-intelligence`: deixava de fabricar dados → `available:false` + estrutura vazia (sem consumidor na UI).
  - `api/cs-ops/scorecard/[csm_id]`: tinha dummy data e consultava `profiles.name` (coluna inexistente); reescrita para usar `ProductivityService` real + RBAC.
- **#13 — `supabase/.temp/`:** `git rm --cached` + adicionado ao `.gitignore`.
