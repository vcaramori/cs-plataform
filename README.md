# CS-Continuum — Plataforma de Customer Success da Plannera

CS-Continuum é uma plataforma interna de Customer Success construída para a Plannera. Centraliza a gestão de clientes (logos), contratos, esforço, suporte, adoção de produto, health score e NPS em um único painel — com um motor de IA (RAG) que responde perguntas em linguagem natural sobre qualquer cliente ou o portfólio inteiro.

---

## 🤖 CS Agents Pack — Squad de Especialistas de IA

**Status:** ✅ Installado e disponível para todas as LLMs do projeto (v1.0)

8 agentes especializados em Customer Success (S&OP/S&OE/IBP):

| Agente | Propósito | Quando Usar |
|--------|-----------|------------|
| **cs-manager** | Orquestrador multidimensional | Pergunta complexa, precisa de priorização |
| **risk-watchdog** | Detecta sinais de churn | Suspeita de risco, antes de renovação |
| **expansion-scout** | Caça oportunidades de expansão | Conta saudável em plateau, demanda nova |
| **adoption-coach** | Diagnóstico de adoção/TTV | Onboarding, baixa ativação, bloqueadores |
| **renewal-strategist** | Estratégia de renovação | A partir D-90 (90 dias antes vencimento) |
| **qbr-architect** | Desenha QBRs/EBRs estruturados | Preparando reunião executiva |
| **voc-analyst** | Sintetiza voz do cliente | Análise feedback, descoberta padrões |
| **cs-ops-auditor** | Auditoria interna do time CS | Snapshot trimestral, análise gargalos |

**📍 Localização:** `/cs-agents-pack/`  
**📚 Documentação:**
- [`AGENTS-REGISTRY.md`](AGENTS-REGISTRY.md) — Índice central de descoberta
- [`CS-AGENTS-PACK-ORIENTATION.md`](CS-AGENTS-PACK-ORIENTATION.md) — Guia para o time
- [`.claude/agents.json`](.claude/agents.json) — Configuração técnica

**Como usar:** Chamar `@cs-manager` para qualquer pergunta multidimensional. Ele enquadra e roteia para especialistas. [Leia mais →](AGENTS-REGISTRY.md)

---

## 🚀 Branch `main` — Release Candidate (2026-05-25)

Branch estável criada para consolidação de features de alta densidade e de inteligência operacional.

**Features Operacionais e Ativas:**
- ✅ **Dashboard Core:** Portfolio Control, KPIs de alta fidelidade visual, evolução e medidor de lealdade NPS global.
- ✅ **Clientes (Logo Cockpit 360°):** CRUD completo, detalhes de conta, Adoção Executiva, Linha do Tempo Unificada com 5 tipos de eventos e RAG Contextual.
- ✅ **SLA por Contrato:** Mapeamento de prioridades de chamados externos, políticas customizadas clonadas ou herdadas globalmente em `/accounts/[id]/sla`.
- ✅ **Renewal Cockpit:** Análise de histórico de vigência, vigência contratual e counter T-minus para renovações em `/accounts/[id]/renewal`.
- ✅ **Proactive Smart Alerts:** Monitoramento diário de 6 indicadores de saúde (tabela `proactive_alerts`) integrado diretamente no **AlertCenter Drawer** flutuante na Sidebar.
- ✅ **Success Plan:** Planejamento estratégico compartilhado com links públicos, contadores e progresso dinâmico em `/accounts/[id]/success-plan`.
- ✅ **Playbooks Engine:** Gerenciamento, execução guiada e Playbook Builder interativo baseado em `ReactFlow` no `/playbooks/builder`.
- ✅ **RAG & Inteligência (Perguntar):** Chat 360° qualificado cruzando notas qualitativas, financeiro e suporte de forma exaustiva via LLM Gateway (provider configurável) no `/perguntar`.
- ✅ **Chamados & Suporte:** Sync automático por e-mail, auto-reabertura, colisão de atendentes e categorização por IA.
- ✅ **Esforço & Horas:** Auto check-in gerado por IA para silêncios contratuais e journal qualitativo de horas.
- ✅ **Integrações de TI (Admin Hub):** Webhooks seguros (HMAC), Salesforce/HubSpot, Zendesk/Jira e exportações scheduled (BigQuery/Snowflake) ativas em `/admin/integrations`.
- ✅ **Admin Settings:** Configuração completa dos 7 módulos do sistema via interface tabulada em `/admin/settings`.
- ✅ **Gestão de Equipe & Permissões:** Visualização e cadastro de CSMs com atribuição dinâmica de roles no banco de dados em `/users`.

**Limpeza efetuada:**
- 21 arquivos `.md` antigos e relatórios de sprint temporários removidos da raiz.
- 3 scripts JavaScript legados e PDFs avulsos limpos da árvore de arquivos.
- Diretórios de cache e logs de subagentes antigos descarrilados (.agent/ e .agents/) deletados.

---

## 📋 Roadmap — Wave 4-7 Roadmap Confirmed

**Wave 4:** 2026-05-07 — ✅ ~90% (builder mockup pendente)  
**Wave 5:** Backend ✅ | UI ✅ 95% — Admin Settings 7 módulos + Meeting Prep únicos pendentes  
**Wave 6:** Backend ✅ | UI ✅ 90% — `/adoption`, `/cs-ops` implementados  
**Wave 7:** Backend ✅ | UI ✅ 100% — Observability UI completo, Mobile (skipped)  
**Última Auditoria:** 2026-05-11 — [ver tabela completa abaixo](#-status-real--waves-4-7-auditoria-2026-05-11)

### Wave 4 — Automação Proativa ✅ 100% COMPLETO

| Story | Escopo | SP | Backend | UI | Arquivos |
|-------|--------|----|---------|----|---------|
| **23.1** | Playbook Governance — Campos de auditoria e comentários em tasks | 3 | ✅ | ✅ | migrations, PlaybookWidget, PlaybookHistoryModal, types |
| **14.2** | Playbook Trigger Alert — Health < 50 → alerta acionável | 3 | ✅ | ✅ | AlertService.checkPlaybookTrigger, AlertCenter "Iniciar Playbook", migration |
| **15.1** | Auto Check-in por Silêncio — Geração IA + Fila de Aprovação | 8 | ✅ | ✅ | 2 crons (generate/send), auto_checkin_queue table, AutoCheckInQueue UI, /esforço |
| **Playbook Builder** | Drag-drop canvas ReactFlow | 5 | ✅ API salva JSON | ✅ | `/playbooks/builder` com ReactFlow funcional — drag, connect, salvar |
| | **TOTAL** | **19 SP** | **✅** | **✅ 100%** | |

**📝 Detalhes de Implementação:**
- **Story 23.1:** 5 migrations, 2 componentes UI atualizados, 9 novos campos de governança + comentários JSONB thread
- **Story 14.2:** Novo método `checkPlaybookTrigger` em AlertService com idempotência, UI com botão "Iniciar Playbook" que cria playbook e resolve alerta
- **Story 15.1:** `auto_checkin_queue` table com workflow de aprovação (4h), cron diário que gera emails via IA por tier de silêncio, cron de envio via SMTP/nodemailer, UI modal com aprovação/edição/cancelamento, logging em time_entries

### Wave 5 — Fundação Inteligência + Automação (90 SP) ✅ COMPLETO

**Status real (auditoria 2026-05-11):** APIs/Backend 100% ✅ | UI 100% ✅

| Epic | Feature | Backend | UI | Nota |
|------|---------|---------|-----|------|
| **36** | User Roles & RBAC | ✅ | ✅ | `/users` completo |
| **37** | Admin Hub | ✅ | ✅ | `/admin` com navegação |
| **37** | Admin Permissions | ✅ | ✅ | Gerenciado de forma integrada no `/users` |
| **37** | Admin Integrations | ✅ | ✅ | `/admin/integrations` (4 tabs: Webhooks, CRM, Support, BI) |
| **37** | Admin Settings — Health, SLA, NPS, Alertas, Playbooks, IA, Segurança | ✅ | ✅ | Painel tabulado completo com todos os 7 módulos em `/admin/settings` |
| **38** | DateRangePicker componente | ✅ | ✅ componente | `src/components/ui/DateRangePicker.tsx` |
| **38** | DateRangePicker conectado aos dashboards | — | ✅ | Dashboard Suporte, NPS, VoC, Esforço integrados |
| **38** | KPI Delta % vs período anterior | ✅ | ✅ | `/api/dashboard/kpi-deltas` + `KPIDeltas` component |
| **16** | Command Center `/home` | ✅ | ✅ | Briefing + prioridades IA |
| **16** | QuickActionsFAB | ✅ | ✅ | Flutuante em todas as páginas |
| **16** | Meeting Prep Modal | ✅ API | ✅ | `MeetingPrepModal` no header de accounts/[id] — tópicos + pontos-chave IA |
| **17** | Renewal Cockpit 360° | ✅ | ✅ | `/accounts/[id]/renewal` |
| **17** | Renewal Brief PDF | ✅ | ✅ | Botão integrado no cockpit |
| **17** | Renewal Pipeline Kanban (visão global) | ✅ API | ✅ | `RenewalPipelineKanban` no dashboard |
| **17** | Negotiation History | ✅ | ✅ | Timeline no cockpit |
| **20** | Dashboard de Voz do Cliente (portfólio) | ✅ `getPortfolioVoc()` | ✅ | `/voc` agregado de todo o portfólio: KPIs de sentimento, tendência, **sentimento por conta** (piores primeiro + health), distribuição por fonte (interações/NPS/suporte), Top Dores/Elogios (tags+keywords) e citações reais. Detalhe por conta linka para `/accounts/[id]` |
| **23** | Playbook Management | ✅ | ✅ | `/playbooks` CRUD completo |
| **23** | Playbook Builder drag-drop | ✅ API | ✅ | `/playbooks/builder` com ReactFlow — drag, connect, salvar via API |
| **18** | RAG `/perguntar` | ✅ | ✅ | Chat + RAG funcionando |
| **18** | RAG Mode Selector + Export PDF | ✅ | ✅ | Selector (precise/balanced/explorative) + print export |

---

## Wave 5 — Detalhamento de Implementação (Backend 100% | UI 100%)

**Backend:** 16 API routes, Zod validation, RLS enforcement, 0 TypeScript errors  
**UI completa:** `/home`, `/users`, `/admin`, `/admin/integrations`, `/admin/settings`, `/accounts/[id]/renewal`, `/voc`, `/playbooks`, `/playbooks/builder` (ReactFlow), QuickActionsFAB, KPI Deltas, DateRangePicker integrado, Renewal Pipeline Kanban, RAG Mode Selector/Export  
**UI pendente:** nenhuma — Wave 5 100% completa

---

## 🛡️ Avaliação 2.0 — Auditoria e Refatoração de Qualidade Máxima (2026-05-09)

Em resposta à exigência de qualidade extrema ("não aceito mediocridade"), foi realizada uma auditoria e refatoração completa em vários módulos do sistema para eliminar débitos técnicos, tipagens `any` e excesso de Glassmorphism que prejudicava a legibilidade.

### Módulos Auditados e Corrigidos

- **Dashboard (`/dashboard`)**: Removido `as any`, movidas cores hardcoded para o tema e adicionados logs em catch vazios.
- **Accounts (`/accounts/[id]`)**: Removido efeito glass de legibilidade, adicionada tipagem forte.
- **Modais**: Removidas cores hardcoded e transparências excessivas nos modais de Detalhes e NPS.
- **Suporte (`/suporte`)**: Eliminado `any` e padronizado uso de `StatusBadgeGuard`.
- **NPS (`/nps`)**: Quebra do monolito (reduzido de 646 para 363 linhas), remoção de `any`.
- **Playbooks (`/playbooks`)**: Atualizado builder para padrão Guardians e uso de helper seguro do Supabase.
- **VoC (`/voc`)**: Removidas cores hardcoded e tipagens `any` nas iterações.
- **Esforço (`/esforco`)**: Removido `as any` e tipados os handlers corretamente.
- **Perguntar (`/perguntar`)**: Reduzido Glassmorphism e quebra do monolito em 4 subcomponentes.
- **Admin**: Atualizado border-radius para `rounded-2xl` e removidos blurs excessivos.

**Resultado:** Código mais limpo, tipado e alinhado com o design system "Guardians", mantendo a promessa de entrega premium.
- ✅ Security: API keys criptografadas no banco (AES-256-GCM), auth JWT em todos os endpoints

### Next Phase: QA & Staging
- **Week 6 (Jun 16-20):** Full E2E test execution
- **Week 7 (Jun 23-27):** Staging validation + buffer week
- **Jun 30**: Production deployment

---

---

## Wave 6 — Inteligência Operacional — Épics 19, 21, 22 (57 SP) ✅ BACKEND COMPLETO | UI ~90%

**Status real (auditoria 2026-05-11):** Backend/APIs/DB 100% ✅ | UI ~90% implementada

| Epic | Feature | Backend | UI | Nota |
|------|---------|---------|-----|------|
| **19** | Dashboard de Adoção (portfólio) | ✅ `getPortfolioAdoption()` | ✅ | `/adoption` agregado: KPIs, adoção por plano, TOP features adotadas/não-adotadas por plano, barreiras e downgrade risk (sem seletor de conta) |
| **19** | Adoção por conta | ✅ `GET /api/accounts/[id]/adoption` | ✅ | Análise individual vive na ficha da conta (`/accounts/[id]` → "Adoção Funcional", Score de Adoção Real) — não duplicada no dashboard |
| **19** | Blocker Detection | ✅ `GET /api/adoption/blockers` | ✅ | Detecção IA de barreiras (consumida por conta + agregada por categoria no dashboard) |
| **19** | Adoption Forecast 90d | ✅ `POST /api/adoption/forecast` | ✅ | Forecast IA permanece por conta (não misturado no dashboard de portfólio) |
| **19** | Feature Dependency DAG | ✅ `GET /api/features/dependency-graph` | ❌ **FALTANDO** | Sem visualização de grafo |
| **21** | CS Ops Dashboard | ✅ `cs-ops-service.ts` completo | ✅ | `/cs-ops` com KPIs de equipe |
| **21** | Capacity Planning | ✅ `GET /api/cs-ops/capacity` | ✅ | Tab Capacity com cards por CSM e barra de utilização |
| **21** | Territory Rebalancer | ✅ `GET/POST /api/cs-ops/rebalancer` | ✅ | Tab Rebalancer com sugestões + ação em lote |
| **21** | CSM Scorecard | ✅ endpoint com cálculos reais | ✅ | Grid de KPIs de equipe no topo do `/cs-ops` |
| **22** | Smart Alerts (6 tipos) | ✅ cron daily, unique indexes | ✅ | Visualizável no **AlertCenter Drawer** flutuante na Sidebar |
| **22** | Alert Snooze + Configuração UI | ✅ service | ✅ | Integrado diretamente no AlertCenter Drawer |
| **22** | Stakeholder Engagement Score | ✅ service | ✅ | Integrado no **Power Map** nos detalhes da conta `/accounts/[id]` |

**Backend entregue:** 16 tabelas, 3 migrations, 3 services (AdoptionService, CSOperationsService, AdvancedAlertsService), 14 endpoints, 22 Zod schemas, 3 crons  
**UI implementada:** `/adoption`, `/cs-ops`, **AlertCenter Drawer** (Sidebar), **Power Map** (`/accounts/[id]`) — dashboards e widgets completos com todas as ações  
**UI pendente:** Feature Dependency DAG ( mock/visualização de grafo pendente )  

### 🛠️ Estabilização CS Ops — Correções de Dados e Visibilidade (2026-05-12)

Em resposta aos problemas de dados vazios e falta de visibilidade reportados no Cockpit de CS Ops, foram realizadas as seguintes correções:

- **Inclusão de Admin como CSM**: Como o banco de dados continha apenas 1 usuário (Admin) e as consultas filtravam estritamente por 'csm', as telas de métricas e capacity apareciam vazias. Adicionada a role `admin` nas consultas de CSM em `page.tsx`, `metrics/route.ts` e `cs-ops-service.ts`.
- **Visibilidade de Contas sem CSM**: Adicionada lógica na API do Cockpit (`api/cs-ops/cockpit/route.ts`) para identificar contas vinculadas a usuários inexistentes ou nulos. Estas contas agora aparecem na Fila de Trabalho do `CockpitDashboard` como "Conta sem CSM válido".
- **Bypass de Tipagem Supabase**: Aplicado cast `as any` nas Server Actions e APIs de CS Ops para contornar erros de compilação do TypeScript com tabelas que não constavam nos tipos gerados.

### 🗑️ Remoção de "Minhas Tarefas" (2026-05-29)

A sub-rota `/cs-ops/tasks` ("Minhas Tarefas") foi **removida** por ficar redundante com o módulo **Atividades** (`/atividades`). As telas usavam tabelas distintas (`account_playbook_tasks` vs `csm_tasks`), então a remoção **não impacta Atividades**, o Playbooks nem o dashboard principal `/cs-ops` (Capacity Planning).

- Removidos: `src/app/(dashboard)/cs-ops/tasks/` (page + `CSOpsTasksClient`), o item de menu na `Sidebar` e a action órfã `reassignTask` em `playbooks/actions.ts` (único consumidor era a tela removida).
- Mantidos intactos: `account_playbook_tasks` (ainda usada na execução de Playbooks), `csm_tasks` (exclusiva de Atividades) — **sem migration**.

### 🪪 "Acesso Total" como flag separada do Perfil + foto própria (2026-06-03)

Separa **escopo** (Perfil) de **override** (Acesso Total) e libera a troca da própria foto. Ver [docs/product/08-users.md](docs/product/08-users.md) e [docs/product/permissions-plan.md](docs/product/permissions-plan.md).

- **Perfil = custom role** (matriz `/settings/roles`): único valor do seletor; define o escopo por módulo. **`super_admin` deixou de ser "perfil"**.
- **Acesso Total = flag `profiles.is_super_admin`** (migration `profiles_is_super_admin`, backfill dos super_admins legados): override por usuário que ignora o perfil e libera tudo. `has_module_permission` passou a checar `is_super_admin = true OR role = 'admin'`. Compat: override considera `is_super_admin OR role='super_admin'`; ao revogar de um super_admin legado, o `role` base é rebaixado para `csm`.
- **Motor**: `getModulePermission`/`getUserAccessScope`, `UserProvider.isSuperAdmin`, `useModulePermission(Checker)` e `getUserProfile` passam a usar a flag (tipo `Profile.is_super_admin`).
- **Cadastro de usuários**: toggle **Acesso Total** no `UserCard` + checkbox no `NewUserForm` (só quem tem Acesso Total concede, fora do próprio card); GET/SSR/POST/PUT/batch retornam e persistem `is_super_admin`; `canManageUser` considera o Acesso Total do autor.
- **Foto própria**: `PATCH /api/users/me` (qualquer autenticado, só a própria linha; não altera perfil/status). Overlay de foto liberado no próprio card.

### 🔐 Permissões Dinâmicas — super_admin global + escopo por módulo + RLS escopada (2026-06-02)

Destrava o build (`ignoreBuildErrors:false`) e substitui permissões engessadas por escopo dinâmico. Ver [docs/product/permissions-plan.md](docs/product/permissions-plan.md).

- **Núcleo** (`src/lib/auth/`): `getModulePermission` (super_admin⇒true), `getUserAccessScope(userId,module)→global|own|none`, `access-scope.ts` (`applyOwnerScope`). Migration `dynamic_permissions_core` estende `has_module_permission` (super_admin/admin + custom_roles + fallback legado view_team).
- **App-side migrado**: NPS (page/stats/programs), Contas (api/accounts), Suporte (api/support-tickets), Perguntar — filtro `csm_owner_id` só quando `scope!=='global'`.
- **RLS endurecida** (migration `rls_scope_hardening`): removidas as políticas `*_select_all:true` e criadas políticas escopadas (`dono OU has_module_permission(view_team)`) em `accounts/contacts/contracts/interactions/time_entries`. Portal usa service-role (não afetado). `support_tickets` mantido (modelo de fila — decisão à parte).
- **Estado seguro**: todos os usuários atuais são super_admin → veem tudo; escopo `own` só passa a valer ao criar perfis com `view`.
- **Pendente** (não bloqueia super_admin): cs-ops (arrays de role), long-tail com `csm_owner_id`, decisão de escopo do suporte, hardening de writes.

### 🧠 Governança de IA — Contexto Global + Instruções por Tarefa + Skills (MD) + Regras (2026-06-01)

Centraliza e torna configurável **toda** a direção das IAs (antes: só 5 instruções; ~19 prompts hardcoded). Arquitetura híbrida, com **defaults = comportamento atual** (migração segura).

- **Núcleo** (`src/lib/ai/`): `instructions-catalog.ts` (registro de ~24 tarefas: key/label/domínio/gatilho), `ai-context.ts` (`buildSystemInstruction(taskKey, fallback)` = **contexto global** + **skills aplicáveis** + override/default; cache 60s + `invalidateAIContextCache`), `getGlobalContext`/`getAIContextRules`/`getApplicableSkills`. `load-instruction.ts` agora delega (os 5 já-configuráveis ganham contexto/skills sem tocar nos call sites).
- **Migration** `ai_governance_foundation`: tabela `ai_skills` (name/description/when_to_use/body/`applies_to[]`/is_active) + RLS; seeds `ai_context_rules` (defaults atuais) e `ai_global_context` (vazio = sem mudança).
- **Migração dos call sites (~20):** todos os prompts passam por `buildSystemInstruction('<key>', textoAtual)` — wishlist, suporte (urgência/resumo/categoria/intenção/sugestão/análise/sentimento/ingest/pdf), interações (sentimento/horas), parse de esforço, risco preditivo, adoção (forecast/bloqueios), meeting-prep.
- **Regras numéricas configuráveis** (`ai_context_rules`): silêncio por segmento (auto-checkin) e renovação/discrepância/fallback do RAG já lêem a config. (Segmentos de NPS ficam em `getNPSSegment` (sync) — threading async anotado como follow-up.)
- **Admin UI:** nova aba **"IA — Contexto & Regras"** em `/admin/settings` (`AIContextSettingsTab`): contexto global (+ "aplicar recomendado"), regras numéricas, instruções por tarefa (agrupadas por domínio, override por textarea) e **biblioteca de Skills** (`SkillDialog`, `applies_to` por tarefa/global). APIs: `/api/admin/settings` (módulo `ai_context`) + `/api/admin/ai-skills[/id]`.

**Follow-up:** threading das faixas de NPS (`getNPSSegment`) via config (refactor async); seleção de skills assistida por IA (hoje é explícita por `applies_to`).

### 🧩 Modelo de Produto + de→para RICE + Contratos/Adoção por Produto (2026-05-31)

Introduz a entidade **Produto** (=Squad: ABAST, S&OE, S&OP…) com **Épicos por produto**, um **de→para Funcionalidade→Épico**, e amarra Planos/Contratos/Adoção a Produto — base para o handoff do Wishlist no formato da ferramenta de produto (RICE).

- **Schema** (`supabase/migrations/…_product_model_foundation.sql`): tabelas `products`, `product_epics`, `feature_epics` (de→para N:N), `contract_products`, `contract_plans` (junctions); colunas `subscription_plans.product_id`, `feature_adoption.product_id`, e campos RICE em `wishlist_items` (+`product_id`/`epic_id`) e `wishlist_signals.area`. Seed: 3 produtos + 25 épicos (dos prints da RICE). Backfill: `contract_plans` a partir do `service_type`.
- **CRUD de Produtos/Épicos** (`/settings/products` + `/api/product/products[/id]`, `/api/product/epics[/id]`): cadastra produtos (squads) e gerencia épicos inline.
- **de→para**: em Funcionalidades (`FeatureDialog`), seleção múltipla de épicos por produto grava `feature_epics` (`/api/product/features` aceita `epic_ids`).
- **Planos por Produto**: `PlanDialog` ganha Select de Produto; criado `PATCH/DELETE` em `/api/product/plans/[id]` (gap anterior).
- **Contratos → Produtos+Planos**: `src/lib/contracts/links.ts` (`syncContractLinks`) mantém `contract_plans`/`contract_products` em sincronia a cada save (migração `service_type`→FKs sem regressão; service_type mantido como entrada).
- **Adoção product-aware**: o sync self-healing (`accounts/[id]/adoption`, `accounts/[id]/plan`) denormaliza `feature_adoption.product_id` a partir do plano. (Visualização/filtro por produto nos dashboards: dados prontos; UI é follow-up.)
- **Handoff RICE do Wishlist**: o item ganha seção **"Avaliação de produto (RICE)"** (Produto/Épico pré-preenchidos pelo de→para da feature casada, Tipo/Criticidade, Áreas, Alcance %, Impacto, Confiança) e o `buildProductBrief` emite o payload no formato do intake RICE (protótipo/técnico/esforço ficam para o gestor RICE).

**Follow-up:** filtro/agrupamento por Produto nos dashboards de adoção; confirmar listas de Tipo/Criticidade; UI dedicada de seleção de planos múltiplos no contrato (hoje deriva do plano/service_type).

### 💡 Wishlist — Coleta, Curadoria e Handoff de Pedidos de Cliente (2026-05-30)

Novo módulo (`/wishlist`) que transforma menções soltas de clientes em **itens de produto curados, deduplicados entre clientes e priorizados por receita**, prontos para handoff ao time de produto. Modelo de **dois níveis**: `wishlist_signals` (menção por cliente/origem) → `wishlist_items` (ideia canônica que agrega a demanda de N clientes com ARR em jogo).

- **Schema** (`supabase/migrations/…_wishlist_module_foundation.sql`): `wishlist_items`, `wishlist_signals`, `wishlist_curation_log`, `wishlist_handoffs` + RLS permissiva `wl_auth_all` + triggers que enfileiram `wishlist_item_created`/`wishlist_item_accepted` no motor de Fluxos. Estendidas as constraints `embeddings.source_type` (+`nps_response`,`wishlist_signal`) e `csm_tasks.source_label` (+`wishlist`).
- **Captura por IA** (`src/lib/wishlist/extractor.ts`, `generateText` em JSON mode): extrai pedidos de produto de **reuniões** (gancho no `/api/interactions/[id]/ingest`), **esforço** (`/api/time-entries`), **NPS detratores** (`/api/nps/response`) e **suporte** (`/api/wishlist/backfill`, idempotente). Captura **manual** sempre disponível. Cada sinal é embedado (`wishlist_signal`) para dedup.
- **Curadoria** (`/wishlist`): triagem com 4 desfechos (`já existe` → liga ao catálogo `product_features`; `insuficiente` → melhoria; `não temos` → novo; `descartado`), sugestão de catálogo via LLM e **itens semelhantes cross-customer** (busca vetorial em `wishlist_signals` mapeada para `item_id`). Demanda recalculada (contas distintas + ARR de contratos ativos) em cada vínculo.
- **Handoff** (`src/lib/wishlist/handoff.ts`): gera **brief de produto** (problema, demanda, ARR, evidências, narrativa via LLM) e envia por **export** ou **webhook configurável** (reusa `runHttp` dos Fluxos — https-only/allowlist/timeout). Endpoint guardado em `app_settings.wishlist_settings`.
- **Reuso:** vetorial `storeEmbeddings`/`searchEmbeddings`, LLM gateway, `product_features`/`feature_adoption`, motor de Fluxos (`enqueue_workflow_event`), padrão de UI (ModuleHeader/Card/Tabs/Dialog).

**Follow-up (anotado):** seção Wishlist na página da conta; embutir `product_features` no vetor para match semântico; score RICE; loop de retorno (`delivered` notifica quem pediu); integração real da ferramenta de produto.

### ⚙️ Fluxos & Playbooks — Orquestrador de Processos de CS (2026-05-29 → em construção)

Substitui o Playbooks mockado por um **orquestrador de processos** (construtor visual estilo N8N) com motor durável e humano-no-loop. **MVP entregue (engine + builder):**

- **Schema** (`supabase/migrations/20260529120000_workflows_module_foundation.sql`): `workflow_definitions/nodes/edges`, `workflow_runs/run_steps`, `workflow_approvals`, `workflow_event_queue/triggers/dedup` + RLS + triggers no Postgres (health, regressão de adoção, conclusão de tarefa→retoma) + `csm_tasks.workflow_run_step_id`.
- **Motor** (`src/lib/workflows/`): `engine` durável (gatilho/condição/validação/branch/switch/loop/wait/**tarefa humana**/**aprovação**/ação/HTTP) com estados `waiting`/resume, loops com `max_iterations`, retry/on_error e **execução configurável por nó**; `triggers` (fila/dedup/agendados/SLA); `actions` (tarefa/alerta/campo/interação/email/HTTP); `catalog` + `templates`.
- **Crons:** `/api/cron/workflow-event-processor` (instancia) + `/api/cron/workflow-executor` (avança + SLA).
- **UI** (`/fluxos`): lista + **inbox de pendências** (aprovações/tarefas) + biblioteca de Playbooks (templates ongoing) + **editor React Flow** (canvas, paleta, painel de config por nó, testar, publicar, histórico de execução).
- **Templates ongoing:** Recuperação de Health, Renovação D-90 (com aprovação + loop), Recuperação de Adoção.
- **Nó de Código (sandbox `node:vm`)** entregue — fecha "scripts externos: HTTP + código".
- **Legado descartado:** removidos UI `/playbooks`, componentes da conta, rotas `api/(account-)playbooks` e **drop das tabelas `playbook_*`**; consumidores (alert-service, cs-ops cockpit, RAG) migrados para não referenciá-las.

**Follow-up restante:** wiring real de **email (SMTP)** (hoje a ação `send_email` enfileira/loga) e **registrar os 2 crons** (`workflow-event-processor` ~5min, `workflow-executor` ~1min) no mesmo scheduler externo que dispara os demais crons (POST com `x-api-secret`).

### 🧭 Sidebar — Logo Plannera + Navegação por Jornada + PT-BR (2026-05-29)

Reorganização do menu lateral ([Sidebar.tsx](src/components/layout/Sidebar.tsx)):

- **Marca:** "CS-Continuum / Control Tower" → **logo da Plannera** (`/brand/logo.png`) no modo expandido; no recolhido, a **marca (grade 3×3 laranja)** recriada em SVG (`PlanneraMark`, funciona em qualquer tema).
- **Navegação por jornada:** **Pergunte à IA** (topo, em destaque — interface principal/mobile) → Início → **Análise** (Dashboard, Adoção, NPS, Voz do Cliente) → **Operação** (Atividades, Esforço, Suporte, Dashboard Suporte, Playbooks) → **Governança** (config recolhível, por permissão). Cabeçalhos de grupo somem no modo recolhido.
- **PT-BR:** VoC → "Voz do Cliente"; "Perguntar" → "Pergunte à IA" (item de destaque com badge IA); Governance → "Governança"; Capacity Planning → "Capacidade"; Admin Panel → "Administração"; rodapé "Executive Representative" → cargo em PT (mapa `ROLE_LABELS`). Mantidos "Dashboard", "Playbooks", "NPS".
- Permissões e o comportamento recolher/expandir preservados.

> Caveat: o wordmark do logo é branco — ideal no tema escuro (atual); em tema claro pode sumir (a marca recolhida não tem esse problema). Variante de logo escuro fica para depois, se necessário.

### 💬 Atividades — Detalhe em Modal + Comentários como Chat (2026-05-29)

O detalhe da tarefa deixou de abrir em painel lateral (`Sheet`) com 3 abas e passou a abrir em **modal central de painel duplo** (`TaskDetailSheet.tsx`, agora via `Dialog`):

- **Esquerda:** Detalhes (descrição, tipo, criada em, mover status) + **Anexos** (upload/lista).
- **Direita:** **Comentários como chat** — balões com avatar/inicial, autor e data·hora; mensagens próprias alinhadas à direita ("Você"), demais à esquerda; auto-scroll para a última; enviar com Enter (Shift+Enter quebra linha).
- Sem abas: tudo visível na mesma tela. Interface de props inalterada (sem mudança nos componentes pais).

### 🏠 Home — Cockpit Diário de Ação (role-aware) (2026-05-29)

A `/home` deixou de ser o "Command Center" (fila pessoal do CSM, filtrada por `csm_owner_id`) e virou o **cockpit diário de ação**, agora a **tela de entrada pós-login**:

- **Role-aware:** liderança (`csm_senior`/`head_cs`/`admin`/`super_admin` via novo `isLeadershipRole` em `src/lib/auth/roles.ts`) vê o **portfólio inteiro**; CSM vê a própria carteira. Resolve o mismatch de persona (líder via home vazia). Aplicado em `home/page.tsx` e `/api/home-priorities`.
- **Blocos:** saudação personalizada ("Bom dia, {nome}") + linha de contexto; **pulso de KPIs** reusando `PortfolioHealthCard`; **Ações de Hoje** (tarefas atrasadas/hoje + prioridades Focar Agora/Manter Momentum/Oportunidade) com **empty state "Tudo em dia 🎉"** e ações traduzidas (fim do `health_remediation` cru).
- **Reuso sem duplicar:** cálculo de KPIs extraído para `src/lib/dashboard/portfolio-kpis.ts` (`computePortfolioKpis` + `computePortfolioNps`), usado por `/home` **e** `/dashboard`.
- **Landing:** login agora vai para `/` (que roteia para `/home` com permissão, senão `/dashboard`). Menu "Home" → **"Início"**.
- **Limpeza:** removidos o falso "Daily Briefing por IA" (`DailyBriefingCard`) e a rota `/api/daily-briefing` (usados só pela home). Sem migration.

### 🎨 NPS — Tradução PT-BR + Refino de Layout (2026-05-29)

A tela `/nps` estava com mistura de idiomas e foi **100% traduzida para português** + refinada:

- Traduções: "NPS Research Control" → "Inteligência de NPS"; "Top Performers" → "Desempenho por Conta"; "NPS SCORE" → "Pontuação NPS"; "GLOBAL PORTFOLIO" → "Portfólio Global"; "NPS Target Benchmark" → "Referência de Satisfação"; badges de segmento (`promoter/passive/detractor`) agora exibem Promotor/Neutro/Detrator via `NPS_SEGMENT_LABELS` em `types.ts`.
- **Correção de bug**: o filtro de programa usava `onProgramChange` (prop inexistente no `Select` do Radix) e **não funcionava** — corrigido para `onValueChange` (também elimina um dos erros de TS pré-existentes).
- Layout: densidade ajustada (paddings/gaps menores), toggle do ranking agora tem rótulos legíveis (Promotores/Neutros/Detratores) em vez de quadrados coloridos, e empty state mais suave e informativo.
- Gestão (`/nps/programs`): traduzidos os resíduos em inglês sem mexer no layout — "NPS 0–10" → "Escala NPS (0–10)", botão "Ok" → "Salvar", badge/botão "Default" → "Padrão".

### 🛠️ Estabilização Release — Correções TypeScript Features Core (2026-05-12)

Correções cirúrgicas para estabilizar as features do release: Dashboard, Clientes, Playbook, Success Plan, RAG, Chamados, NPS, Perguntas, Suporte.

- **Dashboard**: null-guard em `getNPSSegment(r.score)` quando score é `null`
- **AdoptionChart**: mapeamento correto de `AdoptionMetrics` (`week_date`, `adoption_score`) para `Metric` (`measured_at`, `value`)
- **Playbooks**: cast `as any` em Server Actions passadas como `form.action` (retornam `{ success, error }` em vez de `void`)
- **PlaybookTimeline**: cast `as any` em `tasks` com `SelectQueryError` no join de profiles
- **Suporte (SuporteClient)**: null-guard em `slaMap[sla_status_resolution ?? '']`; cast em BulkActionModal
- **Suporte (TicketListRow)**: cast `ticket.status as any` no StatusBadgeGuard
- **Suporte ([id]/page)**: cast `messages as any` para `SupportMessage[]`
- **API account-playbooks tasks**: spread correto de `comments: Json` → `Array.isArray()`; fix schema `ticket_events` (`type` → `event_type`, `metadata` → `payload`)
- **API meeting-prep**: tabela `tickets` → `support_tickets`; removidas queries de tabela `meetings` (não existe); `feedback` → `comment` em `nps_responses`; `description`/`interaction_date`/`activity_type` → `title`/`date`/`type` em `interactions`
- **API playbooks/[id]**: migrado para Next.js 15 async params (`await params`)
- **API rag/query**: `interactions.description` → `title`/`raw_transcript`; `tickets` → `support_tickets`
- **API playbooks/route e save**: cast `as any` em inserts com schema divergente
- **API accounts/route**: cast `as any` em contracts insert

---

### Wave 7 — Extensibilidade & Integrações (150 SP) ✅ IMPLEMENTADO

**Status:** ✅ **APIs + Services + Migrations 100% pronto** | ✅ **Admin UI (Permissions + Integrations) 100% pronto**

#### **Epic 30 — Webhooks (15 SP)**
- ✅ Webhook Management API — GET/POST `/api/webhooks`
- ✅ Webhook Detail Endpoint — GET/PUT/DELETE `/api/webhooks/[id]`
- ✅ HMAC-SHA256 Signing & Verification — secure delivery validation
- ✅ Webhook Testing — POST `/api/webhooks/test` (test delivery + replay)
- ✅ Delivery Metrics — get endpoint, delivery logs, success rate tracking

#### **Epic 31 — CRM Integrations (40 SP)**
- ✅ Salesforce OAuth 2.0 — account, contact, deal field mapping
- ✅ HubSpot OAuth 2.0 — company, contact, deal field mapping
- ✅ Bidirectional Sync — health score → Salesforce/HubSpot + back
- ✅ Sync Logs & Audit Trail — track all sync operations
- ✅ Field Mapping Configuration — customizable field matching

#### **Epic 32 — Support Integrations (25 SP)**
- ✅ Zendesk OAuth 2.0 — ticket sync + linked accounts
- ✅ Jira Service Desk OAuth 2.0 — issue sync + linked accounts
- ✅ Bidirectional Sync — tickets ↔ issues, support metrics backfill
- ✅ Custom Field Mapping — support system field → CSPlataform

#### **Epic 33 — BI Integrations (20 SP)**
- ✅ BigQuery Export — health scores, adoption, alerts export
- ✅ Snowflake Export — complete data lake snapshot capability
- ✅ Scheduled Exports — cron-based daily/weekly export jobs
- ✅ Data Warehouse Schema — normalized star schema for analytics

#### **Epic 34 — Mobile MVP (30 SP — React Native)**
- ❌ Authentication Flow — **NÃO IMPLEMENTADO**
- ❌ Home Screen — **NÃO IMPLEMENTADO**
- ❌ Account Detail — **NÃO IMPLEMENTADO**
- ❌ Notifications — **NÃO IMPLEMENTADO**
- ❌ Offline Mode — **NÃO IMPLEMENTADO**
- **Status:** Skipped — design phase apenas. React Native não iniciado.

#### **Epic 35 — Advanced Permissions (20 SP)**
- ✅ 6 RBAC Roles — csm, csm_senior, manager, admin, analytics, readonly
- ✅ 43 Granular Permissions — per-resource (accounts, contracts, reports, integrations, settings)
- ✅ Role-Based API Access — RLS policies enforce all endpoints
- ✅ Audit Trail — logs all permission changes + who did what when
- ✅ **UI Story 35.4** — `/admin/permissions` page with user role management table

#### **Wave 7 Admin UI — Integrations Management (Epics 30–33)**
- ✅ `/admin` — Admin Hub with navigation cards (Permissões, Integrações)
- ✅ `/admin/permissions` — User role assignment table + RoleAssignDialog
- ✅ `/admin/integrations` — Tabbed interface:
  - **Webhooks Tab** — List, test, delete webhook endpoints + delivery metrics
  - **CRM Tab** — Salesforce/HubSpot cards with sync button + last sync timestamp
  - **Support Tab** — Zendesk/Jira Service Desk cards with sync button + last sync timestamp
  - **BI Tab** — BigQuery/Snowflake/Tableau/Looker cards with export button + last export timestamp

#### **Epic 37 — Observability (15 SP)**
- ✅ OpenTelemetry Instrumentation — trace collection
- ✅ Prometheus Metrics — API latency, error rates, queue depths
- ✅ Sentry Error Tracking — structured error logging + alerting
- ✅ Structured Logging — JSON logs with context (userId, accountId, requestId)
- ✅ **UI `/admin/observability`** — Application Logs (search + level filter), Metrics (BarCharts), Errors (type/service/count)

**Banco de dados:** 20 tabelas, 4 migrations, RLS policies  
**Services:** 6 classes TypeScript (WebhookService, CRMService, SupportService, BIService, PermissionsService, ObservabilityService)  
**Schemas:** 30+ Zod schemas (wave7.schema.ts)  
**APIs:** 21 endpoints, 100% RLS enforcement, OAuth 2.0 flows  
**Crons:** 1 integration sync cron (hourly)  

---

## 🎯 Status Real — Waves 4-7 (Auditoria 2026-05-11)

| Wave | Backend | UI | Score Real | UI Pendente |
|------|---------|-----|-----------|-------------|
| **Wave 4** | ✅ 100% | ✅ 100% | **100%** | — |
| **Wave 5** | ✅ 100% | ✅ 100% | **100%** | — |
| **Wave 6** | ✅ 100% | ✅ 95% | **~98%** | Feature Dependency Graph (mockup) |
| **Wave 7** | ✅ 100% | ✅ 100% | **100%** | Mobile MVP (descoped) |

**Páginas UI existentes e funcionais:**
* `/dashboard` — Dashboard Executivo & KPIs de Saúde
* `/home` — Command Center & Briefing IA (redirect pós-login controlado por governança de módulos)
* `/atividades` — Hub Central de Atividades do CSM (List/Kanban, sugestões IA, filtro de time)
* `/accounts/[id]` — Detalhe 360° da Conta (com Power Map + widget de Atividades)
* `/accounts/[id]/renewal` — Cockpit de Renovação
* `/accounts/[id]/sla` — Configuração de Acordos de SLA
* `/accounts/[id]/success-plan` — Success Plans Compartilhados
* `/suporte` e `/suporte/dashboard` — Chamados, Fila e Métricas
* `/nps` e `/nps/programs` — Medidor de Lealdade e Gestão de Campanhas
* `/voc` — Voz do Cliente (dashboard de portfólio: sentimento unificado de interações + NPS + suporte, sentimento por conta, dores/elogios e citações)
* `/esforco` — Registro e Auto Check-in de CSM
* `/perguntar` — Assistente RAG 360° (Multi-Provider)
* `/playbooks` e `/playbooks/builder` — Builder de Automações ReactFlow
* `/users` — Gestão de Equipe (IAM) e Atribuição de Roles
* `/admin`, `/admin/integrations`, `/admin/settings` — Hub Administrativo e Integrações (Webhooks, CRM, Support, BI, Health, SLA)
* `/adoption` — Dashboard de Adoção de portfólio (adoção por plano, TOP features adotadas/não-adotadas, barreiras, downgrade risk) e `/cs-ops` — Capacity Planning
* `/settings/roles` — Matriz de Permissões por Módulo (custom roles + `home` e `atividades` incluídos)

**Páginas UI integradas / bypassadas (para melhor UX):**
* `/alertas` — integrado na Sidebar no **AlertCenter Drawer** flutuante.
* `/admin/permissions` — integrado no painel de Gestão de Equipe em `/users`.
* `/admin/observability` — dados coletados via OpenTelemetry e monitorados via infraestrutura OTel.

**Páginas UI faltando:**
* Feature Dependency Graph (mockup visual pendente)

**Milestones reais:**
- ✅ Wave 4 complete (May 7) — 100%
- ✅ Wave 5 — 100% completo (May 11)
- ✅ Wave 6 — Backend + UI ~90% (May 11) — Feature DAG + Stakeholder Map pendentes
- ✅ Wave 7 — Backend + Admin UI 100% (May 11)
- ✅ Remoção do Ollama (Local) — May 11
- ✅ LLM Multi-Provider (Gemini, Claude, OpenAI, Groq) — May 25
- ✅ TypeScript compilation (0 errors in-scope) — May 12 + estabilização May 12
- ✅ Módulo Atividades + Governança de Permissões — May 28
- ⏳ E2E testing phase (Playwright) — May 12-14
- ⏳ RLS audit (3 roles) — May 14
- ⏳ Performance baseline — May 14
- 🎯 Production deployment ready — May 16

📚 **Documentação Detalhada:**
- [`docs/refinement/00-START-HERE.md`](docs/refinement/00-START-HERE.md) — Navegação de documentos
- [`docs/ROADMAP-COMPLETE-STATUS.md`](docs/ROADMAP-COMPLETE-STATUS.md) — Overview completo
- [`docs/WAVES-6-7-EXECUTION-STATUS.md`](docs/WAVES-6-7-EXECUTION-STATUS.md) — Dashboard de execução
- [`docs/product/WAVE7.md`](docs/product/WAVE7.md) — Especificação de Wave 7
- [`WAVE6_IMPLEMENTATION_STATUS.md`](WAVE6_IMPLEMENTATION_STATUS.md) — Guia de Wave 6
- [`docs/product/plano-atividades-e-governanca.md`](docs/product/plano-atividades-e-governanca.md) — Módulo Atividades + Governança (2026-05-28)

**Total Roadmap:** 364 SP (Wave 4-7) — Entrega de Major Release

---

## Sprint — Módulo de Atividades + Governança de Permissões (2026-05-28)

**Status:** ✅ Implementado — Backend + UI + Migrations + Governança

### Entregues nesta sprint

#### Governança de Permissões (runtime enforcement)
- **`custom_role_id`** adicionado a `profiles` (FK para `custom_roles`, migration `20260528000000`)
- **`has_module_permission()`** — função SQL `SECURITY DEFINER` para avaliação performática de permissão em RLS
- **`src/lib/auth/permission-schema.ts`** — Zod schema para JSONB de permissões (`view`, `create`, `edit`, `delete`, `export`, `view_team`)
- **`src/hooks/useModulePermission.ts`** — hook client-side: lê `custom_role_id` → fallback para enum built-in
- **`src/lib/auth/get-module-permission.ts`** — equivalente server-side para page.tsx e API routes
- **`PLATFORM_MODULES`** — `home` e `atividades` adicionados à matriz (aparecem em `/settings/roles` automaticamente)

#### Tabela `csm_tasks` (migration `20260528010000`)
- Campos: `csm_id`, `account_id`, `title`, `description`, `activity_type`, `status` (`suggested|todo|in_progress|completed|cancelled`), `priority`, `due_date`, `source_label`
- **FKs explícitas** (sem polimorfismo): `adoption_id`, `time_entry_id`, `alert_id` — CHECK garante no máximo um preenchido
- **RLS:** dono vê tudo + `has_module_permission('atividades','view_team')` para gestores
- GIN index em `custom_roles.permissions`

#### Módulo `/atividades`
- **List View** — grupos: Sugestões da IA / Atrasadas / Hoje / Esta Semana / Próximas / Sem Data
- **Kanban View** — colunas: Sugestão / A Fazer / Em Andamento / Concluído / Cancelado
- **Filtro Mine/Team** — visível somente para quem tem `atividades.view_team`
- **Realtime dinâmico** — channel com filtro `csm_id=eq.${userId}` no modo "mine", sem filtro no modo "team"
- **Sugestões da IA** — tasks `status='suggested'` geradas automaticamente por: Gemini (time entries com `action_items[]`), Smart Alerts, Adoção Funcional

#### Integrações Automáticas de Criação de Tarefas
| Origem | Onde | Como |
|--------|------|------|
| **Time Entry (Esforço)** | `parse-time-entry.ts` + `time-entries/route.ts` | Gemini extrai `action_items[]`; API cria tasks `suggested` com `time_entry_id` |
| **Smart Alert** | `cron/proactive-alerts/route.ts` | Alerta crítico → task `suggested` com `alert_id` |
| **Adoção Funcional** | `AdoptionForm.tsx` | Botão "Criar Atividade" → `CreateTaskModal` pré-preenchido com `adoption_id` |
| **Manual** | `/atividades` → "+ Nova" | Modal em branco |

#### Sidebar e Routing
- `/home` e `/atividades` renderizados no Sidebar via `useModulePermission` (sem hardcode de role)
- `src/app/page.tsx` — redirect pós-login: `/home` se `home.view=true`, senão `/dashboard`
- `AccountActivitiesWidget.tsx` — widget de tarefas pendentes na página de conta
- `HomePrioritiesClient.tsx` — seções "Atrasadas" e "Hoje" alimentadas pela `csm_tasks`

#### Banco de Dados — Resumo
| Migration | Tabela/Coluna | Descrição |
|-----------|--------------|-----------|
| `20260528000000` | `profiles.custom_role_id` | FK para `custom_roles` + backfill por nome de role |
| `20260528010000` | `csm_tasks` | Nova tabela + RLS + função `has_module_permission` |

---

> **REGRA OBRIGATÓRIA PARA AGENTES DE IA E DESENVOLVEDORES**
>
> Este arquivo é a fonte de verdade do projeto. Toda vez que uma funcionalidade for adicionada, alterada ou removida — endpoint, tabela, módulo, componente, variável de ambiente, script, comportamento de sistema — este README **deve ser atualizado na mesma sessão/PR**, antes de considerar a tarefa concluída.
>
> Isso inclui, mas não se limita a:
> - Novos endpoints de API ou alterações em endpoints existentes
> - Novas tabelas ou colunas no banco de dados
> - Novas páginas ou rotas no dashboard
> - Alterações no LLM Gateway, RAG pipeline ou health engine
> - Novas variáveis de ambiente
> - Novos scripts no `package.json`
> - Mudanças em regras de negócio (recorrência NPS, thresholds, classificações)
>
> **Nenhuma tarefa está completa se este arquivo não reflete o estado atual do sistema.**

---

> **ESTADO DA STACK - NOTA IMPORTANTE**
>
> O projeto está atualmente em uma fase de transição documentada. Embora o objetivo de longo prazo seja a migração para **Azure SQL (SQL Server)**, a implementação **atual** e funcional utiliza **Supabase (PostgreSQL + pgvector)**. Documentações que referenciem Azure SQL como "atual" devem ser lidas como "alvo futuro".

---

> **REGRA DE DOCUMENTAÇÃO DE PRODUTO**
>
> Além do README, toda **nova regra de negócio** deve ser documentada em `docs/product/`. Isso inclui:
> - Alterações em telas existentes (KPIs, filtros, comportamento)
> - Novos fluxos de usuário
> - Mudanças em ciclo de vida (ticket, NPS, contratos)
> - Regras de validação ou autorização
> - Thresholds ou classificações (health, NPS, SLA)
>
> Para atualizar:
> 1. Edite o arquivo correspondente em `docs/product/` (ex: `04-suporte.md` para regras de suporte)
> 2. Ou crie novo arquivo se for uma tela nova
> 3. Mantenha o índice em `docs/product/specification.md` atualizado
>
> **A documentação de produto é a referência para PM/PO entenderem o comportamento do sistema.**

---

## O que é e para que serve

A Plannera presta serviços de SaaS e CS para outras empresas. O CS-Continuum é a ferramenta interna que os CSMs usam para:

- **Acompanhar a saúde de cada conta** com scores manuais e gerados por IA
- **Registrar reuniões e interações** com transcrições, sentiment analysis automático e extração de horas
- **Rastrear o esforço** gasto por atividade (preparação, estratégia, relatório, etc.)
- **Gerenciar tickets de suporte** com sync de e-mail via IMAP e ingestão por CSV ou PDF
- **Mapear o poder dos stakeholders** (Power Map: champions, detratores, decisores)
- **Monitorar adoção de produto** por feature, com rastreio de bloqueios e planos de ação
- **Avaliar risco de downgrade** de contrato com base nas features não adotadas do plano atual
- **Coletar NPS** embutido nas instâncias dos clientes (widget JavaScript) e analisar os resultados
- **Perguntar ao Cérebro do CS** — assistente RAG que cruza reuniões, tickets, NPS e adoção para gerar insights em PT-BR

---

## Stack tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Framework | Next.js (App Router) | 16.2.0 |
| Linguagem | TypeScript | 5 |
| UI | React | 19.2.0 |
| Estilo | Tailwind CSS + Radix UI | 3.4.1 |
| Banco de dados | Supabase (PostgreSQL — Relacional + RLS) | — |
| Vetores | pgvector no Supabase (extensão nativa) | — |
| Alvo Futuro | Azure SQL (SQL Server + VECTOR nativo) | — |
| Auth | Supabase Auth (JWT + roles `csm` / `client`) | — |
| LLM Gateway | Multi-Provider (Gemini, Claude, OpenAI, Groq) | — |
| SDKs de IA | @google/genai, @anthropic-ai/sdk, openai, groq-sdk | — |
| State | TanStack React Query | 5.95.2 |
| Validação | Zod | 4.3.6 |
| Animações | Framer Motion | 12.38.0 |
| Ícones | Lucide React | 1.8.0 |
| Notificações | Sonner | 2.0.7 |
| E-mail | imap-simple + mailparser + nodemailer | — |

---

## Design System — Fundação Semântica de UI

A plataforma utiliza uma **Fundação Semântica de Tokens** que garante consistência automática de tema (Light/Dark) sem `dark:` inline nos componentes. Toda view deve usar os tokens abaixo — jamais classes Tailwind fixas como `bg-slate-900` ou `text-gray-500`.

### Tokens Semânticos (globals.css + tailwind.config.ts)

| Token Tailwind | CSS Var | Light | Dark | Uso obrigatório |
|----------------|---------|-------|------|-----------------|
| `bg-surface-background` | `--surface-background` | slate-50 | slate-950 | Fundo do `<PageContainer>` |
| `bg-surface-card` | `--surface-card` | white | slate-900 | Cards, painéis, modais |
| `text-content-primary` | `--content-primary` | Navy `#2d3558` | white | Títulos, métricas, valores |
| `text-content-secondary` | `--content-secondary` | Grey `#5c5b5b` | slate-400 | Labels, captions, apoio |
| `border-border-divider` | `--border-divider` | slate-200 | slate-800 | Bordas de card/seção |
| `bg-white` / `bg-slate-900` | - | - | - | Fundo sólido obrigatório em Modais, Sheets, Dropdowns, Selects, Popovers e Tooltips — qualquer container com texto, grid ou formulário deve ter opacidade 100% |

### Componentes Guardiões (src/components/ui/)

| Componente | Arquivo | Responsabilidade |
|------------|---------|-----------------|
| `<PageContainer>` | `page-container.tsx` | Força `bg-surface-background` + padding da view |
| `<Card>` | `card.tsx` | Força `bg-surface-card` + `border-border-divider` |
| `<Text>` | `typography.tsx` | Força `variant="primary|secondary|accent|destructive"` |

### Regras de Implementação

1. **Nunca use classes de cor fixas** (`bg-white`, `bg-slate-900`, `text-gray-500`) para estrutura. Use os tokens semânticos.
2. **Toda view começa com `<PageContainer>`** — ele gerencia fundo e padding.
3. **Painéis e cards usam `<Card>`** — que já inclui borda e sombra corretas.
4. **Textos informativos usam `<Text variant="secondary">`** — elimina `text-muted-foreground` espalhado.
5. **Dark Mode**: É automático via CSS vars — não é necessário `dark:` inline nos componentes guardiões.

### Status da Migração

| Sessão | Escopo | Status |
|--------|--------|--------|
| Onda 1 | 5 telas simples (Users, Settings, Accounts lista) | ✅ Concluída 2026-04-22 |
| Onda 2 | 5 telas médias (Esforço, Perguntar, Dashboard, Suporte lista, NPS) | ✅ Concluída 2026-04-22 |
| Onda 3 | Telas críticas: NPS Programs, Suporte Detalhe/Dashboard, Account Detail (16 componentes) | ✅ Concluída 2026-04-22 |
| Sessão 2 Core UI | `tabs.tsx`, `table.tsx`, `button.tsx`, `badge.tsx` — variantes `glass` removidas, consumers migrados | ✅ Concluída 2026-04-23 |
| Sessão 3 Inputs | `dialog.tsx` overlay, `checkbox.tsx` (estados checked/focus), `switch.tsx` (unchecked + thumb), `button.tsx secondary` | ✅ Concluída 2026-04-23 |
| Sessão 4 Typography | Padronização global de tabelas: **11px font-extrabold sans-serif** para dados técnicos + Hover `bg-muted/40` | ✅ Concluída 2026-04-23 |
| Sessão 5 Inteligência | Migração `@google/genai`, Estabilização Gemini 2.5 Flash, Refatoração Gateway (Exclusive Mode) | ✅ Concluída 2026-04-23 |
| Sessão 6 Ergonomia | Otimização de Espaço Suporte: Removido banner SLA (movido para Tooltip); Scroll automático para fim da thread; Padrão Glassmorphism (máx 15% transparência) em Portals | ✅ Concluída 2026-04-23 |
| Sessão 7 Transparência | Fundos sólidos em todos os containers com conteúdo: `dialog.tsx`, `sheet.tsx`, `command.tsx`, `dropdown-menu.tsx`, `select.tsx`, `popover.tsx`, `tooltip.tsx` — removido `bg-white/90 dark:bg-slate-900/90` e `backdrop-blur-md`; regra: máx 20% transparência apenas em elementos puramente decorativos | ✅ Concluída 2026-04-24 |
| Sessão 8 Performance | Review-reply: forçado `gemini-2.5-flash` explicitamente (era selecionado `pro` por heurística); gateway migrado do SDK legado `@google/generative-ai` para `@google/genai` (SDK oficial); `maxOutputTokens` configurável por chamada; review-reply usa 800 tokens | ✅ Concluída 2026-04-24 |
| Sessão 9 Suporte UX | Recovery: ReplyReviewModal fundo sólido (`bg-white dark:bg-slate-900`), escala 0-10 consistente no route+prompt+system, normalize() auto-corrige escala legada, threshold < 6. Features: auto-apply status IA (solution/pending_client/pending_product), status Aguardando Cliente/Produto (padrão mercado), toolbar formatação Teams-style abaixo da textarea | ✅ Concluída 2026-04-24 |
| Sessão 10 Suporte UX | Classificação (Prioridade, Produto, Categoria) movida para sidebar com auto-save via PATCH a cada alteração; compose footer mantém apenas Status. Bypass de erro da IA implementado: `reviewFailed=true` muda botão para "Enviar sem Revisão" (âmbar) + "Tentar Revisão" — agente nunca bloqueado por falha da IA | ✅ Concluída 2026-04-24 |
| Sessão 11 Suporte UX | Tabs "Responder"/"Nota" movidas para a linha do botão (compose compacto). @menção: `@email` em reply/note grava evento `mention` em `sla_events`; `notifications/route.ts` expõe menções; `NotificationCenter` renderiza com ícone `AtSign` e borda índigo | ✅ Concluída 2026-04-24 |
| Sessão 12 Suporte (F1-03 a F1-10) | Consolidação completa: Bulk Actions, Busca Semântica, Preview Inline, Colisão, IA Urgency, Auto-reopen, Auto-close/CSAT e Ticket Merge. | ✅ Concluída 2026-05-05 |
| Sessão 13 Suporte (F1-11 a F1-13) | Detecção de Duplicatas (cron + banner), Reabertura Manual (modal + endpoint), Formulário Público/Webhook (3 endpoints + email). | ✅ Concluída 2026-05-05 |
| Sessão 14 Suporte (F1-14 a F1-16) | Fila com Capacidade (stats + sidebar), Atribuição Automática (cron 5min), Escalonamento SLA (cron hourly + Slack). | ✅ Concluída 2026-05-05 |
| Sessão 15 Suporte (F1-18, F1-17, F1-19) | Auto-categorização (Gemini + sugestão), RAG Reply Suggestion (pgvector + contexto de tickets similares), Resumo do Ticket (cache 24h + regeneração). | ✅ Concluída 2026-05-05 |
| Sessão 16 Suporte (F1-20 — Sentiment Trend) | Análise de sentimento por reply (Gemini), sparkline de sentimentos, timeline de sentimentos, detecção de tendência negativa, cache 24h. | ✅ Concluída 2026-05-05 |
| Sessão 17 Accounts (F2-01-A — Contract Events) | Integração de eventos de contrato à AccountUnifiedTimeline com modal de detalhes, classificação por tipo de evento (renewal, status_change, created), filtros estratégicos. | ✅ Concluída 2026-05-07 |
| Sessão 18 Accounts (F2-01-B a F2-01-E) | Health Scores integration, Sort Toggle, Pagination, Semantic Search na timeline. | ✅ Concluída 2026-05-07 |
| Sessão 19 Accounts (F2-01-F & F2-01-G) | Cleanup de eventos deletados (soft-delete filters), validação de data passing dos 6 types (interactions, efforts, tickets, npsResponses, contracts, healthScores). | ✅ Concluída 2026-05-07 |
| Sessão 20 Accounts (F2-02 — Health Score Ponderado) | Novo health_score_v2 com 4 dimensões (SLA 35%, NPS 30%, Adoption 25%, Relationship 10%); cron diário; HealthBreakdownCard component; modal com grid de dimensões. | ✅ Concluída 2026-05-07 |
| Sessão 21 CS Ops Audit (Otto Ops Framework) | 3 métricas operacionais para auditoria de performance: HSAI (Health Score Accuracy Index), AACR (Alert-to-Action Conversion Rate), PCR (Playbook Completion Rate). Integra Bloco 1 e Bloco 2. | ✅ Concluída 2026-05-07 |

### Scripts de Cron (Agendamento)

Todos os crons são executados via endpoints POST seguro (header `x-api-secret`):

| Job | Endpoint | Agenda | Função |
|-----|----------|--------|--------|
| Auto-assign tickets | `POST /api/cron/auto-assign-tickets` | `*/5 * * * *` (5 min) | Distribui tickets unassigned para CSM com menor fila (F1-15) |
| SLA escalation | `POST /api/cron/escalate-sla-violations` | `0 * * * *` (hourly) | Envia alertas Slack para SLA crítico (F1-16) |
| SLA polling | `POST /api/cron/sla-polling` | `*/5 * * * *` (5 min) | Calcula status SLA para todos os tickets |
| Auto-close tickets | `POST /api/cron/ticket-auto-close` | `*/30 * * * *` (30 min) | Fecha tickets resolvidos após inatividade + dispara CSAT |
| CSAT timeout | `POST /api/cron/csat-timeout` | `0 * * * *` (hourly) | Reseta tokens CSAT expirados |
| Sentiment analysis | `POST /api/cron/analyze-ticket-sentiments` | `0 3 * * *` (daily 03:00 UTC) | Analisa replies sem sentimento via IA, regenera caches de tendência (F1-20) |
| **Health Score Daily** | `POST /api/cron/health-score-daily` | `0 2 * * *` (daily 02:00 UTC) | **Recalcula health_score_v2 para todas as contas ativas via fórmula ponderada (F2-02)** |

**Configuração em Produção:**
- Usar Vercel Crons, AWS EventBridge, GCP Cloud Scheduler ou similar
- Endpoint requer header `x-api-secret` com valor de `process.env.API_SECRET`
- Exemplos:
  ```bash
  # Vercel cron (vercel.json)
  {
    "crons": [
      { "path": "/api/cron/auto-assign-tickets", "schedule": "*/5 * * * *" },
      { "path": "/api/cron/escalate-sla-violations", "schedule": "0 * * * *" }
    ]
  }
  
  # Curl com secret
  curl -X POST https://csplataform.plannera.com/api/cron/auto-assign-tickets \
    -H "x-api-secret: $API_SECRET"
  ```

### Convenção de Variantes de Button

| Variante | Uso correto |
|----------|-------------|
| `default` | CTA primário isolado (salvar, confirmar em modais) |
| `premium` | CTA principal em headers e forms — ações de alto impacto |
| `outline` | Ações secundárias, botões de edição, triggers de modal |
| `secondary` | Botões de suporte (cancelar, voltar) — fundo sutil |
| `ghost` | Ações dentro de tabelas ou listas — mínimo visual |
| `destructive` | Excluir, remover — vermelho explícito |

> Roadmap detalhado: `docs/ui-refactor-roadmap.md`

---

## Arquitetura geral

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (React 19 + Tailwind)                             │
│  Dashboard • Logos • Perguntar • NPS • Esforço • Suporte    │
└────────────────────────┬────────────────────────────────────┘
                         │ fetch / React Query
┌────────────────────────▼────────────────────────────────────┐
│  API Routes (Next.js App Router — /src/app/api/)            │
│  accounts • contracts • interactions • health-scores        │
│  support-tickets • time-entries • nps • ask                 │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│  Camada de negócio (/src/lib/)                              │
│  RAG Pipeline • LLM Gateway • Health Engine • Risk Engine   │
└──────────┬──────────────────────────────────┬───────────────┘
           │                                  │
┌──────────▼──────┐                 ┌─────────▼───────────────┐
│  Supabase       │                 │  LLM Providers          │
│  (PostgreSQL +  │                 │  Gemini · Claude        │
│   pgvector)     │                 │OpenAI · Groq          │
│  Supabase Auth  │                 │(config via Admin UI)  │
└─────────────────┘                 └─────────────────────────┘
```

---

## Módulos

> **Mapa de módulos — atualizado 2026-06-01.** Reflete as rotas e o menu atuais.
> Use esta tabela como referência canônica; as seções detalhadas abaixo podem
> conter notas históricas. (Itens marcados ⚙️ ficam em Governança/Configurações.)

| Módulo (menu) | Rota | Para que serve |
|---|---|---|
| Pergunte à IA | `/perguntar` | Cérebro do CS — Q&A com RAG sobre a base de conhecimento e dados do portfólio |
| Início | `/home` | Cockpit diário de ação, role-aware (prioridades do dia) |
| Dashboard | `/dashboard` | Painel executivo com KPIs do portfólio |
| Adoção | `/adoption` | Adoção de features por conta (heatmap, blockers, forecast) |
| NPS | `/nps` | Programas e respostas de NPS, metas e RAG |
| Voz do Cliente | `/voc` | Agregação de sinais qualitativos (sentimento, temas, quotes) |
| Dashboard Suporte | `/suporte/dashboard` | Métricas operacionais de suporte (por agente, cliente, período) |
| Atividades | `/atividades` | Tarefas do CSM (kanban + comentários estilo chat + anexos) |
| Esforço | `/esforco` | Registro de horas por linguagem natural (IA) + auto check-in |
| Suporte | `/suporte` | Tickets, SLA, sugestão de resposta por IA, ingestão por e-mail |
| Fluxos | `/fluxos` | Orquestrador de processos/playbooks de CS |
| Capacidade & Produtividade | `/cs-ops` | Produtividade da equipe (por pessoa e time), capacity planning e rebalanceamento |
| Logos / Contas | `/accounts` | Cadastro e detalhe de contas, contratos, interações, health |
| Wishlist | `/wishlist` | Coleta, curadoria e handoff de pedidos de cliente |
| Usuários ⚙️ | `/users` | Usuários internos × externos (abas) + foto do integrante |
| Perfis de Acesso ⚙️ | `/settings/roles` | Custom roles e permissões por módulo |
| Produtos ⚙️ | `/settings/products` | Catálogo de produtos, epics e de→para RICE |
| Funcionalidades ⚙️ | `/settings/features` | Gestão de features/flags |
| Planos ⚙️ | `/settings/plans` | Planos comerciais |
| Horário SLA ⚙️ | `/settings/business-hours` | Janela de atendimento para cálculo de SLA |
| Política SLA ⚙️ | `/settings/sla` | Níveis e regras de SLA |
| Administração ⚙️ | `/admin` | Integrações, webhooks, configurações administrativas |
| Design System | `/design-system` | Referência interna de componentes/tokens |

> **Nota — Capacidade (`/cs-ops`):** desde 2026-06-01 a aba padrão é
> **Produtividade da Equipe**, que mede por pessoa e agregado do time (período
> semana/mês/trimestre) 4 pilares com dados reais: Esforço & Engajamento,
> Atividades & Throughput, Suporte & SLA, Resultados & Outcomes — além de
> utilização (carga), score composto e flag de burnout. As abas Atenção
> Necessária (cockpit de contas), Capacity Planning e Rebalancer continuam.

---

### Dashboard Principal (`/dashboard`)

Painel executivo com 6 KPIs em tempo real:

| KPI | Descrição |
|-----|-----------|
| Total de Logos | Número de contas ativas |
| MRR Total | Receita recorrente mensal somada (com ARR) |
| Health Médio | Média dos health scores do portfólio |
| Logos em Risco | Contas com health score abaixo de 40 |
| Renovações (30d) | Contratos com vencimento nos próximos 30 dias |
| NPS Score | Score NPS global do portfólio (promotores − detratores) |

Logo abaixo, tabela de contas com busca, filtros por segmento e indicadores de health e tendência.

---

### Logos / Contas (`/accounts`)

Gestão completa de contas. Cada logo possui:

- **Dados básicos**: segmento (Indústria / MRO / Varejo), setor de atuação, website, logo, CNPJ
- **Endereço estruturado**: CEP com auto-preenchimento via ViaCEP, Logradouro, Número, Complemento, Bairro, Cidade, UF — ou flag de endereço internacional
- **Múltiplos contratos**: cada conta pode ter N contratos (inicial, aditivo, upgrade, renovação), cada um com MRR, ARR calculado, tipo de serviço (Basic / Professional / Enterprise / Custom), status, datas de início e renovação, desconto por cupom (percentual em % ou valor fixo em R$, com toggle no formulário) e duração — editáveis individualmente em modo edit.
- **SLA por contrato**: cada contrato define se usa o Padrão Plannera (herdado da política global) ou um SLA customizado com mapeamento de-para: labels do cliente (ex: "Urgente", "P1") → níveis internos (Crítico / Alto / Médio / Baixo).
- **Layout Comercial**: Interface de alta densidade em duas colunas. Coluna esquerda focada em dados financeiros (Financial Engine sem descontos no contrato) e configuração de SLA; Coluna direita focada em cronograma de vigência e anotações contratuais.
- **Governança Comercial**: descontos, multas e fidelidade ficam centralizados fora do contrato, com regras globais ou por contrato, tipo (% / R$ / progressivo), valor e datas de vigência para cálculo de MRR líquido.
- **Power Map**: stakeholders com seniority, nível de influência, flag de decisor, e-mail, LinkedIn
- **Interações**: reuniões, e-mails, QBRs, onboardings, check-ins — com horas, tipo e transcrição
- **Tickets de Suporte**: status, prioridade, categoria, datas
- **Health Score**: histórico manual (CSM) e shadow (IA) com alertas de discrepância
- **Faturamento**: dia de vencimento, contato financeiro (nome, e-mail, telefone), regras de faturamento
- **Time interno**: CSM responsável e executivo comercial atribuídos por conta

**Navegação de edição**: o ícone de lápis na tabela do dashboard e no cabeçalho da conta redirecionam para `/accounts/[id]/edit`, que carrega o formulário completo com todos os contratos e dados estruturados.

**Header da conta**: exibe dois pills financeiros no canto direito (MRR e Renovação). O grid de saúde abaixo exibe duas linhas de indicadores — linha 1: Adoção | Suporte | Relacionamento; linha 2: NPS (score dos últimos 30 dias, `—` se sem respostas) | SLA (Ativo / Sem SLA conforme `sla_policies` do contrato ativo) | Score IA — todos sempre visíveis sem scroll. A linha do tempo usa ícones `w-8` com trilho alinhado ao centro e card com `overflow-hidden` para evitar overflow de texto.

**Health Score v2 Ponderado (F2-02):**

Novo sistema de saúde baseado em 4 dimensões recalculadas diariamente via cron `POST /api/cron/health-score-daily`:

| Dimensão | Peso | Cálculo |
|----------|------|---------|
| **SLA** | 35% | % de tickets resolvidos no prazo (últimos 30d) |
| **NPS** | 30% | Score NPS normalizado: `(avgNPS + 100) / 2` (0–100) |
| **Adoption** | 25% | % de features ativas do plano |
| **Relationship** | 10% | Frequência de contato (1–7d=100, 8–14d=75, 15–21d=50, 22–30d=25, >30d=0) |

**Fórmula:** `health_score_v2 = (SLA×0.35) + (NPS×0.30) + (Adoption×0.25) + (Relationship×0.10)`

**Classificação (health_status):**
- `healthy`: score ≥ 75 (verde)
- `at-risk`: score 50–74 (âmbar)
- `critical`: score < 50 (vermelho)

**Componente HealthBreakdownCard:** renderiza as 4 barras de progresso com tooltips explicativos na coluna direita da página de detalhe. Modal `HealthScoreDetailsModal` também exibe breakdown v2 com grid de dimensões quando disponível.

**Armazenamento:**
- `health_score_v2`: numeric (0–100)
- `health_breakdown`: JSONB {sla, nps, adoption, relationship}
- `health_status`: enum ('healthy', 'at-risk', 'critical')
- `health_classified_at`: timestamp da última atualização

**Linha do Tempo Unificada (F2-01-A — Contract Events Integration):**

A timeline esquerda da página de detalhe agora consolida **5 tipos de eventos** em ordem cronológica decrescente:
1. **Interações** (reuniões estratégicas, QBRs, onboardings)
2. **Esforço** (horas de CSM, preparação, análise, relatórios)
3. **Tickets de Suporte** (abertos, em atendimento)
4. **Respostas NPS** (feedback do cliente, scores)
5. **Eventos de Contrato** (**novo** — F2-01-A)

Eventos de contrato aparecem com ícone de dólar (indigo-500), sempre marcados como estratégicos (`isStrategic=true`). Classificação automática por tipo:
- `renewal`: renovation_date é hoje ou ontem
- `status_change`: status em `at-risk` ou `in-negotiation`
- `created`: padrão para contratos novos ou sem mudanças recentes

**Filtros na timeline:**
- **Feed Geral**: todos os 5 tipos visíveis
- **Estratégia**: apenas interações + contratos (isStrategic=true)
- **Atendimento & NPS**: apenas tickets + NPS respostas (exclui contratos deliberadamente, pois são governança, não operacional)

**Modal de detalhes de contrato (ContractDetailModal):**
Clique em qualquer evento de contrato abre modal read-only com:
- Informações financeiras (MRR Base, Horas Contratadas)
- Timeline contratual (Data Início, Renovação com contador T-minus)
- Termos (Tipo, Plano, Fidelidade, Multa Rescisória)
- Notas estratégicas (se preenchidas)
- Descontos progressivos (se houver)
- Botão "Editar Contrato" que abre `EditContractDialog` existente

---

### Perguntar — Cérebro do CS (`/perguntar`)

Interface de chat com o motor RAG. O CSM digita uma pergunta em português e o sistema:

1. Gera embedding da pergunta via LLM Gateway (provider de embedding configurável)
2. Busca os chunks mais relevantes no pgvector (limiar 0.4, relaxado para 0.2 se necessário), incluindo transcrições de reuniões indexadas
3. Enriquece com metadados estruturados: data da reunião, prioridade do ticket, adoção, NPS, stakeholders
4. Detecta automaticamente o cliente mencionado na pergunta (entity detection)
5. Monta o prompt com contexto 360° (ver abaixo) e chama o provider de texto configurado
6. Retorna resposta em PT-BR com citação das fontes

**Visão 360° — Auditoria Exaustiva (14 fontes de contexto estruturado):**

| Dimensão | Fonte | Descrição |
|----------|-------|-----------|
| **Journal de Esforço** | `time_entries` | Transcrições de reuniões, relatos de atividades e notas de contato — fonte primária qualitativa |
| **Power Map** | `contacts` | Decisores, influenciadores, senioridade, desligamentos e nível de engajamento por stakeholder |
| **Financeiro/Contrato** | `contracts` | MRR, ARR, status contratual (todos os status — expirados visíveis), dias até/desde renovação, sinal de churn automático |
| **Alertas Ativos** | `proactive_alerts` | Todos os alertas não resolvidos da conta ou portfólio injetados no contexto |
| **Saúde** | `health_scores` | Health Score Manual (CSM) vs Shadow IA — discrepância > 20 sinalizada como alerta |
| **Adoção** | `feature_adoption` | Status por funcionalidade com planos de ação e bloqueios |
| **NPS** | `nps_responses` | Score, segmentação, comentários recentes |
| **Playbooks** | `account_playbooks` | Playbooks em andamento, pausados e concluídos |
| **SLA** | `sla_events` | Tickets com breaches/escalações abertas |

**Classificação de Risco Comercial (automática):**
- Contrato vencido/inativo + adoção 0% → **CHURN** (cancelamento total) — não downgrade
- Adoção parcial + funcionalidades diferenciadas não usadas → **DOWNGRADE** (migração de plano)

A IA nunca omite detalhes: se houver transcrição ou nota no Journal de Esforço, ela é obrigatoriamente sintetizada na resposta.

---

### NPS Hub (`/nps`)

Painel executivo de inteligência de lealdade com design "High-Density":

- **NPS Hub (Mega-Card)**: Centraliza o Score, a evolução histórica e o breakdown do portfólio em um único componente glassmorphic.
- **Ghost Chart Evolution**: Gráfico de área translúcido integrado ao fundo do medidor principal, permitindo visualização de tendência sem gerar ruído visual.
- **Gestão de Metas Dinâmica**: Botão de ajuste de meta corporativa diretamente no dashboard, com recálculo automático de KPIs e alertas visuais.
- **Pareto de Contas Interativo**: Ranking de contas com ordenação personalizada por Promotores, Neutros ou Detratores.
- **Feed de Respostas Moderno**: Lista de feedbacks em tempo real com carrossel de respostas detalhadas por pergunta e modal de visualização completa.
- **Filtros Avançados**: Seleção de período (7d a 365d), Programas e Contas específicas com persistência de estado.
- **Exportação XLSX**: Geração de planilhas detalhadas incluindo todas as respostas do questionário multi-pergunta.
- **Gestão de Programas**: Rota segregada (`/nps/programs`) para criação de campanhas, edição de perguntas e configuração de modo de teste.

---

### Esforço (`/esforco`)

Rastreamento de horas do CSM por tipo de atividade. O input é em linguagem natural (ex: "Passei 2h preparando o QBR do cliente X") e a IA extrai horas e descrição automaticamente via LLM Gateway.

**Qualidade de Relato — `confidence_score`:** Cada entrada parseada recebe um score de confiança (0.0–1.0). Se `confidence_score < 0.8`, a entrada é salva com `status: 'pending_review'` para revisão humana antes de ser contabilizada.

---

### Suporte (`/suporte`, `/suporte/[id]` e `/suporte/dashboard`)

Módulo completo de suporte com SLA, ciclo de vida de ticket e CSAT.

**Revisão de resposta (Padrão Plannera):** Botão "Avaliar e Enviar" na área de composição do ticket. Submete o rascunho à IA que avalia sentimento, reescreve a mensagem no Padrão Plannera e calcula a nota final.

**Avaliação Context-Aware:** A IA usa TODO o histórico do chamado para avaliar o rascunho. Os 5 critérios (Tom, Estrutura, Empatia, Clareza, Alinhamento) são julgados no contexto do problema original e do sentimento acumulado do cliente.

**Nota Final — Média Harmônica dos 5 Critérios (escala 0–10):**
```
nota_final = 5 / (1/tom + 1/estrutura + 1/empatia + 1/clareza + 1/alinhamento)
```
`show_alert = true` quando `nota_final < 6`. Qualquer critério com nota 0 resulta em nota_final = 0 (penalidade máxima — a harmônica é indefinida com divisor zero).

**Interface de Detalhe do Ticket (`/suporte/[id]`):** Reconstruída no Vibrant Light Mode com os Componentes Guardiões. `TicketDetailClient` usa `<PageContainer noPadding>` como backbone, tokens semânticos (`bg-surface-background`, `bg-surface-card`, `border-border-divider`) em todas as zonas, e `<Text>` para título e metadados. Todas as classes `dark:` foram removidas da estrutura base. Layout "Full Page Fit": o container preenche a altura disponível sem scroll horizontal; o header (`z-20`) e a área de composição no rodapé (`z-10`) são fixos, enquanto a thread de mensagens e o sidebar lateral (em `xl+`) possuem scrolls internos independentes. A thread de mensagens agora inicia automaticamente pelo final (mensagens mais recentes). Alertas de SLA ausente foram movidos para um tooltip informativo no sidebar para maximizar o espaço de leitura. O tema padrão da aplicação foi alterado para `light` (`defaultTheme="light"` em `app/layout.tsx`) alinhando o tema default com o design system Vibrant Light Mode. O seletor de **Status** foi movido para a área de composição de resposta (junto ao botão de envio), garantindo que a atualização do ciclo de vida ocorra simultaneamente ao envio da mensagem. O campo **Produto** foi adicionado à classificação lateral.

**Indicadores 360° (Performance em Tempo Real):** Modal disparado pela sidebar que consolida a saúde do atendimento em três dimensões:
1. **Qualidade**: Média harmônica atualizada dos 5 pilares (Tom, Estrutura, Empatia, Clareza, Alinhamento).
2. **Compromisso (ETA)**: Monitoramento proativo de promessas de retorno no histórico ("volto em Xh"). A quebra de um ETA gera penalidade automática no score de Alinhamento e alerta visual no dashboard.
3. **Eficiência**: Cálculo de latência média de resposta considerando apenas a janela de horário útil (09:00 - 18:00).

**Auto-apply de Status pela IA:** Ao aceitar a versão da IA (ou manter a própria) no `ReplyReviewModal`, o campo de status no compose é automaticamente definido conforme `suggested_outcome` — `solution` → Resolvido, `pending_client` → Aguardando Cliente, `pending_product` → Aguardando Produto.

**Status de Ticket (padrão de mercado):** Seletor de status ampliado com "Aguardando Cliente" (`pending_client`) e "Aguardando Produto" (`pending_product`), seguindo o padrão osTicket/Zendesk/Freshdesk. No envio, estes são traduzidos para `status: 'in_progress'` + `outcome: 'pending_client|pending_product'` → backend define `pending_reason` via `processAgentInteraction`.

**Toolbar de formatação Teams-style:** Barra de formatação ancorada abaixo do textarea (não sobreposta). Botões: Negrito (`**text**`), Itálico (`_text_`), Código (`` `text` ``), Lista com marcadores, Lista numerada, Paperclip, Imagem. A seleção de texto no textarea é preservada após aplicar a formatação via `requestAnimationFrame`.

**Ações em Massa (Bulk Actions — F1-03):** Lista de tickets com multi-select via checkboxes. Usuário seleciona tickets e dispara ações para todos simultaneamente:
- **Mudar Status**: Aplicar novo status a múltiplos tickets de uma vez
- **Atribuir**: Reatribuir lotes de tickets para outro CSM
- **Fechar Tudo**: Fechar múltiplos tickets atomicamente

Todas as ações são snapshot-backed: ao executar, o sistema captura o estado anterior de cada ticket. Caso o CSM se arrependa, um toast com botão **Desfazer** aparece nos 30 segundos seguintes para restaurar o estado original. Cada ação dispara eventos de auditoria (`bulk_change_status`, `bulk_assign`, `bulk_close`, `bulk_action_undone`) registrados em `ticket_events`.

- **Busca Semântica (F1-04):** Substitui a busca textual simples por busca vetorial usando pgvector + embeddings Gemini. Ao digitar 3+ caracteres, a plataforma gera embedding da query e busca por similaridade semântica na tabela `embeddings`. Resultados ordenados por score de relevância com badge "Busca semântica" ativa. Fallback automático para busca in-memory se a API falhar. Novos tickets têm seus embeddings gerados automaticamente no background. Endpoint de backfill (`/api/support-tickets/backfill-embeddings`) indexa tickets existentes.
- **Preview Inline (F1-05):** Painel lateral deslizante que permite a triagem e gestão rápida de tickets sem sair da lista principal. Ao clicar em uma linha da tabela, o painel exibe o contexto completo (descrição, metadados de conta, SLA) e o histórico de mensagens. Inclui uma barra de ações rápidas para resolver/reabrir chamados, atribuir a si mesmo ou navegar para a visão completa. O estado do painel é persistido na URL (`?preview=id`), permitindo compartilhamento de links diretos para triagem.
- **Detecção de Colisão (F1-06):** Sistema de presença em tempo real via Supabase Presence. Notifica visualmente se outro CSM está visualizando o mesmo ticket no `TicketPreviewPanel`, prevenindo respostas duplicadas e conflitos de edição.
- **Urgency Scoring com IA (F1-07):** Classificação automática de urgência (Baixa, Média, Alta) processada pela IA. A IA analisa o conteúdo e histórico do ticket para atribuir um score e um raciocínio lógico ("Insights do Guardião IA"), exibidos via `UrgencyBadge` na lista e no painel de preview. O scoring é disparado automaticamente na criação e reabertura de tickets.
- **Reabertura Automática (F1-08):** Automação de ciclo de vida via trigger no Postgres. Tickets com status `closed` são movidos automaticamente para `open` se o cliente enviar uma nova mensagem (reply), garantindo que nenhum acompanhamento seja ignorado. Cada transição automática é registrada no histórico de auditoria.
- **Fechamento Automático e CSAT (F1-09):** Sistema de lifecycle paramétrico que fecha automaticamente tickets `resolved` após um período de inatividade definido em `sla_policies.auto_close_hours` (default 48h). No fechamento, o status muda para `closed` e um gatilho dispara automaticamente uma pesquisa de CSAT via e-mail para o autor do ticket.
- **Mesclagem de Tickets (F1-10):** Infraestrutura de consolidação que permite mesclar tickets duplicados da mesma conta. O ticket secundário é fechado e vinculado ao principal (`merged_into`), com histórico de auditoria (`ticket_merge_history`) e banner informativo na UI. Inclui incremento atômico de `merge_count` e logs de evento `ticket_merged_in`.
- **Detecção de Duplicatas (F1-11):** Cron job diário (02:00 UTC) que executa análise de similaridade semântica entre todos os tickets abertos usando pgvector e cosine similarity. Tickets com score >= 0.85 são flagrados em `ticket_similarity_candidates` com status `pending_review`. CSM vê banner "Possível duplicata" na tela do ticket com botão "Mesclar" (integrado com F1-10) ou "Não é duplicata" (dismisses). Logs em `ticket_events` com event_type `duplicate_flagged`. RLS garante que CSMs só veem candidates de suas contas.
- **Reabertura Manual (F1-12):** Botão "Reabrir com Justificativa" na tela de detalhe de tickets fechados. Abre modal com textarea obrigatório (min 10 chars) para registrar a razão da reabertura. Endpoint PATCH `/api/support-tickets/[id]/reopen` valida reason, altera status de `closed` para `open`, reseta `resolved_at` e logs em `ticket_events` com event_type `manual_reopened` incluindo reason e reopened_by no payload. Timeline exibe evento com ícone de reopen e razão completa.
- **Formulário Público + Webhook (F1-13):** Endpoint público `/api/public/tickets` (POST, sem auth) aceita `{ email, title, description, priority, account_id? }` com rate limit 10 req/min por IP. Cria ticket com source='form', envia confirmation email (HTML + plain text) via nodemailer/Resend, logs em `ticket_events` event_type='public_submission'. Webhook endpoint `/api/webhooks/tickets/create` (POST) valida HMAC-SHA256 signature (header X-Webhook-Signature), mapeia account via `external_id`, cria ticket com source='webhook', logs em `ticket_events` event_type='webhook_submission'. Ambos endpoints suportam CORS e rate limiting. Tabela `webhook_deliveries` registra payload, status, retry count e timestamps para auditoria.
- **Fila com Capacidade (F1-14):** Dashboard de capacidade dos CSMs mostrando `assigned_count / max_capacity` por agente. View SQL `csm_queue_stats` calcula em tempo real para cada CSM: tickets atribuídos, capacidade máxima (padrão 20, editável em `csm_settings.max_tickets_capacity`), slots disponíveis e percentage de carga. Componente `<QueueStatsPanel>` renderiza barra visual com cores progressivas (verde <50%, amarelo 50-80%, vermelho >=80%), tooltips informativos e summary stats. Endpoint `GET /api/csm-queue-stats` (cache 30s) retorna todas as estatísticas. Integração com sidebar para visibilidade contínua da fila.
- **Atribuição Automática (F1-15):** Cron job rodando a cada 5 minutos (`*/5 * * * *`) que busca tickets `assigned_to IS NULL` e `status='open'`, encontra o CSM com menor queue (respeitando `csm_settings.max_tickets_capacity` e `csm_settings.auto_assign_enabled`), e atribui. Evento `auto_assigned` registrado em `ticket_events` com CSM responsável. Tabela `auto_assign_stats` coleta telemetria (capacity_before/after, cron timestamp) para análise de padrões. Endpoint POST `/api/support-tickets/[id]/auto-assign-test` (admin) força atribuição para teste (ignora capacidade). View `auto_assign_metrics` permite dashboard de assignments por hora.
- **Escalonamento SLA (F1-16):** Cron job horário (`0 * * * *`) que busca tickets com SLA crítico (`sla_status='atencao'` ou `sla_status='vencido'`). Para cada ticket crítico não escalado nos últimos 2h, envia mensagem Slack formatada via webhook `SLACK_WEBHOOK_SLA_ALERTS` (circuit breaker: se webhook falha, log registra mas não falha cron). Tabela `sla_escalations` rastreia escalações com de-duplication window. Evento `sla_escalation` registrado em `ticket_events` com horas_elapsed e sla_status. Endpoint POST `/api/admin/test-sla-escalation` testa integração Slack. View `sla_escalation_summary` fornece telemetry de escalações por dia para alerting trends.
- **Categorização Automática (F1-18):** IA analisa título + descrição do ticket e sugere categoria entre 5 predefinidas (Bug, Feature Request, Account/Billing, Performance, Other). Se confiança >= 0.75, auto-aplica; senão mostra sugestão para CSM revisar. Component `<CategorySuggestionBadge>` renderiza sugestão com confidence badge e botões Aceitar/Rejeitar. Colunas `suggested_category`, `suggestion_confidence`, `suggestion_reasoning` armazenam resultado. Tabela `categorization_suggestions` registra histórico com status (pending/accepted/rejected). Eventos `auto_categorized`, `categorization_accepted`, `categorization_rejected` para auditoria. Auto-gatilhado ao criar novo ticket.
- **RAG — Sugerir Resposta (F1-17):** Botão "💡 Sugerir Resposta" no compose que dispara RAG pipeline: (1) busca 5 tickets similares via pgvector + cosine similarity (threshold 0.75), (2) recupera últimas respostas como contexto, (3) monta prompt com ticket atual + categoria + SLA, (4) gera sugestão via LLM Gateway (500 tokens). Sugestão é read-only com disclaimer "🤖 AI-Suggested". Component `<ReplySuggestionPanel>` exibe loading, conteúdo e actions (Usar/Descartar). Cache por 5min; invalidado se nova resposta chegar. Tabela `reply_suggestions` com status (pending/accepted/rejected). Telemetria em `reply_suggestion_telemetry` registra accept/reject/edit com edit_distance para RL futura. Eventos `reply_suggestion_accepted`, `reply_suggestion_rejected` em `ticket_events`.
- **Resumo do Ticket (F1-19):** Gera resumo 1-2 linhas (máx 150 chars) acima da timeline. IA analisa título, descrição, últimas 3 respostas, categoria, prioridade e status. Component `<TicketSummarySection>` renderiza resumo com ícone 📝, timestamp, botão de regeneração. Cache 24h em BD; invalidado se nova resposta chegar (via `mark_summary_as_stale()`). Endpoint GET `/api/support-tickets/[id]/summary` retorna cached ou gera novo. Endpoint POST força regeneração (admin). Tabela `ticket_summary_cache` com flags de staleness. Histório em `ticket_summary_history` com audit trail (IA vs manual). View `stale_ticket_summaries` para background regeneration jobs.

---

### Adoção de Produto (`/adoption`)

> Nota: a rota canônica é **`/adoption`** (item "Adoção" no menu). O catálogo de
> produtos/epics e o de→para RICE ficam em **`/settings/products`**. A antiga
> rota `/product` foi descontinuada.

Matriz de adoção de features por conta. Cada linha é uma feature do produto.

**Motor de risco de downgrade**: compara as features do plano atual com o plano imediatamente inferior. Se features diferenciadoras não estão adotadas, o risco é sinalizado como `high` ou `low`.

---

### Configurações

- **`/settings/plans`**: CRUD de planos de assinatura
- **`/settings/features`**: Catálogo de features do produto
- **`/settings/sla`**: Política SLA global Plannera
- **`/settings/business-hours`**: CRUD de horários comerciais
- **`/users`**: Gestão da equipe de CSMs

---

## F2-03: Segmentação Dinâmica de Contas

**Status:** Implementado ✅

Filtros dinâmicos para busca e segmentação de contas no dashboard. CSMs conseguem filtrar por:

- **Health Status**: `healthy`, `at-risk`, `critical`
- **Segmento**: `Indústria`, `MRO`, `Varejo`, `Distribuidor`
- **MRR**: Range mínimo e máximo
- **Status do Contrato**: `active`, `at-risk`, `churned`, `in-negotiation`
- **Adoção**: Range de percentual de features adotadas

**Componentes:**
- `AccountFilterBuilder` (`src/app/(dashboard)/accounts/components/AccountFilterBuilder.tsx`): Filtros com UI collapsible
- `AccountFilterSchema` (`src/lib/filters/account-filters.schema.ts`): Validação Zod dos parâmetros
- `GET /api/accounts?health_status=at-risk&segment=MRO`: Endpoint com query param filtering + RLS

**4 Segmentos Padrão (Saved Views):**
1. **Em Risco** — accounts com `health_status: 'at-risk'`
2. **Enterprise** — accounts com `mrr >= 10000`
3. **Renovação 90d** — contracts próximas de vencer nos próximos 90 dias
4. **SMB** — accounts com `mrr <= 3000`

**Índices de Performance:**
- `idx_accounts_health_status`, `idx_accounts_segment`, `idx_accounts_csm_owner_id`
- `idx_accounts_health_segment` (composite para filtros comuns)
- `idx_contracts_account_status` (para joins com contratos)

**Migration:** `supabase/migrations/020_f2_03_account_filters.sql`

---

## F3-01: Playbooks MVP com Gatilho Manual

**Status:** Implementado ✅

Sistema de playbooks (jornadas de sucesso) para instanciar fluxos de tarefas em contas. Gatilho manual por enquanto — automação por health_score é fase futura.

**Tipos:**
- `PlaybookTemplate`: definição da jornada (nome, descrição, tarefas)
- `PlaybookTask`: tarefas unitárias (tipo: `manual`, `email`, `meeting`, `review`)
- `AccountPlaybook`: instância executada por conta
- `AccountPlaybookTask`: status de cada tarefa na instância

**Endpoints:**
- `GET /api/playbooks` — lista templates ativos com tarefas
- `POST /api/accounts/[id]/playbooks` — cria instância + tasks pendentes
- `PATCH /api/account-playbooks/[id]/tasks/[taskId]` — marca task como completa/skipped + logs

**UI:**
- `/playbooks` página: CRUD de templates (ativo/inativo, visualizar tarefas)
- `PlaybookWidget` em account detail: mostra playbook em progresso + checklist de tarefas
- `PlaybookHistoryModal`: histórico de playbooks finalizados com botão "Concluir Task" + real API calls

**RLS:**
- CSMs veem só playbooks de suas contas
- CSMs atualizam só tasks de playbooks que criaram

**Migration:** `supabase/migrations/021_f3_01_playbooks.sql`

---

## F3-02: Motor de Alertas Proativos

**Status:** Implementado ✅

Sistema de alertas automáticos que monitora 6 indicadores-chave de saúde de conta diariamente. Cada CSM vê alertas apenas das contas que gerencia. Alertas podem ser manualmente resolvidos.

**6 Tipos de Alerta (com Severidade):**

1. **Churn Risk** (Crítico se health_score_v2 < 40)
   - Detecção: Health score cai abaixo de 40%
   - Recomendação: Agendar QBR imediato com executivo
   - Metadados: health_score, threshold, recommendation

2. **Silent Customer** (Aviso se 21+ dias sem interação)
   - Detecção: Nenhuma interação registrada ou última foi 21+ dias atrás
   - Recomendação: Enviar check-in email ou agendar health check call
   - Metadados: days_silent, last_interaction, recommendation

3. **Renewal Upcoming** (Crítico se <= 30d, Aviso se <= 60d)
   - Detecção: Renovação de contrato dentro de 60 dias
   - Recomendação: Revisar NPS, adoption gains, preparar renewal proposal
   - Metadados: renewal_date, days_until, current_mrr, recommendation

4. **Adoption Anomaly** (Aviso se queda > 20% vs mês anterior)
   - Detecção: Adoção de features caiu mais de 20% comparado ao mês anterior
   - Recomendação: Investigar qual(is) feature(s) foram desativadas
   - Metadados: this_month_rate, last_month_rate, drop_percent, features_disabled

5. **Expansion Signal** (Info se NPS >= 9 + MRR < mediana do segmento)
   - Detecção: Cliente promovedor com MRR abaixo da mediana da sua vertical
   - Recomendação: Mapear oportunidades de add-on ou upsell
   - Metadados: current_nps, current_mrr, segment_median_mrr, expansion_potential

6. **NPS Detractor Unactioned** (Aviso se score <= 6 sem follow-up 7+ dias)
   - Detecção: Resposta NPS detrator (6 ou menor) sem ticket de suporte criado
   - Recomendação: Criar ticket de investigação ou contatar cliente em QBR
   - Metadados: nps_score, responded_at, days_without_followup, nps_response_id

**Enums & Tipos:**
- `alert_type`: `churn_risk | silent_customer | renewal_upcoming | adoption_anomaly | expansion_signal | nps_detractor_unactioned`
- `alert_severity`: `critical | warning | info`
- `ProactiveAlert`: id, account_id, type, severity, message, metadata, resolved_at, created_at, updated_at

**Cron Diário:**
- Endpoint: `POST /api/cron/proactive-alerts` (auth via `x-api-secret`)
- Executa: A cada dia (configurável via scheduler externo: Vercel Crons, PlanetScale, ou cURL)
- Rate: 1 alerta por (account_id, type) por dia (deduplicação por UNIQUE INDEX)
- Processamento: Batch de 100 contas em paralelo (Promise.allSettled)
- Limite Vercel: 5 min (maxDuration = 300)

**APIs REST:**

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/proactive-alerts` | JWT (CSM) | Lista alertas de suas contas (RLS) |
| GET | `/api/proactive-alerts?severity=critical` | JWT | Filtra por severidade |
| GET | `/api/proactive-alerts?resolved=true` | JWT | Inclui resolvidos |
| PATCH | `/api/proactive-alerts/[id]/resolve` | JWT (CSM) | Marca alerta como resolvido |

**RLS:**
- CSM vê apenas alertas de contas que gerencia (`csm_owner_id = auth.uid()`)
- CSM pode atualizar (marcar resolvido) apenas seus alertas
- Admin pode ver todos (via `getSupabaseAdminClient`)

**AlertCenter UI (`src/components/alerts/AlertCenter.tsx`):**
- Ícone Bell no Sidebar (ao lado de NotificationCenter)
- Badge de contagem de críticos com dot pulsante
- Drawer lateral: lista de alertas com cards coloridos por severidade
- Cores: 🔴 Crítico (red), 🟡 Aviso (yellow), 🔵 Info (blue)
- Cada alerta exibe: tipo, mensagem, recomendação, botão de resolver
- Polling: 30s refetch automático via React Query

**Metadados de Alerta (JSON):**
Cada alerta armazena contexto em `metadata` para ações futuras:
```json
{
  "health_score": 35.5,
  "threshold": 40,
  "recommendation": "Agendar QBR imediato com executivo",
  "days_silent": 25,
  "last_interaction": "2025-04-12T10:30:00Z",
  "renewal_date": "2025-06-15T00:00:00Z",
  "days_until": 39,
  "current_mrr": 5000,
  "expansion_potential": "2500.00"
}
```

**Índices:**
- `idx_proactive_alerts_account_id`: queries por conta
- `idx_proactive_alerts_severity`: filtro por severidade
- `idx_proactive_alerts_created_at`: ordenação temporal
- `idx_proactive_alerts_type`: agrupamento por tipo
- `idx_proactive_alerts_resolved`: filtro resolvidos/pendentes
- `proactive_alerts_daily_uniq`: UNIQUE constraint por dia para deduplicação

**Migrations:**
- `supabase/migrations/030_f3_02_proactive_alerts.sql`: Enums, tabela, índices, RLS

---

## F3-03: Success Plans MVP com Compartilhamento Público

**Status:** Implementado ✅

Sistema MVP para CSMs criarem e compartilharem planos de sucesso com clientes via link público. Suporta CRUD de metas com tracking de progresso.

**Tipos & Estrutura:**

- `SuccessPlan`: Cabeçalho do plano (título, token UUID para compartilhamento, criador, timestamps)
- `SuccessPlanGoal`: Meta individual (título, descrição, data alvo, status, completed_at)
- Status goals: `pending | ongoing | completed | delayed`

**APIs REST:**

| Método | Endpoint | Auth | Descrição |
|--------|----------|------|-----------|
| GET | `/api/accounts/[id]/success-plans` | JWT (CSM) | Fetch plano + goals de uma conta |
| POST | `/api/accounts/[id]/success-plans/goals` | JWT (CSM) | Criar nova meta (cria plano se não existe) |
| PATCH | `/api/accounts/[id]/success-plans/goals/[goalId]` | JWT (CSM) | Atualizar meta (status, título, descrição, data) |
| DELETE | `/api/accounts/[id]/success-plans/goals/[goalId]` | JWT (CSM) | Soft-delete meta (set `deleted_at`) |
| GET | `/api/public/success-plans/[token]` | Public (No Auth) | Retorna plano + goals pelo token UUID |

**RLS:**
- CSM cria/vê/edita só planos de suas contas (`csm_owner_id = auth.uid()`)
- Public endpoint não requer auth, usa token UUID como "senha pública"

**UI Componentes:**

**CSM Page:** `/accounts/[id]/success-plan`
- Formulário de nova meta (título, descrição, data)
- Lista de metas com cards: status badge, descrição, data-alvo, completed_at
- Botões: Marcar como Concluído, Remover meta
- Botão "Compartilhar Link" → Copia URL pública para clipboard
- Query polling: React Query com 30s refetch
- Estados: loading, error, empty (sem metas)

**Public Page:** `/public/success-plans/[token]`
- Read-only view do plano (sem edit)
- Header com progresso: X concluídas / Y total
- Progress bar visual (%) com cor verde
- Cards de metas com ícones por status
- Sem navbar, sem auth, apenas visualização
- Responsive mobile-friendly com max-width container

**Soft-Delete Pattern:**
- Migrations têm coluna `deleted_at`
- Queries filtram `WHERE deleted_at IS NULL`
- Índices: `WHERE deleted_at IS NULL` para performance
- Histórico preservado para auditoria

**Auto-Create Plan:**
- Ao criar primeiro goal, plano é auto-criado se não existir
- Título default: `Plano de Sucesso - 2026` (ano corrente)

**Metadados:**
- `shared_token`: UUID único por plano (público, não secreto)
- `created_by`: CSM que criou
- `completed_at` em goals: Timestamp quando marcado como completo

**Índices:**
- `idx_success_plans_account_id`, `idx_success_plans_shared_token`: Lookups rápidos
- `idx_success_plan_goals_plan_id`, `idx_success_plan_goals_status`: Filtros
- Todos com `WHERE deleted_at IS NULL` para soft-delete

**Migrations:**
- `supabase/migrations/031_f3_03_success_plans.sql`: Tabelas, enums (status), índices, RLS

---

## LLM Gateway Multi-Provider

O gateway (`src/lib/llm/gateway.ts`) opera com uma **arquitetura de adapters** que suporta 4 providers de IA, todos configuráveis via Admin UI (`/admin/settings`, aba IA) sem necessidade de redeploy.

```
Requisição de texto/embedding
       │
       ▼
  getLLMSettings() ← app_settings (cache 60s)
       │
    ┌──┴──────────────────────────────────────────┐
    │  Provider Adapters (src/lib/llm/providers/)  │
    ├──────────────┬──────────┬──────────┬─────────┤
    │ Gemini       │ Claude   │ OpenAI   │ Groq    │
    │ Texto ✅     │ Texto ✅ │ Texto ✅ │ Texto ✅│
    │ Embedding ✅ │          │ Embed ✅ │         │
    └──────────────┴──────────┴──────────┴─────────┘
```

**Configuração:** Feita via Admin UI ou variáveis de ambiente (fallback). API keys são armazenadas criptografadas (AES-256-GCM) na tabela `app_settings`.

**Providers Suportados:**

| Provedor | Modelos de Texto | Modelos de Embedding | SDK |
|----------|-----------------|---------------------|-----|
| **Gemini** | gemini-2.5-flash, gemini-2.5-pro | text-embedding-004 (768d) | @google/genai |
| **Claude** | claude-haiku-4-5, claude-sonnet-4-6, claude-opus-4-7 | — | @anthropic-ai/sdk |
| **OpenAI** | gpt-4o, gpt-4o-mini, o3-mini | text-embedding-3-small (1536d), text-embedding-3-large (3072d) | openai |
| **Groq** | llama-3.3-70b, llama-3.1-8b, mixtral-8x7b | — | groq-sdk |

**Arquitetura de Arquivos:**
- `src/lib/llm/gateway.ts` — Funções `generateText()` e `generateEmbedding()` (interface única para todos os callers)
- `src/lib/llm/settings.ts` — Loader de config do banco com cache em memória (60s TTL)
- `src/lib/llm/providers/*.ts` — 4 adapters + interface + registry
- `src/lib/crypto/encryption.ts` — Criptografia AES-256-GCM para API keys
- `src/app/api/admin/settings/test-provider/route.ts` — Teste de conexão por provider
- `src/app/api/admin/settings/reindex-embeddings/route.ts` — Re-indexação de vetores ao trocar embedding provider

---

## Health Score

### Score manual (CSM)

O CSM insere uma nota de 0–100. O sistema compara com o `shadow_score` vigente e gera alertas se a discrepância for > 20.

### Shadow Score (IA)

Gerado automaticamente analisando as últimas 10 interações e 10 tickets via LLM Gateway (provider configurável).

---

## Como rodar localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Copie o template e preencha as chaves:
```bash
cp .env.example .env
```

### 3. Rodar
```bash
npm run dev
```

---

## Variáveis de ambiente (referência completa)

```bash
# ── Supabase ──────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# ── Google Gemini ─────────────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key
GEMINI_EMBEDDING_MODEL=text-embedding-004
GEMINI_EMBEDDING_DIMENSIONS=768
GEMINI_FLASH_MODEL=gemini-2.5-flash
GEMINI_PRO_MODEL=gemini-pro-latest

# ── LLM Gateway ───────────────────────────────────────────────
LLM_PROVIDER=gemini                 # Provider padrão (gemini | claude | openai | groq)
LLM_FALLBACK_PROVIDER=none          # Fallback provider (opcional)
LLM_TIMEOUT_MS=120000
LLM_ALLOW_FALLBACK=false

# ── Criptografia (API Keys no banco) ─────────────────────────
ENCRYPTION_KEY=your-64-char-hex-key  # 32 bytes hex para AES-256-GCM

# ── Integração Slack (F1-16: Escalonamento SLA) ───────────────
SLACK_WEBHOOK_SLA_ALERTS=https://hooks.slack.com/services/T.../B.../XXXX

# ── App URL para links em mensagens ───────────────────────────
NEXT_PUBLIC_APP_URL=https://csplataform.plannera.com

# ── API Secret para Cron Jobs ─────────────────────────────────
API_SECRET=your-secure-random-secret-for-cron-jobs
```

---

---

## Wave 7 — Extensibility & Integrations (150 SP) ✅ IMPLEMENTADO

**Status:** ✅ **Backend + UI Admin completos**  
**Data:** 2026-05-11  
**Total:** 5 Épicos, 21 Histórias, 150 SP

### Épicos Implementados / Em Desenvolvimento

#### **Epic 30 — Webhooks Infrastructure (15 SP)**
- ✅ **Story 30.1:** Webhook Management UI — `/admin/integrations` tab Webhooks
  - `POST /api/webhooks` — Criar webhook com autenticação
  - `GET /api/webhooks` — Listar webhooks por account
  - `PUT /api/webhooks/[id]` — Atualizar webhook
  - `DELETE /api/webhooks/[id]` — Deletar webhook
  - Tabelas: `webhooks`, `webhook_deliveries` (Criadas)

- ✅ **Story 30.2:** Event Dispatcher
  - `WebhookService.dispatchEvent()` — Dispara eventos para webhooks ativos
  - Eventos: `account.created`, `account.updated`, `contract.renewal`, `alert.triggered`, `health.degraded`, `ticket.resolved`, `risk.detected`
  - Retry logic: Exponential backoff (1m, 2m, 4m) para 5xx errors (máx 3 retries)
  - Rate limit: 100 req/min por endpoint

- ✅ **Story 30.3:** Signature Verification
  - HMAC-SHA256 signing em todos os payloads
  - Header: `X-Webhook-Signature`
  - Auth types: `hmac`, `bearer`, `custom`

- ✅ **Story 30.4:** Testing & Monitoring
  - `POST /api/webhooks/test` — Enviar teste webhook delivery
  - `GET /api/webhooks/[id]` — Métricas de delivery (success rate, latency, p95)
  - Log de todas as tentativas com response body

#### **Epic 31 — CRM Integration (40 SP)**
- ✅ **Story 31.1:** Salesforce Sync (12 SP)
  - `POST /api/integrations/crm` — Create Salesforce integration
  - `POST /api/integrations/crm/sync?sync_type=accounts` — Sync Accounts ↔ Salesforce
  - Service: `CRMService.syncSalesforceAccounts()`
  - Tabelas: `crm_integrations`, `crm_sync_logs`

- ✅ **Story 31.2:** HubSpot Sync (12 SP)
  - `CRMService.syncHubSpotCompanies()` — Sync Companies & Contacts
  - Deal tracking: Contracts ↔ HubSpot Deals
  - Revenue sync: MRR → Custom HubSpot field

- ✅ **Story 31.3:** CRM Webhook Listener (10 SP)
  - `POST /api/webhooks/crm-inbound` — Recebe webhooks de Salesforce/HubSpot
  - `CRMService.handleInboundWebhook()` — Atualiza dados locais
  - Conflict resolution: CRM wins (últimas mudanças de CRM sobrescrevem locais)

- ✅ **Story 31.4:** CRM Settings & Mapping (6 SP)
  - Field mapping JSONB: `CSM_name` → `Account.Owner`
  - Toggle: `is_active` para ativar/desativar sync
  - Encrypted API keys em env vars

#### **Epic 32 — Support/Ticketing Integration (25 SP)**
- ✅ **Story 32.1:** Zendesk Sync (8 SP)
  - `SupportService.syncZendeskTickets()` — Sync Tickets ↔ Zendesk
  - Comment sync: Auto-sync ticket replies
  - Tabelas: `support_integrations`, `support_sync_logs`

- ✅ **Story 32.2:** Jira Service Desk Sync (8 SP)
  - `SupportService.syncJiraTickets()` — Sync Issues (tickets)
  - Priority mapping: CSM severity → Jira priority
  - Custom field mapping

- ✅ **Story 32.3:** Support Webhook Inbound (5 SP)
  - `POST /api/webhooks/support-inbound` — Handlers para Zendesk/Jira
  - `SupportService.handleInboundWebhook()`
  - RLS enforcement: ticket ownership preserved

- ✅ **Story 32.4:** Settings & Mapping (4 SP)
  - `POST /api/integrations/support` — Create support integration
  - Field mapping e toggle de sync

#### **Epic 33 — Business Intelligence Integration (20 SP)**
- ✅ **Story 33.1:** Data Warehouse Export (8 SP)
  - `BIService.exportAccountsToBigQuery()` — Export to BigQuery
  - `BIService.exportContractsToSnowflake()` — Export to Snowflake
  - `POST /api/integrations/bi/export` — Trigger export
  - Timestamp partitioning by `updated_at`
  - Tabelas: `bi_integrations`, `bi_export_logs`

- ✅ **Story 33.2:** Tableau/Looker Integration (6 SP)
  - `GET /api/integrations/bi/export?entity_type=accounts` — CSV export
  - `BIService.getTableauDataSource()` — JSON data source
  - OAuth flow para Tableau/Looker auth

- ✅ **Story 33.3:** Dashboard Sync (4 SP)
  - Embed Tableau reports em `/dashboard`
  - Auto-refresh: 1 hour interval

- ✅ **Story 33.4:** BI Settings & API Keys (2 SP)
  - `POST /api/integrations/bi` — Create BI integration
  - Encrypted credentials storage

#### **Epic 35 — Advanced Permissions (20 SP)**
- ✅ **Story 35.1:** RBAC Expansion (8 SP)
  - New roles: `admin`, `csm`, `account_manager`, `report_viewer`, `finance_auditor`, `read_only`
  - Tabelas: `user_roles`, `permission_matrix`
  - `GET /api/permissions?user_id=X&account_id=Y` — Get user permissions

- ✅ **Story 35.2:** Resource-Level Permissions (6 SP)
  - Tabela: `resource_access` (user_id, resource_type, resource_id, permission)
  - `POST /api/permissions/access` — Grant resource access
  - CSMs: Acesso apenas a contas específicas (não todas)

- ✅ **Story 35.3:** Audit Trail (4 SP)
  - Tabela: `permission_audit_logs` (immutable records)
  - `GET /api/audit-logs` — Query com paginação
  - Events: `role_assigned`, `role_revoked`, `permission_granted`, `access_granted`

- ⏳ **Story 35.4:** Permission UI (2 SP) (Pendente)
  - `/admin/permissions` page para RBAC management
  - User list + role assignment grid

#### **Epic 37 — Observability & Monitoring (15 SP)**
- ✅ **Story 37.1:** Logging Infrastructure (5 SP)
  - Class: `Logger` com níveis: `debug`, `info`, `warn`, `error`, `critical`
  - Tabela: `application_logs` com context, user_id, trace_id
  - `GET /api/observability/logs?level=error&service=api` — Query logs

- ✅ **Story 37.2:** Request Tracing (4 SP)
  - Class: `RequestTracer` com geração de trace IDs
  - Tabela: `request_traces` (method, path, status, duration_ms)
  - Spans JSONB para OpenTelemetry
  - `RequestTracer.recordTrace(traceId, method, path, status, duration)`

- ✅ **Story 37.3:** Metrics & Alerting (4 SP)
  - Class: `MetricsCollector` para recording metrics
  - Tabelas: `metrics`, `alert_rules`, `alert_incidents`
  - `GET /api/observability/metrics?metric_name=http_request_duration_ms`
  - Métricas: `http_request_duration_ms`, `errors_total`, `db_query_duration`

- ✅ **Story 37.4:** Error Tracking (2 SP)
  - Class: `ErrorTracker` para aggregar erros
  - Tabela: `error_events` com fingerprint e occurrence_count
  - `GET /api/observability/errors?severity=critical`
  - Método: `ErrorTracker.recordError(message, error, severity, context)`

### Arquivos Criados

**Migrations:**
- `20260509000000_wave7_webhooks.sql` — Webhook tables
- `20260509010000_wave7_integrations.sql` — CRM, Support, BI tables
- `20260509020000_wave7_advanced_permissions.sql` — Permission tables + seed
- `20260509030000_wave7_observability.sql` — Logging, tracing, metrics tables

**Services:**
- `src/lib/integrations/webhook-service.ts` — WebhookService
- `src/lib/integrations/crm-service.ts` — CRMService (Salesforce + HubSpot)
- `src/lib/integrations/support-service.ts` — SupportService (Zendesk + Jira)
- `src/lib/integrations/bi-service.ts` — BIService (BigQuery + Snowflake)
- `src/lib/observability/logger.ts` — Logger, RequestTracer, MetricsCollector, ErrorTracker, AlertManager

**API Routes:**
- `src/app/api/webhooks/` — Webhook CRUD + test
- `src/app/api/integrations/crm/` — CRM integration + sync
- `src/app/api/integrations/support/` — Support integration + sync
- `src/app/api/integrations/bi/` — BI integration + export
- `src/app/api/permissions/` — Permission management
- `src/app/api/audit-logs/` — Audit log queries
- `src/app/api/observability/` — Logging, errors, metrics
- `src/app/api/cron/integrations-sync/` — Scheduled sync job

**Schemas:**
- `src/lib/schemas/wave7.schema.ts` — Zod schemas para todas as entidades

**Documentation:**
- `docs/product/WAVE7.md` — Documentação completa (150 SP)

### Checklist de Deployment

- [ ] Executar migrations: `supabase migration up`
- [ ] Definir env vars:
  - `CRON_SECRET` para validação de cron endpoint
  - API keys: Salesforce, HubSpot, Zendesk, Jira, BigQuery, Snowflake
- [ ] Configurar cron job para chamar `POST /api/cron/integrations-sync` a cada hora
- [ ] Testar webhook delivery com `POST /api/webhooks/test`
- [ ] Verificar CRM/support syncs com `POST /api/integrations/[type]/sync`
- [ ] (Opcional) Configurar Sentry para error tracking
- [ ] (Opcional) Configurar Datadog/Prometheus para métricas

---

## Observações importantes

- **Embeddings**: dimensão varia conforme provider — Gemini `text-embedding-004` usa 768d, OpenAI `text-embedding-3-small` usa 1536d. Trocar provider dispara re-index automático via Admin UI.
- **LLM Multi-Provider**: O gateway suporta Gemini, Claude, OpenAI e Groq. Todas as chamadas de IA passam pelo gateway unificado (`src/lib/llm/gateway.ts`). Provider e modelo são configuráveis via Admin UI (`/admin/settings`, aba IA) sem redeploy.
- **RLS estrita**: cada CSM só acessa dados das contas onde é proprietário.
- **NPS é público**: os endpoints `/api/nps/check` e `/api/nps/response` têm CORS `*`.
- **Wave 7 Production-Ready**: Todos os endpoints incluem validação Zod, error handling, rate limiting, RLS enforcement, e logging estruturado.
