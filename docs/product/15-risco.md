# 15. Cockpit de Risco

## Visão Geral

`/risco` é o painel nº 1 da retenção: responde num olhar **quanto de receita está em risco, quantas contas e em que severidade, onde está concentrado, o que está causando e o que está sendo feito**. Antes era apenas uma lista; agora é um cockpit completo, no padrão do Cockpit de Renovações.

## Risco Unificado (núcleo)

`src/lib/risk/risk-cockpit.ts` (`classifyAccountRisk`) consolida os sinais fragmentados num único perfil por conta:

- **Entradas:** `health_score_v2`, última `account_risk_assessments` (risk_score, sentiment, reasoning), `proactive_alerts` ativos de risco (churn, silêncio, renovação, detrator NPS, anomalia de adoção, playbook), `account_risks` (CS Ops), `contracts` (arr, renovação), última curadoria.
- **`risk_level`** = pior nível entre os sinais: `critical` / `high` / `medium` / `low` / `none`. (`health_score_v2 = 0/null` é tratado como **não computado**, não como crítico — evita inundar o portfólio de falsos críticos.)
- **`reasons[]`**: drivers legíveis ("Health crítico", "Risco IA 85", "Cliente silencioso", "Detrator NPS sem ação", "Renovação em 18d"…).
- **`arrAtRisk`**: ARR ativo da conta quando em risco.
- **`treatment`** (`pendente`/`em_tratamento`/`tratado`): derivado da `csm_task` vinculada ao alerta (mesma lógica da Central de Alertas). Curadoria `false_positive` rebaixa/oculta.

`buildCockpitAggregates` produz os KPIs e as distribuições (segmento, CSM, drivers).

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
- `health_score_v2 = 0` (não computado) → não vira crítico; Health médio "—".
- `health_breakdown` vazio → drivers vêm de alertas+IA (quando o breakdown for populado, adicionar painel por dimensão SLA/NPS/Adoção/Relacionamento).
- Tendência com <2 pontos → "histórico insuficiente".

## Reúso

`StatCardPremium`, `ModuleHeader`, `PageContainer`, `Card`/`Badge`, `RiskCurationControl`, `getUserAccessScope`, `recharts`, `framer-motion`, padrão do Cockpit de Renovações e da Central de Alertas (tratamento).

## Histórico

| Data | Alteração |
|------|------------|
| Jun/2026 | Redesenho de `/risco` como cockpit: Risco Unificado + API escopo-aware + KPIs + matriz de bolha + kanban por severidade + distribuições + triagem priorizada com curadoria. `health_score_v2=0` tratado como não computado. Estados vazios elegantes para contratos/ARR/health_breakdown ainda não populados. |
