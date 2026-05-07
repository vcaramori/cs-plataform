# Epics and Stories — CS-Continuum Roadmap Completo
# Versão: 3.0 | Atualizado: 2026-05-07 | PM: Pedro Prioriza | PO: Paulo Pauta
# Sessão: Mesa Redonda CS + BMAD — Análise Crítica Completa

---

## ✅ Waves 1–3-B (Concluídas)

> Detalhes em histórico. Resumo abaixo.

| Wave | Escopo | Stories |
|------|--------|---------|
| Wave 1 | Dashboard, Accounts, NPS, Suporte Base, RAG, Esforço, Settings, Auth | 15 ✅ |
| Wave 2 | Design System Guardiões + Gemini Gateway | 3 ✅ |
| Wave 3 | Suporte Avançado (F1-03 a F1-20) | 18 ✅ |
| Wave 3-B | Accounts Avançado, Alertas, Playbooks, IA Preditiva, Governança, CS Ops | 10 ✅ |

---

## 🔄 Wave 4 — Automação Proativa (REVISADA — 3 Stories)

> **Ordem de execução obrigatória:** 23.1 → 14.2 → 15.1  
> **Status Refinement:** ✅ COMPLETO  
> **Documento:** [`docs/product/refinement-wave4-wave5.md`](refinement-wave4-wave5.md)  
> **Atenção:** Thresholds configuráveis foram movidos para Epic 22 (Wave 5) para evitar débito técnico.

### Epic 23-PRE: Playbook Governance Foundation (PRÉ-REQUISITO)
- **Story 23.1 [📋 REFINADO — 3 SP — PRIMEIRO]:** Adicionar colunas de governança nas tabelas de playbook:
  `playbook_tasks`: + `assigned_role` (csm/manager/ops), + `due_days_from_start` INT, + `estimated_hours` DECIMAL, + `feature_tags` TEXT[] (para pipeline Adoption-to-Playbook)
  `account_playbook_tasks`: + `assigned_to` UUID→auth.users, + `due_date` TIMESTAMPTZ, + `completed_by` UUID→auth.users, + `comments` JSONB[] (thread simples), + `time_spent_hours` DECIMAL
  `account_playbooks`: + `expected_end_date` TIMESTAMPTZ, + `objective` TEXT, + `success_criteria` TEXT
  UI: atualizar PlaybookWidget e PlaybookHistoryModal para exibir/editar esses campos.

### Epic 14: Automação de Playbooks
- **Story 14.1 [✅]:** Gatilho Manual por conta
- **Story 14.2 [📋 REFINADO — 3 SP]:** Gatilho por Health Score — cron detecta health_score_v2 < 50 (hardcoded, configurável na Wave 5), cria alerta no AlertCenter com botão "Iniciar Playbook". Idempotente (1 playbook ativo por tipo/conta). Sem UI de threshold agora.

### Epic 15: Comunicação Automatizada
- **Story 15.1 [📋 REFINADO — 8 SP]:** Check-in Automático por Silêncio — sem interação há X dias (Enterprise=14d, Mid=21d, SMB=30d, hardcoded). Gemini gera e-mail personalizado com histórico da conta. CSM aprova/edita/cancela em janela de **4h úteis** antes do envio. Não dispara se ticket aberto ou interação agendada em 7 dias. Log em `time_entries` como `auto_checkin`. Opt-out individual por conta.

---

## 🚀 Wave 5 — CS Intelligence & Excellence

> **Missão:** Superar Gainsight, Totango e ChurnZero em inteligência contextual e usabilidade.
> **Inspiração:** Gap analysis com CS Agents Pack — Sessão 2026-05-07.  
> **Status Refinement (Epics 36, 37, 38):** ✅ COMPLETO  
> **Documento:** [`docs/product/refinement-wave4-wave5.md`](refinement-wave4-wave5.md)

---

### Epic 36: User Roles & Permissions — Prioridade #0-A (PRÉ-CONDIÇÃO ARQUITETURAL)
> *"Cada pessoa vê e faz exatamente o que o cargo permite"*
> **Deve ser desenvolvido ANTES de qualquer outra story da Wave 5.**

- **Story 36.1:** Hierarquia de Papéis (Role Hierarchy)
  Implementar 5 níveis de acesso na tabela `users` (campo `role` enum):
  - `super_admin` — Plannera internamente; acesso total a tudo, incluindo multi-tenant (futuro)
  - `admin` — Gestor da plataforma da empresa cliente; configura parâmetros, gerencia time, vê todos os dados
  - `head_cs` — Head de CS; vê toda a carteira, relatórios de time, CS Ops, pode atribuir contas
  - `csm_senior` — CSM Sênior; gerencia própria carteira + pode ver carteira de outros CSMs (read-only) + acesso a relatórios agregados
  - `csm` — CSM padrão; vê apenas suas próprias contas e tickets atribuídos (RLS atual)
  - `client` — Portal do cliente (já existe, manter separado)
  Migration: adicionar coluna `role` em `users`/`profiles`; atualizar todas as RLS policies para incluir verificação de role. Supabase Auth: sincronizar role com `app_metadata` para uso no JWT.

- **Story 36.2:** Role-Based UI (RBAC Frontend)
  Controle de visibilidade de componentes baseado no role do usuário logado. Implementar hook `usePermission(permission: string): boolean` e HOC `<RequireRole role="head_cs">`. Itens de menu, botões e seções são ocultados (não apenas desabilitados) para roles sem permissão. Tabela de permissões por role:

  | Funcionalidade | csm | csm_senior | head_cs | admin | super_admin |
  |---|---|---|---|---|---|
  | Ver próprias contas | ✅ | ✅ | ✅ | ✅ | ✅ |
  | Ver todas as contas | ❌ | 👁️ read | ✅ | ✅ | ✅ |
  | CS Ops Dashboard | ❌ | 👁️ parcial | ✅ | ✅ | ✅ |
  | Admin Panel | ❌ | ❌ | ❌ | ✅ | ✅ |
  | Gerenciar usuários | ❌ | ❌ | 👁️ view | ✅ | ✅ |
  | Configurar parâmetros | ❌ | ❌ | ❌ | ✅ | ✅ |
  | Reajuste de preço | ❌ | ❌ | ✅ | ✅ | ✅ |
  | Rebalanceamento carteira | ❌ | ❌ | ✅ | ✅ | ✅ |
  | Bulk Actions em tickets | ✅ | ✅ | ✅ | ✅ | ✅ |
  | Ver relatórios do time | ❌ | 👁️ limitado | ✅ | ✅ | ✅ |

- **Story 36.3:** Convite e Gestão de Usuários com Role
  Atualizar `/users`: admin pode convidar novo usuário e definir role no momento do convite. Head CS pode ver time mas não editar roles. CSM não vê esta página. Alteração de role gera evento `role_changed` em `audit_log` com `changed_by`, `old_role`, `new_role` e timestamp. Role `super_admin` só pode ser atribuído por outro `super_admin`.

---

### Epic 37: Admin Control Panel — Prioridade #0-B (PRÉ-CONDIÇÃO ARQUITETURAL)
> *"Todos os parâmetros da ferramenta, organizados por módulo, em um único painel"*
> **Acessível apenas para roles `admin` e `super_admin`.**
> **Rota:** `/admin` — link no Sidebar visível apenas para admins.

- **Story 37.1:** Admin Panel — Estrutura e Navegação
  Rota `/admin` com sidebar de módulos. Layout: sidebar esquerda com módulos, área principal com formulário de parâmetros do módulo selecionado. Todos os campos com tooltip de ajuda contextual explicando o impacto do parâmetro. Salvar com confirmação (toast + audit log). Histórico de alterações por parâmetro (quem mudou, quando, de/para).

- **Story 37.2:** Módulo Dashboard & Health Score
  Parâmetros configuráveis:
  - Health Score v2: pesos das 4 dimensões (SLA %, NPS %, Adoption %, Relationship %) — soma deve ser 100%
  - Thresholds de classificação: healthy (≥X), at-risk (Y-X), critical (<Y) — default 75/50
  - Janela de cálculo de SLA (default 30 dias)
  - Janela de frequência de contato para Relationship (faixas de dias configuráveis)
  - Frequência do cron `health-score-daily` (hora de execução)
  - KPI targets do Dashboard: NPS meta, Health meta, MRR target do portfólio

- **Story 37.3:** Módulo Suporte
  Parâmetros configuráveis:
  - Auto-close após inatividade: horas por política SLA (padrão 48h)
  - Threshold de nota mínima de revisão de resposta IA (padrão <6)
  - Janela de Undo de Bulk Actions (padrão 30s, range 10-120s)
  - Threshold de similaridade para busca semântica (padrão 0.75)
  - Threshold de detecção de duplicatas (padrão 0.85, range 0.70-0.95)
  - Taxa limite do formulário público (padrão 10 req/min por IP)
  - Capacidade máxima padrão por CSM (padrão 20 tickets)
  - Auto-assign: habilitado/desabilitado globalmente
  - URL do Slack Webhook para alertas de SLA
  - Urgency scoring: habilitado/desabilitado
  - CES: habilitado/desabilitado + threshold de alta fricção (padrão 5)

- **Story 37.4:** Módulo NPS & Surveys
  Parâmetros configuráveis:
  - Faixas NPS: promotor (≥X, default 9), detrator (≤Y, default 6)
  - Meta de NPS corporativa (editável também no Dashboard)
  - Frequência mínima entre surveys por conta (default: não reenviar em 90 dias)
  - Dimensões de NPS habilitadas: Produto / Atendimento / Ambos
  - CES: escala (1-5 ou 1-7), texto da pergunta, tempo de espera pós-fechamento do ticket
  - CSAT: texto da pergunta, escala, tempo de espera

- **Story 37.5:** Módulo Alertas & Automações
  Parâmetros configuráveis (consolidados do Epic 22 — Admin é a UI):
  - Silent customer: dias por tier (Enterprise, Mid-Market, SMB)
  - Health crítico threshold para alerta churn_risk (padrão 40)
  - Health threshold para trigger de playbook (padrão 50, migrado da Wave 4)
  - NPS detrator sem followup: dias (padrão 7)
  - Adoption anomaly: queda % para alerta (padrão 20%)
  - Expansion signal: MRR vs mediana do segmento
  - CES alta fricção: threshold (padrão 5)
  - Janelas de renovação: crítico (padrão 30d), urgente (60d), planejamento (90d)
  - Check-in automático: habilitado/desabilitado global + dias por tier
  - Janela de aprovação de check-in (padrão 4h úteis)
  - Alert snooze: opções disponíveis, duração máxima

- **Story 37.6:** Módulo Playbooks & CS Ops
  Parâmetros configuráveis:
  - Adoption-to-Playbook: threshold de taxa de adoção para trigger (padrão 20% por 30 dias)
  - Feature Abandonment: dias de inatividade para detecção (padrão 30 dias, janela de histórico 60 dias)
  - Playbook auto-trigger: habilitado/desabilitado por tipo
  - Portfolio rebalancing: threshold de sobrecarga (padrão 80%) e sub-alocação (padrão 40%)
  - Capacidade máxima padrão de tickets por CSM (padrão 20)
  - Daily Briefing: horário de envio (padrão 08:00), habilitado/desabilitado
  - RAG Proativo: dia da semana e horário (padrão segunda 09:00), habilitado/desabilitado

- **Story 37.7:** Módulo IA & RAG
  Parâmetros configuráveis:
  - Modelo Gemini ativo (flash/pro) por tipo de tarefa (chat, embedding, reply-review, categorização)
  - Threshold de similaridade RAG (padrão 0.4, fallback 0.2)
  - Max output tokens por tipo de chamada (reply-review: 800, RAG: 2000, etc.)
  - Cache de resumo de ticket: duração (padrão 24h)
  - Cache de sugestão de resposta: duração (padrão 5 min)
  - Confidence mínimo de auto-apply de categorização (padrão 0.75)
  - Confidence mínimo de lançamento de esforço (padrão 0.8)
  - RAG: número de chunks similares a buscar (padrão 5)

- **Story 37.8:** Módulo Integrações & Notificações
  Parâmetros configuráveis:
  - E-mail (SMTP): host, porta, usuário, senha, remetente padrão (mascarado após salvar)
  - Slack Webhooks: SLA Alerts, Daily Briefing, Notificações Gerais — campo URL + botão "Testar"
  - API Keys externas: Resend, Firecrawl (mascarado, apenas últimos 4 chars visíveis)
  - CORS origins permitidos para o formulário público de tickets
  - Webhook HMAC Secret para recebimento de tickets externos

- **Story 37.9:** Módulo Usuários & Segurança
  Parâmetros configuráveis:
  - Política de senha (comprimento mínimo, complexidade)
  - Tempo de sessão (expiração JWT)
  - 2FA: habilitado/obrigatório por role
  - Whitelist de domínios de e-mail para auto-aprovação de convites
  - Número máximo de usuários por role (limite de licença)
  - Audit log retention: dias de retenção do histórico de alterações (padrão 365d)

---

### Epic 16: CS Command Center (Prioridade #1)
> *"30 segundos para saber onde agir hoje"* — Mário Mentor

- **Story 16.1:** Home do CSM — Priorização da Carteira
  Seções: "Focar Agora" (top 3 críticas + razão + ação sugerida), "Manter Momentum" (saudáveis + próxima ação), "Oportunidade" (sinais de expansão). Atualização diária via cron por CSM.

- **Story 16.2:** Daily Briefing por IA
  Gemini gera às 08h: 3 prioridades do dia baseadas em alertas, renovações, tickets críticos e silêncio. Card fixo no topo da home até dispensar. Salvo em `daily_briefings`.

- **Story 16.3:** Quick Actions Contextuais
  Floating bar com 4 ações: Registrar Interação, Abrir Ticket, Lançar Horas, Perguntar ao RAG. Modais sem sair da home.

- **Story 16.4:** Meeting Prep Mode — Vera Valor
  Ao criar interação futura, o sistema gera automaticamente: pauta sugerida baseada em histórico, perguntas-chave por tipo de reunião (QBR/Check-in/EBR/Onboarding), últimos 3 pontos de atenção da conta. Template salvo e editável antes da reunião.

---

### Epic 17: Renewal Cockpit (Prioridade #2)
> *"Narrativa completa em uma tela"* — Renato Renova

- **Story 17.1:** Renewal Cockpit 360° por Conta
  Acessível via botão "Preparar Renovação" (visível em contas com renovação < 90d). Seções: Health Score 12 meses (gráfico área), NPS Journey (4 ciclos + comentários), Tickets Resumo (volume/CSAT/TRT), Esforço do Time (horas por tipo), Adoção delta (% atual vs início do contrato), Highlights Positivos (3 marcos gerados por IA).

- **Story 17.2:** Renewal Brief Automático (PDF)
  Gemini gera documento com: capa (logo, MRR, data renovação), sumário executivo (passado/presente/futuro), tabelas de KPIs, proposta de valor. Layout Plannera via jsPDF/Puppeteer.

- **Story 17.3:** Renewal Pipeline — Visão do Portfólio
  Seção no Dashboard: Crítico (<30d), Urgente (30-60d), Planejamento (60-90d). Drill-down por CSM. Indicador de prontidão (health + NPS + CSAT → verde/âmbar/vermelho).

- **Story 17.4:** Negotiation History — Renato Renova
  Por contrato: histórico narrativo de renovações anteriores (descontos oferecidos/aceitos, objeções levantadas, argumento de fechamento, contraparte envolvida). Tabela `contract_negotiation_history`. Exibido no Renewal Cockpit e no ContractDetailModal.

---

### Epic 18: RAG Intelligence Modes (Prioridade #3)
> *"Output pronto para usar, não texto corrido"* — Vera Valor

- **Story 18.1:** RAG Structured Output — 4 Modos
  Seletor no chat: Narrativo (atual), QBR Mode (3 seções: últimos 3m/conquistas/próximos passos + riscos e mitigações), Risk Report (diagnóstico/sinais/ações priorizadas), Renewal Brief (narrativa de valor/proposta/pontos de negociação).

- **Story 18.2:** RAG com Memória de Sessão
  Histórico de até 10 trocas na sessão. "Contextualize na conta X" persiste para próximas perguntas. "Nova Conversa" reseta. Histórico salvo em `rag_sessions`.

- **Story 18.3:** RAG Proativo — Insight Push
  Cron semanal (segunda 09h): analisa portfólio por CSM, gera até 3 insights proativos (ex: padrão de escalada em tickets). Entregue via NotificationCenter com link para contexto completo.

- **Story 18.4:** RAG Export & Share
  Botão "Exportar" em qualquer resposta do RAG. Formatos: PDF (com logo Plannera), Markdown, Copiar para clipboard. Compartilhamento via link interno (acesso autenticado). Log em `rag_exports`.

---

### Epic 19: Adoption Intelligence (Prioridade #4)
> *"Do diagnóstico à ação automaticamente"* — Alice Adoção

- **Story 19.1:** Adoption-to-Playbook Pipeline Automático
  Trigger: feature_adoption_rate < 20% por 30+ dias. Alerta "Adoção em Risco" no AlertCenter com botão "Iniciar Playbook". Playbook selecionado pelo `feature_tag` correspondente (definido na Story 23.1). Idempotente. Evento `adoption_playbook_triggered`.

- **Story 19.2:** Expansion Radar — Painel de Oportunidades
  Nova aba "Oportunidades" no Dashboard. Card por conta: Score 0-100 (NPS + adoção + crescimento + MRR gap vs mediana segmento), tipo (upsell plano/add-on/novos usuários), ação recomendada por IA, **data de contato sugerida** (Edu Expansão — timing baseado no ciclo da conta). Filtros por score/tipo/CSM.

- **Story 19.3:** Feature Adoption Benchmarks
  Benchmark por (segmento, plano). Linha de referência na matriz de adoção. Tooltip "Média segmento: 68% — Conta 15pp abaixo". Atualização semanal.

- **Story 19.4:** Onboarding Score & Time-to-Value — Alice Adoção
  Medição de TTV: dias até atingir X features ativas (threshold configurável por plano). Score de onboarding 0-100 baseado em velocidade de ativação, breadth de uso e profundidade. Exibido no header da conta como métrica separada do health score. Benchmarks por segmento/plano. Alertas de TTV em risco.

- **Story 19.5:** Product Roadmap Alignment por Conta
  CSM pode marcar quais features do roadmap futuro são relevantes para cada conta. Agregado: "8 contas aguardam Feature X" → informa priorização de produto. Integra com Epic 28 (Feedback Loop).

- **Story 19.6:** Feature Abandonment Detection — Edu Expansão ✅ APROVADO
  Detecta features que ERAM usadas e pararam (distinto de features nunca adotadas). Critério: feature com `last_used_at` nos últimos 60 dias e agora sem atividade há 30+ dias. Alerta "Abandono de Feature" com severidade pelo peso no plano. Exibido na matriz de adoção com ícone de queda e timestamp do último uso. Gatilha automático para playbook de reativação (integra Story 19.1 via `feature_tag = 'reativacao'`). Cron semanal. Tabela `feature_abandonment_events`.

---

### Epic 20: VoC Intelligence — Voz do Cliente (Prioridade #5)
> *"NPS + tickets + reuniões → um único tema"* — Vico Voz

- **Story 20.1:** VoC Monthly Report por Conta
  Gemini sintetiza mensalmente: top 3 temas positivos, top 3 temas de atenção, 1 recomendação. Seção "Voz do Cliente" na conta com histórico. Digest semanal configurável.

- **Story 20.2:** VoC Portfolio Dashboard
  Rota `/voc`. Word cloud + ranking de temas por frequência. Filtros por segmento/CSM/período. Drill-down: tema → contas afetadas. Exportação CSV.

- **Story 20.3:** Feedback Loop — VoC para Produto
  Botão "Enviar para Produto" em qualquer tema VoC. Modal com título/descrição/prioridade pré-preenchidos. Cria em `product_feedback_items`. Exportação CSV para Jira/Linear.

- **Story 20.4:** NPS Multi-dimensão — Vico Voz
  Separar NPS em 2 dimensões: Produto (software, features, UX) e Atendimento CS (suporte, relacionamento, proatividade). Novo campo `nps_dimension` nos programas. Dashboard separado por dimensão. Benchmarks independentes. Ação distinta: NPS Produto → feedback de roadmap; NPS CS → ação do time.

- **Story 20.5:** Customer Effort Score (CES) — Vico Voz ✅ APROVADO
  Nova dimensão de survey: CES mede o esforço do cliente para resolver um problema (escala 1-7 "Quanto esforço você precisou fazer?"). Melhor preditor de churn por abandono — alta fricção = risco. Acionado após fechamento de ticket (junto ao CSAT) e opcionalmente após interações de onboarding. Campo `survey_type` em `nps_responses` (nps/csat/ces). Dashboard CES em `/nps`: média por conta/período, distribuição, correlação com CSAT e churn. Alerta quando CES > 5 (alta fricção) por conta.

---

### Epic 21: CS Ops Excellence (Prioridade #6)
> *"Gestão baseada em dados, não em feeling"* — Otto Ops

- **Story 21.1:** CSM Performance Dashboard
  Rota `/cs-ops`. Cards por CSM: carteira atual, CSAT médio, SLA compliance %, tickets resolvidos/abertos, tempo médio de 1ª resposta, health médio da carteira. Ranking comparativo (anonimizado para peers, completo para Head). Filtro por período.

- **Story 21.2:** Portfolio Rebalancing Recommendations
  Análise semanal de carga por CSM (nº contas, MRR gerido, tickets abertos, health médio). Se carga >80% ou <40%: alerta para Head com sugestão de quais contas mover. Aprovação humana obrigatória. Evento `portfolio_rebalanced`.

- **Story 21.3:** Playbook Effectiveness Tracking
  Health_score_v2 capturado antes e depois do playbook (7d/30d/90d). Dashboard em `/playbooks`: taxa de conclusão, delta de health, NPS delta pós-playbook. Ranking dos 3 playbooks mais eficazes.

- **Story 21.4:** CSM Activity Audit Log — Otto Ops
  Tabela `csm_activity_log`: contas visitadas, tickets respondidos, notas criadas, playbooks iniciados, RAG consultado. Por CSM por dia. Dashboard em `/cs-ops` mostrando adoção interna da ferramenta. Útil para onboarding de novos CSMs.

- **Story 21.5:** Capacity Planning Avançado
  Simulação de crescimento: "Se adicionarmos 5 contas Enterprise, qual CSM tem slot?". Baseado em peso de conta (MRR × complexidade). Recomendação de contratação: "Capacidade esgota em X meses no ritmo atual". Exportável para apresentação ao board.

- **Story 21.6:** Account Transition & Handoff Protocol
  Quando CSM é trocado (saída/realocação): checklist de handoff gerado automaticamente (reuniões pendentes, tickets abertos, próximas renovações, relacionamentos-chave do Power Map). Período de overlap configurável. Novo CSM recebe briefing IA da conta no primeiro acesso. Log em `account_transitions`.

---

### Epic 22: Alertas Inteligentes & Configuráveis (Prioridade #7)
> *"Sem thresholds fixos, sem fadiga de alertas"* — Rita Resgate

- **Story 22.1:** Thresholds Configuráveis por Conta/Segmento
  Settings > Alertas. 3 níveis: Global → Segmento → Conta. Thresholds: dias silêncio (7-90d), health crítico (20-60), NPS detrator sem followup (3-14d), health trigger playbook (Wave 4 Story 14.2 migra aqui). Validação com aviso se conta < segmento.

- **Story 22.2:** Alert Snooze & Frequência
  Snooze por alerta: 1d/3d/7d/até próxima mudança. Tabela `alert_snooze_log`. Head vê alertas em snooze do time. Frequência de renotificação configurável por tipo.

- **Story 22.3:** Stakeholder Engagement Score — Rita Resgate
  Por contato no Power Map: última interação (reunião/e-mail/ticket), frequência média, tendência (aumentando/estável/decrescente). Score 0-100 de engajamento. Alerta "Decisor Silencioso" se executivo-chave sem interação há X dias. Exibido no Power Map e no Risk Report do RAG.

- **Story 22.4:** Alert Intelligence — Correlação e Priorização
  IA analisa alertas ativos e identifica correlações (ex: "Esta conta tem silêncio + NPS queda + renovação em 45d — risco combinado alto"). Agrupa alertas relacionados em "Situação de Risco" com score combinado. Reduz ruído mostrando o cenário completo, não alertas isolados.

- **Story 22.5:** Champion Exit Alert — Rita Resgate ✅ APROVADO
  Quando um contato marcado como Champion ou Decisor no Power Map atualiza manualmente sua empresa (campo `is_active = false` ou novo campo `departed_at`), o sistema dispara alerta crítico "Defensor interno saiu da conta". CSM vê quem saiu, seu nível de influência e a última interação registrada. Alerta persiste até que um novo champion seja designado. Tabela `contact_departure_log`. Integração futura com LinkedIn Signal (Wave 6).

---

### Epic 23: Playbook Excellence (Expansão da Wave 4)

- **Story 23.1 [Wave 4 — PRÉ-REQUISITO]:** Governance Foundation (ver Wave 4 acima)

- **Story 23.2:** Success Plans — Jornadas Estratégicas
  Diferente de playbooks (táticos), Success Plans são objetivos estratégicos por conta com milestones trimestrais. Exemplo: "Atingir 80% de adoção em 6 meses". Cada milestone tem owner, prazo, critério de sucesso e status. Revisado em QBR. Link direto com health score e adoption benchmarks.

- **Story 23.3:** Playbook Library & Templates Comunitários
  Biblioteca de templates pré-definidos: Onboarding (30/60/90 dias), Recuperação de Conta em Risco, Expansão de Módulo, Preparação de QBR, Offboarding. CSMs podem clonar, customizar e compartilhar templates internamente. Rating e comentários por template.

- **Story 23.4:** Playbook Automation — Ações Automáticas
  Tasks do tipo `auto`: enviar e-mail (template selecionável), criar ticket interno, agendar reunião (link Google/Outlook Calendar), notificar Slack. Executadas automaticamente quando a task anterior é concluída e a data é atingida. Aprovação humana opcional por tipo de ação.

- **Story 23.5:** Price Increase Management Workflow — Renato Renova ✅ APROVADO
  Workflow completo para reajuste de preço: (1) CSM/Head cadastra reajuste com % de aumento, data de vigência e segmentos impactados; (2) sistema lista automaticamente contas afetadas com delta de MRR calculado; (3) Gemini gera comunicação personalizada por conta (baseada no histórico de relacionamento e NPS); (4) CSM revisa/edita e aprova envio; (5) envio via nodemailer com tracking de abertura; (6) registro em `contract_price_adjustments` com status (comunicado/aceito/em negociação/recusado); (7) histórico de negociação atualizado automaticamente na conta. Dashboard de acompanhamento: % de contas comunicadas, receita em risco, negociações abertas.

---

## 🌐 Wave 6 — Plataforma Madura & Integrações

---

### Epic 24: Portal do Cliente (Customer Portal)
> *"O cliente vê a saúde da parceria com a Plannera"*

- **Story 24.1:** Portal Autenticado para Clientes (`/portal`)
  Login separado para contato do cliente (role `client`). Visão restrita: seus tickets, status de adoção, próximas reuniões, documentos compartilhados. SLA visível. Sem acesso a dados comerciais.

- **Story 24.2:** Shared Success Plan no Portal
  Cliente vê o Success Plan (Story 23.2) da própria conta: objetivos, progresso dos milestones, próximas ações. Comentários bilaterais. Aprovação de milestone pelo cliente.

- **Story 24.3:** Ticket Submission no Portal
  Cliente abre tickets diretamente no portal (sem e-mail). Acompanha status em tempo real. Resposta do CSM aparece no portal e no e-mail. Notificação push (PWA).

---

### Epic 25: Communication Hub

- **Story 25.1:** Email Sequences & Campaigns
  Templates de e-mail reutilizáveis com variáveis ({{account_name}}, {{csm_name}}, {{renewal_date}}). Sequências: onboarding (D+1/D+7/D+30), reengajamento, pré-renovação. Agendamento e tracking de abertura.

- **Story 25.2:** Meeting Templates Library
  Templates de pauta por tipo: QBR (30/60/90 dias), EBR, Check-in mensal, Onboarding kickoff. Pauta gerada automaticamente com dados da conta. Exportável para e-mail/Google Docs.

- **Story 25.3:** Broadcast Announcements
  Head de CS envia comunicado para todos CSMs (ex: novo processo, mudança de SLA). Log de leitura. Urgente (banner) vs Informativo (inbox).

---

### Epic 26: Integrações

- **Story 26.1:** CRM Sync (Salesforce / HubSpot)
  Sync bidirecional: contas, contatos, oportunidades de expansão, status de renovação. Mapping de campos configurável. Webhook-based (near real-time).

- **Story 26.2:** Calendar Integration (Google / Outlook)
  Registrar interação com 1 clique a partir de evento do calendário. Auto-preenche duração, participantes e tipo. Sincroniza próximas reuniões na timeline da conta.

- **Story 26.3:** Zoom / Meet — Auto-Transcription Ingestion
  Após reunião, transcrição importada automaticamente via API Zoom/Read.ai. Vinculada à interação correspondente. Alimenta o RAG e o sentiment analysis.

- **Story 26.4:** Jira / Linear — Product Feedback Integration
  Items criados via Epic 20 (VoC → Produto) são criados automaticamente no Jira/Linear com labels de cliente/segmento. Status sync bidirecional: quando issue é fechada, VoC item é marcado como "resolvido" e cliente é notificado.

- **Story 26.5:** Slack Deep Integration
  Além dos alertas SLA existentes, adicionar: Daily Briefing no Slack por CSM (opt-in), notificação de playbook iniciado/concluído, summary semanal da carteira (toda segunda), comando `/cs-status conta X` que retorna health + alertas ativos.

- **Story 26.6:** SSO / Enterprise Auth
  SAML 2.0 / OpenID Connect para login corporativo (Azure AD, Okta, Google Workspace). Auto-provisioning de usuários por domínio de e-mail. Gestão de grupos/roles via IdP.

---

### Epic 27: Executive Intelligence

- **Story 27.1:** Board-Level Dashboard
  Visão executiva para CEO/CFO: ARR total, Net Revenue Retention (NRR), Gross Retention, expansão vs churn líquido, health médio do portfólio, CSAT consolidado. Sem dados de conta individual. Exportável como PDF mensal.

- **Story 27.2:** Cohort Analysis — Retenção por Coorte
  Agrupar contas por data de início (trimestral). Visualizar retenção, expansão e churn por coorte ao longo do tempo. Identificar quais safras de clientes têm melhor NRR.

- **Story 27.3:** Segment Intelligence Report
  Comparativo automático entre segmentos (Indústria/MRO/Varejo/Distribuidor): health médio, CSAT, NPS, TTV, churn rate, expansão. Gerado mensalmente. Identifica qual segmento tem melhor produto-market fit.

- **Story 27.4:** Churn Post-Mortem AI Analysis
  Quando conta é marcada como `churned`: Gemini analisa todo o histórico (tickets, NPS, interações, health trend, engagement de stakeholders) e gera relatório de causa raiz. Identifica padrão de sinais que antecederam o churn. Agrega em "Padrões de Churn" para aprendizado do time.

---

### Epic 28: Digital CS — Low-Touch Automation

- **Story 28.1:** Tier-Based Automation Rules
  Contas SMB (MRR < R$3k): atendimento majoritariamente automatizado. Regras configuráveis: check-in automático (sem aprovação), playbooks sem intervenção manual, alertas apenas quando crítico. Tier Enterprise: tudo com aprovação humana.

- **Story 28.2:** In-App Guidance (para o Portal do Cliente)
  Tooltips e walkthroughs dentro do Portal do Cliente guiando o cliente a usar features do produto Plannera. Baseado na adoção atual da conta (Story 19.1 — features não adotadas recebem guias contextuais).

- **Story 28.3:** Customer Health Digest (para o Cliente)
  E-mail mensal automático para o contato principal da conta mostrando: progresso de adoção, tickets resolvidos, próximas renovações, highlights do período. Gerado por IA com tom positivo e dados reais. Opt-out disponível.

---

### Epic 29: Knowledge Base Inteligente

- **Story 29.1:** Knowledge Base Auto-Gerada de Tickets
  Tickets resolvidos com CSAT >= 4 e resposta aceita pela IA são candidatos para KB. Gemini extrai: título, problema, solução, categoria, produto afetado. Curadoria humana (aceitar/rejeitar). Tabela `knowledge_base_articles`.

- **Story 29.2:** KB Search no Suporte
  Antes de abrir ticket, cliente vê artigos relevantes da KB (busca semântica). No compose do CSM, "Sugerir da KB" usa pgvector para buscar artigo similar ao ticket atual. Reduz volume de tickets repetitivos.

- **Story 29.3:** KB Analytics
  Artigos mais consultados, taxa de deflexão (KB consultada → ticket não aberto), artigos com alto CSAT, gaps (buscas sem resultado). Dashboard em `/settings/knowledge-base`.

---

### Epic 30: Competitive Intelligence & Risk Radar

- **Story 30.1:** Competitive Risk Flags
  CSM pode registrar mencões de concorrentes em interações e tickets (campo `competitor_mentioned`). Dashboard: quais concorrentes aparecem mais, por segmento, correlação com churn subsequente. Alerta quando conta menciona concorrente 2+ vezes em 30 dias.

- **Story 30.2:** Market Signal Alerts
  Integração com Firecrawl/RSS: monitora notícias sobre contas (mudanças de liderança, M&A, crises financeiras, demissões em massa). Alerta proativo ao CSM "Acme Foods anunciou layoffs — avaliar impacto na renovação". Configurável por conta (opt-in).

---

## 🧩 Wave 7 — Onboarding & Capacitação Interna (Onda Final)

> Não desdobrar em stories agora. Escopo macro definido para quando a plataforma estiver madura.

### Epic 35: CSM Training & Certification Tracking — Otto Ops ✅ APROVADO (Wave Final)

> **Visão:** A plataforma deve ter um módulo de onboarding para novos CSMs com mapeamento completo de todas as funcionalidades. O novo CSM entra na ferramenta e tem um caminho guiado de aprendizado — cada módulo da plataforma tem sua documentação interna, exercícios práticos e critério de conclusão.

- **Escopo macro:** Módulo `/training` com trilhas por perfil (CSM júnior, sênior, Head de CS); cada trilha cobre os módulos da plataforma (Accounts, Suporte, NPS, Esforço, RAG, Playbooks, Alertas); progresso rastreado por CSM; certificação interna ao concluir trilha; conteúdo atualizado automaticamente quando nova feature é lançada (integra com changelog do README).
- **Prioridade:** Baixa — iniciar quando Wave 6 estiver 80% concluída.

---

## 📋 Wishlist — Itens Avaliados e Adiados

> Estes itens foram discutidos e conscientemente adiados. Podem ser retomados em revisões futuras do roadmap.

| Item | Razão do Adiamento | Quem Levantou |
|------|-------------------|---------------|
| Health Score Forecasting (60/90d preditivo) | Wishlist — a IA atual é reativa; forecasting requer dados históricos mais ricos | Mário Mentor |
| Monitoramento de Atraso de Pagamento | Wishlist — sem integração com sistema financeiro atual | Rita Resgate |
| Regulatory Risk Flag | Fora do escopo atual da Plannera | Rita Resgate |
| Referral Tracking | Fora do escopo CS — pertence ao time comercial | Edu Expansão |
| User-Level Adoption (granularidade por usuário) | Requer API do produto Plannera — dependência externa | Alice Adoção |
| Executive Sponsorship Tracking | Wishlist — valor alto mas baixa urgência | Vera Valor |
| QBR Scheduling Workflow | Wishlist — coberto parcialmente por Meeting Prep Mode (16.4) | Vera Valor |
| G2/Capterra Review Monitoring | Fora do escopo — pode entrar em Market Signal Alerts (30.2) | Vico Voz |
| LGPD Compliance Audit Log | Wishlist — relevante quando escalar para múltiplos clientes | Otto Ops |
| SLA Breach Cost Calculator | Wishlist — valor alto, baixa prioridade vs outros itens | Otto Ops |

---

## 📊 Resumo Executivo — Mapa Completo

| Wave | Foco | Status | Stories |
|------|------|--------|---------|
| Wave 1 | Fundação | ✅ Concluída | 15 |
| Wave 2 | Design System | ✅ Concluída | 3 |
| Wave 3 | Suporte Avançado | ✅ Concluída | 18 |
| Wave 3-B | Accounts & Intelligence | ✅ Concluída | 10 |
| **Wave 4** | **Automação Proativa** | **🔄 3 pendentes** | **3** |
| **Wave 5** | **CS Intelligence & Excellence** | **🆕 Planejada** | **33** |
| **Wave 6** | **Plataforma Madura & Integrações** | **🆕 Planejada** | **30** |
| **Wave 7** | **Onboarding & Capacitação** | **🔮 Onda Final** | **1 épico** |

**Total aprovado: 112 stories + 1 épico Wave 7**
**Wishlist documentada: 10 itens**

### Prioridade de Execução — Wave 5

```
CRÍTICO (impacto imediato no CSM):
  Epic 16 (Command Center) → Epic 17 (Renewal Cockpit) → Epic 22 (Alertas)

ALTO (inteligência diferenciada):
  Epic 18 (RAG Modes) → Epic 19 (Adoption + Feature Abandonment + TTV)
  Epic 20 (VoC + CES) → Epic 23 (Playbook Excellence + Price Increase)

IMPORTANTE (operação e gestão):
  Epic 21 (CS Ops) → Epic 22.5 (Champion Exit Alert)
```

### Dependências Críticas

```
Wave 5 Epic 36 ──→ TODOS os outros Epics da Wave 5 (roles são pré-condição)
Wave 5 Epic 37 ──→ Epic 22 (consolida UI de thresholds no Admin Panel)
Wave 4 Story 23.1 ──→ Wave 5 Stories 19.1, 21.3, 23.2, 23.3, 23.4, 23.5
Wave 4 Story 14.2 ──→ Wave 5 Story 22.1/37.5 (threshold configurável)
Wave 4 Story 15.1 ──→ Wave 5 Story 22.1/37.5 (threshold configurável)
Wave 5 Epic 20    ──→ Wave 6 Epic 26.4 (Jira integration)
Wave 5 Epic 19.4  ──→ Wave 6 Epic 28.2 (In-App Guidance)
Wave 6 Epic 24    ──→ Wave 6 Epic 28 (Digital CS usa Portal)
Wave 6 (80% done) ──→ Wave 7 Epic 35 (CSM Training)
```

---

### Epic 38: Date Intelligence — MTD, YTD e Filtros Globais (Quick Win)
> *"Sem MTD/YTD, os números não têm contexto"*
> **Quick Win — pode ser desenvolvido em paralelo com Wave 5 início.**

- **Story 38.1:** Filtros de Período Globais (MTD / QTD / YTD / Custom)
  Adicionar seletor de período padronizado em **todas** as telas que exibem dados temporais. Períodos pré-definidos: `Hoje`, `7 dias`, `MTD` (mês corrente até hoje), `Mês anterior`, `QTD` (trimestre corrente), `YTD` (ano corrente), `Ano anterior`, `Custom` (date-picker range). Componente `<DateRangePicker>` global reutilizável. Estado persistido em URL query params (`?period=mtd&from=&to=`) para compartilhamento de link. Telas impactadas: Dashboard Principal, NPS Hub, Suporte Dashboard, Esforço, CS Ops `/cs-ops`, VoC `/voc`, Renewal Pipeline.

- **Story 38.2:** KPI Comparison — Período Atual vs Anterior
  Em cada KPI do Dashboard Principal e CS Ops: exibir delta percentual vs período anterior equivalente (ex: "MTD atual vs MTD mês passado"). Indicador visual: seta verde ↑ / vermelha ↓ / cinza → com percentual. Tooltip mostrando os valores absolutos dos dois períodos. Aplicar também no NPS Score, Health Médio, Tickets Abertos e MRR.

- **Story 38.3:** Exportação Contextual com Período
  Ao exportar qualquer relatório (NPS XLSX, VoC CSV, Esforço), o arquivo gerado inclui no nome e no cabeçalho o período selecionado (ex: `nps-export-MTD-2026-05.xlsx`). Filtro de data aplicado automaticamente nos dados exportados.

---

## 📊 Resumo Executivo — Mapa Completo

| Wave | Foco | Status | Stories |
|------|------|--------|---------|
| Wave 1 | Fundação | ✅ Concluída | 15 |
| Wave 2 | Design System | ✅ Concluída | 3 |
| Wave 3 | Suporte Avançado | ✅ Concluída | 18 |
| Wave 3-B | Accounts & Intelligence | ✅ Concluída | 10 |
| **Wave 4** | **Automação Proativa** | **🔄 3 pendentes** | **3** |
| **Wave 5** | **CS Intelligence & Excellence** | **🆕 Planejada** | **47** |
| **Wave 6** | **Plataforma Madura & Integrações** | **🆕 Planejada** | **30** |
| **Wave 7** | **Onboarding & Capacitação** | **🔮 Onda Final** | **1 épico** |

> Wave 5 inclui: Epics 36 (Roles), 37 (Admin Panel), 38 (Date Intelligence — Quick Win), 16–23 (CS Intelligence)

**Total aprovado: ~128 stories + 1 épico Wave 7**
**Wishlist documentada: 10 itens**

### Prioridade de Execução — Wave 5

```
PRÉ-CONDIÇÃO (deve vir primeiro):
  Epic 36 (Roles & Permissions) → Epic 37 (Admin Panel)

QUICK WIN (paralelo com início da Wave 5):
  Epic 38 (MTD/YTD Date Filters) — independente, baixo risco

CRÍTICO (impacto imediato no CSM):
  Epic 16 (Command Center) → Epic 17 (Renewal Cockpit) → Epic 22 (Alertas)

ALTO (inteligência diferenciada):
  Epic 18 (RAG Modes) → Epic 19 (Adoption + Feature Abandonment + TTV)
  Epic 20 (VoC + CES) → Epic 23 (Playbook Excellence + Price Increase)

IMPORTANTE (operação e gestão):
  Epic 21 (CS Ops) → Epic 22.5 (Champion Exit Alert)
```

---

*Documento mantido por: Pedro Prioriza (PM) & Paulo Pauta (PO)*
*Revisado com: Time CS Agents Pack — Mário Mentor, Rita Resgate, Edu Expansão, Alice Adoção, Renato Renova, Vera Valor, Vico Voz, Otto Ops*
*Última revisão: 2026-05-07 — Mesa Redonda de Análise Crítica Completa*
*Próximo passo: Handoff para Arnaldo Arquiteta + Davi Deploy — sizing e sprint planning Wave 4*
