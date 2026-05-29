# Plano de Implementação — Módulo de Adoção (Revisado)

> **Atualização (2026-05-29) — Virada para Dashboard de Portfólio**
>
> A tela `/adoption` deixou de ser uma análise **individual** (selecionar conta → heatmap/blockers/forecast) e passou a ser um **dashboard de portfólio de Adoção** (em português, "Adoção"). Motivação: a análise por cliente **já existe dentro da ficha da conta** (`/accounts/[id]` → "Adoção Funcional", Score de Adoção Real, downgrade risk) — manter um seletor de conta em `/adoption` era redundante e não dava visão executiva do portfólio.
>
> **Decisões de produto:**
> - Sem seletor de conta e **sem forecast por IA** em `/adoption` — para não misturar com a adoção por cliente. O forecast IA (`POST /api/adoption/forecast`) e o heatmap por feature permanecem disponíveis para a visão por conta.
> - Detalhamento por conta **linka** para a ficha da conta; o dashboard não duplica a análise individual.
>
> **Blocos do dashboard (v1):**
> 1. **KPIs** — score médio de adoção, % features em uso, % bloqueadas, contas em downgrade risk, total de contas.
> 2. **Adoção por plano** — card por tier (Basic / Essential / Professional) com score de adoção e distribuição de status; clicar seleciona o plano.
> 3. **TOP features adotadas / não-adotadas por plano** — rankings; nas não-adotadas, badge "Diferenciador" quando a feature é exclusiva do tier (sinaliza risco comercial).
> 4. **Barreiras por categoria** — bar chart agregando `feature_adoption.blocker_category`.
> 5. **Risco de downgrade** — contas sub-adotando features que justificam o plano (link para a conta).
>
> **Arquitetura:**
> - Agregação: `getPortfolioAdoption()` em [`src/lib/adoption/portfolio-adoption.ts`](../../src/lib/adoption/portfolio-adoption.ts), reutilizando `getPortfolioSummary()` de `risk-engine.ts` para blockers/downgrade risk.
> - Mapa conta→plano: contrato ativo (`contracts.service_type`) > qualquer contrato > `account_plans` (mesma precedência de `getAccountPlanSummary`).
> - Score de adoção do plano: `(in_use + partial*0.5) / aplicáveis * 100` (mesma fórmula do "Score de Adoção Real").
> - UI: [`AdoptionPortfolioClient.tsx`](../../src/app/(dashboard)/adoption/components/AdoptionPortfolioClient.tsx). O antigo `AdoptionDashboardClient.tsx` foi removido.

## 1. Contexto

O módulo de Adoção mede, diagnostica e melhora a adoção dos clientes na plataforma. Ele sai de uma visão passiva de dados para uma postura ativa de combate a blockers e recuperação de uso.

## 2. Objetivo do Produto

Permitir que o CS entenda a profundidade de uso do cliente, identifique impedimentos (blockers) e execute planos de ação para garantir o valor percebido.

## 3. Estado Atual vs Gap

- **O que já temos**: Heatmap de uso, listagem de blockers e dados de forecast (visualização avançada).
- **O que falta**: Criar/editar blockers manualmente, planos de ação específicos para adoção e sugestões da IA para novos blockers baseados em interações.

---

## 4. Plano de Implementação em Ondas

### 🌊 Onda 1: Camada de Ação (Operacional)
**Foco**: Gestão de impedimentos e planos de recuperação.

- **AD-04: Blockers de Adoção**
  - Registro manual e classificação de blockers (US-AD-011, US-AD-013).
  - Listagem e fluxo de resolução de blockers (US-AD-014, US-AD-015).
- **AD-05: Planos de Ação**
  - Criação e acompanhamento de planos de ação para melhorar a adoção (US-AD-016, US-AD-017).
  - Medição do resultado do plano (Adoption Score antes vs depois) (US-AD-018).

### 🌊 Onda 2: Camada de Visão (Analítica)
**Foco**: Detalhamento e navegação nos dados de uso.

- **AD-03: Heatmap de Adoção**
  - Detalhamento da funcionalidade ao clicar no heatmap (US-AD-008).
  - Marcar funcionalidade como "Não Aplicável" ou "Requer Treinamento" (US-AD-009, US-AD-010).
- **AD-06: Forecast de Adoção**
  - Listagem de clientes com tendência negativa para priorização (US-AD-020).
- **AD-07: Analytics**
  - Análise de adoção por módulo, funcionalidade e usuário (US-AD-022 a US-AD-024).

### 🌊 Onda 3: Camada de Inteligência (RAG + IA)
**Foco**: Automação e diagnósticos inteligentes.

- **AD-04: Blockers de Adoção (IA)**
  - Receber sugestões de blockers identificados pela IA em atas ou tickets (US-AD-012).
- **AD-08: RAG + IA**
  - Geração de resumo inteligente da adoção da conta (US-AD-025).
  - Consulta de dados de adoção por linguagem natural (US-AD-026).
