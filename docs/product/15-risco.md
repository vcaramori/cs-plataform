# 15. Cockpit de Risco

## Visão Geral

`/risco` é o painel nº 1 da retenção: responde num olhar **quanto de receita está em risco, quantas contas e em que severidade, onde está concentrado, o que está causando e o que está sendo feito**. Antes era apenas uma lista; agora é um cockpit completo, no padrão do Cockpit de Renovações.

## Régua única de health (fonte da verdade = score manual)

Toda a plataforma classifica o health do cliente por **uma única régua** em `src/lib/health/classify.ts` (`classifyHealth`/`isAtRiskScore`). Não há mais thresholds inline espalhados (antes havia ~5 réguas divergentes que faziam as telas mostrarem números diferentes).

- **Régua canônica:** `≥70 saudável · 50–69 atenção · 40–49 em risco · <40 crítico`. **"Em risco" = score < 50** (bandas *em risco* + *crítico*).
- **Fonte da verdade = `accounts.health_score` (MANUAL).** O `health_score_v2` (ponderado, cron) é **advisory** e **não** entra no headline/classificação. Os cards "Health Score Ponderado" e mini-gauges degradam para "Automático — aguardando processamento" enquanto não calculados.
- **Consumidores da régua única:** dashboard (`portfolio-kpis`, `PortfolioHealthCard`, `AccountsTable`, `RenewalPipelineSection`), gauge da conta (`HealthScoreCard`), edição manual (`HealthScoreEditModal`), home (`risk-engine`, `home-priorities`), cockpit (`classifyAccountRisk`, `RiskKpis`, `RiskTable`) e o resumo do chat de IA.

## Risco Unificado (núcleo)

`src/lib/risk/risk-cockpit.ts` (`classifyAccountRisk`) consolida os sinais num único perfil por conta:

- **Entradas:** `health_score` (manual), última `account_risk_assessments` (risk_score, sentiment, reasoning), `proactive_alerts` ativos de risco (churn, silêncio, renovação, detrator NPS, anomalia de adoção, playbook), `account_risks` (CS Ops), `contracts` (arr, renovação), última curadoria.
- **`risk_level`** = pior nível entre os sinais: `critical` / `high` / `medium` / `low` / `none`. Mapeamento do health manual: crítico→`critical`, em risco→`high`, atenção→`low` (watch, **não** conta como "em risco" = `medium`+).
- **IA = camada de ALERTA, não escala o risco sozinho.** `ai_risk_score`/`ai_sentiment` setam `aiFlag` (sobe a conta para `low`/"watch" e exibe o chip **"revisar"** na triagem), mas **não inflam** a contagem de "em risco". O CSM avalia e, ao confirmar, cria um `account_risks`/alerta — aí sim escala. Curadoria `false_positive` rebaixa/oculta.
- **`reasons[]`**: drivers legíveis ("Health em risco", "IA sinaliza risco — revisar", "Cliente silencioso", "Renovação em 18d"…).
- **`arrAtRisk`**: ARR ativo da conta quando em risco. **`treatment`**: derivado da `csm_task` vinculada ao alerta.

`buildCockpitAggregates` produz os KPIs e as distribuições (segmento, CSM, drivers). **Nota:** o KPI "Contas em risco" do Cockpit é um **superset** do "Logos em risco" do Dashboard — ambos usam a mesma régua de health (<50), mas o Cockpit soma também risco por alertas ativos, riscos manuais e renovação ≤90d.

## Pipeline automático (crons)

Os scores automáticos rodam via pg_cron → edge functions, usando `net.http_post` (extensão **`pg_net`**, habilitada). `cron-shadow-score-weekly` (seg 8h UTC) gera o shadow/IA — a **camada de alerta**. O `cron-health-score-daily` (4h UTC) recalcularia o `health_score_v2`, mas a edge function correspondente ainda **não está deployada** → o v2 segue dormente (ok: é advisory). Sem `pg_net` (estado anterior) ambos falhavam com `schema "net" does not exist`.

## API

`GET /api/dashboard/risk-cockpit` — escopo-aware (`getUserAccessScope`; super_admin/head vê tudo, CSM só as próprias). Retorna `kpis`, `accounts[]` (perfil unificado, ordenado por severidade×ARR), `bySegment`, `byOwner`, `byDriver`, `trend[]`.

## UI (`/risco`)

`page.tsx` (ModuleHeader) → `RiskCockpitClient` (busca a API uma vez) → seções:
1. **KPIs** (`RiskKpis`, `StatCardPremium`): ARR em risco (+%), Contas em risco (+ crítico/alto), Renovações em risco ≤90d, Health médio, % em tratamento.
2. **Matriz de risco** (`RiskMatrix`, recharts ScatterChart): Health (Y) × Risco IA (X), bolha = ARR, cor = severidade, zona crítica destacada; clique → conta.
3. **Kanban por severidade** (`RiskKanban`): colunas Crítico/Alto/Médio/Baixo com cards (health, risco IA, ARR, motivo, dono, tratamento).
4. **Distribuições** (`RiskDistributions`, recharts): risco por segmento, por CSM, ranking de drivers, tendência de sinais.
5. **Triagem priorizada** (`RiskTable`): tabela filtrável (severidade, segmento, CSM, tratamento, busca) com curadoria por linha (`RiskCurationControl`) e link para a conta.

Botão **"Reavaliar risco"** roda o motor de alertas (`/api/alerts/evaluate`) e recarrega.

## Estados vazios elegantes

- Sem contratos → ARR em risco "R$ 0" + dica "Cadastre contratos"; renovações 0.
- `health_score` ausente → conta como "Sem dados" (não vira crítico). Health médio do cockpit usa o score **manual**.
- `health_score_v2`/`health_breakdown` vazios → são advisory; cards do v2 mostram "Automático — aguardando processamento". Drivers do risco vêm do health manual + alertas + IA (flag).
- Tendência com <2 pontos → "histórico insuficiente".

## Reúso

`StatCardPremium`, `ModuleHeader`, `PageContainer`, `Card`/`Badge`, `RiskCurationControl`, `getUserAccessScope`, `recharts`, `framer-motion`, padrão do Cockpit de Renovações e da Central de Alertas (tratamento).

## Histórico

| Data | Alteração |
|------|------------|
| Jun/2026 | Redesenho de `/risco` como cockpit: Risco Unificado + API escopo-aware + KPIs + matriz de bolha + kanban por severidade + distribuições + triagem priorizada com curadoria. `health_score_v2=0` tratado como não computado. Estados vazios elegantes para contratos/ARR/health_breakdown ainda não populados. |
