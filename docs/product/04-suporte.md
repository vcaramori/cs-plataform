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

#### 4.1.1.1 Ações em Massa (Bulk Actions)

A tabela possui uma coluna de seleção com checkboxes para multi-select:

| Recurso | Comportamento |
|---------|--------------|
| **Checkbox no header** | "Selecionar tudo" — marca/desmarca todos os tickets da página filtrada |
| **Checkbox por linha** | Seleciona/deseleciona ticket individual. Clique fora do checkbox navega para detalhe |
| **Barra flutuante** | Aparece quando 1+ tickets selecionados. Fixa no rodapé, contém: contador de seleção + 3 botões de ação |
| **Mudar Status** | Abre modal com seletor de novo status. Aplica a TODOS os selecionados atomicamente. Registra evento `bulk_change_status` por ticket |
| **Atribuir** | Abre modal com dropdown de CSMs. Reatribui todos para o CSM escolhido. Registra evento `bulk_assign` |
| **Fechar Tudo** | Confirma e fecha todos atomicamente. Status → `closed`, `closed_at` → agora. Registra evento `bulk_close` |

**Snapshot-backed Undo:**
- Antes de executar qualquer ação, o sistema captura o estado anterior de cada ticket (status, assigned_to)
- Após execução bem-sucedida, toast com botão **Desfazer** aparece por ~30s
- Usuário clica → PUT `/api/bulk-actions` com o snapshot restaura estado original
- Evento `bulk_action_undone` registrado por ticket restaurado

**Isolamento por RLS:**
- Usuário só pode selecionar/atualizar tickets de contas onde é `csm_owner`
- POST `/api/bulk-actions` valida propriedade via `accounts.csm_owner_id = auth.uid()`

---

#### 4.1.1.2 Busca Semântica (Semantic Search)

O campo de busca na tabela executa busca semântica via embeddings vetoriais quando o usuário digita 3+ caracteres.

| Comportamento | Descrição |
|---------------|-----------|
| **Query < 3 chars** | Sem chamada API, mantém busca in-memory simples (fallback) |
| **Query ≥ 3 chars** | Debounce 400ms → gera embedding Gemini da query → busca por similaridade em pgvector |
| **Spinner + Badge** | Ícone de carregamento durante a chamada de embedding. Badge "🌟 Semântica" aparece quando busca ativa |
| **Relevância** | Tickets rankeados por score de similaridade (cosine distance). Threshold 0.35 para incluir |
| **Combinação com filtros** | Busca semântica determina o conjunto de resultados; filtros de status/prioridade ainda se aplicam |
| **Fallback silencioso** | Se a API falhar, volta automática para busca in-memory sem feedback negativo ao usuário |

**Ingestão de Embeddings:**
- Ao criar novo ticket (`POST /api/support-tickets`), o sistema gera embedding do `title + description` e o armazena na tabela `embeddings` em background
- Tickets existentes podem ser indexados via POST `/api/support-tickets/backfill-embeddings` (chamada única manual)

**RLS:**
- Busca semântica valida propriedade: usuário só vê tickets de contas onde é `csm_owner`
- Filtro `accounts.csm_owner_id = auth.uid()` aplicado após ranking semântico

---

#### 4.1.1.3 Preview Inline (Triagem Rápida)

O Preview Inline permite a visualização contextual e a execução de ações rápidas diretamente da lista de tickets, sem a necessidade de navegar para uma página de detalhes.

| Comportamento | Descrição |
|---------------|-----------|
| **Slide-in Panel** | Ao clicar em uma linha da tabela, um painel lateral desliza da direita (90% width em desktop, máximo 600px). |
| **Contexto Completo** | Exibe subject, informações do customer, SLA status (badge + tempo), descrição completa e as últimas 3 respostas. |
| **Ações Inline** | Permite alterar *Assignee* via dropdown, mudar *Status*, adicionar *Tags* via modal reutilizável e submeter *Notes* internas. |
| **Deep Linking** | Atualiza a URL automaticamente (ex: `?view=all&preview=ticket-123`) para permitir compartilhamento direto do contexto. |
| **Responsividade** | Oculto em telas mobile (< 768px) no MVP. |
| **Fechamento** | Fecha via botão X, tecla ESC ou clique fora do painel. Remove o parâmetro da URL. |

#### 4.1.1.4 Detecção de Colisão (Collision Detection)

Sistema de presença em tempo real para evitar conflitos entre CSMs.

| Recurso | Descrição |
|---------|-----------|
| **Supabase Presence** | Rastreia usuários ativos no canal `ticket_presence:[id]`. |
| **Alerta Visual** | No `TicketPreviewPanel`, um banner animado exibe o e-mail de outros CSMs visualizando o mesmo ticket. |
| **Prevenção** | Reduz o risco de respostas duplicadas para o mesmo cliente. |

#### 4.1.1.5 Urgency Scoring com IA (F1-07)

Classificação inteligente de prioridade baseada no conteúdo.

| Recurso | Descrição |
|---------|-----------|
| **Motor Gemini** | Analisa título, descrição e histórico para determinar a urgência. |
| **Escala** | `low` (Baixa), `medium` (Média), `high` (Alta). |
| **Insights do Guardião** | Exibição do raciocínio da IA em tooltips (`UrgencyBadge`). |
| **Disparo** | Executado automaticamente na criação do ticket e em cada reabertura. |

#### 4.1.1.6 Detecção de Duplicatas (F1-11)

O sistema identifica tickets duplicados através de análise de similaridade semântica.

| Recurso | Descrição |
|---------|-----------|
| **Cron Diário** | Job executado às 02:00 UTC que compara embeddings de todos os tickets abertos |
| **Threshold** | Tickets com cosine similarity ≥ 0.85 são flagrados como potenciais duplicatas |
| **Candidates** | Armazenados em `ticket_similarity_candidates` com status `pending_review` |
| **UI** | Banner "Possível duplicata" exibe % de similaridade com botões "Mesclar" (F1-10) ou "Não é duplicata" |
| **Dismissal** | CSM pode marcar como falso positivo; status muda para `dismissed` |
| **Auditoria** | Logs em `ticket_events` com event_type `duplicate_flagged`; RLS garante isolamento por conta |

#### 4.1.1.7 Reabertura Manual (F1-12)

CSM pode reabrir tickets fechados com justificativa registrada.

| Recurso | Descrição |
|---------|-----------|
| **Botão** | "Reabrir com Justificativa" visível apenas em tickets com status `closed` |
| **Modal** | Textarea obrigatório (min 10 chars, max 1000) para capturar razão da reabertura |
| **API** | PATCH `/api/support-tickets/[id]/reopen` valida reason, altera status `closed` → `open` |
| **SLA** | `resolved_at` é resetado; `sla_status_resolution` volta a `no_prazo` |
| **Auditoria** | Event `manual_reopened` registrado em `ticket_events` com reason + reopened_by no payload |
| **Timeline** | Exibe ícone de reopen com razão completa visível ao clicar |

#### 4.1.1.8 Fila com Capacidade (F1-14)

Visibilidade em tempo real da capacidade de trabalho de cada CSM.

| Recurso | Descrição |
|---------|-----------|
| **Coluna max_tickets_capacity** | Adicionada a `csm_settings`; padrão 20 tickets por CSM (editável) |
| **View csm_queue_stats** | Calcula em tempo real: assigned_count, max_capacity, available_slots, load_percentage |
| **QueueStatsPanel** | Componente sidebar que lista CSMs com barras de capacidade coloridas |
| **Codificação de cores** | Verde <50%, Amarelo 50-80%, Vermelho >=80% |
| **Tooltip** | Exibe X/Y tickets e N slots disponíveis ao passar mouse |
| **Endpoint** | GET `/api/csm-queue-stats` retorna stats com cache 30s |
| **RLS** | View herda RLS de `auth.users` e `support_tickets` |

#### 4.1.1.9 Atribuição Automática (F1-15)

Sistema de auto-assignment que distribui carga automaticamente entre CSMs.

| Recurso | Descrição |
|---------|-----------|
| **Cron Job** | Roda a cada 5 minutos (`*/5 * * * *`) |
| **Trigger** | Tickets com `assigned_to IS NULL` e `status='open'` |
| **Algoritmo** | Busca CSM com menor `assigned_count` que ainda tem `available_slots > 0` |
| **Validação** | Respeita `max_capacity` e `auto_assign_enabled` flag (padrão true) |
| **Auditoria** | Evento `auto_assigned` em `ticket_events` com CSM responsável |
| **Telemetria** | Tabela `auto_assign_stats` registra capacity_before/after para análise |
| **Endpoint de Teste** | POST `/api/support-tickets/[id]/auto-assign-test` (admin) força atribuição |
| **Dashboard** | View `auto_assign_metrics` mostra assignments por hora para tendências |

#### 4.1.1.10 Escalonamento SLA (F1-16)

Notificação automática via Slack quando SLA está crítico.

| Recurso | Descrição |
|---------|-----------|
| **Cron Job** | Roda a cada 1 hora (`0 * * * *`) |
| **Busca** | Tickets com `sla_status='atencao'` (< 3h) ou `sla_status='vencido'` (< 0h) |
| **Slack Message** | Formatação com emoji (🚨 vencido, ⚠️ atenção), fields de cliente/CSM/prioridade, botão "Ver Ticket" |
| **De-duplication** | Não envia 2x para mesmo ticket em janela de 2 horas |
| **Circuit Breaker** | Se webhook Slack falha, log registra mas não falha o cron |
| **Webhook Var** | `SLACK_WEBHOOK_SLA_ALERTS` configurável por deployment |
| **Auditoria** | Evento `sla_escalation` em `ticket_events` com horas_elapsed e sla_status |
| **Telemetry** | Tabela `sla_escalations` rastreia escalações; view `sla_escalation_summary` para trends |
| **Endpoint de Teste** | POST `/api/admin/test-sla-escalation` valida webhook configurado e envia msg teste |

#### 4.1.1.11 Formulário Público e Webhook (F1-13)

Integração para recebimento de tickets de fontes externas sem autenticação.

**Formulário Público:**

| Feature | Descrição |
|---------|-----------|
| **Endpoint** | POST `/api/public/tickets` (sem auth, CORS enabled) |
| **Campos** | email (required), title (required), description (required), priority (optional, default='medium'), account_id (optional) |
| **Rate Limit** | 10 req/min por IP client; retorna 429 se excedido |
| **Account Mapping** | Se account_id não fornecido, busca por domain do email; fallback para primeira conta |
| **Criação** | Ticket criado com `source='form'`, `created_via_form_at` timestamp |
| **Email** | Confirmation email enviado via nodemailer com ID do ticket e link de tracking |
| **Auditoria** | Event `public_submission` registrado em `ticket_events` com email + timestamp |

**Webhook (Sistema Externo):**

| Feature | Descrição |
|---------|-----------|
| **Endpoint** | POST `/api/webhooks/tickets/create` |
| **Assinatura** | Header `X-Webhook-Signature` valida HMAC-SHA256; rejeita 401 se inválida |
| **Payload** | email, title, description, priority, account_key (maps to `accounts.external_id`), optional external_id |
| **Resposta** | 200 com `{ ticket_id }` ou erro 400/401/500 |
| **Auditoria** | Tabela `webhook_deliveries` registra payload, status, response, tentativas e timestamps |
| **Retry** | Implementado em background com exponential backoff (1s, 2s, 4s) — 3 tentativas máx |
| **Logging** | Event `webhook_submission` registrado em `ticket_events` com external_account_key |

### 4.1.2 Detalhe do Ticket (`/suporte/[id]`)

Layout de duas colunas:

**Coluna principal (esquerda):**
- Thread cronológica: mensagem original do cliente → replies dos agentes → notas internas. A visualização inicia automaticamente pelo final (mensagens mais recentes) para agilizar o atendimento.
- Cada evento distinguido visualmente (cor de fundo, ícone, label)
- Área de composição com abas "Responder ao Cliente" / "Nota Interna"

**Área de composição — fluxo de envio e classificação:**

```
[Agente redige resposta no textarea]
         ↓
[Seleciona Status do ticket (ao lado do botão)]
         ↓
[Botão "Avaliar e Enviar"]
         ↓
[ReplyReviewModal abre com resultado]
         ↓
[Agente escolhe: sua versão OU versão da IA]
         ↓
[Botão "Enviar Resposta" (Status persistido aqui)]
```

**Caso de falha da IA (`reviewFailed = true`):**
- O sistema tenta primeiro; se a chamada falhar, o textarea é desbloqueado
- Agente pode enviar diretamente sem avaliação (bypass habilitado apenas após tentativa)

**Estados da área de composição:**

| Estado | UI |
|--------|----|
| `!reviewApproved && !reviewFailed` | Seletor de Status + Botão "Avaliar e Enviar" (laranja) |
| `reviewApproved` | Seletor de Status + botão "Reavaliar" (ghost) + botão "Enviar Resposta" (azul) |
| `reviewFailed` | Botão "Tentar Novamente" + botão "Enviar sem Avaliação" (cinza) |

Edição do textarea após aprovação reseta `reviewApproved = false` (força nova avaliação).

**Sidebar (direita):**
- Classificação inline: **produto** (S&OP, S&OE, etc), prioridade, nível SLA, categoria, agente responsável.
- O campo **Status** foi movido para a área de composição de resposta para garantir que o ciclo de vida seja atualizado junto com o envio da mensagem.
- Painel SLA com `SLATimer` e `SLABadge` — indicador visual (ícone de alerta) e tooltip informativo exibidos quando nenhuma política está configurada, liberando espaço na área de leitura central.
- Info do cliente (nome da conta, link para detalhe)
- Histórico de datas (criação, 1ª resposta, resolução)

> **Observação:** O Status agora só é persistido quando a mensagem é de fato enviada, evitando saltos de estado sem conteúdo explicativo.

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

### 4.2.1 Ticket Lifecycle & Auto-close

O ciclo de vida segue o fluxo: `open` → `in_progress` → `resolved` → `closed`.

| Evento | Regra | Ação |
|--------|-------|------|
| **Auto-close** | Ticket em `resolved` sem réplica há X horas. | Status → `closed` + Disparo de CSAT. |
| **Parâmetro** | Definido em `sla_policies.auto_close_hours` (por conta). | Valor default: 48h. |
| **Reabertura** | Cliente envia mensagem em ticket `closed` ou `resolved`. | Status → `open` + Reset de SLAs. |

### 4.2.2 Pesquisa de Satisfação (CSAT)

Após o fechamento do ticket, um convite para avaliação é enviado automaticamente.
- **Escala**: 1 (Muito Insatisfeito) a 5 (Muito Satisfeito).
- **Token**: Um link único (`/csat/[token]`) é gerado com expiração de 7 dias.
- **Visibilidade**: A nota e o comentário são exibidos no `KPI Strip` e no Dashboard de Suporte.
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

**Os 5 Critérios de Avaliação (0–10 cada):**

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
Escala: 0–10. Penaliza fortemente critérios fracos — um único critério com nota baixa reduz significativamente a nota final.

**Regra de alerta:** `show_alert = true` quando `nota_final < 6`.

**Normalização automática:** O backend aplica `normalize()` em todos os scores antes do cálculo. Se a IA retornar valores em escala 0-100, são automaticamente convertidos para 0-10. O campo `evaluation` sempre exibe valores normalizados.

**Output (campo a campo):**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `sentiment` | `'Equilibrado' \| 'Neutro' \| 'Rígido'` | Tom emocional detectado |
| `feedback_summary` | string | Resumo em português do feedback, referenciando o histórico quando relevante |
| `evaluation.tom` | 0–10 | Score de tom (context-aware) |
| `evaluation.estrutura` | 0–10 | Score de estrutura |
| `evaluation.empatia` | 0–10 | Score de empatia (context-aware) |
| `evaluation.clareza` | 0–10 | Score de clareza |
| `evaluation.alinhamento` | 0–10 | Alinhamento ao Padrão Plannera |
| `recommended_version` | string | Versão reescrita pela IA com nomes reais e contexto do chamado |
| `training_notes` | string | Nota de treinamento para o agente (1-2 frases) |
| `pillar_scores.habilidades_comunicacao` | 0–10 | Pilar agregado de comunicação (tom + clareza + empatia) |
| `pillar_scores.efetividade_respostas` | 0–10 | Pilar agregado de efetividade (estrutura + alinhamento) |
| `nota_final` | number \| null | Média harmônica dos 5 critérios; `0` se qualquer critério for 0 |
| `show_alert` | boolean | `true` se `nota_final < 6` |
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

### 4.2.9 Reabertura Automática (Auto-Reopen)

Automação de ciclo de vida via banco de dados para garantir que nenhuma interação do cliente seja ignorada.

| Regra | Descrição |
|-------|-----------|
| **Gatilho (Trigger)** | `trg_auto_reopen_on_reply` monitora inserções na tabela `support_ticket_messages`. |
| **Condição** | Ticket com `status = 'closed'` recebe mensagem do tipo `reply` (cliente). |
| **Ação** | Status alterado para `open`. |
| **Auditoria** | Evento `auto_reopened` registrado em `ticket_events`. |

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

### 4.2.10 Mesclagem de Tickets (Merge)

Permite consolidar tickets duplicados ou relacionados em um único chamado principal.

| Recurso | Descrição |
|---------|-----------|
| **Vínculo** | O ticket secundário é fechado (`status = 'closed'`) e aponta para o principal via coluna `merged_into`. |
| **Audit Log** | Registro na tabela `ticket_merge_history` com o autor da mesclagem, motivo e timestamp. |
| **Integridade** | Evento `ticket_merged_in` é registrado na timeline do ticket principal. |
| **Indicador** | A coluna `merge_count` no ticket principal é incrementada automaticamente via RPC. |

### 4.2.11 Fechamento Automático (Auto-close)

Mecanismo para manter a fila de suporte limpa de chamados resolvidos mas não encerrados.

| Regra | Descrição |
|---------|-----------|
| **Trigger** | Ticket com `status = 'resolved'` sem atividade há X horas. |
| **Configuração** | O tempo é definido em `sla_policies.auto_close_hours` (default 48h). |
| **Ação** | Status alterado para `closed`. |
| **CSAT** | O fechamento dispara automaticamente o convite de CSAT para o cliente. |

---

## 4.3 Componentes Visuais

### 4.3.1 TicketDetailClient

| Elemento | Descrição |
|----------|-----------|
| Thread | Eventos `sla_events` ordenados por `created_at` |
| Abas composição | "Responder ao Cliente" / "Nota Interna" |
| Botão principal | "Avaliar e Enviar" → "Enviar Resposta" (após aprovação) |
| Seletor de status | Sempre visível na área de composição; inclui "Aguardando Cliente" e "Aguardando Produto" |
| Botão Reavaliar | Reset de `reviewApproved` com nova chamada à IA |
| Toolbar de formatação | Barra fixa abaixo do textarea: Negrito, Itálico, Código, Lista com marcadores, Lista numerada + Paperclip/Imagem |
| Auto-apply IA status | Ao aceitar versão da IA (ou manter própria), `editStatus` é automaticamente definido conforme `suggested_outcome` |
| Bypass de erro da IA | Se a revisão falhar (erro de API), o botão muda para "Enviar sem Revisão" (âmbar) + botão secundário "Tentar Revisão". O agente nunca fica bloqueado. |

**Seção de Classificação no sidebar (auto-save):**
- Prioridade, Produto e Categoria movidos para o sidebar direito
- Cada alteração chama `PATCH /api/support-tickets/[id]` imediatamente, sem precisar enviar uma resposta
- Indicador "Salvando..." visível durante a chamada (`savingProps`)
- O campo Status permanece no rodapé do compose, vinculado ao ciclo de vida da resposta

**Status disponíveis no dropdown (padrão de mercado — osTicket/Zendesk/Freshdesk):**

| Valor | Label | Comportamento no envio |
|-------|-------|------------------------|
| `open` | Aberto | status = 'open' |
| `in_progress` | Em Andamento | status = 'in_progress' |
| `pending_client` | Aguardando Cliente | status = 'in_progress' + outcome = 'pending_client' → pending_reason = 'client' |
| `pending_product` | Aguardando Produto | status = 'in_progress' + outcome = 'pending_product' → pending_reason = 'product' |
| `resolved` | Resolvido | status = 'resolved' → resolveTicket() + dispara CSAT |
| `closed` | Fechado | status = 'closed' → closeTicket() |

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
| HelpDesk: chamado sem cliente identificável | Resolução em cascata (código `[..]` → domínio → nome) falha → `skipped` + erro "conta não identificada". Definir `fallback_account_id` na config OU `helpdesk_tags`/`website` na conta para casar. |
| HelpDesk: chamado com status `pending`/`onhold` | Mapeado para `in_progress` (underscore — valor aceito pelo CHECK do banco). |

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
| Abr/2026 | Escala de avaliação corrigida para 0-10 (era 0-100); threshold de alerta ajustado para < 6; normalização automática no backend |
| Abr/2026 | Auto-apply do status sugerido pela IA: ao aceitar versão da IA ou a própria, `editStatus` é definido automaticamente |
| Abr/2026 | Adicionado "Aguardando Cliente" e "Aguardando Produto" ao seletor de status (padrão osTicket/Zendesk/Freshdesk) |
| Abr/2026 | Toolbar de formatação Teams-style (Negrito, Itálico, Código, Listas) abaixo da textarea — eliminado overlap de ícones |
| Abr/2026 | Classificação (Prioridade, Produto, Categoria) movida de volta ao sidebar direito com auto-save via PATCH; compose footer mantém apenas Status |
| Abr/2026 | Bypass de erro da IA: se revisão falhar, botão vira "Enviar sem Revisão" + "Tentar Revisão"; agente nunca fica bloqueado |
| Abr/2026 | Tabs "Responder"/"Nota" movidas para a linha do botão de envio — compose mais compacto, mais espaço para a thread |
| Abr/2026 | @menções: digitar @email em resposta ou nota notifica o usuário na Central de Alertas (evento `mention` em `sla_events`) |
| Mai/2026 | **F1-05 — Preview Inline:** Implementado painel lateral deslizante para triagem rápida; integração com `usePreviewPanel` (deep-linking); `PreviewActionBar` para ações rápidas; `TicketListRow` para renderização otimizada. |
| Mai/2026 | **F1-06 — Detecção de Colisão:** Implementado sistema de presença em tempo real via Supabase Presence para avisar CSMs visualizando o mesmo ticket. |
| Mai/2026 | **F1-07 — Urgency Scoring com IA:** Integração com Gemini AI para análise de urgência automática com exibição de raciocínio (UrgencyBadge). |
| Mai/2026 | **F1-08 — Reabertura Automática:** Automação via trigger no Postgres para reabrir tickets fechados quando o cliente responde. |
| Mai/2026 | **F1-09 — Auto-close e CSAT:** Implementado sistema de fechamento automático paramétrico com disparo de pesquisa de satisfação. |
| Mai/2026 | **F1-10 — Mesclagem de Tickets:** Infraestrutura de merge com auditoria, incremento atômico e vínculo entre chamados. |
| Mai/2026 | **F1-11 — Detecção de Duplicatas:** Cron job diário (02:00 UTC) com análise de similaridade semântica (pgvector, cosine 0.85+); banner UI com opção de merge ou dismissal; RLS enforced. |
| Mai/2026 | **F1-12 — Reabertura Manual:** Modal de reabertura com justificativa obrigatória (min 10 chars); PATCH endpoint valida status; logs event_type='manual_reopened' com reason. |
| Mai/2026 | **F1-13 — Formulário Público + Webhook:** POST `/api/public/tickets` (rate limit 10/min, email required) + POST `/api/webhooks/tickets/create` (HMAC validation); suporta `source='form'|'webhook'`; tabela `webhook_deliveries` para auditoria; email de confirmação via nodemailer. |
| Mai/2026 | **F1-14 — Fila com Capacidade:** View SQL `csm_queue_stats` calcula em tempo real (assigned_count, available_slots, load_percentage); coluna `max_tickets_capacity` em `csm_settings` (padrão 20, editável); componente `<QueueStatsPanel>` no sidebar com barras visuais (verde <50%, amarelo 50-80%, vermelho >=80%); endpoint `GET /api/csm-queue-stats` com cache 30s; RLS enforced por account. |
| Mai/2026 | **F1-15 — Atribuição Automática:** Cron job a cada 5 minutos (`POST /api/cron/auto-assign-tickets`, schedule `*/5 * * * *`) encontra tickets `assigned_to IS NULL + status='open'` e atribui para CSM com menor `assigned_count` (respeitando `max_capacity` e flag `auto_assign_enabled`); evento `auto_assigned` em `ticket_events` com CSM responsável; tabela `auto_assign_stats` para telemetria (capacity_before/after); endpoint POST `/api/support-tickets/[id]/auto-assign-test` (admin) força atribuição para teste; view `auto_assign_metrics` agrupa assignments por hora para dashboard de tendências. |
| Mai/2026 | **F1-16 — Escalonamento SLA:** Cron job horário (`POST /api/cron/escalate-sla-violations`, schedule `0 * * * *`) busca tickets com SLA `atencao` (<3h) ou `vencido` (>deadline); envia mensagem Slack formatada (🚨/⚠️ emoji, cliente, prioridade, CSM, link direto) via webhook `SLACK_WEBHOOK_SLA_ALERTS` com circuit breaker (se webhook falha, log registra mas não falha cron); tabela `sla_escalations` com de-duplication (não envia 2x em janela de 2h); evento `sla_escalation` em `ticket_events` com horas_elapsed; endpoint POST `/api/admin/test-sla-escalation` valida webhook e envia msg de teste; view `sla_escalation_summary` fornece telemetria por dia para análise de trends. |
| Mai/2026 | **F1-14 — Fila com Capacidade:** View SQL `csm_queue_stats` calcula em tempo real (assigned_count, available_slots, load_percentage); coluna `max_tickets_capacity` em `csm_settings` (padrão 20); componente `<QueueStatsPanel>` no sidebar com barras visuais (verde/amarelo/vermelho); endpoint `GET /api/csm-queue-stats` com cache 30s. |
| Mai/2026 | **F1-15 — Atribuição Automática:** Cron job a cada 5 minutos encontra ticket `assigned_to IS NULL + status='open'` e atribui para CSM com menor queue (respeitando `max_capacity` e `auto_assign_enabled` flag); evento `auto_assigned` em `ticket_events`; tabela `auto_assign_stats` para telemetria; endpoint POST `/api/support-tickets/[id]/auto-assign-test` para teste forçado; view `auto_assign_metrics` para dashboard. |
| Mai/2026 | **F1-18 — Categorização Automática:** Gemini analisa título + descrição (max 150 chars) e sugere categoria entre 5 predefinidas (Bug, Feature Request, Account/Billing, Performance, Other). Se `confidence >= 0.75`: auto-aplica a `category`; senão: mostra `<CategorySuggestionBadge>` para CSM revisar (botões Aceitar/Rejeitar, confidence % badge, reasoning). Colunas: `suggested_category`, `suggestion_confidence`, `suggestion_reasoning`. Tabela `categorization_suggestions` registra histórico com status (pending/accepted/rejected, applied_at, applied_by). Eventos: `auto_categorized` (sugestão gerada), `categorization_accepted` (CSM aceitou), `categorization_rejected` (CSM rejeitou). Auto-gatilhado ao criar novo ticket via `processAutoCategorizationForTicket()` em background. |
| Mai/2026 | **F1-17 — RAG Reply Suggestion:** Botão "💡 Sugerir Resposta" dispara RAG pipeline: (1) busca 5 tickets similares via `get_similar_tickets_for_rag()` (pgvector, cosine distance <= 1 - threshold 0.75), (2) recupera últimas 3 respostas como contexto, (3) monta prompt: ticket atual + categoria + prioridade + contexto similares, (4) gera sugestão Gemini 2.5 Flash (max 500 tokens, temp 0.7). Component `<ReplySuggestionPanel>` renderiza em collapse: loading spinner → read-only box com sugestão + disclaimer "🤖 AI-Suggested" + botões (Usar/Descartar) + "📚 Based on N similar tickets" expansível. Cache: `reply_suggestion_cache` (5min TTL, upsert ticket_id). Invalidação: gatilho `invalidate_reply_suggestion_cache()` ao INSERT `ticket_events` com `event_type IN ('reply', 'note')`. Telemetria: `reply_suggestion_telemetry` registra action (accepted/rejected/edited) + edit_distance se editado (para RL futura). Eventos: `reply_suggestion_accepted`, `reply_suggestion_rejected` em `ticket_events`. Validação: ticket deve estar `status IN ('open', 'in_progress')`. |
| Mai/2026 | **F1-19 — Resumo do Ticket:** Component `<TicketSummarySection>` posicionado acima da timeline. Gera resumo 1-2 frases (máx 150 chars) analisando: título, descrição, últimas 3 respostas, categoria, prioridade, status via Gemini (max 100 tokens, temp 0.3). UI: ícone 📝 + "Resumo:" + texto + timestamp geração + botão ↻ (regeneração, admin only ou optional). Cache: coluna `summary` + `summary_generated_at` em `support_tickets` (24h TTL). Invalidação: gatilho `mark_summary_as_stale()` reseta `summary=NULL, summary_generated_at=NULL` ao INSERT `ticket_events` com `event_type='reply'`. Endpoints: GET `/api/support-tickets/[id]/summary` retorna cached ou gera novo; POST força regeneração (logs em `summary_history`). Tabelas: `ticket_summary_cache` (tracking + stale flag), `ticket_summary_history` (audit: summary_text, generated_by='ai'|'manual', regenerated_by). View: `stale_ticket_summaries` lista tickets com summary expirado/invalido para background job. Eventos: `summary_regenerated` em `ticket_events` se forçado manualmente. |
| Mai/2026 | **F1-20 — Sentiment Trend:** Análise automática de sentimento (positivo/neutro/negativo) de cada reply via Gemini com score 0-1. Tabela `reply_sentiments` armazena: sentiment, score, keywords, confidence. Cache 24h em `sentiment_trend_cache` (últimas 10 respostas para sparkline). Componentes: `<SentimentBadge>` ao lado do autor da reply (hover: score + keywords); `<SentimentTrendSparkline>` no header (sparkline compacto + trend direction); `<SentimentTimeline>` no sidebar (lista expandível com filter por sentiment, stats). Endpoint: GET `/api/support-tickets/[id]/sentiment-trend` retorna array de sentimentos com trend_direction (improving/stable/declining). Cron job daily 03:00 UTC (`POST /api/cron/analyze-ticket-sentiments`) busca replies não-analisadas (max 100), processa em paralelo (max 5 req/s), regenera caches. Alerting: trigger no PostgreSQL detecta 3+ replies negativas consecutivas e cria evento `negative_trend_detected` em `ticket_events` para notificações opcionais. RLS enforced: CSMs veem sentimentos apenas de suas contas. |
| Mai/2026 | **F1-16 — Escalonamento SLA:** Cron job horário busca tickets com SLA `atencao` ou `vencido`; envia mensagem Slack formatada via webhook `SLACK_WEBHOOK_SLA_ALERTS` (circuit breaker se webhook falha); tabela `sla_escalations` com de-duplication (2h window); evento `sla_escalation` em `ticket_events` com horas_elapsed; endpoint POST `/api/admin/test-sla-escalation` testa integração; view `sla_escalation_summary` para análise de trends. |
| Jun/2026 | **Fix sync HelpDesk gravava 0 chamados** ("0 processados, N pulados"): o sync escrevia `source='helpdesk'` e `status='in-progress'`, mas os CHECK de `support_tickets` só aceitavam `source ∈ (csv,manual,email)` e `status='in_progress'` (underscore) → **todos os upserts falhavam** (caíam em `result.errors`, escondido do toast) e só os sem-conta apareciam como "pulados". Além disso, `csat_responses` não tinha `UNIQUE(ticket_id)`, mas o sync usa `upsert(onConflict:'ticket_id')` → todo CSAT falhava. Correções: migration `20260616160000` (`source` aceita `'helpdesk'`) + `20260616170000` (`UNIQUE` em `csat_responses.ticket_id`); `map.ts` emite `in_progress`; `sync.ts` só marca `historical_done=true` se a carga progrediu (senão um backfill falho travava em incremental e nunca reprocessava); o toast mostra `lidos/novos/atualizados/erros` (antes "processados" = só `created`, mascarando falhas). Diagnóstico: 313 chamados na API, 305 resolvem por conta, 8 sem cliente. **Backfill: 305 chamados + 40 CSAT carregados.** |
| Jun/2026 | **Tempos de atendimento do HelpDesk**: (1) `first_response_at` nunca era computado → `map.ts` extrai a 1ª mensagem pública de **agente** (`author.type==='agent'`) dos `events` e `sync.ts` grava (backfill: 298/305). (2) `opened_at`/`resolved_at` eram `date` (sem hora) → TMR no mesmo dia = 0; migration `20260616180000` converte para `timestamptz` (drop/recreate da view `stale_ticket_summaries`) e o backfill regravou horários reais (TMP ≈ 20h, TMR ≈ 3,9 dias). (3) CSAT (40) correto e ligado aos chamados — aparece no período e por cliente; **por agente fica zerado** (chamados importados sem `assigned_to`; agentes do HelpDesk não mapeiam para usuários da plataforma). |
