# 10. CS Ops Audit — Estratégia de Auditoria de Performance do Time CS

**Otto Ops — CS Ops Auditor**

---

## Visão Geral

Com **Bloco 1 (Health Score v2, Segmentação, Playbooks)** consolidado e **Bloco 2 (Alertas Proativos, Success Plans)** no horizonte, Otto Ops implementa uma **auditoria estruturada** que mede se o time de CS está usando **efetivamente** os dados novos para gerar impacto operacional.

Este documento define as **3 métricas operacionais críticas** que Otto Ops monitora mensalmente para validar o ROI da plataforma no CS.

---

## Contexto: O Que Foi Entregue (Bloco 1)

### Health Score v2 (F2-02)
- **4 dimensões ponderadas:** SLA (35%), NPS (30%), Adoption (25%), Relationship (10%)
- **Cron diário:** `/api/cron/health-score-daily` recalcula para todas as contas ativas
- **Status classificado:** `healthy` (≥75), `at-risk` (50–74), `critical` (<50)

### Segmentação Dinâmica (F2-03)
- **Filtros + 4 segmentos salvos:** Em Risco, Enterprise, Renovação 90d, SMB
- **Busca semântica:** Permite identificar padrões complexos entre contas

### Playbooks MVP (F3-01)
- **Jornadas estruturadas:** Onboarding, Re-engagement, Renewal Prep
- **Gatilho manual (v1):** CSM clica para instanciar fluxo

---

## O Que Vem (Bloco 2)

### Alertas Proativos (F3-02)
- **6 tipos automáticos:** Churn Risk, Silent Customer, Renewal Upcoming, Adoption Anomaly, Expansion Signal, NPS Detractor
- **Cron diário:** `/api/cron/proactive-alerts` identifica contas em risco
- **Severidade:** Critical (vermelho), Warning (amarelo), Info (azul)

### Success Plans com Compartilhamento (F3-03)
- **Metas compartilhadas:** Link público para cliente acompanhar progresso
- **Tracking:** Status visual com % de conclusão

---

## As 3 Métricas Operacionais Críticas

### Métrica 1: **Health Score Accuracy Index (HSAI)**

**O que mede:** Se os CSMs estão usando o Health Score v2 para tomar decisões operacionais reais.

**Por que é crítica:**
- Health v2 foi investimento significativo (4 dimensões, cron diário)
- Se CSMs ignorarem scores e continuarem usando "intuição", valor é zero
- Score accuracy = confiança que o time tem no dado

**Fórmula:**
```
HSAI = (% contas com ação tomada em 7 dias após mudança de status) / (% total de mudanças de status)

Exemplo:
- 50 contas mudaram para "critical" no mês
- 35 dessas 50 receberam QBR agendado, playbook iniciado ou alerta resolvido em até 7 dias
- HSAI = 35/50 = 70%
```

**Target:** ≥ 80% (CSMs respondem a 80% das mudanças críticas em ≤ 7 dias)

**Como auditar:**
1. Query: Contas que transitaram para `health_status = 'critical'` este mês
2. Buscar no histórico: QBRs, playbooks iniciados, alerts resolvidos nos 7 dias seguintes
3. Calcular ratio

**SQL para auditoria:**
```sql
-- Contas que entraram em "critical" este mês
WITH critical_transitions AS (
  SELECT 
    a.id,
    a.health_status,
    a.health_classified_at,
    a.csm_owner_id
  FROM accounts a
  WHERE a.health_status = 'critical'
    AND a.health_classified_at >= DATE_TRUNC('month', NOW())
    AND a.health_classified_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
),
actions_taken AS (
  SELECT DISTINCT
    ct.id as account_id,
    COUNT(*) FILTER (WHERE i.date >= ct.health_classified_at AND i.date <= ct.health_classified_at + INTERVAL '7 days') as interactions_count,
    COUNT(*) FILTER (WHERE ap.created_at >= ct.health_classified_at AND ap.created_at <= ct.health_classified_at + INTERVAL '7 days') as alerts_resolved,
    COUNT(*) FILTER (WHERE acc_pb.created_at >= ct.health_classified_at AND acc_pb.created_at <= ct.health_classified_at + INTERVAL '7 days') as playbooks_started
  FROM critical_transitions ct
  LEFT JOIN interactions i ON i.account_id = ct.id
  LEFT JOIN proactive_alerts ap ON ap.account_id = ct.id AND ap.resolved_at IS NOT NULL
  LEFT JOIN account_playbooks acc_pb ON acc_pb.account_id = ct.id
  GROUP BY ct.id
)
SELECT 
  COUNT(*) as total_critical_transitions,
  COUNT(*) FILTER (WHERE interactions_count > 0 OR alerts_resolved > 0 OR playbooks_started > 0) as with_actions,
  ROUND(100.0 * COUNT(*) FILTER (WHERE interactions_count > 0 OR alerts_resolved > 0 OR playbooks_started > 0) / COUNT(*), 2) as hsai_percentage
FROM actions_taken;
```

**Indicadores de Alerta:**
- HSAI < 50%: CSMs não confiam no health score v2 → precisa retraining
- HSAI 50–70%: Engajamento parcial → falta clareza na recomendação de ação
- HSAI ≥ 80%: CSMs usam dados → incrementar complexidade de automação

**Ações Corretivas:**
- Sessão de Product-CS: Por que CSM não agiu? É falso positivo? Falta contexto?
- Retraining: Demonstrar casos de sucesso onde health score previu churn corretamente
- Automatização: Se HSAI > 85%, considerar gatilho automático de playbook por health_status

---

### Métrica 2: **Alert-to-Action Conversion Rate (AACR)**

**O que mede:** Se os alertas proativos (Bloco 2) estão convertendo em ações concretas ou sendo ignorados.

**Por que é crítica:**
- Alertas são caros (processamento diário, custo cognitivo ao CSM)
- Se 90% dos alertas são ignorados, motor de alertas é desperdício
- AACR valida eficácia do sistema de inteligência

**Fórmula:**
```
AACR = (Alertas com status "resolvido" em ≤ 48h) / (Total de alertas criados)

Exemplo:
- Sistema criou 120 alertas em "Critical" + "Warning" este mês
- 85 foram marcados "resolvido" via UI (botão "Resolver") em ≤ 48h
- AACR = 85/120 = 70.8%
```

**Target:** 
- Critical alerts: ≥ 85% (CSM deve responder rápido a risco de churn)
- Warning alerts: ≥ 70% (menos urgentes, mas visíveis)
- Info alerts: ≥ 50% (nice-to-have, CSM pode ignorar)

**Como auditar:**
1. Query: Alertas criados este mês por severidade
2. Filtrar: Aqueles com `resolved_at IS NOT NULL` e tempo até resolução ≤ 48h
3. Calcular ratio por severidade

**SQL para auditoria:**
```sql
SELECT 
  alert_severity,
  COUNT(*) as total_alerts,
  COUNT(*) FILTER (
    WHERE resolved_at IS NOT NULL 
      AND EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 <= 48
  ) as resolved_within_48h,
  ROUND(
    100.0 * COUNT(*) FILTER (
      WHERE resolved_at IS NOT NULL 
        AND EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600 <= 48
    ) / NULLIF(COUNT(*), 0),
    2
  ) as conversion_rate_percent,
  ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600), 1) as avg_hours_to_resolve
FROM proactive_alerts
WHERE created_at >= DATE_TRUNC('month', NOW())
  AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
GROUP BY alert_severity
ORDER BY alert_severity;
```

**Indicadores de Alerta:**
- AACR < 40%: Alertas sendo ignorados → possivelmente muito ruído ou irrelevantes
- AACR 40–70%: Engajamento parcial → revisar precisão dos triggers
- AACR ≥ 70%: CSMs respondendo bem → aumentar confiança no motor

**Breakdown por Tipo de Alerta (sub-métrica):**
```sql
SELECT 
  alert_type,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved,
  ROUND(100.0 * COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) / COUNT(*), 2) as resolution_rate,
  alert_severity
FROM proactive_alerts
WHERE created_at >= DATE_TRUNC('month', NOW())
GROUP BY alert_type, alert_severity
ORDER BY total DESC;
```

**Ações Corretivas:**
- Falsos positivos em "Renewal Upcoming": Revisar lógica de threshold (talvez 90d é muito cedo)
- "Silent Customer" ignorado: Talvez CSM já tem contexto → remover esse tipo
- "Churn Risk" 100% resolvido: Padrão ouro → replicar padrão em outros tipos

---

### Métrica 3: **Playbook Completion Rate (PCR)**

**O que mede:** Se os playbooks estruturados estão sendo completados ou abandonados.

**Por que é crítica:**
- Playbooks são jornadas de sucesso → completação = sucesso operacional
- Taxa baixa = CSMs não veem valor ou tarefas irrelevantes
- PCR indica qualidade do template de playbook

**Fórmula:**
```
PCR = (Playbooks com status "concluído" ou "finished") / (Total de playbooks instanciados)

Exemplo:
- CSMs iniciaram 40 playbooks este mês
- 28 foram marcados como "finished" (todas as tarefas completadas)
- 8 foram abandonados (nenhuma tarefa desde ativação > 14 dias)
- 4 estão em progresso (< 14 dias)
- PCR = 28 / 40 = 70%
```

**Target:** 
- v1 (Manual trigger): ≥ 75% (CSM escolhe relevância)
- v2 (Auto-trigger): ≥ 60% (pode incluir irrelevantes)

**Como auditar:**
1. Query: Playbooks criados este mês
2. Contar: Quantos têm todas as tarefas com `status = 'completed'`
3. Contar: Quantos foram abandonados (sem atividade > 14 dias)
4. Calcular ratio

**SQL para auditoria:**
```sql
WITH playbook_status AS (
  SELECT 
    ap.id,
    ap.account_id,
    ap.playbook_template_id,
    ap.created_at,
    pt.name as template_name,
    COUNT(apt.id) as total_tasks,
    COUNT(apt.id) FILTER (WHERE apt.status = 'completed') as completed_tasks,
    MAX(apt.updated_at) as last_activity,
    CASE 
      WHEN COUNT(apt.id) = COUNT(apt.id) FILTER (WHERE apt.status = 'completed') 
        THEN 'finished'
      WHEN NOW() - MAX(apt.updated_at) > INTERVAL '14 days' 
        THEN 'abandoned'
      ELSE 'in_progress'
    END as playbook_status
  FROM account_playbooks ap
  JOIN playbook_templates pt ON pt.id = ap.playbook_template_id
  LEFT JOIN account_playbook_tasks apt ON apt.account_playbook_id = ap.id
  WHERE ap.created_at >= DATE_TRUNC('month', NOW())
  GROUP BY ap.id, ap.account_id, ap.playbook_template_id, ap.created_at, pt.name
)
SELECT 
  template_name,
  COUNT(*) as total_playbooks,
  COUNT(*) FILTER (WHERE playbook_status = 'finished') as finished,
  COUNT(*) FILTER (WHERE playbook_status = 'abandoned') as abandoned,
  COUNT(*) FILTER (WHERE playbook_status = 'in_progress') as in_progress,
  ROUND(100.0 * COUNT(*) FILTER (WHERE playbook_status = 'finished') / COUNT(*), 2) as completion_rate
FROM playbook_status
GROUP BY template_name
ORDER BY total_playbooks DESC;
```

**Indicadores de Alerta:**
- PCR < 40%: Template pode ser inútil ou tarefas muito complexas
- PCR 40–70%: Bom engajamento, mas espaço para melhoria
- PCR ≥ 75%: Template é relevante e bem-estruturado

**Sub-métrica: Average Completion Time (ACT)**
```sql
SELECT 
  pt.name as template_name,
  COUNT(ap.id) as playbooks_completed,
  ROUND(AVG(EXTRACT(EPOCH FROM (MAX(apt.updated_at) - ap.created_at)) / 3600 / 24), 1) as avg_days_to_complete,
  MIN(EXTRACT(EPOCH FROM (MAX(apt.updated_at) - ap.created_at)) / 3600 / 24) as fastest_completion_days,
  MAX(EXTRACT(EPOCH FROM (MAX(apt.updated_at) - ap.created_at)) / 3600 / 24) as slowest_completion_days
FROM account_playbooks ap
JOIN playbook_templates pt ON pt.id = ap.playbook_template_id
LEFT JOIN account_playbook_tasks apt ON apt.account_playbook_id = ap.id
WHERE ap.created_at >= DATE_TRUNC('month', NOW())
  AND MAX(apt.updated_at) IS NOT NULL
GROUP BY pt.name;
```

**Ações Corretivas:**
- Se PCR < 40%: Remover ou redesenhar template
- Se ACT > 60 dias: Tarefas muito complexas → quebrar em etapas menores
- Se abandoned > 20%: Talvez ativação automática (Bloco 2 feature) ajudaria

---

## Painel de Auditoria Integrado

### Dashboard Otto Ops

**Localização:** `/cs-ops/audit` (rota futura)

**Layout 3-coluna:**

| Coluna 1 | Coluna 2 | Coluna 3 |
|----------|----------|----------|
| **HSAI Score** (0–100) com histórico 6 meses | **AACR by Severity** (cards coloridos por severity) | **PCR by Template** (tabela com taxas) |
| Verde: ≥80, Amarelo: 50–80, Vermelho: <50 | Click para drill-down de alertas específicos | Sort por completion rate |
| Recomendações automáticas por score | Gráfico de "Avg Hours to Resolve" | Trend vs mês anterior |
| Número de CSMs acima/abaixo da meta HSAI | Top/Bottom 3 alert types por efetividade | Playbook abandonment timeline |

**Filtros:**
- Período: Last 30 Days, Trimestre, Ano Customizado
- CSM: Mostrar métricas por indivíduo (com RLS)
- Segmento: Filter por Indústria, MRO, Varejo
- Alert Type: Drill-down por tipo específico

**Ações Disponíveis:**
- Botão "Exportar Relatório" → XLSX com todas as 3 métricas + breakdown
- Botão "Ajustar Targets" → Modal para mudar thresholds de AACR/PCR por equipe
- Botão "Retraining Needed" → Gera lista de CSMs abaixo da meta HSAI com casos de estudo

---

## Cronograma de Auditoria

### Mensal (Otto Ops — 1–3 do mês)

**Dia 1:**
- Rodar queries das 3 métricas para o mês anterior
- Compilar em relatório automático

**Dia 2–3:**
- Reunião com Head de CS + CSM leads
- Apresentar: HSAI, AACR, PCR vs targets
- Identificar CSMs abaixo da meta
- Planejar intervenções

### Trimestral (Otto Ops — 1º dia do mês + 2 meses)

**Análise profunda:**
- Tendências de 3 meses (estamos melhorando?)
- Correlação: HSAI alto → AACR alto → PCR alto? (validar relação causal)
- Impacto real: Contas que tiveram ação (HSAI) → renovaram? (medir ARR protegido)

### Semestral (Otto Ops — Junho, Dezembro)

**Strategic Review:**
- ROI do Bloco 1 + Bloco 2: Mudou o NPS? Reduziu churn?
- Feedback de CSMs: Que alertas são mais úteis? Que templates?
- Roadmap Bloco 3: Automação completa? Novos playbooks?

---

## Alertas Automáticos para Otto Ops

### Condições de Escalação

**Se HSAI < 50% por 2 meses seguidos:**
- Slack: "HSAI crítico — CSMs não confiando em health score v2. Retraining urgente."
- Ação: Agendar workshop

**Se AACR < 40% para alert type específico por 1 mês:**
- Slack: "Alert type `{type}` com AACR baixa — considerar remover ou revisar lógica."
- Ação: PM + CS lead analisa trigger

**Se PCR < 40% para template específico:**
- Slack: "Playbook template `{name}` com PCR crítica — marcar para redesenho."
- Ação: Remover ou redesenhar

---

## Roadmap Futuro (Pós-Bloco 2)

### Bloco 3: Automação Completa (Q4 2026)

**Health-Based Playbook Trigger:**
- Se `health_status = 'critical'` → Auto-inicia playbook "Churn Recovery"
- Se `health_status = 'at-risk'` + renovação < 60d → Auto-inicia "Renewal Prep"
- CSM pode skippar se contexto diferente

**Alert Auto-Remediation:**
- "Silent Customer" > 30 dias → Auto-enviar check-in email (template sugerido por Gemini)
- "Expansion Signal" → Auto-criar task no Playbook "Upsell Opportunity"

**Predictive Escalation:**
- Se HSAI está caindo por 3 meses → Auto-flag conta para Executive Review (H-CS)
- Se AACR < 50% → Auto-disable alert type para esse CSM (snooze 30 dias)

### Bloco 4: Success Metrics Unificadas (Q1 2027)

**KPIs Globais:**
- % de contas em "healthy" status (alvo: 70%)
- NPS médio do portfólio (alvo: +40)
- Churn anual (alvo: <8%)
- ARR por CSM (alvo: +15% vs ano anterior)

**Correlação:**
- Alto HSAI + Alto AACR + Alto PCR → Correlaciona com ARR protegido? NPS?
- Data science: Qual métrica prediz melhor que conta renovará?

---

## Implementação Técnica

### Tabelas Necessárias

As tabelas já existem:
- `accounts` → `health_status`, `health_classified_at`
- `proactive_alerts` → `alert_severity`, `created_at`, `resolved_at`
- `account_playbooks` + `account_playbook_tasks` → status de tarefas

### API Endpoints para Auditoria

**Otto Ops Dashboard query (futura):**
```
GET /api/cs-ops/audit?period=month&csm_id=optional&segment=optional
Response: {
  hsai: { score: 75, target: 80, trend: "down", breakdown: {...} },
  aacr: { score: 68, by_severity: {...}, by_type: {...} },
  pcr: { score: 82, by_template: [...], avg_completion_days: 14 },
  period: "2026-04",
  alerts: [ { condition: "...", action: "..." } ]
}
```

**CSM-level audit (futura):**
```
GET /api/cs-ops/audit/csm/[id]?period=month
Response: {
  csm_name: "João",
  accounts_managed: 12,
  hsai: 75,
  aacr: 82,
  pcr: 88,
  recommendations: [...]
}
```

### Views SQL para Auditoria (Criadas em Bloco 2)

```sql
-- View: hsai_monthly (recalculada diariamente via cron)
CREATE OR REPLACE VIEW hsai_monthly AS
WITH critical_transitions AS (...)
SELECT ... (fórmula HSAI)

-- View: aacr_summary (atualizada com cada alert criado/resolvido)
CREATE OR REPLACE VIEW aacr_summary AS
SELECT alert_severity, conversion_rate FROM proactive_alerts ...

-- View: pcr_summary (atualizada com cada playbook_task update)
CREATE OR REPLACE VIEW pcr_summary AS
SELECT template_name, completion_rate FROM account_playbooks ...
```

---

## Conclusão

Com essas **3 métricas operacionais**, Otto Ops consegue:

1. **HSAI** → Medir confiança no dado (Health Score v2)
2. **AACR** → Medir eficácia do motor de alertas (Bloco 2)
3. **PCR** → Medir relevância dos playbooks (Bloco 1)

Juntas, as 3 métricas formam um **tripé de validação** que responde:
- "O time está usando os dados que construímos?"
- "Os dados estão corretos e úteis?"
- "Qual é o impacto real no negócio?"

**Target Integrado (Todos no Verde):**
- HSAI ≥ 80% (CSMs confiam e agem)
- AACR ≥ 70% (Alertas convertem em ação)
- PCR ≥ 75% (Playbooks são relevantes)

Se as 3 métricas estão no verde, o Bloco 1 + Bloco 2 estão gerando valor real. Se alguma está vermelha, há um gargalo claro para corrigir.
