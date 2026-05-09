# 🚨 Risk & Mitigation Plan — Wave 5 Final Push

**Owner:** Arquiteto (Arnaldo)  
**Review Cadence:** Daily standup (últimas 2 semanas)  
**Escalation:** Via Paulo Pauta ou Pedro Prioriza

---

## 🔴 CRITICAL RISKS

### 1. **Gemini API Rate Limits Hit During Cron Spike**

**Probability:** MEDIUM  
**Impact:** HIGH (features break, users see errors)

| Scenario | Trigger | Impact |
|----------|---------|--------|
| Default | 60 req/min limit exceeded | PDF generation fails, highlights null |
| Peak usage | 500 CSMs × highlights = 500 req/min | 8x limit, request queue backlog |

**Mitigation:**
- ✅ Batch requests: group por account (max 10 per batch)
- ✅ Exponential backoff (1s → 2s → 4s)
- ✅ Fallback logic: se Gemini fail, return template text
- ✅ Monitoring: Datadog alert se rate limit hit
- ✅ Quota upgrade: solicitar 500 req/min Gemini (free tier)

**Owner:** Dev Lead  
**Effort:** 1 SP (logging + fallback)  
**Timeline:** Week 2

---

### 2. **Supabase RLS Performance Degrades at Scale**

**Probability:** MEDIUM  
**Impact:** HIGH (queries timeout, dashboard slow)

**Scenario:** 10K accounts × complex RLS policies (health_scores, contract_negotiation_history, renewal_documents)

**Mitigation:**
- ✅ Index strategy:
  - `accounts(csm_owner_id)` — query baseline
  - `health_scores(account_id, evaluated_at DESC)` — 12m trend
  - `contract_negotiation_history(contract_id, date DESC)` — renewal history
- ✅ Query optimization: use `limit(100)` + pagination
- ✅ Staging load test: 5K accounts, measure p95 latency
- ✅ Caching: VoC heatmap aggregates cached 1h

**Owner:** Arquiteto  
**Effort:** 1 SP (indices + load testing)  
**Timeline:** Week 1 (before dev starts)

---

### 3. **Playbook Canvas UX Broken on Mobile**

**Probability:** HIGH  
**Impact:** MEDIUM (feature usable on desktop only)

**Scenario:** ReactFlow drag-drop doesn't work on touch devices, canvas too small

**Mitigation:**
- ✅ Design: mobile-first mockup NOW (not Wave 6)
- ✅ Dev: touch event handlers in ReactFlow config
- ✅ Test: manual on iPhone 12 + Android
- ✅ MVP scope: desktop first (mobile in Wave 6), document in `/playbooks/builder`

**Owner:** Design + Dev  
**Effort:** 0.5 SP (if desktop-only); 2 SP (if mobile support)  
**Timeline:** Week 2 (design decision → dev starts)

---

### 4. **PDF Generation Timeout on Large Datasets**

**Probability:** MEDIUM  
**Impact:** HIGH (renewal brief fails, user frustrated)

**Scenario:**  
- Account with 12 months health history + 50 NPS responses + 100 tickets
- Gemini processing takes >30s
- Next.js timeout = 120s max (maxDuration set)

**Mitigation:**
- ✅ Async job: move PDF generation to background queue (Bull/BullMQ)
- ✅ User UX: "PDF generating, link sent to email" (instead of download)
- ✅ Timeout: 300s backend, 30s frontend polling
- ✅ Fallback: if timeout, generate simple template

**Owner:** Dev Lead  
**Effort:** 2 SP (queue setup + email)  
**Timeline:** Week 3-4

---

### 5. **VoC Analyzer Processes Same Data Twice**

**Probability:** MEDIUM  
**Impact:** MEDIUM (double-charging Gemini, stale data)

**Scenario:** Cron runs at 02:00, reprocesses yesterday's data

**Mitigation:**
- ✅ Idempotency: mark interactions with `voc_analyzed_at` timestamp
- ✅ Cron logic: `WHERE sentiment_score IS NULL AND created_at > NOW()-24h`
- ✅ Dedup: in-memory Set of processed interaction IDs
- ✅ Alerting: if > 1000 interactions processed, log warning

**Owner:** Dev  
**Effort:** 0.5 SP  
**Timeline:** Week 2

---

## 🟡 MEDIUM RISKS

### 6. **Data Contract Mismatch with CS Agents**

**Probability:** HIGH  
**Impact:** MEDIUM (agents can't process Wave 5 outputs)

**Example:**  
- Epic 16 outputs: `{ priority_1: "...", priority_2: "...", priority_3: "..." }`
- Paulo Pauta expects: `{ priorities: [{ rank: 1, text: "..." }] }`

**Mitigation:**
- ✅ **Paulo Pauta validation NOW** (before dev commits)
- ✅ Document in `cs-agents-pack/data-contracts.md`
- ✅ Schema validation: Zod/Yup in API responses
- ✅ Agent integration test: cs-manager can parse Wave 5 output

**Owner:** Paulo Pauta + Dev  
**Effort:** 1 SP (schema docs + validation)  
**Timeline:** Week 1

---

### 7. **TypeScript Compilation Errors Accumulate**

**Probability:** MEDIUM  
**Impact:** LOW (annoying, but fixable)

**Mitigation:**
- ✅ CI gate: `tsc --noEmit` must pass before merge
- ✅ Daily: run `npm run tsc` in standup
- ✅ Rule: no `// @ts-ignore` without issue link

**Owner:** Dev Lead  
**Effort:** 0 SP (process)  
**Timeline:** Day 1

---

### 8. **QA Cannot Reproduce RLS Bug**

**Probability:** MEDIUM  
**Impact:** MEDIUM (security regression undetected)

**Scenario:** CSM A sees CSM B's accounts in staging, but can't reproduce locally

**Mitigation:**
- ✅ QA setup: staging DB with 3 test users (roles: csm, csm_senior, admin)
- ✅ Checklist: RLS test for each epic
- ✅ Automation: E2E tests with different JWT roles
- ✅ Documentation: `/docs/testing/rls-strategy.md`

**Owner:** QA  
**Effort:** 1 SP (setup + docs)  
**Timeline:** Week 1

---

## 🟢 LOW RISKS

### 9. **Design Mockups Not Ready in Time**

**Mitigation:** Design starts mockups THIS WEEK (paralelo Refinement)

---

### 10. **Dev Burnout from Aggressive Timeline**

**Mitigation:**
- ✅ 2-day buffer (Week 7 reserved for fixes)
- ✅ Pair programming (Epic 18 RAG complex)
- ✅ Daily standup max 15 min

---

## 📊 RISK DASHBOARD

| Risk | Prob | Impact | Owner | Status |
|------|------|--------|-------|--------|
| Gemini rate limits | 🟡 M | 🔴 H | Dev | 🔧 Week 2 |
| RLS performance | 🟡 M | 🔴 H | Arq | ✅ Week 1 |
| Canvas mobile UX | 🔴 H | 🟡 M | Design | ⏳ THIS WEEK |
| PDF timeout | 🟡 M | 🔴 H | Dev | 🔧 Week 3-4 |
| VoC double-process | 🟡 M | 🟡 M | Dev | 🔧 Week 2 |
| Data contract mismatch | 🔴 H | 🟡 M | Paulo | ⏳ THIS WEEK |
| TypeScript errors | 🟡 M | 🟢 L | Dev | ✅ Day 1 |
| RLS QA coverage | 🟡 M | 🟡 M | QA | 🔧 Week 1 |

---

## 🎯 SIGN-OFF REQUIRED

Antes de kick-off, cada owner assina:

- [ ] **Arquiteto:** Índices + load test OK
- [ ] **Design:** Canvas mockups locked
- [ ] **QA:** RLS test strategy pronto
- [ ] **Dev Lead:** Fallback logic architecture assinado
- [ ] **Paulo Pauta:** Data contracts validados

---

**Status:** 🔴 PENDING — Espera reunião de hoje
