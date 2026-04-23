# 4. Suporte — Sistema de Tickets

## Visão Geral do Módulo

O módulo **Suporte** é o sistema de gestão de tickets do CS-Continuum. Permite aos CSMs criar, gerenciar e resolver tickets de clientes com tracking de SLA, avaliação de qualidade da resposta (Padrão Plannera) e feedback de satisfação (CSAT).

**Caminhos:**
- Lista: `/suporte`
- Detalhe: `/suporte/[id]`
- Dashboard executivo: `/suporte/dashboard`
- SLA por conta: `/suporte/sla`

---

## 4.1 Telas do Módulo

### 4.1.1 Lista de Tickets (`/suporte`)

| Seção | Componentes |
|-------|-------------|
| **KPI strip** | Abertos, Vencidos, Em Atenção, CSAT médio |
| **Filtros** | Status, Prioridade, Agente, Conta |
| **Tabela** | ID, Conta, Assunto, Status, Prioridade, SLABadge, Atualizado |

---

### 4.1.2 Detalhe do Ticket (`/suporte/[id]`)

Layout de duas colunas:

**Coluna principal (esquerda):**
- Thread cronológica: mensagem original do cliente → replies dos agentes → notas internas. A visualização inicia automaticamente pelo final (mensagens mais recentes) para agilizar o atendimento.
- Cada evento distinguido visualmente (cor de fundo, ícone, label)
- Área de composição com abas "Responder ao Cliente" / "Nota Interna"

**Área de composição — fluxo obrigatório de avaliação:**

```
[Agente redige resposta no textarea]
         ↓
[Botão "Avaliar e Enviar"]  ← único caminho normal
         ↓
[POST /api/support-tickets/review-reply]
  (chamada única ao Gemini — sem Ollama)
         ↓
[ReplyReviewModal abre com resultado]
         ↓
[Agente escolhe: sua versão OU versão da IA]
         ↓
[Seleciona status sugerido pela IA (editável)]
         ↓
[Botão "Enviar Resposta" (desbloqueado)]
```

**Caso de falha da IA (`reviewFailed = true`):**
- O sistema tenta primeiro; se a chamada falhar, o textarea é desbloqueado
- Agente pode enviar diretamente sem avaliação (bypass habilitado apenas após tentativa)

**Estados da área de composição:**

| Estado | UI |
|--------|----|
| `!reviewApproved && !reviewFailed` | Botão "Avaliar e Enviar" (laranja) |
| `reviewApproved` | Seletor de status + botão "Reavaliar" (ghost) + botão "Enviar Resposta" (verde) |
| `reviewFailed` | Botão "Tentar Novamente" + botão "Enviar sem Avaliação" (cinza) |

Edição do textarea após aprovação reseta `reviewApproved = false` (força nova avaliação).

**Sidebar (direita):**
- Classificação inline: status, prioridade, nível SLA, categoria (9 tópicos predefinidos), agente responsável
- Painel SLA com `SLATimer` e `SLABadge` — indicador visual (ícone de alerta) e tooltip informativo exibidos quando nenhuma política está configurada, liberando espaço na área de leitura central.
- Info do cliente (nome da conta, link para detalhe)
- Histórico de datas (criação, 1ª resposta, resolução)

> **Removido:** seção "Ações" da sidebar (botões de 1ª resposta, resolver, reabrir) — essas ações foram integradas ao fluxo de envio de resposta ou ao seletor de status.

---

### 4.1.3 Dashboard Executivo (`/suporte/dashboard`)

4 camadas de visibilidade:

| Camada | Métricas |
|--------|----------|
| **KPIs em tempo real** | Abertos, Vencidos, Em Atenção, Primeira Resposta pendente |
| **KPIs do período** | TMP (Tempo Médio de 1ª Resposta), TMR (Tempo Médio de Resolução), Compliance SLA (%), CSAT médio |
| **Por agente** | Tickets abertos, resolvidos, CSAT, compliance individual |
| **Por cliente** | Tickets abertos por conta, saúde de suporte por logo |

Exportação XLSX disponível (3 abas: tickets, por agente, por cliente).

---

### 4.1.4 Indicadores 360° (Modal)

Acesso rápido via botão "Ver Indicadores 360°" na sidebar lateral. Consolida a performance do ticket em três dimensões críticas:

#### A. Dimensão de Qualidade (Média Harmônica)
Exibe a nota atual baseada na última avaliação da IA (Review de Resposta).
- **Cálculo**: Média harmônica dos 5 pilares (Tom, Estrutura, Empatia, Clareza, Alinhamento).
- **Visual**: Gráfico de progresso circular ou barra com a nota consolidada (0-100).
- **Detalhamento**: Lista dos 5 pilares com suas notas individuais.

#### B. Dimensão de Compromisso (ETA Tracking)
Monitoramento proativo de promessas de retorno feitas pelo agente no histórico.
- **Detecção**: IA varre o histórico em busca de termos como "volto em 1h", "respondo até às 15:00", "amanhã cedo te dou um retorno".
- **Status `no_prazo`**: Promessa feita e dentro do tempo, ou cumprida com nova resposta.
- **Status `atrasado`**: Tempo da promessa expirou sem nova interação do agente.
- **Penalidade**: Um ETA quebrado reduz automaticamente o score de **Alinhamento** em 40 pontos no cálculo consolidado.

#### C. Dimensão de Eficiência (Latência Útil)
Tempo médio de resposta do agente às interações do cliente.
- **Janela Útil**: O cálculo considera apenas o horário comercial configurado (padrão 09:00 - 18:00).
- **Regra**: Tempo decorrido entre a mensagem do cliente e a reply do agente.

---

## 4.2 Regras de Negócio

### 4.2.1 Ticket Lifecycle

```
open → in_progress → resolved → closed
                  ↑               ↓
              reopened ←──────────┘
```

| Status | Significado |
|--------|-------------|
| `open` | Aguardando 1ª resposta |
| `in_progress` | Em atendimento |
| `pending_client` | Aguardando retorno do cliente |
| `pending_product` | Aguardando time de produto/engenharia |
| `resolved` | Resolvido — CSAT disparado |
| `closed` | Encerrado após `auto_close_hours` úteis sem reabertura |
| `reopened` | Reaberto pelo cliente |

---

### 4.2.2 SLA Status

| Status | Significado | Trigger |
|--------|-------------|---------|
| `no_prazo` | Dentro do prazo | `elapsed < limit` |
| `atencao` | Próximo do vencimento | `elapsed > limit × (1 - alert_threshold_pct/100)` |
| `vencido` | Prazo excedido, evento não completado | `elapsed >= limit` |
| `cumprido` | Evento completado dentro do prazo | `completed_at <= deadline` |
| `violado` | Evento completado fora do prazo | `completed_at > deadline` |

Calculado em **minutos úteis** no fuso `America/Sao_Paulo` usando a tabela `business_hours`.

---

### 4.2.3 SLA Levels (padrão Plannera)

| Nível interno | 1ª Resposta | Resolução |
|---------------|-------------|-----------|
| `critical` | 60 min | 240 min (4h) |
| `high` | 240 min (4h) | 1440 min (24h) |
| `medium` | 480 min (8h) | 2880 min (48h) |
| `low` | 1440 min (24h) | 4320 min (72h) |

**Mapeamento De/Para:** nomenclaturas do cliente (ex: "Urgente", "P1") são mapeadas para os níveis internos via `sla_level_mappings`.

---

### 4.2.4 Revisão de Resposta — Padrão Plannera

**Chamada única ao Gemini** (`provider: 'gemini', allowFallback: true` — Ollama ignorado para esta operação).

**Avaliação Context-Aware:** A IA recebe TODO o histórico de mensagens do ticket antes de avaliar o rascunho. Os 5 critérios são julgados levando em conta o problema original do cliente, o sentimento acumulado ao longo da conversa e o tom das respostas anteriores — nunca de forma isolada.

**Input enviado:**
- Rascunho da resposta do agente
- Contexto: assunto, descrição original, histórico completo de respostas, categoria, nome da conta e nome do agente

**Os 5 Critérios de Avaliação (0–100 cada):**

| Critério | O que avalia |
|----------|-------------|
| **Tom** | Adequação emocional ao contexto, calor humano, linguagem proporcional à gravidade do chamado |
| **Estrutura** | Sequência lógica, aderência ao Padrão Plannera: saudação → contexto → solução → próximos passos → fechamento |
| **Empatia** | Reconhecimento genuíno do sentimento do cliente, validação da dor, personalização baseada no histórico |
| **Clareza** | Objetividade, linguagem simples e direta, ausência de ambiguidades ou jargões desnecessários |
| **Alinhamento** | Conformidade plena com o Padrão Plannera, uso dos nomes reais, zero placeholders, assinatura correta |

**Fórmula nota_final (Média Harmônica dos 5 Critérios):**
```
nota_final = 5 / (1/tom + 1/estrutura + 1/empatia + 1/clareza + 1/alinhamento)
```
Escala: 0–100. Penaliza fortemente critérios fracos — um único critério com nota baixa reduz significativamente a nota final.

**Regra de alerta:** `show_alert = true` quando `nota_final < 60`.

**Output (campo a campo):**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `sentiment` | `'Equilibrado' \| 'Neutro' \| 'Rígido'` | Tom emocional detectado |
| `feedback_summary` | string | Resumo em português do feedback, referenciando o histórico quando relevante |
| `evaluation.tom` | 0–100 | Score de tom (context-aware) |
| `evaluation.estrutura` | 0–100 | Score de estrutura |
| `evaluation.empatia` | 0–100 | Score de empatia (context-aware) |
| `evaluation.clareza` | 0–100 | Score de clareza |
| `evaluation.alinhamento` | 0–100 | Alinhamento ao Padrão Plannera |
| `recommended_version` | string | Versão reescrita pela IA com nomes reais e contexto do chamado |
| `training_notes` | string | Nota de treinamento para o agente (1-2 frases) |
| `pillar_scores.habilidades_comunicacao` | 0–100 | Pilar agregado de comunicação |
| `pillar_scores.efetividade_respostas` | 0–100 | Pilar agregado de efetividade |
| `nota_final` | number \| null | Média harmônica dos 5 critérios; `null` se qualquer critério for 0 |
| `show_alert` | boolean | `true` se `nota_final < 60` |
| `suggested_outcome` | `'solution' \| 'pending_client' \| 'pending_product' \| 'none'` | Status sugerido pela IA |
| `outcome_reasoning` | string | Justificativa do status sugerido (1 frase) |

---

### 4.2.5 ReplyReviewModal — Layout

| Zona | Conteúdo |
|------|----------|
| **Header** | Título "Avaliação da Resposta" + badge de alerta (inline, se `show_alert`) |
| **Nota de Treinamento** | `training_notes` sempre visível no topo |
| **Ver detalhes** | Toggle colapsável que revela os 5 scores individuais + pilares |
| **Sugestão de status** | Strip colorido com ícone: `suggested_outcome` + `outcome_reasoning` |
| **Comparação** | Painel esquerdo: versão do agente | Painel direito: versão da IA |
| **Seleção** | Dois botões de rádio: "Minha versão" / "Versão da IA" |
| **Nota final** | Badge numérico com média harmônica |

**Cores por `suggested_outcome`:**

| Valor | Label | Cor |
|-------|-------|-----|
| `pending_client` | Aguardando Cliente | Âmbar |
| `pending_product` | Aguardando Produto | Índigo |
| `solution` | Resolver Chamado | Esmeralda |
| `none` | Manter Aberto | Cinza |

---

### 4.2.6 CSAT

| Regra | Valor |
|-------|-------|
| Trigger | Ticket muda para `resolved` |
| Validade do token | `SUPPORT_CSAT_TOKEN_VALIDITY_DAYS` (padrão: 14 dias) |
| Auto-close | `SUPPORT_AUTO_CLOSE_DEFAULT_HOURS` após resolução sem reabertura |
| Score negativo (≤ 2) | Notificação para agente + `SUPPORT_HEAD_USER_ID` |
| Fallback SMTP | Se e-mail falhar, `email_delivery_failed = true` — ticket não bloqueado |

---

### 4.2.7 Intent Classification

Classifica e-mails recebidos via IMAP/Power Automate:

| Classificação | Ação |
|--------------|------|
| `gratitude` | Ticket não criado; e-mail arquivado |
| `question_or_issue` | Ticket criado normalmente |
| `unclear` | Ticket criado com flag para revisão manual |

---

### 4.2.8 Notificações (7 tipos)

| Tipo | Trigger |
|------|---------|
| `sla_attention` | SLA atingindo threshold de atenção |
| `sla_breached` | SLA vencido sem resolução |
| `new_ticket` | Novo ticket criado |
| `ticket_reassigned` | Ticket reatribuído |
| `ticket_reopened` | Ticket reaberto |
| `csat_received` | Resposta CSAT registrada |
| `csat_negative` | Score CSAT ≤ 2 |

---

## 4.3 Componentes Visuais

### 4.3.1 TicketDetailClient

| Elemento | Descrição |
|----------|-----------|
| Thread | Eventos `sla_events` ordenados por `created_at` |
| Abas composição | "Responder ao Cliente" / "Nota Interna" |
| Botão principal | "Avaliar e Enviar" → "Enviar Resposta" (após aprovação) |
| Seletor de status | Aparece após aprovação da avaliação |
| Botão Reavaliar | Reset de `reviewApproved` com nova chamada à IA |

### 4.3.2 ReplyReviewModal

Renderizado via `createPortal(content, document.body)` com `zIndex: 9999` para garantir que fique acima de qualquer elemento, incluindo a sidebar.

SSR-safe: `useState(mounted) + useEffect(() => setMounted(true))`.

### 4.3.3 SLABadge

Semáforo visual de SLA:

| Status | Cor | Ícone |
|--------|-----|-------|
| `no_prazo` | Verde | CheckCircle |
| `atencao` | Âmbar | AlertTriangle (pulse) |
| `vencido` | Vermelho | XCircle |
| `cumprido` | Verde | CheckCheck |
| `violado` | Vermelho | ShieldOff |

### 4.3.4 SLATimer

Componente client-side com countdown em tempo real usando `setInterval`. Exibe tempo restante ou tempo decorrido após vencimento. Input: `deadline` (timestamp ISO).

---

## 4.4 Fluxo de Dados

### 4.4.1 Resposta com Avaliação

```
[Agente redige resposta]
    ↓
[Clique "Avaliar e Enviar"]
    ↓
[POST /api/support-tickets/review-reply]
  { reply, ticketId, category, accountName, subject, description, previousReplies }
    ↓
[Gemini: chamada única — avalia + sugere status + reescreve]
    ↓
[ReplyReviewModal abre]
    ↓
[Agente seleciona versão + confirma status]
    ↓
[reviewApproved = true, outcome = suggested_outcome]
    ↓
[Clique "Enviar Resposta"]
    ↓
[POST /api/support-tickets/[id]/reply]
  { body, close_after: status === 'resolved' }
    ↓
[Se close_after: resolve ticket + dispara CSAT]
```

### 4.4.2 Polling SLA (Cron)

```
[Edge Function cron-sla-polling — a cada 5 min]
    ↓
[POST /api/cron/sla-polling com x-api-secret]
    ↓
[Busca tickets open/in_progress com SLA ativo]
    ↓
[Para cada ticket: calcula status em minutos úteis]
    ↓
[Atualiza sla_status_first_response e sla_status_resolution]
    ↓
[Cria notificações (sla_attention, sla_breached)]
```

---

## 4.5 Requisitos Técnicos

### 4.5.1 Autenticação

🔒 **Obrigatória** — redireciona para `/login` se não autenticado. Endpoints públicos: CSAT submit/comment.

### 4.5.2 Dados

| Tabela | Acesso |
|--------|--------|
| `support_tickets` | RLS: tickets do CSM ou org |
| `sla_events` | RLS: via ticket |
| `sla_policies` | RLS: por contrato |
| `sla_policy_levels` | RLS: via policy |
| `sla_level_mappings` | RLS: via policy |
| `business_hours` | RLS: global ou por account |
| `csat_responses` | RLS: via ticket |
| `csat_tokens` | RLS: via ticket |

### 4.5.3 API Endpoints (principais)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/support-tickets` | Lista |
| POST | `/api/support-tickets/[id]/reply` | Envia resposta |
| POST | `/api/support-tickets/[id]/resolve` | Resolve (congela SLA, dispara CSAT) |
| POST | `/api/support-tickets/review-reply` | Avalia resposta via Gemini |
| GET | `/api/support-tickets/[id]/sla` | Status SLA detalhado |
| POST | `/api/cron/sla-polling` | Polling (cron, `x-api-secret`) |

---

## 4.6 Casos de Borda

| Caso | Comportamento |
|------|----------------|
| IA indisponível ao avaliar | `reviewFailed = true` → botão "Enviar sem Avaliação" habilitado |
| SLA não configurado | Ícone de alerta e Tooltip informativo no sidebar lateral |
| Tickets sem política SLA | `sla_status` permanece nulo, sem cálculo |
| SMTP falha ao resolver | `email_delivery_failed = true` em `csat_tokens`, ticket resolve normalmente |
| Score CSAT ≤ 2 | Notificação para agente + head de CS |
| E-mail de agradecimento (IMAP) | Classificado como `gratitude`, não vira ticket |
| Reply em ticket resolvido | `intent_classifier` avalia se é nova questão ou gratidão |

---

## 4.7 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão inicial — Sistema de tickets com SLA |
| Abr/2026 | Implementado lifecycle completo (open → closed) |
| Abr/2026 | Implementado CSAT com token e SMTP Outlook 365 |
| Abr/2026 | Implementado AI reply analyzer separado (debounce) |
| Abr/2026 | Refatorado para fluxo unificado: "Avaliar e Enviar" obrigatório |
| Abr/2026 | Removida seção "Ações" da sidebar; ações integradas ao fluxo de envio |
| Abr/2026 | Chamada única ao Gemini: avalia + sugere status + reescreve |
| Abr/2026 | `reviewFailed` bypass garante que agente nunca fique bloqueado |
| Abr/2026 | ReplyReviewModal via createPortal (z-index 9999) |
| Abr/2026 | `suggested_outcome` + `outcome_reasoning` adicionados ao output da IA |
| Abr/2026 | Avaliação migrada para 5 critérios (0-100) com Média Harmônica; `show_alert` quando `nota_final < 60` |
| Abr/2026 | Avaliação context-aware: IA usa TODO o histórico do ticket para julgar o rascunho |
| Abr/2026 | Refatoração visual completa para Vibrant Light Mode; layout responsivo com header/compose sticky e sidebar empilhável em mobile |
| Abr/2026 | `defaultTheme` da aplicação alterado para `light` — alinhamento com design system |
| Abr/2026 | Implementado **Indicadores 360°**: modal com monitoramento de ETA (promessas de retorno), Média Harmônica de qualidade e Latência em horário útil |
