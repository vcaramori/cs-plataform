# Análise Comparativa: Roadmap F1-F4 vs Épicos Existentes

**Data:** 2026-05-04  
**Propósito:** Mapear confluências, gaps e decisões de arquitetura entre o roadmap planejado (F1-F4) e o que já foi implementado (Épicos 1-10)

---

## 1. VISÃO GERAL DE STATUS

### Épicos Existentes (Implementação Atual)

| Epic | Módulo | Status | Telas | Features Principais |
|------|--------|--------|-------|---------------------|
| 1 | Dashboard | ✅ Done | `/dashboard` | KPI strip, accounts table |
| 2 | Accounts | ✅ Done | `/accounts`, `/accounts/[id]` | LOGO management, contracts, health score, timeline |
| 3 | NPS Hub | ✅ Done | `/nps`, `/nps/programs` | Dashboard NPS, surveys, segmentação |
| 4 | **Suporte** | ✅ Done | `/suporte`, `/suporte/[id]`, `/suporte/dashboard`, `/suporte/sla` | **Ticket lifecycle, SLA management, AI reply review, CSAT, notificações** |
| 5 | Perguntar (RAG) | ✅ Done | `/perguntar` | Assistente conversacional baseado em dados da conta |
| 6 | Esforço | ✅ Done | `/esforco` | Time tracking, horas, rentabilidade |
| 7 | Settings | ✅ Done | `/settings` | SLA policies, business hours, configurações globais |
| 8 | Usuários/Auth | ✅ Done | `/login`, `/users` | JWT auth, team management |
| 9 | **Playbooks** | 🔄 In Progress | `/playbooks` | Jornadas, templates, automação, health score triggers |
| 10 | **Risk Prediction** | 🔄 In Progress | (via dashboard) | IA preditiva de churn, sentiment analysis |

### Roadmap Planejado (F1-F4)

| Fase | Foco | Status | Cards | Descrição |
|------|------|--------|-------|-----------|
| **F1** | Suporte World-Class | 🔴 Não iniciado | 20 cards | Views salvas, filtros compostos, bulk actions, busca semântica, automação de reopen/close, merge, detecção de duplicata, urgency scoring, atribuição, SLA escalation |
| **F2** | Customer 360 | 🔴 Não iniciado | 3 cards | Timeline unificada, health score ponderado, segmentação dinâmica |
| **F3** | Playbooks + Alertas | 🟡 Parcialmente iniciado | 3 cards | Playbooks MVP, motor de alertas, success plans (mas Epic 9 já começou playbooks) |
| **F4** | Analytics + Integrações | 🔴 Não iniciado | 6 cards | Portfolio analytics, renewal management, HubSpot, billing, telemetria, Slack |

---

## 2. MAPEAMENTO DETALHADO: FEATURES PLANEJADAS vs IMPLEMENTADAS

### 2.1 Módulo Suporte (Epic 4 vs F1 Views Salvas + F1 Automations)

**Status:** Epic 4 ✅ COMPLETO | F1 Views Salvas 🔴 NÃO INICIADO | F1 Automations 🔴 NÃO INICIADO

| Feature | F1 Card | Epic 4 | Status | Gap |
|---------|---------|--------|--------|-----|
| **Lista de tickets com filtros** | F1-01 (Views Salvas) | ✅ Implementado | Filtros básicos existem | ❌ **Faltam: Views Salvas, Filtros Compostos** |
| **Filtros Compostos (AND/OR)** | F1-02 | ❌ | Filtros simples apenas | ❌ FilterBuilder não existe |
| **Bulk Actions** | F1-03 | ❌ | Ações por linha | ❌ Sem seleção em massa |
| **Busca Semântica** | F1-04 | ❌ | Busca por texto | ❌ Sem embeddings |
| **Preview Inline** | F1-05 | ✅ Existe | Side panel detail view | ✅ Parcialmente (não é inline hover) |
| **Detecção de Colisão** | F1-06 | ❌ | N/A | ❌ Não implementado |
| **Urgency Scoring** | F1-07 | ❌ | N/A | ❌ Não implementado |
| **Reopen Automático** | F1-08 | ❌ | Manual apenas | ❌ Sem regra automática |
| **Auto-close por Prioridade** | F1-09 | ❌ | Manual apenas | ❌ Sem cron job |
| **Merge de Tickets** | F1-10 | ❌ | N/A | ❌ Não implementado |
| **Detecção de Duplicata (IA)** | F1-11 | ❌ | N/A | ❌ Não implementado |
| **Reopen Manual com Justificativa** | F1-12 | ✅ Existe | Reopen com nota possível | ✅ Parcialmente |
| **Formulário Público/Webhook** | F1-13 | ❌ | Não documentado | ❌ Não implementado |
| **Fila com Capacidade** | F1-14 | ❌ | N/A | ❌ Não implementado |
| **Atribuição Automática** | F1-15 | ❌ | Manual apenas | ❌ Não implementado |
| **Escalonamento por SLA** | F1-16 | ✅ Existe | SLA breach notificações | ✅ Parcialmente (notificações existem) |
| **RAG "O que Responder?"** | F1-17 | ✅ Existe | `/perguntar` (Epic 5) | ✅ Existe (em outro módulo) |
| **Categorização Automática** | F1-18 | ❌ | Categorias manuais | ❌ Sem IA |
| **Resumo do Ticket (IA)** | F1-19 | ❌ | N/A | ❌ Não implementado |
| **Sentiment Trend** | F1-20 | ❌ | N/A | ❌ Não implementado |

**Resumo F1 (Suporte):**
- 🟢 5 features parcialmente implementadas (Preview, Reopen Manual, SLA Escalation, RAG, Help)
- 🔴 15 features completamente faltando
- **Impacto:** F1 não é redundante — traz 15 novas features ao Epic 4 existente

---

### 2.2 Módulo Accounts / Health Score (Epic 2 vs F2 Health Score)

**Status:** Epic 2 ✅ COMPLETO | F2 Health Score 🔴 NÃO INICIADO

| Feature | F2 Card | Epic 2 | Status | Gap |
|---------|---------|--------|--------|-----|
| **Timeline Unificada** | F2-01 | ✅ Existe | Account detail + timeline | ✅ Parcialmente (não é multi-source ainda) |
| **Health Score Simples** | Epic 2 | ✅ Existe | 0-100 básico | ✅ Implementado |
| **Health Score Ponderado** | F2-02 | ❌ | Health Score simples | ❌ Sem ponderação de 5 dimensões |
| **Segmentação Dinâmica** | F2-03 | ❌ | N/A | ❌ Sem FilterBuilder reutilizado |

**Resumo F2 (Accounts):**
- 🟢 1 feature parcialmente implementada (timeline)
- 🔴 2 features completamente faltando
- **Impacto:** F2 estende Epic 2 com health score avançado

---

### 2.3 Módulo Playbooks (Epic 9 vs F3 Playbooks)

**Status:** Epic 9 🔄 IN PROGRESS | F3-01 Playbooks 🔄 IN PROGRESS

| Feature | F3 Card | Epic 9 | Status | Gap |
|---------|---------|--------|--------|-----|
| **Playbook Templates** | F3-01 | ✅ Schema criado | Tabelas 017_playbooks_automation.sql | ✅ Migration existe |
| **Playbook Tasks** | F3-01 | ✅ Schema criado | `playbook_tasks` table | ✅ Estrutura existe |
| **Instância de Playbook** | F3-01 | ✅ Schema criado | `account_playbooks` table | ✅ Estrutura existe |
| **Automação por Health Score** | F3-01 | ✅ Schema + Trigger | Função `fn_trigger_health_score_playbook()` | ✅ Trigger criado |
| **Motor de Alertas Proativos** | F3-02 | ❌ | Não documentado | ❌ Faltam alertas dinâmicas |
| **Success Plans** | F3-03 | ❌ | N/A | ❌ Não iniciado |

**Resumo F3 (Playbooks):**
- 🟢 4 features com schema já criado (migrations 017)
- 🔴 2 features faltando (alertas dinâmicas, success plans)
- **Impacto:** F3-01 já tem fundação; faltam componentes UI e orquestração

---

### 2.4 Módulo Risk Prediction (Epic 10 vs F3 Alertas + F2 Health)

**Status:** Epic 10 🔄 IN PROGRESS | F3-02 Alertas 🔴 NÃO INICIADO

| Feature | Card | Epic 10 | Status | Gap |
|---------|------|---------|--------|-----|
| **Risk Assessment Model** | F3-02 | ✅ Schema criado | `account_risk_assessments` (018_predictive_risk.sql) | ✅ Table exists |
| **Sentiment Analysis** | F3-02 | ✅ Schema criado | Sentiment label em risk_assessments | ✅ Schema exists |
| **AI Reasoning** | F3-02 | ✅ Schema criado | `ai_reasoning` field | ✅ Schema exists |
| **Proactive Alerts (Churn, Silent, Renewal, etc)** | F3-02 | ❌ | Não documentado | ❌ Alertas ainda não orquestradas |

**Resumo Epic 10/F3-02:**
- 🟢 3 features com schema
- 🔴 1 feature (orquestração de alertas) faltando

---

### 2.5 Módulo Analytics + Integrações (F4)

**Status:** 🔴 NÃO INICIADO

| Feature | F4 Card | Implementação | Status | Gap |
|---------|---------|--------------|--------|-----|
| **Portfolio Analytics** | F4-01 | N/A | ❌ | ❌ Não iniciado |
| **Renewal Management** | F4-02 | N/A | ❌ | ❌ Não iniciado |
| **HubSpot Integration** | F4-03 | N/A | ❌ | ❌ Não iniciado |
| **Billing Integration** | F4-04 | N/A | ❌ | ❌ Não iniciado |
| **Product Telemetry** | F4-05 | N/A | ❌ | ❌ Não iniciado |
| **Slack Integration** | F4-06 | N/A | ❌ | ❌ Não iniciado |

**Resumo F4:**
- 🔴 6 features completamente não iniciadas

---

## 3. ANÁLISE DE TABELAS: CONFLITOS vs CONFLUÊNCIAS

### Migrations Planejadas (meu 008_phase1_foundation.sql)

```
saved_views
├─ user_id, account_id, filters jsonb, visibility
├─ UNIQUE(user_id, name, entity_type)
└─ RLS policies

csm_queue_config
├─ user_id, max_concurrent_tickets
└─ RLS policies

ticket_merge_history
├─ primary_ticket_id, secondary_ticket_id
├─ merged_by, merged_at
└─ Índices para performance

ticket_similarity_candidates
├─ ticket_a_id, ticket_b_id, similarity_score
├─ status (pending_review, confirmed_duplicate, dismissed)
└─ reviewed_by, reviewed_at

ticket_events
├─ ticket_id, event_type, payload jsonb
├─ triggered_by, created_at
└─ Índices por type, ticket, created_at

timeline_events
├─ account_id, event_type, source_table, source_id
├─ occurred_at, metadata jsonb
└─ RLS policies + Índices
```

### Migrations Existentes (relevantes)

```
012_support_sla.sql
├─ sla_policies, sla_events
└─ SLA statuses, compliance tracking

014_support_messaging_refactor.sql
├─ Refatorou structure de mensagens
└─ Support pipeline

015_support_automation_v2.sql
├─ Automação v2 de tickets
└─ (conteúdo não lido)

017_playbooks_automation.sql
├─ playbook_templates, playbook_tasks
├─ account_playbooks, account_playbook_tasks
└─ fn_trigger_health_score_playbook() trigger

018_predictive_risk.sql
├─ account_risk_assessments
├─ risk_score, sentiment_label, ai_reasoning
└─ RLS policies
```

### ⚠️ CONFLITOS IDENTIFICADOS

| Tabela | Meu Plan | Existente | Conflito | Resolução |
|--------|----------|-----------|----------|-----------|
| `saved_views` | ✅ Plano 008 | ❌ Não existe | ✅ Sem conflito | Criar conforme planejado |
| `ticket_events` | ✅ Plano 008 | ✅ Possível via sla_events | ⚠️ Duplicação? | **REVER:** Verificar se sla_events já cobre |
| `timeline_events` | ✅ Plano 008 | ❌ Não existe | ✅ Sem conflito | Criar conforme planejado |
| `csm_queue_config` | ✅ Plano 008 | ❌ Não existe | ✅ Sem conflito | Criar conforme planejado |
| `ticket_merge_history` | ✅ Plano 008 | ❌ Não existe | ✅ Sem conflito | Criar conforme planejado |
| `ticket_similarity_candidates` | ✅ Plano 008 | ❌ Não existe | ✅ Sem conflito | Criar conforme planejado |

---

## 4. MAPA DE PRIORIZAÇÃO: O QUE FAZER PRIMEIRO?

### Opção A: Continuar com F1-F4 (Meu Roadmap)

**Pros:**
- ✅ Bem documentado com 35 cards
- ✅ Sequência clara de dependências
- ✅ Estende Épicos 1-8 de forma orgânica

**Cons:**
- ❌ Conflita com Epic 9 (Playbooks) que já começou
- ❌ 18 migrations diferentes + estrutura dupla de rastreamento (Épicos + F1-F4)
- ❌ Playbooks estão avançados em Epic 9, refazer em F3 é retrabalho

---

### Opção B: Consolidar em Épicos 1-10+ (Sistema Existente)

**Pros:**
- ✅ Um único sistema de rastreamento
- ✅ Aproveita momentum de Epic 9-10
- ✅ Menos redundância

**Cons:**
- ❌ Precisa remapear os 35 cards de F1-F4 em sub-stories de Épicos
- ❌ Épicos são grandes; F1-F4 são faseados e menores

---

### Opção C: Híbrido (Meu Recomendado)

**Estrutura:**
- Manter **Épicos 1-10** como sistema de rastreamento principal
- Usar **F1-F4 como "sequência de implementação"** dentro dos Épicos
- Mapear: F1 features → Epic 4 enhancement, F2 features → Epic 2 enhancement, etc

**Timeline:**
1. ✅ Epic 1-8: Done
2. 🔄 Epic 9 (Playbooks) + Epic 10 (Risk): Continuar conforme iniciado
3. 🔴 F1 Enhancement (Suporte 2.0): Views Salvas + Filtros + Bulk Actions + ... (15 features faltando)
4. 🔴 F2 Enhancement (Accounts 2.0): Health Ponderado + Segmentação
5. 🟡 F3 Completion: Acabar UI/orquestração de Playbooks e Alertas
6. 🔴 F4 (Novo): Analytics + Integrações

---

## 5. RECOMENDAÇÃO FINAL

### Status Real da Plataforma

```
✅ Fundação (Épicos 1-8)
   └─ Dashboard, Accounts, NPS, Suporte (básico), RAG, Esforço, Settings, Auth
   
🔄 Em desenvolvimento (Épicos 9-10)
   └─ Playbooks (schema ok, UI em progresso), Risk Prediction (schema ok)
   
🔴 Não iniciado (minhas F1-F4 features)
   └─ F1: 15 features de Suporte avançado
   └─ F2: 2 features de Accounts avançado
   └─ F3: 2 features de Playbooks/Alertas (1 partially initiated)
   └─ F4: 6 features Analytics + Integrações
```

### Próximo Passo

**Você precisa escolher:**

1. **Descartar meu roadmap F1-F4?** → Continuar apenas com Épicos
2. **Manter meu roadmap F1-F4?** → Proceder com migrations + 31 cards (mas terá duplicação com Épicos 9-10)
3. **Híbrido: Remapear F1-F4 como sub-stories de Épicos?** → Mais limpo, mas trabalho de reorganização

---

## 6. QUESTIONÁRIO PARA VOCÊ

Preciso que você responda:

1. **Os Épicos 1-8 estão realmente 100% DONE?** (ou há work in progress não-commitado?)
2. **Épicos 9-10 (Playbooks, Risk) devem continuar como estão?** Ou você quer parar e refatorar em cima de F3-F4?
3. **F1-F4 features (Views Salvas, Bulk Actions, etc) são prioritárias agora?** Ou devem esperar Epic 9-10 ficar ready?
4. **Qual é o seu timeline?** (precisa de deadline para F1/F2/F3/F4?)

---

**Aguardando sua clareza sobre prioridades antes de executar qualquer migration ou criar os 31 cards restantes.**
