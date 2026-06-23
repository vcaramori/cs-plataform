# Plano de Implementação — Módulo de VOC | Voz do Cliente (Revisado)

> **Atualização (2026-06-23) — Redesenho de usabilidade: tudo clicável + evidência + CSAT + visão por conta (Fase 1)**
>
> O dashboard deixou de ser "morto ao clique". Agora **todo número é uma porta**: KPIs, barras de fonte, termos de dor/encanto, dias da tendência e citações abrem um **Drawer de Sinais** (a lista que compõe o número), e cada sinal expande no **Cartão de Evidência** — mostrando **como foi avaliado**: origem (Read.ai? IA nossa? nota direta do cliente?), nota + escala, texto-fonte, keywords/confiança e link para a fonte.
>
> - **Núcleo único** `buildVocSignals` em [`portfolio-voc.ts`](../../src/lib/voc/portfolio-voc.ts) (reusado por portfólio, conta e drill-down). Cada `VocSignal` carrega um payload `evidence`.
> - **5ª fonte: CSAT** (`csat_responses`, nota 1-5 → −1..1) — antes 100% ignorada (era a maior fonte recente de voz).
> - **Sentimento da agenda (Read.ai)** é rotulado explicitamente como "Avaliado pelo Read.ai" na evidência (vs. "Avaliado por IA" das interações manuais).
> - **Interações filtradas pela DATA do evento** (não pela data de import) — corrige reuniões antigas recém-importadas aparecendo no período errado.
> - **Visão por conta**: nova rota [`/voc/[accountId]`](../../src/app/(dashboard)/voc/[accountId]/page.tsx) (tendência, fontes, dores/encantos e feed completo da conta); as linhas do portfólio passam a apontar para ela.
> - **Novos endpoints (só leitura, sem IA):** `GET /api/voc/signals` (drill-down) e `GET /api/voc/account/[id]`.
> - **Componentes:** [`SignalsDrawer`](../../src/app/(dashboard)/voc/components/SignalsDrawer.tsx), [`SignalEvidence`](../../src/app/(dashboard)/voc/components/SignalEvidence.tsx), `voc-ui.tsx`.
>
> **Fases seguintes (planejadas):** Fase 2 — enriquecimento assíncrono (sentimento do comentário NPS, temas+citações de reuniões, taxonomia de temas, métricas do Read.ai via webhook) **só em cron batched/idempotente** (lição do incidente de Disk-IO). Fase 3 — taxonomia visível + ações (criar tarefa de uma dor, marcar falso-positivo) + tie-ins com health/RAG.

> **Atualização (2026-05-29) — Virada para Dashboard de Portfólio + correção de schema**
>
> A tela `/voc` deixou de ser per-CSM (contas do usuário logado) e passou a ser um **dashboard de portfólio de Voz do Cliente**, no mesmo padrão visual do novo `/adoption`.
>
> **Correção importante de schema:** os blocos antigos "Top Pains/Praises" e "Feedback Highlights" estavam **quebrados em produção** porque dependiam de objetos que **não existem no banco**: tabela `interaction_themes`, colunas `interactions.description` / `interactions.quotes` e `nps_responses.sentiment_score` (migrations nunca aplicadas). A v1 do dashboard **não depende** desses objetos — usa apenas o que existe.
>
> **Fontes unificadas num sinal comum** (`getPortfolioVoc`):
> - **Interações** — `interactions.sentiment_score` (−1..1) + `title`/`raw_transcript`.
> - **NPS** — `nps_responses.score` via `getNPSSegment` (promoter/passive/detractor → positivo/neutro/negativo) + `comment` (citação) + `tags` (temas). Exclui `is_test`/`dismissed`.
> - **Suporte** — `reply_sentiments.sentiment` + `keywords` (temas), ligado à conta via `ticket_id` → `support_tickets.account_id`.
>
> **Blocos v1:** KPIs (índice de sentimento −100..100, volume, % positivo/negativo, contas em alerta), Tendência de sentimento, **Sentimento por conta** (piores primeiro + correlação com health + link para `/accounts/[id]`), Distribuição por fonte, Top Dores/Elogios (tags+keywords) e Citações reais.
>
> **Temas (Top Dores/Elogios):** determinístico via tags (NPS) + keywords (suporte), separados pela polaridade do sinal — **sem IA ao vivo**.
>
> **Arquitetura:** `getPortfolioVoc()` em [`src/lib/voc/portfolio-voc.ts`](../../src/lib/voc/portfolio-voc.ts); API `GET /api/voc/portfolio` (portfolio-wide, params de período); UI [`VocPortfolioClient.tsx`](../../src/app/(dashboard)/voc/components/VocPortfolioClient.tsx) com `DateRangePicker`. Removidos: `VocBoardClient.tsx`, `sentiment-chart.tsx` e as rotas `api/voc/{top-themes,quotes,sentiment-trends}`.

## 1. Contexto

O módulo de VOC centralizará, estruturará e transformará a voz do cliente em ações concretas. Ele funcionará tanto em modo manual quanto integrado ao RAG + IA, servindo como a camada de validação humana sobre os sinais detectados pela IA.

## 2. Objetivo do Produto

Criar um sistema de inteligência sobre percepção, dores e oportunidades, conectando feedbacks a ações práticas e retroalimentando o RAG com informações confirmadas.

## 3. Estado Atual vs Gap

- **O que já temos**: Dashboard analítico com tendências de sentimento, temas e citações (Quotes).
- **O que falta**: Registro manual de feedbacks, fila de triagem, validação de sugestões da IA e criação de ações (tarefas, riscos) a partir do feedback.

---

## 4. Plano de Implementação em Ondas

### 🌊 Onda 1: Camada de Ação (Operacional)
**Foco**: Permitir o registro e a tratativa de feedbacks.

- **VOC-01: Registro Manual de Feedbacks**
  - Formulário de criação de feedback manual e rápido (US-VOC-001, US-VOC-002).
  - Listagem e detalhe de feedbacks com status de triagem (US-VOC-003, US-VOC-004).
- **VOC-03: Classificação e Triagem**
  - Classificação por tipo, sentimento e criticidade (US-VOC-005 a US-VOC-007).
  - Fila de triagem para feedbacks pendentes (US-VOC-009).
- **VOC-04: Ações a partir do VOC**
  - Criar tarefa, risco ou iniciar playbook a partir de um feedback (US-VOC-010 a US-VOC-013).

### 🌊 Onda 2: Camada de Visão e Priorização de Produto (RICE)
**Foco**: Consolidar os dados, integrar com Produto e priorizar demandas usando o framework RICE da Plannera.

- **VOC-05: Produto e Wishlist**
  - Criar demanda de produto (Wishlist) ou vincular feedbacks a demandas existentes (US-VOC-014, US-VOC-015).
  - **Relacionamento N:N**: Permitir que um mesmo item de Wishlist seja associado a múltiplos clientes/contas. Essa associação alimentará automaticamente o critério de *Alcance* (Reach).
  - **Motor de Priorização RICE Plannera**: Implementar o cálculo automático de score para cada item da Wishlist:
    - **R (Alcance)**: Calculado com base em `% de clientes impactados` (Peso 2) e `% do SOM impactado` (Peso 0.5).
    - **I (Impacto)**: Baseado em Diferencial, Oportunidade Comercial, Compromisso (Peso 100), Satisfação, Evita Churn, Segurança (Peso 50) e Sustentabilidade (Peso 50).
    - **C (Confiança)**: Baseado em aprovações de protótipo, concorrência, pedidos de clientes/leads e detalhamento técnico (Peso 10).
    - **E (Esforço)**: Baseado em dias de dev, barreira técnica, abrangência e risco.
  - Listagem de demandas originadas de VOC para o PM (US-VOC-016), ordenada pelo Score RICE.

- **VOC-07: Analytics e Insights**
  - Dashboard gerencial de VOC (US-VOC-021) expandindo o atual.
  - Consolidação de feedbacks em Insights (US-VOC-023).

### 🌊 Onda 3: Camada de Inteligência (RAG + IA)
**Foco**: Automação na captura e validação de IA.

- **VOC-02: Sugestões RAG + IA**
  - Receber e listar sugestões geradas pela IA (US-VOC-AI-001, US-VOC-AI-002).
  - Interface de revisão: Validar, Editar, Rejeitar, Dividir ou Mesclar sugestões (US-VOC-AI-003 a US-VOC-AI-008).
- **VOC-06: Integrações**
  - Captura automática de comentários de NPS e CSAT (US-VOC-017, US-VOC-018).
  - Alimentar o RAG com feedbacks validados (US-VOC-020).
  - Medição de qualidade das sugestões da IA (US-VOC-022).
