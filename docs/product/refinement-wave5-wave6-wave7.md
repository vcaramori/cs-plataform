# Refinement: Wave 5 + Wave 6 + Wave 7 — CS-Continuum Roadmap

**Data:** 2026-05-08  
**Status:** Refinement completo com PM, PO, CS Agents Pack, Arnaldo (Arquitetura), Davi (Deploy)  
**Total SP:** 290 SP ≈ 29 sprints (18 meses @ 2 sprints/mês)

---

## 📋 Wave 5 — Fundação Inteligência + Automação (49 + 124 = 173 SP)

### Fase 1: Pré-Condições Arquiteturais (49 SP) — BLOQUEANTE

#### Epic 36 — User Roles & Permissions (13 SP)

**Story 36.1 — Role Hierarchy & Database Foundation (5 SP)**

*Arnaldo (Arquiteta):* Todas RLS policies futurasependem disso. Migration primeiro.

ACs:
1. Nova enum `user_role` em PostgreSQL: `'super_admin' | 'admin' | 'head_cs' | 'csm_senior' | 'csm' | 'client'`
2. Tabela `profiles` adiciona coluna `role user_role NOT NULL DEFAULT 'csm'`
3. Trigger `fn_sync_role_to_jwt()`: quando `profiles.role` muda → sincroniza para `auth.users.app_metadata.role` (JWT claim)
4. RLS migration: TODAS políticas existentes adicionam:
   ```sql
   OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('head_cs', 'admin', 'super_admin')
   ```
   - Mantém `csm_owner_id = auth.uid()` para CSM restrito
   - Adiciona OR para head_cs+ (acesso global)
5. Helper `getSupabaseServerClient()` expõe `getUserRole()` que lê JWT claim
6. Usuários existentes recebem role='csm' via migration
7. `getSupabaseAdminClient()` operações são sempre permitidas (para crons, migrations)

Plano de Testes:
- DB: Trigger sincroniza role ao UPDATE em profiles
- DB: RLS — `SELECT * FROM accounts` como csm → retorna apenas suas contas; como head_cs → todas
- API: `GET /api/accounts` header token com role='head_cs' → retorna todas as contas
- E2E: TC-36-01: Login como csm → sidebar sem "Admin" link; apenas suas contas visíveis
- E2E: TC-36-02: Login como head_cs → "Admin" link visível; todas as contas acessíveis

Sizing: **5 SP** (migration + trigger + RLS updates + 1 helper)

---

**Story 36.2 — Role-Based UI & Permission Hooks (5 SP)**

*Pedro Prioriza:* Frontend precisa renderizar baseado em JWT role.

ACs:
1. Hook `usePermission(permission: string): boolean` em `src/hooks/usePermission.ts`
   - Valida JWT claim contra matriz de permissões
   - Retorna false se role não tem permissão
2. HOC `<RequireRole role="head_cs" fallback={<Unauthorized />}>` em `src/components/auth/RequireRole.tsx`
   - Usado para proteger rotas/seções inteiras
3. Matriz de permissões em `src/lib/auth/permissions.ts`:
   ```
   admin: ['*'] (todas)
   head_cs: ['view_all_accounts', 'edit_contract', 'force_health_recalc', 'view_reports', 'manage_playbooks']
   csm_senior: ['view_all_accounts', 'edit_contract', 'manage_playbooks']
   csm: ['view_own_accounts', 'edit_own_playbooks', 'log_time']
   client: ['view_public_success_plan']
   ```
4. Sidebar: ícones "CS Ops" (só head_cs+), "Admin" (só admin) ficam ocultos com `<RequireRole>`
5. Botões "Reajuste de Preço" (Wave 5.5), "Rebalancear" (Wave 5.6): visíveis só se `usePermission('edit_contract')`
6. Toast aviso ao tentar ação sem permissão: "Você não tem permissão para isso"

Plano de Testes:
- Unit: `usePermission('edit_contract')` com role='csm' retorna false
- Unit: `usePermission('view_all_accounts')` com role='head_cs' retorna true
- E2E: TC-36-03: Usuário csm tenta acessar `/admin` → RequireRole gate → redirect ou 403
- E2E: TC-36-04: Usuário admin em `/admin` → todos os ícones visíveis
- E2E: TC-36-05: Botão "Reajuste" para role='csm' → oculto; para role='head_cs' → visível

Sizing: **5 SP** (hook + HOC + permissions matrix + UI updates)

---

**Story 36.3 — User Convites & Role Assignment (3 SP)**

*Davi (Deploy):* Integraguém com Auth.

ACs:
1. Rota `/users` (auth gate: `RequireRole role="admin"`)
2. Formulário "Convidar Usuário":
   - Email
   - Role (select, filtrado: `admin` só pode atribuir até `head_cs`, `head_cs` não pode atribuir role)
3. Click "Enviar Convite" → `POST /api/auth/invite`:
   - Verifica permissão do convidador
   - Cria user em `auth.users` com temporary password
   - Insere em `profiles` com role especificado
   - Envia email de boas-vindas com link de reset de senha
4. Audit log: evento `user_invited` com `invited_by`, `user_email`, `role_assigned`, `timestamp`
5. Supabase: `auth.users` já tracking via `created_at`, aproveitamos para audit

Plano de Testes:
- API: `POST /api/auth/invite` com role='csm' → 401 (csm não pode convidar)
- API: `POST /api/auth/invite` com role='admin', target_role='csm_senior' → sucesso; audit log criado
- E2E: TC-36-06: Admin convida novo CSM → email enviado; usuário no `/users` list com role='csm'
- E2E: TC-36-07: CSM tenta acessar `/users` → redirect

Sizing: **3 SP** (invite endpoint + email + audit)

---

#### Epic 37 — Admin Control Panel (26 SP)

*Otto Ops:* Centraliza TODOS os parâmetros hardcoded em tabela `app_settings`. Cada story = módulo diferente.

**Story 37.1 — Admin Panel Estrutura & Navegação (2 SP)**

ACs:
1. Rota `/admin` com `RequireRole role="admin"` gate
2. Nova tabela `app_settings`:
   ```sql
   (key TEXT PRIMARY KEY, value JSONB, updated_by UUID, updated_at TIMESTAMPTZ)
   ```
   - Upsert por key (idempotência)
   - RLS: apenas `admin/super_admin` podem UPDATE
3. Layout `/admin`:
   - Sidebar com 9 módulos:
     - 📊 Dashboard & Health
     - 🎟️ Suporte & SLA
     - ⭐ NPS & Surveys
     - 🚨 Alertas & Automações
     - 📚 Playbooks & CS Ops
     - 🤖 IA & RAG
     - 🔗 Integrações
     - 🔒 Segurança
     - 👥 Usuários & Roles
4. Cada módulo = sub-rota `/admin/[module]`
5. Header: "Admin Panel", ícone logout, user info
6. Toast de confirmação ao salvar + entrada em `audit_log` (evento `setting_updated`, `key`, `old_value`, `new_value`)
7. Dark mode support (usa tokens semânticos)

Plano de Testes:
- E2E: TC-37-01: Admin acessa `/admin` → 200, sidebar com 9 módulos
- E2E: TC-37-02: CSM tenta `/admin` → redirect `/dashboard`
- E2E: TC-37-03: Alterar setting → toast + `audit_log` registrado

Sizing: **2 SP** (layout + navigation + RLS)

---

**Story 37.2 — Dashboard & Health Settings (3 SP)**

*Rita Resgate:* Pesos das 4 dimensões de health + thresholds.

ACs:
1. Settings JSON:
   ```json
   {
     "health_weights": {
       "sla": 35,
       "nps": 30,
       "adoption": 25,
       "relationship": 10
     },
     "health_thresholds": {
       "healthy_min": 75,
       "at_risk_min": 50,
       "critical_max": 49
     },
     "health_recalc_schedule": "0 2 * * *",
     "health_recalc_enabled": true
   }
   ```
2. UI Card com 4 sliders (SLA, NPS, Adoption, Relationship) — validação: soma = 100
3. Input fields: thresholds (min/max)
4. Toggle: "Recalcular Health Diariamente?"
5. Cron schedule selector: "Às 2h, 6h, 10h, etc"
6. Button "Recalcular Agora" (roupa imediatamente `POST /api/cron/health-score-daily`)
7. Tooltip: "Alterações valem para novas avaliações; histórico não muda"

Plano de Testes:
- API: `GET /api/admin/settings/health` retorna weights + thresholds
- API: `PATCH /api/admin/settings/health` com weights somando != 100 → erro
- E2E: TC-37-04: Admin altera weights para SLA=40, NPS=35, Adoption=15, Relationship=10 → toast "Salvos"
- E2E: TC-37-05: Click "Recalcular Agora" → toast "Iniciado em background"
- E2E: TC-37-06: Schedule muda para "06:00" → `app_settings.health_recalc_schedule` = "0 6 * * *"

Sizing: **3 SP** (settings CRUD + cron control UI)

---

**Story 37.3 — Support & SLA Settings (3 SP)**

*Mário Mentor:* Parâmetros de SLA, auto-close, capacidade.

ACs:
1. Settings JSON:
   ```json
   {
     "sla_auto_close_hours": 72,
     "sla_similarity_threshold": 0.85,
     "sla_undo_window_hours": 24,
     "csm_ticket_capacity": 15,
     "support_escalation_hours": 4
   }
   ```
2. UI inputs numéricos com +/- buttons (UX melhor que digitar)
3. Range sliders onde apropriado (threshold 0-1.0)
4. Tooltip em cada setting explicando o comportamento
5. Setting `csm_ticket_capacity`: aplicado no cron de auto-assign, limita quantos tickets new um CSM recebe por dia

Plano de Testes:
- API: `PATCH /api/admin/settings/support` com `sla_auto_close_hours=48` → salvo
- API: `sla_similarity_threshold` fora [0, 1] → erro
- E2E: TC-37-07: Aumentar `csm_ticket_capacity` para 20 → cron auto-assign próximo usa 20

Sizing: **3 SP**

---

**Story 37.4 — NPS & Survey Settings (3 SP)**

*Alice Adoção:* Frequência NPS, segmentação promotor/detrator, dimensões.

ACs:
1. Settings JSON:
   ```json
   {
     "nps_promoter_threshold": 9,
     "nps_detractor_threshold": 6,
     "nps_min_responses_for_calc": 5,
     "nps_dimensions_enabled": ["product_usability", "support_quality", "value_for_money"],
     "nps_survey_min_days_between": 60
   }
   ```
2. UI Sliders:
   - Promoter threshold (0-10)
   - Detractor threshold (0-10)
   - Min responses (1-100)
3. Checkboxes: dimensões disponíveis (pre-defined list)
4. Input: dias mínimos entre surveys por conta
5. Preview ao lado: "Com essa config: promoters >= 9, detractors <= 6"

Plano de Testes:
- API: Mudar `nps_promoter_threshold=8` → respostas com score=8 agora são promoters
- E2E: TC-37-08: Config `nps_survey_min_days_between=90` → contas com survey há 80 dias não recebem nova pesquisa

Sizing: **3 SP**

---

**Story 37.5 — Alertas & Automações Settings (3 SP)**

*Mário Mentor:* Silence detection, health thresholds para alerts, check-in approval window.

ACs:
1. Settings JSON:
   ```json
   {
     "silence_days_enterprise": 14,
     "silence_days_midmarket": 21,
     "silence_days_smb": 30,
     "health_alert_threshold": 50,
     "auto_checkin_approval_hours": 4,
     "churn_risk_health_threshold": 40
   }
   ```
2. UI Sections:
   - "Thresholds de Silêncio" — 3 inputs (dias por segment)
   - "Alertas de Saúde" — threshold para playbook_trigger
   - "Check-in Automático" — approval window (horas)
   - "Risco de Churn" — health threshold
3. Validação: thresholds coerentes (silence_enterprise <= silence_midmarket <= silence_smb)

Plano de Testes:
- API: Mudar `silence_days_enterprise=21` → cron generate detecta silêncio com novo threshold
- E2E: TC-37-09: Config `auto_checkin_approval_hours=6` → queue items têm deadline NOW+6h

Sizing: **3 SP**

---

**Story 37.6 — Playbooks & CS Ops Settings (3 SP)**

*Arnaldo (Arquiteta):* Toggle playbook auto-trigger, adoption thresholds para playbooks.

ACs:
1. Settings JSON:
   ```json
   {
     "playbook_auto_trigger_enabled": true,
     "playbook_auto_trigger_health_threshold": 40,
     "adoption_alert_drop_percent": 20,
     "playbook_assignment_required": false
   }
   ```
2. UI Toggles + inputs
3. `playbook_auto_trigger_enabled=false` → desabilita trigger do health score (manual apenas)
4. `playbook_assignment_required=true` → força que CSM atribua playbook quando inicia (requer assigned_to)

Plano de Testes:
- API: `playbook_auto_trigger_enabled=false` → `trigger_auto_playbook_on_health_score` não dispara
- E2E: TC-37-10: Desabilitar auto-trigger → criar playbook manual na conta

Sizing: **3 SP**

---

**Story 37.7 — IA & RAG Settings (3 SP)**

*Paulo Pauta:* Modelo ativo, thresholds de confidence, TTL de cache.

ACs:
1. Settings JSON:
   ```json
   {
     "llm_model": "gemini-1.5-flash",
     "llm_confidence_threshold": 0.7,
     "rag_embedding_model": "text-embedding-004",
     "rag_cache_ttl_hours": 24,
     "rag_top_k_results": 5
   }
   ```
2. UI Select `llm_model`: dropdown (gemini-1.5-flash, gemini-2.0-pro, etc)
3. Slider `confidence_threshold` [0, 1]
4. Input `rag_top_k_results` [1, 20]
5. Input `rag_cache_ttl_hours` [1, 168]

Plano de Testes:
- API: Mudar `llm_model=gemini-2.0-pro` → Gemini calls usam novo modelo
- E2E: TC-37-11: Config `rag_confidence_threshold=0.9` → respostas com < 0.9 confidence não são mostradas

Sizing: **3 SP**

---

**Story 37.8 — Integrações Settings (3 SP)**

*Davi (Deploy):* SMTP, Slack, API keys.

ACs:
1. Settings JSON:
   ```json
   {
     "email_smtp_host": "smtp.office365.com",
     "email_smtp_port": 587,
     "email_from": "noreply@plannera.com",
     "slack_webhook_url": "https://hooks.slack.com/...",
     "api_rate_limit_per_minute": 100
   }
   ```
2. UI:
   - SMTP inputs (host, port, user—password MASCARADO)
   - Email "From" address
   - Slack webhook (input com "Test" button → envia msg de teste)
   - API rate limit slider
3. Button "Test SMTP Connection" → valida e-mail fake
4. Passwords NUNCA retornadas em GET, apenas "*****" exibido

Plano de Testes:
- API: `PATCH /api/admin/settings/integrations` com novo SMTP → próximo email usa nova config
- E2E: TC-37-12: Mudar Slack webhook → Test button → msg de teste em Slack

Sizing: **3 SP**

---

**Story 37.9 — Segurança Settings (3 SP)**

*Davi (Deploy):* Policies de senha, timeout sessão, whitelist domínios.

ACs:
1. Settings JSON:
   ```json
   {
     "password_min_length": 12,
     "password_require_special": true,
     "session_timeout_minutes": 480,
     "allowed_email_domains": ["plannera.com", "antigravity.com.br"],
     "mfa_required_for_admin": true
   }
   ```
2. UI:
   - Min length slider [8, 20]
   - Toggle: "Exigir caracteres especiais?"
   - Session timeout slider [30, 1440]
   - Domain whitelist: text area (1 por linha)
   - Toggle: "MFA obrigatório para Admin?"
3. Validação: email vs whitelist ao criar user

Plano de Testes:
- API: User com email fora whitelist → reject invite
- E2E: TC-37-13: Session timeout=30min → user inativo 31min → redirect login
- E2E: TC-37-14: MFA required=true → admin sem MFA → aviso "Configure MFA"

Sizing: **3 SP**

---

**Epic 37 Total: 26 SP** (stories 37.1-37.9)

---

#### Epic 38 — Date Intelligence & KPI Comparison (10 SP)

**Story 38.1 — Global Date Range Filters (5 SP)**

*Paulo Pauta:* Período global na navbar, aplicado a todos os dashboards.

ACs:
1. Componente `<DateRangePicker>` em `src/components/ui/DateRangePicker.tsx`
2. Opções preset:
   - Hoje
   - Últimos 7 dias
   - MTD (Month-to-Date)
   - Mês anterior
   - QTD (Quarter-to-Date)
   - YTD (Year-to-Date)
   - Ano anterior
   - Custom (date-picker)
3. Estado em URL: `?period=mtd` ou `?period=custom&from=2026-01-01&to=2026-03-31`
4. Persistência: localStorage se não na URL
5. Telas impactadas: Dashboard, NPS Hub, Suporte Dashboard, Esforço, CS Ops, VoC
6. Hook `useDateRange()`: `{ from: Date, to: Date, label: string, isCustom: boolean }`
7. Ícone no header navbar mostrando período selecionado

Plano de Testes:
- URL: `/dashboard?period=mtd` → ícone na navbar mostra "MTD"
- Unit: `useDateRange()` com período YTD retorna 2026-01-01 a hoje
- E2E: TC-38-01: Selecionar "7 dias" → Dashboard atualiza com dados últimos 7d
- E2E: TC-38-02: Custom range jan-mar → URL = `?period=custom&from=2026-01-01&to=2026-03-31`
- E2E: TC-38-03: Compartilhar URL com período → outro user vê mesmo período

Sizing: **5 SP** (component + URL state + hook + 5 telas integrando)

---

**Story 38.2 — KPI Comparison & Delta % (3 SP)**

*Pedro Prioriza:* Mostrar variação vs período equivalente anterior.

ACs:
1. Em cada KPI card (NPS Score, Health Médio, Tickets Abertos, MRR):
   - Valor atual
   - Delta % vs período anterior equivalente
   - Seta verde ↑ / vermelha ↓ / cinza → (para flat)
   - Cor: green/red/gray
2. Tooltip ao hover: "50 (Mês anterior: 48) = +4.2%"
3. Logic: Se período = "MTD", compara com "Mês anterior MTD" (ex: mai 1-8 vs abr 1-8)
4. Funciona em Dashboard, NPS Hub, Suporte, Esforço
5. "—" se dado anterior não existir (primeira vez)

Plano de Testes:
- Unit: Delta calc: (50-48)/48 * 100 = +4.2% ✅
- E2E: TC-38-04: MTD = 50, mês anterior = 48 → "↑ +4.2%" com cor green
- E2E: TC-38-05: MRR em declínio → "↓ -8.5%" com cor red
- E2E: TC-38-06: Mudar período para YTD → delta recalcula vs YTD anterior

Sizing: **3 SP** (delta logic + UI indicators + 4 telas)

---

**Story 38.3 — Exportação Contextual com Período (2 SP)**

*Davi (Deploy):* Filename + header incluem período, dados filtrados.

ACs:
1. Button "Export" em cada dashboard usa período selecionado
2. Filename inclui período: `nps-export-MTD-2026-05.xlsx` ou `dashboard-custom-20260101-20260331.xlsx`
3. Cabeçalho do arquivo: "Relatório NPS — Período: 01/05 a 08/05/2026 (MTD)"
4. Dados: filtrados para período selecionado (não todos os dados)
5. Footer: "Gerado em YYYY-MM-DD HH:mm"

Plano de Testes:
- E2E: TC-38-07: Exportar Dashboard em YTD → arquivo nomeado "dashboard-ytd-2026.xlsx"
- E2E: TC-38-08: Custom range → nome tem "custom-20260301-20260331.xlsx"
- Arquivo: cabeçalho tem datas corretas

Sizing: **2 SP** (export logic update)

---

**Epic 38 Total: 10 SP**

---

### Fase 2: Core CS Intelligence (124 SP)

#### Epic 16 — CS Command Center (15 SP)

**Story 16.1 — Home do CSM — Focar Agora / Manter Momentum / Oportunidade (5 SP)**

*Pedro Prioriza:* Algoritmo de priorização de carteira.

ACs:
1. Nova rota `/home` (ou `/dashboard` redesenhado como CSM home)
2. Algoritmo "Focar Agora":
   - Contas com `health_status='critical'` OU `health_score_v2 < 50`
   - Com alertas ativos não-resolvidos
   - Ordenadas por health ASC
   - Top 3 exibidas
   - Card: {nome, score, alerta principal, botão "Agir"}
3. Algoritmo "Manter Momentum":
   - Contas com `health_status='healthy'` (score >= 75)
   - Sem interação há > 7 dias
   - Próxima renovação <= 90 dias
   - Ordenadas por renewal_date ASC
   - Top 3 exibidas
   - Card: {nome, score, dias até renovação, botão "Agendar Call"}
4. Algoritmo "Oportunidade":
   - Contas com `expansion_signal` alert ativo
   - NPS >= 9 + MRR < mediana do segmento
   - Top 3
   - Card: {nome, NPS, potential MRR, botão "Explorar"}
5. Cron diário `POST /api/cron/home-priorities` calcula por CSM:
   - Insere em tabela `daily_home_priorities` (csm_id, account_id, category, reason, score, action_type, created_at)
   - Razão gerada: "Health crítico 38 + 1 alerta + Renovação em 22 dias"
6. UI: Cards com progressão cor (red → yellow → green)
7. Botões rápidos: "Visualizar Conta", "Iniciar Playbook", "Agendar", etc

Plano de Testes:
- Cron: Contas com health=45, alertas=2, renewal=20d aparecem em "Focar"
- Cron: Contas com health=85, sem interação 8d, renewal=60d aparecem em "Manter"
- E2E: TC-16-01: CSM acessa `/home` → vê "Focar Agora" com top 3 críticas
- E2E: TC-16-02: Click "Agendar Call" em "Manter Momentum" → abre modal de agendamento
- E2E: TC-16-03: Período = "MTD" → home mostra dados de maio apenas

Sizing: **5 SP** (algoritmo + cron + UI + 3 seções)

---

**Story 16.2 — Daily Briefing por IA (3 SP)**

*Mário Mentor:* IA sintetiza dia do CSM em 3 prioridades.

ACs:
1. Cron `POST /api/cron/daily-briefing` às 08:00 (configurável em Epic 37)
2. Para cada CSM:
   - Busca: alertas de ontem + hoje (não resolvidos)
   - Busca: renovações próximas 30d
   - Busca: tickets críticos abertos
   - Busca: check-ins pendentes
3. Prompt Gemini: "Você é um coach de CSM. Com essas prioridades, crie um briefing em 3 linhas para o CSM hoje"
4. Resposta: JSON `{ priority_1: { title, account, action, urgency }, priority_2: {...}, priority_3: {...} }`
5. Salva em `daily_briefings` (csm_id, date, priorities JSONB, dismissed_at)
6. Card fixo no topo da `/home` com as 3 prioridades + botão "Dispensar"
7. Não gera novo se já existe para o dia

Plano de Testes:
- Cron: 2 briefings gerados para 2 CSMs
- DB: Mesmo CSM rodado 2x no mesmo dia → apenas 1 briefing (idempotência)
- E2E: TC-16-04: Home carrega → card de briefing no topo com 3 prioridades
- E2E: TC-16-05: Click "Dispensar" → card desaparece, `dismissed_at` preenchido

Sizing: **3 SP** (cron + Gemini prompt + UI card + idempotência)

---

**Story 16.3 — Quick Actions Floating Button (2 SP)**

*Alice Adoção:* FAB com 4 ações rápidas (todas as páginas do dashboard).

ACs:
1. Floating action button (FAB) fixo bottom-right em todas as páginas do dashboard
2. 4 ações (com sub-menu ao click):
   - 📝 Registrar Interação (abre modal EsforcoClient)
   - 🎟️ Abrir Ticket (abre modal de novo ticket)
   - ⏱️ Lançar Horas (abre modal de time entry)
   - 💬 Perguntar ao RAG (abre modal "Perguntar")
3. FAB com ícone + label ao hover
4. Z-index alto (1000+) para flutuar sobre conteúdo
5. Responsivo: em mobile, ícones menores, sem label
6. Animação: pulse ao carregar página (incentiva uso)

Plano de Testes:
- E2E: TC-16-06: FAB visível em todas as 8 rotas do dashboard
- E2E: TC-16-07: Click "Registrar Interação" → abre modal, cliques internos funcionam
- E2E: TC-16-08: Mobile 375px → FAB reduzido, labels ocultos

Sizing: **2 SP** (FAB component + 4 modais integration)

---

**Story 16.4 — Meeting Prep Mode (5 SP)**

*Mário Mentor:* Auto-gera pauta para reuniões futuras.

ACs:
1. Ao criar/editar Interaction com `date` no futuro → auto-trigger de prep
2. Gemini gera (baseado em tipo):
   - **QBR:** Pauta: 1) Health overview, 2) Adoption trends, 3) Renewal outlook, 4) Expansion opp
   - **Check-in:** Pauta: 1) Blockers, 2) Recent wins, 3) Next steps
   - **EBR:** Pauta: 1) Business impact, 2) Strategic alignment, 3) ROI
   - **Onboarding:** Pauta: 1) Access setup, 2) Team intro, 3) First week plan
3. Também gera: 3 key questions + 3 attention points (gerados por Gemini via context)
4. Salva em `meeting_prep` (interaction_id, account_id, agenda JSONB, key_questions TEXT[], attention_points TEXT[], edited_agenda TEXT, created_at)
5. Botão "Ver Pauta" na timeline da conta para interações futuras
6. Modal com agenda editável inline (textarea)
7. Save edição → `edited_agenda` preenchido
8. Print button (gera PDF simples)

Plano de Testes:
- Criar interaction type='qbr', date='2026-05-15' → meeting_prep criado automaticamente
- E2E: TC-16-09: Timeline → interação futura → botão "Ver Pauta"
- E2E: TC-16-10: Modal abre com agenda gerada + 3 perguntas
- E2E: TC-16-11: Editar agenda, click "Salvar" → `edited_agenda` preenchido
- E2E: TC-16-12: Click "Imprimir" → PDF com logo Plannera + pauta

Sizing: **5 SP** (auto-trigger + Gemini prompt por tipo + UI + PDF export)

---

**Epic 16 Total: 15 SP**

---

#### Epic 17 — Renewal Cockpit (19 SP)

**Story 17.1 — Renewal Cockpit 360° (8 SP)**

*Pedro Prioriza:* Dashboard renovação com histórico 12m + NPS + Tickets + Adoção.

ACs:
1. Botão "Preparar Renovação" em `AccountHeader` quando `contract.renewal_date < 90 dias`
2. Abre modal full-screen (ou rota `/accounts/[id]/renewal`)
3. 6 Seções com lazy loading (skeleton while loading):
   - **Health 12m:** Área chart (recharts) — `health_scores.evaluated_at + manual_score` últimos 12 meses
     - Eixo X: tempo (mês)
     - Eixo Y: score 0-100
     - Hover: data + score exato + nota manual
   - **NPS Journey:** 4 últimas respostas com comentários full text (scrollable)
   - **Tickets Resumo:** Volume total, CSAT médio (%), TRT médio em dias
   - **Esforço:** Horas por tipo de atividade (bar chart)
   - **Adoção Delta:** % agora vs % há 6 meses (card verde/red conforme trend)
   - **Highlights:** 3 marcos gerados por Gemini (ex: "Atingiram 85% de adoção em março")
4. Cores semânticas (green=good, red=concern)
5. Card "Valor Contrato": MRR em destaque, com "Projetar Aumento %" button

Plano de Testes:
- E2E: TC-17-01: Renovação < 90d → botão "Preparar" visível
- E2E: TC-17-02: Click → modal abre, seções carregam uma a uma
- E2E: TC-17-03: Health chart mostra 12 pontos (1 por mês)
- E2E: TC-17-04: NPS com comentário comprido → text wraps, scrollável
- E2E: TC-17-05: Adoção 65% (era 70%) → "↓ -5%" em red

Sizing: **8 SP** (6 componentes + Gemini highlights + lazy loading)

---

**Story 17.2 — Renewal Brief PDF (5 SP)**

*Arnaldo (Arquiteta):* Gera PDF estruturado pra executivo.

ACs:
1. Button "Gerar PDF" no Renewal Cockpit
2. Backend (Next.js API): `POST /api/accounts/[id]/renewal/pdf`
   - Busca dados account + contract + health 12m + NPS + tickets + adoção
   - Prompt Gemini: "Crie brief executivo de renovação com essas dados. Output: structured text com seções"
   - Output: { capa, sumário_executivo, kpis, proposta_valor, recomendação, assinatura_campos }
3. Frontend: Recebe JSON, renderiza PDF via `jsPDF` ou `html2pdf` library
4. Layout PDF:
   - Página 1: Capa (logo Plannera, nome conta, data, CSM)
   - Página 2: Resumo executivo (3 parágrafos)
   - Página 3: KPIs (tabela: Health, NPS, CSAT, Adoção, MRR)
   - Página 4: Proposta de valor (bullet points)
   - Página 5: Próximos passos + assinatura (blank lines)
5. Download automático: `renewal-[account_name]-[data].pdf`
6. Também salva em `renewal_documents` table (para audit): account_id, csm_id, pdf_url_s3, generated_at

Plano de Testes:
- API: `POST /api/accounts/[id]/renewal/pdf` → retorna PDF buffer
- E2E: TC-17-06: Click "Gerar PDF" → download automático
- Arquivo: nome = "renewal-Acme-2026-05-08.pdf"
- Arquivo: capa com logo visível, layout 5 páginas

Sizing: **5 SP** (Gemini prompting + jsPDF rendering + S3 storage + download)

---

**Story 17.3 — Renewal Pipeline Dashboard (3 SP)**

*Pedro Prioriza:* Visão kanban de renovações por status.

ACs:
1. Nova seção no Dashboard Principal: "Pipeline de Renovações"
2. 3 colunas:
   - **Crítico** (<30d): red background
   - **Urgente** (30-60d): yellow background
   - **Planejamento** (60-90d): blue background
3. Cada coluna: card stack (scroll vertical se muitos)
4. Card por conta: {nome, renovação_date, health_score, NPS, botão "Preparar"}
5. Header col: nº de contas
6. Filter: por CSM (dropdown), por segment
7. Drill-down: click card → vai para Renewal Cockpit
8. Indicador prontidão: cor do card baseado em (health + NPS + CSAT):
   - Verde: health >= 75 E NPS >= 7 E CSAT >= 85
   - Amarelo: health >= 50 OU NPS >= 7
   - Vermelho: health < 50 E NPS < 7

Plano de Testes:
- E2E: TC-17-07: Dashboard carrega → 3 colunas com contas na coluna certa (por dias até renewal)
- E2E: TC-17-08: Filter CSM="João" → só contas dele aparecem
- E2E: TC-17-09: Card verde/amarelo/vermelho conforme health+NPS
- E2E: TC-17-10: Click card → vai para Renewal Cockpit

Sizing: **3 SP** (kanban UI + filter + prontidão calc)

---

**Story 17.4 — Negotiation History (3 SP)**

*Rita Resgate:* Histórico de negociações desconto.

ACs:
1. Nova tabela `contract_negotiation_history`:
   - id, contract_id, account_id, date, discount_offered_pct, discount_accepted_pct
   - main_objection (VARCHAR: "preço", "features", "suporte", "outro")
   - closing_argument (TEXT: tática que fechou)
   - counterpart_name, counterpart_role (ex: "CFO", "Procurement Manager")
   - outcome (renewal, lost, pending)
   - notes, created_by (UUID)
2. Formulário no `ContractDetailModal` → button "Registrar Negociação"
   - Modal com campos: date, offered_pct, accepted_pct, objection, closing_arg, counterpart (2 inputs), outcome
3. Exibição no Renewal Cockpit:
   - Seção "Histórico de Negociações" com timeline narrativa
   - Card por negociação: "(2026-04-15) Discount 15% → accepted 10% | Objection: preço | Outcome: renovado"
4. Cálculo trend: "Últimas 3 negociações: aceito 12%, 10%, 8% = downward trend"

Plano de Testes:
- API: `POST /api/contracts/[id]/negotiation-history` com dados → salvo
- E2E: TC-17-11: Click "Registrar Negociação" → modal, preencher, salvar
- E2E: TC-17-12: Renewal Cockpit mostra timeline com 3 negociações
- E2E: TC-17-13: Trend indicator: "↓ Desconto médio diminuindo" em red

Sizing: **3 SP** (table + form + timeline UI + trend calc)

---

**Epic 17 Total: 19 SP**

---

### Resumo Wave 5

| Épico | Escopo | SP |
|-------|--------|----| 
| 36 | User Roles & Permissions | 13 |
| 37 | Admin Control Panel | 26 |
| 38 | Date Intelligence | 10 |
| **Pré-Condições** | | **49 SP** |
| 16 | CS Command Center | 15 |
| 17 | Renewal Cockpit | 19 |
| **Core** | | **124 SP** |
| **Wave 5 Total** | | **173 SP** |

---

## 🌊 Wave 6 — Inteligência Operacional (140 SP)

### Épicos Planejados

#### Epic 18 — RAG Intelligence Modes (13 SP)
- 18.1: Multi-mode RAG (Summarize, Analyze, Recommend) — 4 SP
- 18.2: Custom Context Stitching (múltiplas fontes) — 3 SP
- 18.3: Confidence Scoring & Source Attribution — 3 SP
- 18.4: RAG Caching & Semantic Dedup — 3 SP

#### Epic 19 — Adoption Intelligence (21 SP)
- 19.1: Feature Adoption Heatmap — 4 SP
- 19.2: Blocker Detection & Auto-Remediation — 5 SP
- 19.3: Adoption Forecasting (ML) — 5 SP
- 19.4: Feature Dependency Graph — 4 SP
- 19.5: Adoption Playbooks (auto-triggered) — 3 SP

#### Epic 20 — Voice of Customer Intelligence (18 SP)
- 20.1: Sentiment Trend Analysis (NPS + Tickets) — 4 SP
- 20.2: Theme Clustering (auto-extract pain points) — 4 SP
- 20.3: Win/Loss Analysis for Churn — 4 SP
- 20.4: Customer Quote Mining — 3 SP
- 20.5: VOC Board (collaborative) — 3 SP

#### Epic 21 — CS Ops Excellence (20 SP)
- 21.1: Capacity Planning & Workload Balancing — 5 SP
- 21.2: Territory Rebalancer (por health, MRR, effort) — 5 SP
- 21.3: Burnout Risk Detection — 3 SP
- 21.4: CSM Performance Scorecard — 4 SP
- 21.5: Team Velocity Metrics — 3 SP

#### Epic 22 — Alertas Inteligentes Avançados (16 SP)
- 22.1: Predictive Churn Score — 5 SP
- 22.2: Anomaly Detection (desvios inesperados) — 4 SP
- 22.3: Sentiment-Triggered Alerts — 3 SP
- 22.4: Contract Risk Alerts — 2 SP
- 22.5: Adoption Cliff Alerts — 2 SP

#### Epic 23 — Playbook Excellence & Orchestration (15 SP)
- 23.2: Playbook Builder (no-code UI) — 5 SP
- 23.3: Smart Playbook Chaining — 3 SP
- 23.4: Playbook A/B Testing — 4 SP
- 23.5: Success Metrics per Playbook — 3 SP

**Wave 6 Total: 140 SP ≈ 14 sprints**

---

## 🌊 Wave 7 — Extensibilidade & Integrações (150 SP)

### Épicos Planejados

#### Epic 39 — Webhook & Event System (12 SP)
- 39.1: Event Bus (account.health_changed, playbook.completed, etc) — 4 SP
- 39.2: Webhook Management UI — 4 SP
- 39.3: Webhook Delivery & Retry Logic — 4 SP

#### Epic 40 — CRM Integrations (20 SP)
- 40.1: Salesforce Integration (read contracts, sync accounts) — 8 SP
- 40.2: HubSpot Integration — 8 SP
- 40.3: Pipedrive Integration — 4 SP

#### Epic 41 — Support Platform Integrations (16 SP)
- 41.1: Zendesk Integration (ticket sync, SLA) — 8 SP
- 41.2: Intercom Integration (user list, tickets) — 8 SP

#### Epic 42 — Business Intelligence Exports (18 SP)
- 42.1: Looker / BI Platform Connector — 8 SP
- 42.2: Tableau Connector — 8 SP
- 42.3: CSV / Parquet Export Pipeline — 2 SP

#### Epic 43 — Mobile App MVP (40 SP)
- 43.1: React Native App Structure — 8 SP
- 43.2: Account List & Search (mobile) — 8 SP
- 43.3: Health Overview (mobile) — 8 SP
- 43.4: Quick Actions (mobile) — 8 SP
- 43.5: Offline Mode — 8 SP

#### Epic 44 — Advanced Permissions & Data Governance (18 SP)
- 44.1: Row-Level Security Refinement (field-level) — 6 SP
- 44.2: Data Retention Policies — 4 SP
- 44.3: PII Masking & Compliance (LGPD/GDPR) — 8 SP

#### Epic 45 — Observability & Analytics (26 SP)
- 45.1: Product Analytics (Mixpanel / Amplitude integration) — 6 SP
- 45.2: Application Performance Monitoring (APM) — 8 SP
- 45.3: Error Tracking & Alerting (Sentry) — 6 SP
- 45.4: User Behavior Heatmaps — 6 SP

**Wave 7 Total: 150 SP ≈ 15 sprints**

---

## 📊 Roadmap Consolidado

| Wave | Escopo | SP | Tempo (@ 2 sprints/mês) |
|------|--------|----|----|
| 4 | Automação Proativa | 14 | 1.5 semanas ✅ |
| 5 | Fundação + Intelligence | 173 | 8.5 sprints (4.2 meses) |
| 6 | Inteligência Operacional | 140 | 7 sprints (3.5 meses) |
| 7 | Extensibilidade | 150 | 7.5 sprints (3.7 meses) |
| **Total** | | **477 SP** | **18 meses** |

---

## 🎯 Sequência de Execução Recomendada

### Wave 5 (0-4 meses):
```
FASE 1 (Semanas 1-3):
  Epic 36 (Roles) → Epic 37.1 (Admin Panel Struc) [paralelo]
  
FASE 2 (Semanas 4-7):
  Epic 37.2-37.9 (Admin módulos) [paralelo, 3-4 sprints]
  Epic 38 (Dates) [paralelo, 2 sprints]
  
FASE 3 (Semanas 8-13):
  Epic 16 (Command Center) → Epic 17 (Renewal Cockpit)
```

### Wave 6 (4-8 meses):
```
FASE 1:
  Epic 18 (RAG Modes)
  Epic 19 (Adoption) [paralelo]
  
FASE 2:
  Epic 20 (VOC) → Epic 22 (Alertas Avançados)
  Epic 21 (CS Ops) [paralelo]
  Epic 23 (Playbook Excellence)
```

### Wave 7 (8-18 meses):
```
FASE 1:
  Epic 39 (Webhooks) → Epic 40 (CRM Integrações)
  Epic 41 (Support) [paralelo]
  
FASE 2:
  Epic 42 (BI Exports) → Epic 43 (Mobile MVP)
  
FASE 3:
  Epic 44 (Permissions) + Epic 45 (Observability)
```

---

## 📋 Definição de Done — Todas as Ondas

**Para cada story:**
1. ✅ Critérios de Aceitação 100% implementados
2. ✅ TypeScript: `tsc --noEmit` passa
3. ✅ Testes E2E: todas as test cases passam (Playwright)
4. ✅ RLS: validado com 2 roles diferentes
5. ✅ Migrations: aplicadas ao staging + production tested
6. ✅ API: 200/201/204 respostas, error handling 400/401/403/500
7. ✅ UI: responsive (375px mobile, 1920px desktop)
8. ✅ Performance: Lighthouse >= 80, CLS < 0.1
9. ✅ README.md atualizado
10. ✅ Documentação de produto em `docs/product/` atualizada
11. ✅ Commit squashed, mensagem descritiva, PR merged

---

## 🚨 Riscos & Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|--------|-----------|
| Gemini API rate limits | M | H | Cache prompts, batch requests, fallback to simpler logic |
| Supabase scaling (RLS perf) | M | H | Query optimization, índices, connection pooling |
| Feature creep em Wave 5 | H | H | Strict AC gate, weekly refinement sync |
| Mobile app complexity (Wave 7) | H | M | Use existing React codebase, React Native shared logic |
| Data volume in Wave 6 (ML) | M | M | Incremental loading, background processing, archiving |

---

## 📅 Timeline de Marcos

- **2026-05-08:** Wave 4 ✅ Completa, Refinement W5-W7 ✅ Pronto
- **2026-05-22:** Wave 5 Phase 1 (Roles + Admin Struct) Completa
- **2026-07-30:** Wave 5 Completa
- **2026-11-30:** Wave 6 Completa  
- **2027-04-30:** Wave 7 Completa & v2.0 Launch

---

**Próximo Passo:** Aprovação de Wave 5 por Vinicius (PO), Arnaldo (Arquitetura), Davi (Deploy). Kickoff executado em paralelo — Epic 36 + Epic 37.1 começam imediatamente.
