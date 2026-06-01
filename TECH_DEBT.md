# Registro de Débitos Técnicos — cs-plataform

Levantamento inicial em 2026-06-01. Marque `[x]` ao resolver. Severidade:
🔴 crítico · 🟠 alto · 🟡 médio · 🟢 baixo.

> Rodada 1 (chore/tech-debt-round1) já resolveu: #5, #6, #13. Ver seção "Resolvido".

## 🔴 Críticos (correção / segurança)

- [ ] **#1 — `ignoreBuildErrors: true` no `next.config.mjs`.** O build ignora erros de TS. Restam **77 erros** (era 79), majoritariamente `TS2339/TS2769/TS2345` por `database.types.ts` desatualizado. _Bloqueado por #8:_ resolver de forma limpa exige regenerar os tipos (`supabase gen types`, precisa de acesso ao banco) — não dá pra só espalhar `as any`. _Ação:_ fazer #8, zerar erros, desligar a flag.
- [x] **#2 — Endpoint `exec_sql` arbitrário.** Ver "Resolvido — Rodada 2".
- [x] **#3 — Fallback silencioso de credenciais.** Ver "Resolvido — Rodada 2".
- [ ] **#4 — RLS a auditar.** ~20 migrations com `USING (true)`/service_role. Confirmar quais são realmente só service_role vs. expostas a `authenticated` (ex.: policy "Service role can do everything" em `profiles`). _Ação:_ auditoria de RLS.

## 🟠 Altos (dados / comportamento incorreto)

- [x] **#5 — Placeholders chumbados em CS-Ops.** Ver "Resolvido".
- [x] **#6 — Stubs Wave 5/6 retornando dados inventados.** Ver "Resolvido".

## 🟡 Médios (qualidade / manutenção)

- [ ] **#7 — Zero testes automatizados.** Há `@playwright/test` no `package.json` mas nenhum `.test`/`.spec`. _Ação:_ começar pelos serviços de cálculo (`productivity-service`, `cs-ops-service`, SLA, health-score).
- [ ] **#8 — ~282 `as any`** (padrão `const db = supabase as any`) anulam a tipagem e escondem bugs de coluna inexistente. **É o bloqueador do #1.** _Ação:_ regenerar `database.types.ts` (`supabase gen types typescript`) e remover `as any` progressivamente.
- [~] **#9 — ~116 `console.log/debug`** em produção. _Parcial:_ removido o log sensível que revelava se a chave Supabase era dummy (`PortalSetupClient`). Restante pendente. _Ação:_ logger com nível.
- [x] **#10 — Tipos duplicados `CockpitData`.** Ver "Resolvido — Rodada 2".
- [x] **#11 — Rota fantasma `cs-ops/tasks`.** Não existe em `src/` — é apenas artefato de cache em `.next/`. Resolve com `rm -rf .next`. Sem mudança de código necessária.
- [ ] **#12 — `csm_scorecard`/`team_velocity` nunca populadas.** Tabelas-snapshot sem gravação → sem histórico/tendência real. _Ação:_ popular via cron (`shadow-score-weekly`) ou remover.
- [x] **#6b — Filtro de adoção no-op.** Ver "Resolvido — Rodada 2".

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
