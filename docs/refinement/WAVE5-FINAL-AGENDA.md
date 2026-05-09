# 🎯 Wave 5 Final Refinement — Agenda Reunião

**Data:** [Data aqui]  
**Duração:** 2 horas  
**Participantes:** Paulo Pauta, Pedro Prioriza, Arnaldo (Arq), Design, QA, Dev Lead  
**Output:** Execution plan assinado para onda final

---

## 📊 ESTADO ATUAL

### Concluído ✅
- Epic 16: Command Center (home, briefing, priorities, FAB)
- Epic 17: Renewal Cockpit skeleton (page, client, APIs)
- Epic 20: VoC Intelligence skeleton (cron, board)
- Epic 23: Playbook Builder UI skeleton
- Epics 36-38: Pré-condições (roles, settings, dates)
- **Migrations:** 29/29 Wave 5 aplicadas

### Faltando Implementação ⏳
- **Epic 18:** RAG Intelligence Modes (13 SP) — BLOQUEANTE para 19-22
- **Epic 19:** Adoption Intelligence (21 SP)
- **Epic 21:** CS Ops Excellence (20 SP)
- **Epic 22:** Smart Alerts (16 SP)
- **Epic 23:** Playbook Excellence (polimento, A/B testing)

### Documentação 📝
- README.md: Atualizar Wave 5 status
- docs/product/: Atualizar feature status

---

## 🚨 DECISÕES CRÍTICAS

### 1. Scope: Epics 18-22 nesta onda ou adiar?

**Opção A:** Inclua todas (173 SP Wave 5 = 4 meses, com pq aggressive)
- **Pro:** Launch completo em Julho
- **Con:** Risco quality, dev burnout

**Opção B:** Core only (16+17 = 34 SP = 1.5 meses, soft)
- **Pro:** Qualidade, menos risco
- **Con:** Epics 18-22 ficam para Wave 6 (atrasa inteligência)

**Recomendação:** Opção C (Híbrida)
- Epic 18 (RAG core, 4 SP) + Epic 20 (VoC, 5 SP) agora
- Epics 19, 21, 22 adiam para Wave 6 start (Julho)

---

### 2. Prioridade de QA

**Críticos (E2E + API tests):**
- [ ] RLS com múltiplas roles (admin, head_cs, csm_senior, csm)
- [ ] Cron reliability (home-priorities, daily-briefing, voc-analyze)
- [ ] PDF generation (timeout, Gemini error handling)
- [ ] Playbook canvas (drag-drop, save/load flow)

**Secundários (Manual + Smoke):**
- [ ] Adoption delta calculation
- [ ] Health chart rendering (12m data)
- [ ] NPS feed scrolling

---

### 3. Tech Stack Decisions

| Question | Options | Decision |
|----------|---------|----------|
| Playbook Canvas | ReactFlow vs custom div-based | ⏳ **Design input?** |
| Adoption Heatmap | Recharts vs D3 vs custom SVG | ⏳ **Design input?** |
| RAG LLM | Gemini vs Claude vs OpenAI | ⏳ **Dev input?** |
| VoC Cache | Redis vs in-memory vs none | ⏳ **Arquiteto input?** |
| Mobile MVP | Start now vs Wave 7 only | ⏳ **Business input?** |

---

### 4. Data Contracts (Paulo Pauta critical!)

**Epic 16 → CS Agents (Command Center)**
- Input: Daily priorities JSON schema
- Output: Expected by cs-manager agent
- **NEEDS:** Paulo Pauta validation before dev

**Epic 17 → Renewal Strategist Agent**
- Input: Renewal Cockpit data structure
- Output: Expected format for agent
- **NEEDS:** Paulo Pauta sign-off

**Epic 20 → VoC Analyst Agent**
- Input: Sentiment scores + themes
- Output: VoC Board format
- **NEEDS:** Paulo Pauta validation

---

## ✅ DEFINIÇÃO DE DONE

**Antes de commit final:**
1. [ ] `tsc --noEmit` = 0 errors
2. [ ] E2E tests: 100% pass rate
3. [ ] RLS: tested com 3 roles
4. [ ] API: status codes corretos (200/201/400/401/403/500)
5. [ ] Migrations: applied + tested em staging
6. [ ] README.md: atualizado
7. [ ] docs/product/: atualizado
8. [ ] Lighthouse: >= 80 core vitals
9. [ ] CLS < 0.1 (no layout shift)

---

## 🗓️ PROPOSTA DE TIMELINE

```
SEMANA 1 (Refinement):
  ✓ Reunião 2h (hoje)
  ✓ Tech decisions finalizadas
  ✓ Design mockups locked
  ✓ QA test plan assinado
  → DEV KICK-OFF

SEMANA 2-3 (Epic 18 + VoC core):
  Grupo A: RAG modes (4 SP) + highlights API
  Grupo B: VoC analyzer cron + board
  
SEMANA 4-5 (Epic 17 full + Epic 23 polish):
  Grupo A: Renewal Cockpit full 6 seções
  Grupo B: Playbook Builder drag-drop + canvas
  
SEMANA 6-7 (QA + Integration):
  QA: Full E2E suite
  Dev: Fixos, performance tuning
  
SEMANA 8 (Deploy + Buffer):
  Staging validation
  Production release
  Wave 6 starts in parallel
```

---

## 📌 NEXT STEPS AFTER THIS MEETING

1. **Paulo Pauta:** Validar data contracts (30 min)
2. **Design:** Lock mockups para Adoption + CS Ops (45 min)
3. **QA:** Criar Jira test plan com story mapping (1h)
4. **Dev:** Setup sprints, assign stories (30 min)
5. **Arnaldo:** RLS review em 36-38 + new epics (45 min)

---

**Reunião encerra quando todos os 🚨 têm resposta.**
