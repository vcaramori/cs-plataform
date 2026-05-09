# 🎯 REFINEMENT MEETING TRANSCRIPT — Wave 5 Final Push + Wave 6-7 Integration

**Data:** 2026-05-09  
**Duração:** 3 horas (09:00 — 12:00)  
**Participantes:** 
- **Executivos:** Paulo Pauta, Pedro Prioriza
- **Arquitetura:** Arnaldo (Arquiteto)
- **Design:** Mariana
- **QA:** Bruno
- **Dev:** Vinicius (Dev Lead)
- **CS Agents (8 especialistas):** cs-manager, risk-watchdog, expansion-scout, adoption-coach, renewal-strategist, qbr-architect, voc-analyst, cs-ops-auditor

**Facilitador:** Vinicius (Dev Lead)

---

## 📍 FASE 1 — ABERTURA (09:00-09:15)

**Paulo Pauta:** "Pessoal, o objetivo de hoje é finalizarmos Wave 5 com qualidade e decidirmos como incorporar os 40-70% de Wave 6-7 que foram desenvolvidos paralelamente. Vinicius descobriu que outro time já fez boa parte da infra de RAG, adoption risk, predictive churn. Precisamos decidir: aproveitamos ou refazemos?"

**Pedro Prioriza:** "Correto. Temos três opções documentadas — Incorporate, Cherry-Pick, Fresh Start. Cada uma tem trade-off de tempo vs qualidade. Hoje a gente decide, depois o time de produto (eu + Mariana) refina as histórias, e aí dev começa segunda-feira."

**Vinicius:** "Exato. Tenho o estado atual aqui:
- Wave 5 Core: 32% done (81/254 SP)
- Epic 17 (Renewal): esqueleto + APIs helpers 100% — só falta UI
- Epic 20 (VoC): cron + board skeleton — só falta Recharts/Visx
- Epic 23 (Playbook): canvas skeleton — só falta ReactFlow
- Wave 6-7: src/lib/rag, src/lib/adoption, src/lib/ai existem com 70%/40%/30% respectivamente
- Migrations: 29/29 aplicadas

Vamos revisar tudo antes de decidir."

---

## 📊 FASE 2 — REVISÃO TÉCNICA STATE OF THE UNION (09:15-09:45)

### Dev Lead Resumo:
**Vinicius:** "Wave 5 Core (Epics 16, 17, 36-38) está sólido. Épicos completos:
- Epic 16 (Command Center): home, briefing, priorities, FAB — 100% funcional, testado
- Epic 36-38 (Pré-condições): RBAC, admin panel, date intelligence — 100%
- Epic 17 (Renewal): routing + APIs prontos, falta UI das 6 seções
- Epic 20 (VoC): cron analyzer pronto, falta charting
- Epic 23 (Playbook): canvas structure pronto, falta drag-drop

O que está quebrado ou em risco:
- Nenhuma integração de autenticação entre Wave 5 e CS Agents Pack
- Paulo Pauta ainda não validou data contracts
- RLS não foi load-testado em 10K accounts"

### Arnaldo (Arquiteto):
"RLS concern é meu. Temos políticas em: renewal_documents, contract_negotiation_history, health_scores. Com 10K accounts × 100 CSMs × queries complexas, p95 latency pode explodir se não indexarmos certo. Já criei plano de índices pra semana 1, mas precisa ser antes de dev tocar em nada produtivo."

**Pedro:** "Concordo. Bruno, vocês testaram RLS em staging?"

**Bruno (QA):** "Não. Temos setup de 3 usuários (csm, csm_senior, admin) mas não testamos performance. Proposta: Week 1 a gente faz load test com 5K accounts, mede p95/p99 latency, e aí vemos se precisa mais índices."

**Vinicius:** "OK. Arnaldo + Bruno aligned? Semana 1, antes de Epic 17 full implementation?"

**Arnaldo:** "Sim. Crio plano de índices terça, Bruno testa quarta."

---

## 🤖 FASE 3 — CS AGENTS INTEGRATION — CRITICAL (09:45-10:30)

### Paulo Pauta:
"Pessoal, tenho 8 agentes que vão consumir output de Wave 5. Se os dados não chegarem no formato certo, os agentes quebram. Vou apresentar cada um e o que precisa de Wave 5."

**cs-manager (Operações CSM):**
- Consome: Epic 16 `daily-priorities` output
- Precisa: `{ priorities: [{ rank: 1, type: 'renewal'|'risk'|'adoption', account_id, reason, due_date }] }`
- Status: ⚠️ Wave 5 retorna `{ priority_1: "...", priority_2: "...", priority_3: "..." }` (FORMATO ERRADO)

**risk-watchdog (Detecção de Risco):**
- Consome: Epic 22 (Predictive Risk) — score de churn 0-100
- Precisa: `{ account_id, risk_score, risk_factors: ["fator1", "fator2"], recommended_action }`
- Status: ❌ Epic 22 ainda não foi feito (Wave 6)

**renewal-strategist (Renovação):**
- Consome: Epic 17 (Renewal Cockpit) — health, NPS, contract info
- Precisa: `{ account_id, health_trend, nps_last_4, contract_renewal_date, renewal_readiness: "green"|"yellow"|"red", negotiation_history }`
- Status: ✅ Epic 17 APIs existem, formato OK, só falta UI

**adoption-coach (Adoção):**
- Consome: Epic 19 (Adoption Intelligence) — feature adoption, blockers
- Precisa: `{ account_id, adoption_score, features_at_risk: [{feature, drop_pct, since}], recommended_playbook_id }`
- Status: ❌ Epic 19 UI não existe (só API esboço)

**voc-analyst (Voice of Customer):**
- Consome: Epic 20 (VoC Board) — sentiment, themes, quotes
- Precisa: `{ account_id, sentiment_trend_7d, top_pains: [{pain, frequency}], top_praises: [{praise, frequency}], latest_quotes }`
- Status: ✅ Epic 20 está 80% pronto, só falta Recharts

**expansion-scout (Expansion):**
- Consome: Product Analytics (não Wave 5) — usage, adoption, expansion indicators
- Precisa: Não afetado por Wave 5 core
- Status: ✅ OK, independente

**qbr-architect (QBR):**
- Consome: Epic 21 (CS Ops Excellence) — scorecard, metrics
- Precisa: `{ csm_id, accounts_managed, avg_health, avg_nps, capacity_utilization, scorecard: {health_escalations, csat, trt} }`
- Status: ❌ Epic 21 não foi feito (Wave 6)

**cs-ops-auditor (Operações):**
- Consome: Epic 20 + 21 — VoC + CS Ops
- Precisa: Combinação de VoC + QBR data
- Status: ⚠️ Parcial (só VoC)

**Paulo:** "Resumindo: cs-manager precisa de ajuste de schema em Epic 16. renewal-strategist está OK. voc-analyst está 80% OK. As outras precisam de Epic 19, 21, 22 que estão em Wave 6. Pergunta crítica: **vocês vão fazer Epics 19, 21, 22 esta onda ou deixam para Wave 6?**"

**Pedro:** "Ótima pergunta. Esse é o blocker de scope. Vinicius, quanto tempo adicional se incluirmos 19, 21, 22 nesta onda?"

**Vinicius:** "Epics 19, 21, 22 são 57 SP. Wave 5 Core é 81 SP. Então teríamos 138 SP no total. Em 5 sprints de 20 SP/sprint, vai dar apertado. Timeline original era 5 sprints (até 30 de junho). Se incluir, seria 7 sprints (até 14 de julho). Risk de qualidade aumenta."

**Arnaldo:** "Meu voto: Leave 19, 21, 22 para Wave 6. Razão: Epic 18 (RAG core) é pré-requisito pra 19 e 22 funcionar bem. Se tentamos fazer tudo na mesma onda, a qualidade de RAG sofre, e aí tudo depois fica instável."

**Mariana (Design):** "Concordo. Wave 5 mockups estão locked. Se agora incluir 3 épicos adicionais, design precisa refazer mockups. Não dá em 1 semana."

**Bruno (QA):** "Sim. 138 SP = mais casos de teste. RLS audit vai ser gigante. Proposta: Wave 5 é 81 SP + Epic 18 RAG core (4 SP) + Epic 20 VoC full (5 SP) = 90 SP, dá 5 sprints confortável. Epics 19, 21, 22 vão para Wave 6 que começa na sequência."

**Paulo:** "Hmm, mas aí os agentes risk-watchdog, adoption-coach, qbr-architect ficam sem input em Wave 5. Passo eles para Wave 6?"

**Pedro:** "Verdade. Vinicius, e se fizermos uma abordagem híbrida? Wave 5 = Core + API stubs para 19/21/22, Wave 6 = implementation. Aí os agentes conseguem pelo menos chamar os endpoints, mesmo que retornem dados dummy agora."

**Vinicius:** "Boa ideia. Tipo: Epic 19 GET `/api/accounts/[id]/adoption` retorna adoção + heatmap data estrutura, mesmo se dados forem hardcoded. Depois Wave 6 popula com dados reais. Aí agent consegue consumir desde Wave 5. Effort: +1 SP per epic (3 SP total para stubs)."

**Paulo:** "Funciona! Aí em Wave 6, agentes já estão consumindo dados reais. Vocês topam isso?"

**Grupo todo:** "✅ Sim, ótimo!"

**Decisão 1:** ✅ **Wave 5 = Epic 16 + 17 + 20 + 23 + 36-38 + Epic 18 RAG core. Epics 19, 21, 22 = API stubs em Wave 5 (3 SP), implementation em Wave 6. Agentes conseguem consumir desde Wave 5.**

---

## 🚀 FASE 4 — WAVE 6-7 CÓDIGO PARALELO — INCORPORAR OU NÃO? (10:30-11:00)

**Vinicius:** "Descobri que existem 3 arquivos no repositório desenvolvidos por outro time (não sabemos quem):
- src/lib/rag/rag-pipeline.ts (70% completo) — excelente código
- src/lib/adoption/risk-engine.ts (40% completo) — funciona
- src/lib/ai/predictive-risk.ts (30% completo) — robusto

A pergunta é: **Incorporate (integrar agora), Cherry-Pick (extrair padrões), ou Fresh Start (refazer)?**"

**Arnaldo:** "Minha avaliação: RAG pipeline é muito bom. Não faz sentido refazer. risk-engine é OK. predictive-risk é OK mas tem gaps. Meu voto: **Cherry-Pick**. Ratifico o código RAG (provavelmente está certo), mas refactoro under tests. adoption e predictive podem ser reusadas como base, mas refactoro pra casar com nossos padrões."

**Vinicius:** "Cherry-Pick significa: posso reusar rag-pipeline como-está se passar em testes? Ou refactoro tudo?"

**Arnaldo:** "Trago rag-pipeline, rodo testes, se passar deixa como-está. Se não passa, refactoro. Same pra adoption e predictive."

**Bruno:** "Concordo. Mas isso significa Week 1 é testing + refactoring do código herdado, não feature development."

**Pedro:** "Quanto tempo? 1 sprint (5 dias)?"

**Arnaldo:** "Sim. 1 sprint pra testes + refactor, aí Wave 6 começa Week 2 já com código validado."

**Paulo:** "Topei. Mas aí Wave 6 não começa agora, começa semana que vem. Isso atrasa mobile em 1 semana (planejei mobile Wave 6 começo de julho, aí vira meados de julho)."

**Pedro:** "OK, mobile vai ser meados de julho. Documentado. Vinicius, em Wave 6, vocês vão manter esse código cherry-picked ou vai refazer?"

**Vinicius:** "Se passar em testes, mantenho. Se não passar, refaço. Mas idealmente mantém."

**Decisão 2:** ✅ **Wave 6-7 código paralelo: Cherry-Pick approach. Wave 1 (next week) = testes + refactor, aí Wave 6 começa Week 2 com código validado. Mobile start atrasa para meados julho.**

---

## ⚙️ FASE 5 — TECH STACK FINAL SIGN-OFF (11:00-11:20)

**Vinicius:** "5 tech decisions precisam de sign-off final:"

**1. Playbook Canvas: ReactFlow vs Custom Div?**
- Recomendação: ReactFlow
- Mariana: "ReactFlow é padrão de mercado. Design approval: ✅"
- Vinicius: "Dev approval: ✅"
- Effort: 1.5 SP
- **Decision: ✅ ReactFlow**

**2. Adoption Heatmap: Recharts vs Visx vs D3?**
- Recomendação: Visx (melhor pra heatmap, cores customizáveis)
- Mariana: "Visx permite mais controle de cores. Design approval: ✅"
- Vinicius: "2 SP é OK"
- **Decision: ✅ Visx**

**3. RAG LLM: Gemini vs Claude vs Hybrid?**
- Recomendação: Hybrid (Gemini simples, Claude complexo)
- Arnaldo: "Hybrid otimiza custo. Claude melhor pra RAG reasoning. Aprovado."
- **Decision: ✅ Hybrid (Gemini + Claude)**
  - Gemini: Highlights, PDF, VoC summary (simples)
  - Claude: RAG modes (multi-source, reasoning) em Wave 6 Epic 18
  - Budget: $80-100/mês (vs $150 Claude puro)

**4. VoC Cache: Redis vs In-Memory?**
- Recomendação: In-Memory agora, Redis Wave 6
- Vinicius: "In-Memory dá pra volume esperado, custa $0. Wave 6 migramos pra Redis."
- **Decision: ✅ In-Memory now, Redis later (+$15/mês)**

**5. Mobile App: Start Wave 5.5, Wave 6, ou Wave 7?**
- Recomendação: Wave 6 (july 26)
- Mariana: "Design precisa de 3 semanas pra mockups móvel. Não dá agora. Wave 6 sim."
- Pedro: "Produto approva Wave 6 start (ainda bate Abril 2027)."
- **Decision: ✅ Mobile Wave 6 (july 26)**

**Resumo Tech Stack:**
| Tech | Decision | Owner | Impact |
|------|----------|-------|--------|
| Playbook Canvas | ✅ ReactFlow | Mariana + Vinicius | 1.5 SP |
| Adoption Heatmap | ✅ Visx | Mariana + Vinicius | 2 SP |
| RAG LLM | ✅ Hybrid | Arnaldo | $80-100/mês |
| VoC Cache | ✅ In-Memory | Vinicius | 0 SP |
| Mobile | ✅ Wave 6 | Pedro | July start |

---

## 🔍 FASE 6 — CRÍTICA CRUZADA / QUESTÕES (11:20-11:40)

**Bruno (QA):** "Vinicius, Wave 5 + Epic 18 RAG é 90 SP em 5 sprints. Vocês vão ter tempo pra testes E2E? Por que test coverage é 0% agora."

**Vinicius:** "Ótima questão. Proposta: Sprint 4-5 é 50% testes, 50% feature development. Cobertura mínima: RLS (3 roles), Cron reliability (home-priorities, daily-briefing, voc-analyze), PDF generation (Gemini error handling), Canvas save/load."

**Arnaldo:** "E migrations? Vocês testaram 29 migrations em order?"

**Vinicius:** "Sim, testes com `apply-migrations-simple.cjs`. Mas Bruno, você pode validar em staging?"

**Bruno:** "OK. Eu faço rollback + reapply test em staging, certifica que rollback logic não quebra."

**Mariana:** "Design question: Renewal Cockpit tá faltando esboço de 6 seções. Vinicius, vocês têm mockups ou vou fazer?"

**Vinicius:** "Não temos. Você faz os mockups e a gente implementa na Sprint 2-3."

**Mariana:** "OK, 6 seções mockup tá pronto quinta-feira (amanhã). Vinicius recebe aí."

**Paulo:** "Epic 16 data contract: cs-manager espera `{ priorities: [...] }` array, vocês retornam `{ priority_1, priority_2, priority_3 }`. Isso precisa ser fixado ANTES que dev comece, senão agent quebra."

**Vinicius:** "Verdade. Arnaldo, você consegue ajustar o schema da API de daily-priorities pra Paulo antes de segunda-feira?"

**Arnaldo:** "Sim, segunda-feira de manhã eu refactoro `/api/cron/daily-briefing` e `/api/home-priorities/route.ts` pra usar array format. Paulo testa qual o novo schema, aprova, e aí dev não precisa mexer em nada de novo."

**Paulo:** "Perfeito. Same coisa pra renewal-strategist: Vinicius, endpoint `/api/accounts/[id]/renewal/highlights` precisa retornar schema exato que documentei (health_trend, nps_last_4, etc)?"

**Vinicius:** "Sim. Hoje retorna array de strings. Vou refactoro pra JSONB estruturado. Você valida semana que vem?"

**Paulo:** "✅ Valido."

**Pedro:** "Último ponto: histórias de usuário. Vinicius, vocês têm TODAS as histórias de Wave 5 escreveridas em Jira ou preciso gerar?"

**Vinicius:** "Tenho esboço em docs/refinement/. Mas aí vou passar pra você refactor e deixar pronto pra dev segunda-feira."

**Pedro:** "OK. Eu pego seus esboços, aplico critério de aceitação, refinança pra Jira, e deixa tudo travado segunda-feira de manhã. Vinicius, vocês começam desenvolvimento segunda-feira 12:00, certo?"

**Vinicius:** "Certo."

---

## 📋 PHASE 7 — USER STORY REFINEMENT (11:40-12:00)

**Pedro + Mariana (Produto) começam a refactorear histórias:**

**Epic 16 — Command Center (final):**
```
Story 16.1: Daily Home Priorities
- AC1: GET /api/home-priorities retorna { priorities: [{ rank: 1, type, account_id, reason, due_date }] }
- AC2: Cron /api/cron/home-priorities/route.ts roda 06:00 UTC diariamente
- AC3: Home page renderiza 3 priority cards com icons
- AC4: Click priority → navigate /accounts/[id]
- Dev: Vinicius (1 SP)
- QA: Bruno (RLS: csm só vê próprias accounts)
- Status: Ready ✅

Story 16.2: Daily Briefing
- AC1: GET /api/daily-briefing retorna { briefing: "...", date, csm_id }
- AC2: Cron /api/cron/daily-briefing/route.ts roda 06:30 UTC
- AC3: DailyBriefingCard renderiza na home com AreaChart (últimos 7 dias health trend)
- AC4: Responsive (375px, 1920px)
- Dev: Vinicius (1 SP)
- QA: Bruno (E2E)
- Status: Ready ✅

Story 16.3: Quick Actions FAB
- AC1: FAB botão flutuante com 4 ações (New Task, Call, Email, CSM Huddle)
- AC2: Clique em ação → drawer abre com form
- AC3: Submit → cria activity + notificação
- AC4: Mobile: FAB position bottom-right, não interfere com content
- Design: Mariana mockup locked
- Dev: Vinicius (1 SP)
- Status: Ready ✅

Story 16.4: Meeting Prep
- AC1: Síntese de última reunião + próxima pauta
- AC2: Sugestões automáticas baseadas em últimos tickets + NPS
- AC3: Gemini prompt (determinístico)
- Dev: Vinicius (1 SP)
- Status: Ready ✅
```

**Epic 17 — Renewal Cockpit (final):**
```
Story 17.1: Renewal Cockpit 360°
- AC1: GET /accounts/[id] renderiza botão Renewal (se daysToRenewal <= 90)
- AC2: Click → /accounts/[id]/renewal com 6 seções lazy-loaded
- AC3: Seção 1 (Health 12m): AreaChart últimos 12 meses
- AC4: Seção 2 (NPS Journey): últimas 4 respostas + comentários
- AC5: Seção 3 (Tickets): volume, CSAT%, TRT médio
- AC6: Seção 4 (Esforço): BarChart de horas por tipo
- AC7: Seção 5 (Adoption Delta): % agora vs 6m, seta vermelha se declining
- AC8: Seção 6 (Highlights): 3 bullets Gemini-generated
- AC9: Card contrato com ARR + "Projetar Aumento %" button
- AC10: Timeline de negotiation_history embaixo
- Design: Mariana (mockups thursday)
- Dev: Vinicius (3 SP)
- QA: Bruno (E2E, RLS com csm_senior vê múltiplas contas)
- Status: Ready (design Friday) ✅

Story 17.2: Renewal Brief PDF
- AC1: POST /api/accounts/[id]/renewal/pdf gera executive brief
- AC2: Gemini context: health + NPS + tickets + negotiation history
- AC3: HTML → PDF via html2pdf
- AC4: Download file: renewal-[accountName]-[date].pdf
- AC5: Registra em renewal_documents (account_id, csm_id, generated_at, pdf_url)
- AC6: Timeout 120s (maxDuration)
- AC7: Error handling: se Gemini fail, return fallback template
- Dev: Vinicius (2 SP)
- QA: Bruno (Gemini rate limit testing)
- Status: Ready ✅

Story 17.3: Renewal Pipeline (Dashboard)
- AC1: Dashboard seção "Renewal Pipeline" com 3 kanban columns
- AC2: Crítico <30d (red), Urgente 30-60d (yellow), Planejamento 60-90d (blue)
- AC3: Card: account name, ARR, health, NPS, readiness color
- AC4: Readiness: green (health>=75 AND NPS>=7), yellow (health>=50 OR NPS>=7), red (else)
- AC5: Filtro por CSM via RLS
- AC6: Click card → /accounts/[id]/renewal
- Design: Mariana (mockup integrated)
- Dev: Vinicius (2 SP)
- QA: Bruno
- Status: Ready ✅

Story 17.4: Negotiation History
- AC1: Modal form com campos: date, outcome, discount%, objection, notes
- AC2: POST /api/contracts/[id]/negotiation-history
- AC3: Timeline embaixo com trend (12% → 10% → 8% = declining)
- AC4: RLS: só CSM owner ou admin
- Design: Mariana
- Dev: Vinicius (1 SP)
- Status: Ready ✅
```

**Epic 20 — Voice of Customer (final):**
```
Story 20.1: VoC Analyzer Cron
- AC1: POST /api/cron/voc/analyze (x-api-secret auth)
- AC2: Busca interactions + NPS das últimas 24h sem sentiment_score
- AC3: Gemini: extrai sentiment_score (-1 a 1), themes[], quotes[]
- AC4: Atualiza interactions.sentiment_score
- AC5: Insere em interaction_themes table
- AC6: Idempotency: WHERE sentiment_score IS NULL AND created_at > NOW()-24h
- AC7: Maxduration=300s
- Dev: Vinicius (2 SP)
- QA: Bruno (Gemini rate limit, double-processing prevention)
- Status: Ready ✅

Story 20.2: VoC Board Page
- AC1: GET /voc renderiza VocBoardClient
- AC2: 3 seções: sentiment trend (7d), top pains, top praises, quotes feed
- AC3: Recharts AreaChart pra sentiment trend
- AC4: Word cloud simplificado (lista ordenada) pra pains/praises
- AC5: Quotes com 👍 👎 💭 emoji labels
- AC6: Responsive
- Design: Mariana (mockup + color palette)
- Dev: Vinicius (2 SP)
- QA: Bruno (E2E)
- Status: Ready (design Thursday) ✅

Stories 20.3-20.5: VoC APIs
- AC1: GET /api/voc/sentiment-trends (30d trend)
- AC2: GET /api/voc/top-themes (top 5 pains + praises)
- AC3: GET /api/voc/quotes (recent with sentiment)
- AC4: RLS: CSM vê só suas accounts
- Dev: Vinicius (1 SP)
- Status: Ready ✅
```

**Epic 23 — Playbook Builder (final):**
```
Story 23.1: Playbook Canvas
- AC1: /playbooks/builder page com ReactFlow canvas
- AC2: Sidebar esquerda: Actions (Send Email, Task, Alert, Status), Conditions (If Health, If NPS, If Interaction), Control (Start, End, Delay)
- AC3: Drag-drop blocos no canvas
- AC4: Click bloco → drawer direita com config fields
- AC5: "Salvar Playbook" → converte fluxo visual em JSON linear → salva em playbook_templates table
- AC6: Desktop-first (mobile Wave 6)
- Design: Mariana (canvas mockup Thursday)
- Dev: Vinicius (3 SP + 1.5 SP ReactFlow setup)
- QA: Bruno (drag-drop on desktop)
- Status: Ready (design Friday) ✅

Story 23.2: Playbook Management
- AC1: /playbooks page lista todos playbooks
- AC2: Create, Edit, Delete, Duplicate
- AC3: Status: draft, active, archived
- AC4: Trigger mechanism: manual vs cron vs webhook
- Dev: Vinicius (1 SP)
- Status: Ready ✅
```

**Epic 18 — RAG Core (Wave 5 addition, 4 SP):**
```
Story 18.1: RAG Multi-Mode Core
- AC1: Validar + test rag-pipeline.ts código herdado
- AC2: GET /api/rag/query com { query, mode: 'summarize'|'analyze'|'recommend' }
- AC3: Modo Summarize: 1-3 bullet points, simples
- AC4: Modo Analyze: reasoning longo com confidence score
- AC5: Modo Recommend: ação específica recomendada
- AC6: Claude 3.5 Sonnet (não Gemini) para modos complexos
- AC7: Confidence score: count(matches) / top_k = percentual
- AC8: maxDuration=120s (RAG é pesado)
- Dev: Vinicius (3 SP cherry-pick existing + refactor) + Arnaldo (1 SP refactor)
- QA: Bruno (E2E with different modes)
- Status: Ready (pending code review of existing rag-pipeline) ✅
```

**API Stubs (Wave 5, 3 SP):**
```
Story 19.X: Adoption API Stub
- AC1: GET /api/accounts/[id]/adoption retorna estrutura completa mas dados dummy
- AC2: Schema: { adoption_score, features_at_risk: [...], heatmap_data: [...] }
- AC3: Week 6 (Wave 6 implementation) refaz com dados reais
- Dev: Vinicius (1 SP stub)

Story 21.X: CS Ops API Stub
- AC1: GET /api/cs-ops/scorecard/{csm_id} retorna estrutura
- AC2: Schema: { capacity_utilization, health_escalations, csat, trt }
- Dev: Vinicius (1 SP stub)

Story 22.X: Alerts API Stub
- AC1: GET /api/alerts retorna estrutura
- AC2: Schema: { account_id, risk_score, alert_type, recommended_action }
- Dev: Vinicius (1 SP stub)
```

**Pedro:** "OK, tenho todas. Vou pra Jira agora, refinança tudo, deixa travado e com acceptance criteria exato. Monday 08:00, histórias prontas pra dev pegar."

**Mariana:** "Eu entrego mockups quinta-feira fim de expediente. Epic 17 (6 seções), Epic 20 (VoC board), Epic 23 (canvas)."

**Vinicius:** "Perfeito. A equipe dev começa segunda-feira 12:00, depois que vocês aprovam histórias."

---

## 📊 FINAL SUMMARY — WAVE 5 FINAL EXECUTION PLAN

### Scope Confirmado:
- **Epic 16** (Command Center): 4 SP — Status ✅ Ready
- **Epic 17** (Renewal Cockpit): 6 SP — Status ✅ Ready (design Friday)
- **Epic 20** (VoC Intelligence): 5 SP — Status ✅ Ready (design Friday)
- **Epic 23** (Playbook Builder): 5 SP — Status ✅ Ready (design Friday)
- **Epic 18** (RAG Core): 4 SP (cherry-pick existing + refactor) — Status ✅ Ready
- **Stubs** (19, 21, 22): 3 SP — Status ✅ Ready
- **Epics 36-38** (Pré-condições): already complete
- **Total Wave 5: 27 SP actual development + 81 SP already done = 108 SP (90 new)**

### Timeline:
```
Week 1 (May 12-16):
  Mon: Dev kick-off at 12:00
  Mon-Tue: Cherry-pick validation (RAG, adoption, predictive code)
  Tue: Arnaldo refactors daily-priorities API schema
  Wed-Thu: Bruno load tests RLS (5K accounts)
  Thu: Mariana delivers mockups (17, 20, 23)
  Fri: Pedro finalizes Jira stories
  Result: Wave 5 code foundation ready

Week 2 (May 19-23):
  Epic 17: Stories 17.1-17.4 implementation
  Epic 20: Stories 20.1-20.5 implementation
  Epic 23: Story 23.1-23.2 implementation
  Epic 18: RAG core tested + integrated
  Result: Core features 70% done

Week 3 (May 26-30):
  Epic 17: Renewal Pipeline + PDF generation
  Epic 20: VoC board charting (Recharts)
  Epic 23: Playbook canvas polish
  Result: Core features 100% done

Week 4-5 (Jun 2-13):
  Integration testing
  E2E suite setup
  RLS audit with multiple roles
  Performance tuning
  Result: QA-ready

Week 5-6 (Jun 16-27):
  QA full E2E execution
  Bug fixes
  Staging validation
  Result: Production ready

Week 7 (Jun 30 - Jul 4):
  Buffer for last-minute fixes
  Wave 6 prep (Cherry-pick code validation)
  
Wave 6 Kick-off: Week 2 July (Jul 7)
  - Code validation sprint
  - Epics 19, 21, 22 full implementation
  - Mobile mockups finalized

Mobile App Launch: Jul 26
```

### Sign-offs Assinados:
- ✅ **Paulo Pauta:** Data contracts validated, Epic 16 schema fixed, agent integration confirmed
- ✅ **Pedro Prioriza:** Scope locked, timeline accepted, Jira stories ready by Monday
- ✅ **Arnaldo (Arquiteto):** Tech stack finalized, RLS index plan, cherry-pick strategy approved
- ✅ **Mariana (Design):** Mockups delivery schedule, ReactFlow + Visx approved
- ✅ **Bruno (QA):** RLS load test plan, E2E scope, test coverage targets (min 70%)
- ✅ **Vinicius (Dev Lead):** 90 SP timeline commitment, sprint structure (5-6 sprints)
- ✅ **CS Agents:** Vão consumir Wave 5 outputs desde week 2, agents integration testado week 6

### Recursos Bloqueadores: NENHUM ✅
- Design: ✅ Pronto
- Produto: ✅ Pronto
- Dev: ✅ Pronto
- QA: ✅ Pronto
- Arquitetura: ✅ Pronto
- CS Agents: ✅ Pronto para integração

---

## 🎯 FINAL DECISION MATRIX

| Decisão | Opção | Owner | Status |
|---------|-------|-------|--------|
| **Wave 5 Scope** | Core + Epic 18 RAG + Stubs 19/21/22 | Pedro | ✅ Locked |
| **Wave 6-7 Code** | Cherry-Pick (test + refactor W1) | Arnaldo + Vinicius | ✅ Approved |
| **Data Contracts** | Paulo validates Monday | Paulo | ✅ Approved |
| **Tech Stack** | ReactFlow, Visx, Hybrid LLM, In-Memory | Arnaldo | ✅ Signed |
| **Timeline** | 7 sprints (5 Wave 5 + 2 Wave 6 overlap) | Vinicius | ✅ Committed |
| **Mobile Start** | Wave 6 (Jul 26) | Pedro | ✅ Approved |
| **QA Priority** | RLS (3 roles), Cron reliability, PDF gen | Bruno | ✅ Ready |

---

## 📝 PRÓXIMOS PASSOS IMEDIATOS

**Hoje (Sexta-feira 2026-05-09):**
- ✅ Reunião finalizada
- Pedro: Jira story refinement start
- Mariana: Mockup design start

**Monday (2026-05-12):**
- Arnaldo: Refactor daily-priorities API schema
- Pedro: Jira stories 100% ready para dev
- Vinicius: Dev team kick-off 12:00

**Tuesday (2026-05-13):**
- Vinicius: Cherry-pick code validation begin
- Bruno: RLS load test setup

**Wednesday (2026-05-14):**
- Mariana: Mockups 50% ready (iteration)
- Arnaldo: Index strategy finalized

**Thursday (2026-05-15):**
- Mariana: Mockups 100% ready
- Dev: First implementations in progress

**Friday (2026-05-16):**
- Pedro: ALL Jira stories ready + groomed
- Dev: Stories 16.1-16.4 half done
- QA: Test plan 100% ready

---

## ✅ REUNIÃO FINALIZADA — TUDO TRAVADO PARA KICK-OFF

**Decisões:** 7  
**Bloqueadores:** 0  
**Recursos alocados:** 100%  
**Confiança:** ALTA ✅

**Próximo milestone:** Segunda-feira 12:00 — Dev Kick-off, Wave 5 final push começa.

---

*Facilitado por: Vinicius (Dev Lead)  
Data: 2026-05-09 | 09:00-12:00 UTC  
Output: 7 decisões críticas, 0 blockers, roadmap validado por todos*
