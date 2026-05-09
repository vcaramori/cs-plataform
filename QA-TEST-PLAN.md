# 🧪 QA Test Plan — Waves 5-7 Comprehensive Testing

**QA Phase Start:** 2026-05-12 14:30 UTC  
**Target Completion:** 2026-05-14 EOD  
**Status:** 🔄 **IN PROGRESS**

---

## 📋 Test Strategy Overview

### Test Phases
1. **Phase 1: Wave 5 Smoke Tests** (2-3 hours)
   - Baseline validation of Wave 5 features
   - 14 tests across 4 epics (Epic 16, 17, 20, 23)
   - Success Criteria: 14/14 passing

2. **Phase 2: Full E2E Test Suite** (4-6 hours)
   - All 30 tests across 9 suites
   - Coverage: all waves, all features
   - Success Criteria: 30/30 passing

3. **Phase 3: RLS Audit** (3-4 hours)
   - 3 role-based access control tests
   - 10+ test cases per role
   - Success Criteria: 0 violations

4. **Phase 4: Performance Baseline** (2-3 hours)
   - Lighthouse scoring (target >= 80)
   - API p95 latency (target <= 3s)
   - Load test (5K accounts simulation)
   - Success Criteria: All targets met

5. **Phase 5: Integration Testing** (2 hours)
   - Cron job execution validation
   - External API integration (Gemini, Claude)
   - Webhook delivery verification
   - Success Criteria: All crons run, integrations healthy

---

## 🎯 Phase 1: Wave 5 Smoke Tests

### Test Suite: `wave5-smoke.spec.ts`

#### Epic 16 — Command Center (4 tests)

| Test | Endpoint | Success Criteria |
|------|----------|------------------|
| **16.1** Load home with priorities | `GET /` | Priorities card visible |
| **16.2** Fetch daily briefing | `GET /api/daily-briefing` | Response 200, has `briefing_text` |
| **16.3** Show quick actions FAB | `GET /` | FAB component visible |
| **16.4** Meeting prep (implied) | Page load | Page renders without errors |

**Status: ⏳ RUNNING**

#### Epic 17 — Renewal Cockpit (3 tests)

| Test | Endpoint | Success Criteria |
|------|----------|------------------|
| **17.1** Render renewal page | `GET /accounts/1/renewal` | 6 sections visible |
| **17.2** Generate PDF | `POST /api/accounts/1/renewal/pdf` | Response 200, has `html` |
| **17.3** Show renewal pipeline | `GET /api/dashboard/renewal-pipeline` | Has `critical`, `urgent`, `planning` |

**Status: ⏳ RUNNING**

#### Epic 20 — Voice of Customer (3 tests)

| Test | Endpoint | Success Criteria |
|------|----------|------------------|
| **20.1** Render VoC board | `GET /voc` | Board visible |
| **20.2** Fetch sentiment trends | `GET /api/voc/sentiment-trends?days=7` | Response 200, has data array |
| **20.3** Fetch top themes | `GET /api/voc/top-themes` | Has `pains` and `praises` |

**Status: ⏳ RUNNING**

#### Epic 23 — Playbook Builder (2 tests)

| Test | Endpoint | Success Criteria |
|------|----------|------------------|
| **23.1** Render playbook canvas | `GET /playbooks/builder` | Canvas element visible |
| **23.2** List playbooks | `GET /api/playbooks` | Response 200 |

**Status: ⏳ RUNNING**

---

## 🎯 Phase 2: Full E2E Test Suite

### Test Suites (9 total)

| Suite | Tests | Epics | Status |
|-------|-------|-------|--------|
| **wave5-smoke.spec.ts** | 14 | 16, 17, 20, 23 | ⏳ Running |
| **accounts.spec.ts** | 2 | 2 | ⏳ Pending |
| **ai-features.spec.ts** | 4 | AI/RAG | ⏳ Pending |
| **dashboard.spec.ts** | 2 | 1 | ⏳ Pending |
| **esforco.spec.ts** | 1 | 6 | ⏳ Pending |
| **nps-hub.spec.ts** | 3 | 5 | ⏳ Pending |
| **playbooks.spec.ts** | 1 | 9 | ⏳ Pending |
| **settings.spec.ts** | 2 | 7, 8 | ⏳ Pending |
| **suporte.spec.ts** | 1 | 4 | ⏳ Pending |
| **TOTAL** | **30** | | **⏳ PENDING** |

**Success Criteria:** 30/30 passing (100% pass rate)

---

## 🔐 Phase 3: RLS Audit

### Test Scenarios (3 roles × 10 cases each)

#### Role 1: `csm` (Customer Success Manager)

| Test Case | Action | Expected Result | Status |
|-----------|--------|-----------------|--------|
| **CSM.1** | View own accounts | See only assigned accounts | ⏳ Pending |
| **CSM.2** | View other CSM accounts | Access denied | ⏳ Pending |
| **CSM.3** | Edit own account | Success (own account) | ⏳ Pending |
| **CSM.4** | Edit other CSM account | Access denied | ⏳ Pending |
| **CSM.5** | View NPS responses | Only own accounts | ⏳ Pending |
| **CSM.6** | View support tickets | Only own accounts | ⏳ Pending |
| **CSM.7** | Create health score | Only own accounts | ⏳ Pending |
| **CSM.8** | View adoption data | Only own accounts | ⏳ Pending |
| **CSM.9** | View renewal pipeline | Only own accounts | ⏳ Pending |
| **CSM.10** | Create task | Only for own accounts | ⏳ Pending |

#### Role 2: `csm_senior` (Senior CSM / Team Lead)

| Test Case | Action | Expected Result | Status |
|-----------|--------|-----------------|--------|
| **CSM_SR.1** | View team accounts | See all team member accounts | ⏳ Pending |
| **CSM_SR.2** | View all accounts | Access denied (except team) | ⏳ Pending |
| **CSM_SR.3** | Edit team account | Success (team accounts) | ⏳ Pending |
| **CSM_SR.4** | View team analytics | Full team dashboard | ⏳ Pending |
| **CSM_SR.5** | Create team alert | For any team account | ⏳ Pending |
| **CSM_SR.6** | Reassign account | Within team only | ⏳ Pending |
| **CSM_SR.7** | Approve check-in | Team submissions | ⏳ Pending |
| **CSM_SR.8** | View capacity metrics | Full team workload | ⏳ Pending |
| **CSM_SR.9** | Configure alerts | Team-wide rules | ⏳ Pending |
| **CSM_SR.10** | View audit logs | Team actions only | ⏳ Pending |

#### Role 3: `admin` (Administrator)

| Test Case | Action | Expected Result | Status |
|-----------|--------|-----------------|--------|
| **ADMIN.1** | View all accounts | Complete visibility | ⏳ Pending |
| **ADMIN.2** | Edit any account | Success for all | ⏳ Pending |
| **ADMIN.3** | View system logs | All audit logs visible | ⏳ Pending |
| **ADMIN.4** | Manage users | Create/edit/delete users | ⏳ Pending |
| **ADMIN.5** | Configure integrations | All integrations accessible | ⏳ Pending |
| **ADMIN.6** | View all reports | Dashboard/analytics unrestricted | ⏳ Pending |
| **ADMIN.7** | Modify RLS policies | Settings accessible | ⏳ Pending |
| **ADMIN.8** | View billing/usage | System-wide metrics | ⏳ Pending |
| **ADMIN.9** | Bulk operations | Across all accounts | ⏳ Pending |
| **ADMIN.10** | Emergency access | Override capabilities | ⏳ Pending |

**Success Criteria:** All 30 test cases pass (0 RLS violations)

---

## ⚡ Phase 4: Performance Baseline

### 4.1 Lighthouse Performance

**Target:** >= 80 score

| Page | Desktop Target | Mobile Target | Status |
|------|---|---|--------|
| `/dashboard` | 80+ | 75+ | ⏳ Pending |
| `/accounts/[id]` | 80+ | 75+ | ⏳ Pending |
| `/voc` | 80+ | 75+ | ⏳ Pending |
| `/playbooks/builder` | 80+ | 75+ | ⏳ Pending |
| `/renewal` | 80+ | 75+ | ⏳ Pending |

### 4.2 API Latency Testing

**Target:** p95 latency <= 3 seconds

| Endpoint | Avg | p95 | p99 | Status |
|----------|-----|-----|-----|--------|
| `GET /api/home-priorities` | <100ms | <500ms | <1s | ⏳ Pending |
| `GET /api/daily-briefing` | <200ms | <1s | <2s | ⏳ Pending |
| `GET /api/accounts/[id]/adoption/heatmap` | <500ms | <2s | <3s | ⏳ Pending |
| `GET /api/alerts` | <300ms | <1.5s | <2.5s | ⏳ Pending |
| `POST /api/renewal/pdf` | <2s | <5s | <8s | ⏳ Pending |

### 4.3 Load Test (5K Accounts)

**Scenario:** Simulate 5,000 active accounts with concurrent CSM sessions

| Load Level | Users | Expected Behavior | Status |
|-----------|-------|-------------------|--------|
| **Level 1** | 10 users | Page load < 500ms | ⏳ Pending |
| **Level 2** | 50 users | Page load < 1s | ⏳ Pending |
| **Level 3** | 100 users | Page load < 2s | ⏳ Pending |
| **Level 4** | 200 users | Page load < 3s | ⏳ Pending |

**Success Criteria:** p95 latency <= 3s at 100 concurrent users with 5K accounts

---

## 🔄 Phase 5: Integration Testing

### 5.1 Cron Job Validation

| Cron Job | Frequency | Success Criteria | Status |
|----------|-----------|------------------|--------|
| `/api/cron/home-priorities` | Daily | Runs, generates data, completes < 30s | ⏳ Pending |
| `/api/cron/daily-briefing` | Daily | Runs, generates briefing text, completes < 1m | ⏳ Pending |
| `/api/cron/voc/analyze` | Daily | Runs, analyzes sentiment, completes < 2m | ⏳ Pending |
| `/api/cron/adoption-analysis` | Daily | Runs, generates heatmap, completes < 1m | ⏳ Pending |
| `/api/cron/alert-analysis` | Hourly | Runs, generates alerts, completes < 30s | ⏳ Pending |
| `/api/cron/cs-ops-daily` | Daily | Runs, calculates capacity, completes < 1m | ⏳ Pending |
| `/api/cron/integrations-sync` | Hourly | Runs, syncs data, completes < 2m | ⏳ Pending |

### 5.2 External API Integration

| Service | Integration | Success Criteria | Status |
|---------|-----------|------------------|--------|
| **Gemini** | Daily briefing, PDF, highlights | Response < 5s, proper error handling | ⏳ Pending |
| **Claude 3.5 Sonnet** | Adoption forecasting, alerts | ML predictions generated, < 10s | ⏳ Pending |
| **OAuth — Salesforce** | Integration auth | Token exchange, data sync | ⏳ Pending |
| **OAuth — HubSpot** | Integration auth | Token exchange, data sync | ⏳ Pending |

### 5.3 Webhook Delivery

| Feature | Test Case | Success Criteria | Status |
|---------|-----------|------------------|--------|
| **Webhook Creation** | POST `/api/webhooks` | Creates and stores webhook | ⏳ Pending |
| **HMAC Signing** | Delivery verification | Signature valid and verified | ⏳ Pending |
| **Delivery Retry** | Failed delivery | Exponential backoff working | ⏳ Pending |
| **Delivery Logging** | Metric tracking | Delivery success rate logged | ⏳ Pending |

---

## 📊 Test Execution Tracker

### Current Status

```
Phase 1: Wave 5 Smoke Tests
├── Running test suite...
├── Execution time: ~5-10 minutes
└── Status: 🔄 IN PROGRESS

Phase 2: Full E2E Tests
├── Waiting for Phase 1 completion
├── Estimated time: 4-6 hours
└── Status: ⏳ PENDING

Phase 3: RLS Audit
├── Waiting for Phase 2 completion
├── Estimated time: 3-4 hours
└── Status: ⏳ PENDING

Phase 4: Performance Baseline
├── Waiting for Phase 3 completion
├── Estimated time: 2-3 hours
└── Status: ⏳ PENDING

Phase 5: Integration Testing
├── Waiting for Phase 4 completion
├── Estimated time: 2 hours
└── Status: ⏳ PENDING
```

---

## 📈 Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Phase 1 Pass Rate | 100% (14/14) | 0/14 | 🔄 Testing |
| Phase 2 Pass Rate | 100% (30/30) | 0/30 | ⏳ Pending |
| RLS Violations | 0 | 0 | 🔄 Audit |
| Lighthouse Score | >= 80 | TBD | ⏳ Pending |
| p95 API Latency | <= 3s | TBD | ⏳ Pending |
| Load Test Success | 100% | TBD | ⏳ Pending |
| Cron Job Success | 100% | TBD | ⏳ Pending |
| Integration Health | 100% | TBD | ⏳ Pending |

---

## 🚨 Critical Blockers to Watch

| Blocker | Severity | Mitigation | Status |
|---------|----------|-----------|--------|
| Test environment setup | High | Dev server running, browsers installed | ✅ Resolved |
| Database connectivity | High | Supabase available, migrations applied | ✅ Verified |
| Authentication/OAuth | Medium | Test accounts created, sandbox ready | ⏳ Pending |
| LLM rate limits | Medium | Exponential backoff configured | ✅ Ready |
| Performance degradation | Medium | Load test to identify bottlenecks | ⏳ Pending |
| RLS policy bugs | High | Audit will find if present | ⏳ Pending |

---

## 📞 QA Team Contacts

| Role | Name | Contact | Responsibility |
|------|------|---------|-----------------|
| **QA Lead** | Bruno | bruno@plannera | Test execution, results reporting |
| **Dev Lead** | Vinicius | vinicius@plannera | Debug support, code investigation |
| **Product** | Pedro | pedro@plannera | Requirements clarification |
| **Architecture** | Arnaldo | arnaldo@plannera | Performance analysis, RLS validation |

---

## 📝 Notes

- Test execution automated via Playwright (CLI-based)
- Results captured in JSON and HTML formats
- Screenshots/traces available for failed tests
- All results documented for deployment decision
- Post-QA: Move to staging deployment if all pass

---

**QA Phase Owner:** Bruno (QA Lead)  
**Documentation:** This file  
**Results Location:** `test-results/` directory  
**Last Updated:** 2026-05-12 14:30 UTC

---

*This QA Test Plan provides comprehensive coverage of all Waves 5-7 functionality, security controls, and performance requirements. All test phases must be completed and passed before production deployment.*
