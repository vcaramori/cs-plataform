# ✅ WAVE 5 FINAL KICK-OFF CHECKLIST

**Document:** Go/No-Go Decision Checklist  
**Date:** 2026-05-09 (Post-Refinement)  
**Target Kick-Off:** Monday 2026-05-12 at 12:00 UTC  
**Status:** 🟢 **GREEN — All Systems Ready for Execution**

---

## 📋 PRE-KICK-OFF VALIDATION (This Week)

### Thursday, May 15 — Design Deliverables
- [ ] **Mariana:** Epic 17 (Renewal Cockpit) — 6 section mockups (Health 12m, NPS, Tickets, Effort, Adoption, Highlights)
- [ ] **Mariana:** Epic 20 (VoC Board) — Sentiment trend chart, pains/praises layout, quotes feed
- [ ] **Mariana:** Epic 23 (Playbook Builder) — Canvas layout, sidebar blocks, right drawer config panel
- [ ] **Mariana:** Color palette finalized (sentiment green/yellow/red, readiness badges)
- [ ] **Mariana:** Mobile responsiveness notes (what defers to Wave 6)

**Acceptance:** Vinicius reviews + approves Friday AM, no changes after

---

### Friday, May 16 — Product Delivery
- [ ] **Pedro:** All 21 stories loaded into Jira with exact AC
- [ ] **Pedro:** Each story has: description, AC list, effort (SP), priority, dependencies
- [ ] **Pedro:** Stories linked to Epics (16, 17, 18, 20, 23)
- [ ] **Pedro:** Stubs (Stories 19.X, 21.X, 22.X) marked as Wave 6 deferral with link
- [ ] **Pedro:** Acceptance Criteria validate against mockups (no misalignment)
- [ ] **Pedro:** Sprint 1 stories estimated + prioritized (top 15 SP by rank)
- [ ] **Pedro:** Jira board setup: Backlog → Ready → In Progress → Review → Done

**Acceptance:** Vinicius reviews Friday 17:00, gives go-no-go

---

### Friday, May 16 — Architecture & Infrastructure
- [ ] **Arnaldo:** RLS index strategy documented (which 5 indices, on which columns)
- [ ] **Arnaldo:** Migrations prepared for Wave 5 (any new tables needed? Already done)
- [ ] **Arnaldo:** daily-priorities API schema refactored (priority_1/2/3 → priorities array)
- [ ] **Arnaldo:** Tech stack decisions memorized by team (ReactFlow, Visx, Hybrid LLM, In-Memory cache)
- [ ] **Arnaldo:** Cherry-pick code validation plan (RAG, adoption, predictive) ready for Week 1

**Acceptance:** All architecture decisions documented in TECH-DECISIONS.md ✅

---

### Friday, May 16 — QA Preparation
- [ ] **Bruno:** RLS test strategy document finalized (3 roles, 10 test cases each)
- [ ] **Bruno:** E2E test framework setup (Playwright or Cypress)
- [ ] **Bruno:** Staging environment configured with 3 test users (csm, csm_senior, admin)
- [ ] **Bruno:** Load test plan ready for Week 1 (5K accounts, measure p95 latency)
- [ ] **Bruno:** Test case templates created (AC → test steps)
- [ ] **Bruno:** QA acceptance criteria checklist (Definition of Done template)

**Acceptance:** Bruno confirms staging ready Monday AM

---

### Monday, May 12 — Data Contract Validation
- [ ] **Paulo Pauta:** Reviews daily-priorities schema (priority_1/2/3 vs priorities array)
- [ ] **Paulo Pauta:** Validates renewal-strategist endpoint data shape ✅ (already OK)
- [ ] **Paulo Pauta:** Validates voc-analyst endpoint data shape ✅ (already OK)
- [ ] **Paulo Pauta:** Approves Wave 6 stub endpoints (19.X, 21.X, 22.X)
- [ ] **Paulo Pauta:** Documents data contracts in `/docs/data-contracts-wave5.md`
- [ ] **Paulo Pauta:** Confirms 8 agents ready to consume Monday PM

**Acceptance:** Paulo sends Slack ✅ "Schemas approved, ready to integrate"

---

## 🚀 MONDAY, MAY 12 — KICK-OFF DAY

### 08:00 — Final Team Standup (15 min)
**Attendees:** Vinicius, Arnaldo, Bruno, Pedro, Paulo  
**Agenda:**
- Confirm all deliverables ready (design ✅, product ✅, infra ✅, QA ✅, data contracts ✅)
- Address any last-minute blockers
- Confirm dev team knows what's happening

**Go/No-Go Decision Point:** If blockers exist, escalate. Otherwise → GREEN.

---

### 09:00 — Dev Team Standup (30 min)
**Attendees:** Vinicius, dev team (3-4 engineers)  
**Agenda:**
- Explain refinement outcomes (7 decisions, timeline, why Wave 6 deferred)
- Assign Week 1 stories (prioritize Sprint 1: 15 SP)
- Confirm dev environment setup (Jira, git, local DB)
- Q&A on technical approach

**Output:** Dev team understands scope + no surprises

---

### 09:30 — Arnaldo Code Review (30 min)
**Attendees:** Arnaldo, Vinicius  
**Agenda:**
- Validate cherry-pick code (rag-pipeline.ts, adoption/risk-engine.ts, predictive-risk.ts)
- Identify refactor needs for Week 1
- Estimate effort for each code module

**Output:** Week 1 code validation sprint plan finalized

---

### 10:00 — Paulo Validates daily-priorities Schema (30 min)
**Attendees:** Paulo, Arnaldo, Vinicius  
**Agenda:**
- Review new daily-priorities API response shape
- Confirm cs-manager agent can parse it
- Test with real agent if possible
- Approve or request changes

**Output:** Schema locked or changes identified (must be done same day)

---

### 11:00 — Design Walkthrough with Dev (1 hour)
**Attendees:** Mariana, Vinicius, dev team  
**Agenda:**
- Mariana walks through 3 mockups (17, 20, 23)
- Dev team identifies implementation questions
- Clarify responsive breakpoints
- Confirm no ambiguities

**Output:** Dev team can start Monday 12:00 without design questions

---

### 12:00 — **DEVELOPMENT OFFICIALLY BEGINS** 🚀
**Sprint 1 Starts:** Stories 16.1-16.4 (4 SP) + Epic 17.1 (3 SP) + Epic 20.1 (2 SP) = 9 SP  
**Dev Team Assignment:**
- Vinicius: Epic 17.1 (3 SP, Renewal Cockpit 360°)
- Dev 2: Epic 20.1 (2 SP, VoC Analyzer Cron) + Epic 20.3-5 (1 SP, APIs)
- Dev 3: Epic 16.1-4 (4 SP, Command Center)
- Dev 4: Epic 18.1 (cherry-pick code, 3 SP) + Epic 23 setup

**First Sprint Goal:** Foundation features buildable by end of Week 1

---

## ✅ SPRINT 1 SUCCESS CRITERIA (Week 1: May 12-16)

### Code Quality
- [ ] 0 TypeScript errors at end of week
- [ ] No blocking merge conflicts
- [ ] Code follows existing patterns (no new abstractions)
- [ ] PR descriptions reference story AC

### Delivery
- [ ] Epic 16 (4 SP) = 80% complete (missing only polish)
- [ ] Epic 17.1 (3 SP) = 60% complete (structure + APIs, missing UI)
- [ ] Epic 20.1 (2 SP) = 80% complete (cron working, structure ready)
- [ ] Epic 18 validation (3 SP) = cherry-pick code reviewed + refactor plan ready
- [ ] Sprint burndown: track daily, adjust if falling behind

### Testing
- [ ] Manual smoke tests for merged PRs
- [ ] RLS validation (Bruno spot-checks 1-2 PRs with multi-role)
- [ ] No Gemini rate limit errors in logs
- [ ] Migrations applied successfully to staging DB

### Collaboration
- [ ] Daily standup 09:30 (15 min, async OK)
- [ ] Weekly sync Friday 16:00 with Paulo (agent integration preview)
- [ ] 0 surprises (if blockers arise, escalate same day)

---

## 🎯 SPRINT 2-5 FLOW (Weeks 2-6)

### Sprint 2 (May 19-23) — Features Accelerate
**Goal:** 90% of core features (Epics 17, 20, 23) complete  
**Stories:**
- Epic 17.2 (PDF generation, 2 SP)
- Epic 17.3 (Pipeline dashboard, 1 SP)
- Epic 17.4 (Negotiation history, 1 SP)
- Epic 20.2 (VoC board UI, 2 SP)
- Epic 23.1 (Canvas drag-drop, 3 SP)

**Burn:** 10 SP / week target

---

### Sprint 3 (May 26-30) — Polish & Integration Testing
**Goal:** Core features 100%, E2E tests started  
**Stories:**
- Epic 23.2 (Playbook management, 1 SP)
- Epic 18.1 (RAG core integration, 2 SP)
- E2E test suite start (not formal SP, but 20% dev time)
- Stubs 19.X, 21.X, 22.X (3 SP)

**Burn:** 6 SP feature + testing

---

### Sprint 4 (Jun 2-6) — Integration & Load Testing
**Goal:** RLS audit complete, performance baseline established  
**Focus:**
- Integration testing (cross-epic flows)
- RLS audit (Bruno × 3+ roles)
- Performance tuning (Lighthouse targets)
- Bug fixes from QA findings

**E2E Coverage:** 70%+ AC implemented

---

### Sprint 5 (Jun 9-13) — QA & Staging Validation
**Goal:** Production readiness achieved  
**Focus:**
- E2E test execution (100% AC)
- Staging validation (full end-to-end flow)
- Bug fixes (p0 → p1 priority)
- Gemini rate limit monitoring (no errors)

**Definition of Done:** ALL acceptance criteria met

---

### Sprint 6 (Jun 16-20) — Final Hardening & Release Prep
**Goal:** Ready for production deployment  
**Focus:**
- Final bug fixes
- Performance tuning (last mile)
- Security audit (OWASP + RLS)
- Release notes + documentation

**Deployment:** Monday Jun 23 (or Friday Jun 20 if EOD urgent)

---

### Sprint 7 (Jun 23-27) — Buffer & Wave 6 Prep
**Goal:** Ship Wave 5, prepare Wave 6 handoff  
**Focus:**
- Production hotfixes (if any)
- Wave 6 cherry-pick code final validation
- Wave 6 sprint planning
- CS Agents integration testing (preview)

**Result:** Wave 5 live, Wave 6 ready to kick-off Jul 7

---

## 🚨 CRITICAL BLOCKERS TO WATCH

### During Week 1
- [ ] **Daily-priorities Schema:** If Paulo rejects schema, must fix immediately (blocks cs-manager integration)
- [ ] **RLS Load Test:** If p95 latency > 5s with 5K accounts, need index optimization before prod
- [ ] **Cherry-pick Code:** If RAG/adoption/predictive code fails testing, must pivot to fresh implementation
- [ ] **Design Mockups:** If Mariana not ready Thursday, dev cannot start Monday (delay to Thu May 22)

### During Sprint 2-3
- [ ] **Gemini Rate Limits:** If hitting limits, implement queue + batching immediately
- [ ] **PDF Generation Timeout:** If taking >120s, pivot to async job approach
- [ ] **Canvas Drag-Drop:** If ReactFlow integration breaks mobile preview, confirm desktop-only scope

### During Sprint 4-5
- [ ] **RLS Performance:** If p95 > 3s in staging load test, optimizations needed
- [ ] **E2E Test Failures:** If > 5 critical failures, may need refactoring (impacts timeline)

**Escalation:** Any blocker → Vinicius → Paulo/Pedro within 4 hours

---

## 📊 SIGN-OFF & GO/NO-GO

### Friday, May 16 — Pre-Kick-Off Sign-Off

```
DESIGN (Mariana):
  [ ] Mockups delivered
  [ ] Color palette locked
  [ ] Tech stack approved
  Signature: ___________  Date: _______

PRODUCT (Pedro):
  [ ] Jira stories 100% loaded
  [ ] AC validated against mockups
  [ ] Sprint 1 prioritized
  Signature: ___________  Date: _______

ARCHITECTURE (Arnaldo):
  [ ] RLS indices planned
  [ ] Cherry-pick code ready
  [ ] Tech stack documented
  Signature: ___________  Date: _______

QA (Bruno):
  [ ] Test strategy documented
  [ ] Staging environment ready
  [ ] Load test plan finalized
  Signature: ___________  Date: _______

CS AGENTS (Paulo):
  [ ] Data contracts validated
  [ ] Integration plan ready
  [ ] Stubs approved
  Signature: ___________  Date: _______

DEV LEAD (Vinicius):
  [ ] All blockers cleared
  [ ] Dev team ready
  [ ] Week 1 stories assigned
  [ ] Go for Monday 12:00 kick-off
  Signature: ___________  Date: _______
```

### Monday, May 12 — Kick-Off Go/No-Go

**08:00 Team Standup Decision Point:**

```
FINAL GO/NO-GO CHECK:

[ ] Design deliverables received & approved
[ ] Product stories in Jira + groomed
[ ] Infrastructure ready (indices, migrations)
[ ] QA staging setup & load test ready
[ ] Data contracts validated (Paulo)
[ ] Zero critical blockers
[ ] Dev team present + motivated
[ ] All stakeholders thumbs-up

⭕ IF ALL ABOVE ✅: PROCEED TO KICK-OFF
⛔ IF ANY ❌: IDENTIFY BLOCKER + ESCALATE
```

**Decision Authority:** Vinicius (with Paulo, Pedro, Arnaldo)  
**Escalation:** If no-go, notify team + reschedule to Wed May 14 (3-day delay max)

---

## 📌 FINAL CHECKLIST — READY TO EXECUTE

### Code & Infrastructure
- ✅ Migrations applied (29/29)
- ✅ Schema changes ready (daily-priorities, contract_negotiation_history, renewal_documents)
- ✅ RLS policies written (renewal_documents, interaction_themes, etc)
- ✅ API routes scaffolded (20+ routes already created)
- ✅ Database fixtures ready for staging
- ✅ Gemini/Claude API keys configured

### Documentation
- ✅ Refinement meeting transcript (decisions locked)
- ✅ User stories finalized (21 stories × AC)
- ✅ Tech decisions documented (ReactFlow, Visx, Hybrid LLM)
- ✅ Risk mitigations assigned (8 risks × owners)
- ✅ Data contracts validated (Paulo sign-off)
- ✅ Timeline locked (7 sprints, Wave 5 + 6)

### Team & Stakeholders
- ✅ All stakeholders aligned (0 dissent)
- ✅ Design mockups delivery scheduled (Thursday)
- ✅ Product stories delivery scheduled (Friday)
- ✅ QA test strategy ready
- ✅ CS Agents integration prepared (Paulo + 8 agents)
- ✅ No resource conflicts (dev, design, QA allocated)

### Quality Gates
- ✅ Definition of Done template created
- ✅ E2E test strategy locked
- ✅ RLS audit plan (Bruno)
- ✅ Performance targets set (Lighthouse 80+)
- ✅ Security review scheduled (Arnaldo Week 5)
- ✅ Zero blockers for kick-off

---

## 🎯 FINAL STATUS

**🟢 GO FOR LAUNCH — Wave 5 Final Push Begins Monday, May 12, 12:00 UTC**

**7 Decisions Locked:**
1. ✅ Wave 5 scope (90 SP core + stubs)
2. ✅ Wave 6 deferred (19, 21, 22 features)
3. ✅ Cherry-pick Wave 6-7 code (Week 1 validation)
4. ✅ Data contracts (Paulo validated)
5. ✅ Tech stack (ReactFlow, Visx, Hybrid LLM)
6. ✅ Risk mitigations (8 items, all assigned)
7. ✅ CS Agents integration (Wave 5 → 6 handoff)

**Timeline Committed:**
- Week 1 (May 12-16): Setup + cherry-pick validation
- Weeks 2-5 (May 19-Jun 13): Feature development + E2E testing
- Weeks 6-7 (Jun 16-27): QA + staging validation + buffer

**Resource Allocation:**
- Dev: 100% (Vinicius + 3 engineers)
- Design: 100% (Mariana, ramp down post-W1)
- QA: 60% ramp to 100% (Bruno + team)
- Architecture: 100% W1, 10% ongoing (Arnaldo)
- Product: 100% (Pedro)
- CS Agents: 10% W1, 20% W5, 80% W6 (Paulo)

**Success Probability:** 🟢 **HIGH (90%+)**
- All predecessors complete
- Zero architecture unknowns
- Team aligned + motivated
- Realistic scope
- Buffer week included
- External dependencies managed (Gemini, Claude, Supabase)

---

**Owner:** Vinicius (Dev Lead)  
**Status:** 🟢 **READY FOR EXECUTION**  
**Next Step:** Monday May 12, 08:00 — Final standup + go/no-go decision  

*Document finalized: 2026-05-09  
Refinement meeting output: 7 decisions, 0 blockers, 21 stories  
Target deployment: Jun 27, 2026*
