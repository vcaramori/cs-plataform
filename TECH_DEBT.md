# Registro de Débitos Técnicos — cs-plataform

Levantamento inicial em 2026-06-01. Marque `[x]` ao resolver. Severidade:
🔴 crítico · 🟠 alto · 🟡 médio · 🟢 baixo.

> Rodada 1 (chore/tech-debt-round1) já resolveu: #5, #6, #13. Ver seção "Resolvido".

## 🔴 Críticos (correção / segurança)

- [ ] **#1 — `ignoreBuildErrors: true` no `next.config.mjs`.** O build de produção ignora todos os erros de TypeScript, mascarando bugs reais (tipos duplicados de `CockpitData`, `implicit any` em rotas cs-ops, etc.). _Ação:_ zerar erros TS e desligar a flag. _Pré-requisito para várias outras correções._
- [ ] **#2 — Endpoint `exec_sql` arbitrário (`src/app/api/migrations/apply-all/route.ts`).** Executa SQL arbitrário de arquivos via `supabase.rpc('exec_sql')`, protegido só por um header. Superfície de RCE no banco. _Ação:_ remover de produção ou trancar (service-role + allowlist); rodar migrations apenas via CLI.
- [ ] **#3 — Fallback silencioso de credenciais (`src/lib/env.ts`).** `DUMMY_URL`/`DUMMY_KEY` fazem o app "subir" apontando p/ Supabase fake quando faltam envs. _Ação:_ falhar explicitamente fora de `development`.
- [ ] **#4 — RLS a auditar.** ~20 migrations com `USING (true)`/service_role. Confirmar quais são realmente só service_role vs. expostas a `authenticated` (ex.: policy "Service role can do everything" em `profiles`). _Ação:_ auditoria de RLS.

## 🟠 Altos (dados / comportamento incorreto)

- [x] **#5 — Placeholders chumbados em CS-Ops.** Ver "Resolvido".
- [x] **#6 — Stubs Wave 5/6 retornando dados inventados.** Ver "Resolvido".

## 🟡 Médios (qualidade / manutenção)

- [ ] **#7 — Zero testes automatizados.** Há `@playwright/test` no `package.json` mas nenhum `.test`/`.spec`. _Ação:_ começar pelos serviços de cálculo (`productivity-service`, `cs-ops-service`, SLA, health-score).
- [ ] **#8 — ~282 `as any`** (padrão `const db = supabase as any`) anulam a tipagem e escondem bugs de coluna inexistente. _Ação:_ regenerar `database.types.ts` e remover `as any` progressivamente.
- [ ] **#9 — ~116 `console.log/debug`** em produção, incl. log que revela se a chave Supabase é dummy (`PortalSetupClient.tsx:23`). _Ação:_ logger com nível; remover logs sensíveis.
- [ ] **#10 — Tipos duplicados `CockpitData`** (client + dashboard) → erro TS2719. _Ação:_ centralizar tipos de CS-Ops num módulo de schema.
- [ ] **#11 — Rota fantasma `cs-ops/tasks`** referenciada nos tipos gerados do Next sem página existente. _Ação:_ limpar referência.
- [ ] **#12 — `csm_scorecard`/`team_velocity` nunca populadas.** Tabelas-snapshot sem gravação → sem histórico/tendência real. _Ação:_ popular via cron (`shadow-score-weekly`) ou remover.
- [ ] **#6b — Filtro de adoção no-op (`accounts/route.ts:~174`).** `adoption_min/max` são ignorados silenciosamente. _Ação:_ implementar via `feature_adoption` ou retornar 400 se usado.

## 🟢 Baixos (higiene)

- [x] **#13 — `supabase/.temp/` versionado.** Ver "Resolvido".
- [ ] **#14 — Pasta-fonte `Logotipos/` na raiz.** Já no `.gitignore`; remover do disco quando conveniente (cópias usadas estão em `public/brand`).
- [ ] **#15 — TODO real:** `TicketPreviewPanel.tsx:41` — collision detection via Supabase Presence (edição concorrente de tickets sem proteção).
- [ ] **#16 — ~42 `eslint-disable`** (muitos `no-img-element`: `<img>` em vez de `next/image`). _Ação:_ revisar caso a caso.
- [ ] **#17 — Documentação divergente.** `README.md` desatualizado vs. módulos reais (Fluxos, Workflows, Product, Wishlist). _Ação:_ reconciliar.

## Nota positiva
Os 16 crons estão autenticados via header `x-api-secret` contra `API_SECRET` — não são endpoints abertos.

---

## Resolvido

### Rodada 1 — chore/tech-debt-round1 (2026-06-01)
- **#5 — Placeholders CS-Ops:**
  - `api/cs-ops/metrics/route.ts`: devolvia shape aninhado que **não batia** com o que o `CSOpsClient` lia (`teamSize`/`avgCapacityUtilization`/… → `undefined` nos cards) e tinha `velocity`/`burnout` chumbados. Agora retorna shape flat **100% real**; schema `CSOpsMetricsResponseSchema` atualizado.
  - `lib/cs-ops/cs-ops-service.ts`: `calculateHealth.avgResponseTimeHours` (era 4.5) agora real; `calculateScorecard` (NPS/CSAT/TRT/interações/`overallScore`/destaques) agora real via colunas corretas (`assigned_to`, `csat_responses`, NPS por conta); `calculateTeamVelocity` (TTV/health/support/utilização) agora real (TTV=0 por falta de fonte).
- **#6 — Stubs:**
  - `api/accounts/[id]/adoption-intelligence`: deixava de fabricar dados → `available:false` + estrutura vazia (sem consumidor na UI).
  - `api/cs-ops/scorecard/[csm_id]`: tinha dummy data e consultava `profiles.name` (coluna inexistente); reescrita para usar `ProductivityService` real + RBAC.
- **#13 — `supabase/.temp/`:** `git rm --cached` + adicionado ao `.gitignore`.
