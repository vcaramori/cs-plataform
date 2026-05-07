# Wave 4 Kick-off — Automação Proativa

**Data:** 2026-05-07  
**Facilitador:** Vinicius (CS Lead)  
**Audience:** Arnaldo (Arquiteta), Davi (Deploy), Tim de Dev  
**Duração estimada:** 2 semanas (14 SP) — 2 sprints de 1 semana cada

---

## 📋 Escopo Wave 4 (3 Stories Sequenciais)

```
Story 23.1 (3 SP) → Story 14.2 (3 SP) → Story 15.1 (8 SP)
 Playbook          Playbook Alert    Auto Check-in
 Governance        (Health Trigger)   (Silence-based)
```

**Ordem obrigatória:** Não há paralelização — executar em série.

---

## 🎯 Objetivos Wave 4

✅ **Governança de Playbooks:** Rastrear atribuição, cronograma e esforço (23.1)  
✅ **Automação por Health:** Criar alertas quando saúde cai crítica, com CTA para iniciar playbook (14.2)  
✅ **Reengajamento Automático:** Detectar contas silenciosas, gerar email por IA, CSM aprova/edita/envia (15.1)

**Impacto:** Reduz trabalho manual de CSM em ~8h/semana por 100 contas (reengajamento + playbook orchestration)

---

## 🔧 Arquivos Críticos a Tocar

### Story 23.1 — Playbook Governance

| Tipo | Arquivo | Mudança |
|------|---------|---------|
| **Migration** | `supabase/migrations/20260507_story_23_1_playbook_governance.sql` | ✨ NOVO |
| **Types** | `src/lib/supabase/types.ts` | 🔧 Estender `PlaybookTask`, `AccountPlaybookTask`, `AccountPlaybook` |
| **Component** | `src/app/(dashboard)/accounts/[id]/components/PlaybookWidget.tsx` | 🔧 Badges, time tracker, due date |
| **Component** | `src/app/(dashboard)/accounts/[id]/components/PlaybookHistoryModal.tsx` | 🔧 Comments thread, time spent, objectives |
| **API** | `src/app/api/account-playbooks/[id]/tasks/[taskId]/route.ts` | 🔧 Aceitar `time_spent_hours` e `comment` |

**Risco técnico:** Baixo — apenas extensão de schema + UI. Campos nullable para compatibilidade.

---

### Story 14.2 — Playbook Trigger Alert

| Tipo | Arquivo | Mudança |
|------|---------|---------|
| **Types** | `src/lib/supabase/types.ts` | 🔧 Adicionar `'playbook_trigger'` ao enum `AlertType` |
| **Migration** | `supabase/migrations/20260507_story_14_2_playbook_trigger_alert.sql` | ✨ NOVO (apenas ADD VALUE ao enum) |
| **Service** | `src/lib/alerts/alert-service.ts` | 🔧 Novo método `checkPlaybookTrigger()` |
| **Service** | `src/lib/alerts/alert-service.ts` | 🔧 Chamar novo método em `evaluateAllAlerts()` |
| **Component** | `src/components/alerts/AlertCenter.tsx` | 🔧 Renderizar botão "Iniciar Playbook" para alerta type=playbook_trigger |
| **API** | (já existe) `src/app/api/accounts/[id]/playbooks/route.ts` | ✅ Sem mudança (endpoint já cria playbook) |
| **Cron** | (já existe) `src/app/api/cron/proactive-alerts/route.ts` | ✅ Sem mudança (já chama AlertService.evaluateAllAlerts) |

**Risco técnico:** Baixo — novo tipo de alerta segue padrão existente. Idempotência crítica (unique constraint no DB).

---

### Story 15.1 — Auto Check-in por Silêncio

| Tipo | Arquivo | Mudança |
|------|---------|---------|
| **Migration** | `supabase/migrations/20260507_story_15_1_auto_checkin.sql` | ✨ NOVO (tabela `auto_checkin_queue`) |
| **Constantes** | `src/lib/constants.ts` | 🔧 `AUTO_CHECKIN_SILENCE_DAYS`, timeouts |
| **Cron Route** | `src/app/api/cron/auto-checkin/generate/route.ts` | ✨ NOVO |
| **Cron Route** | `src/app/api/cron/auto-checkin/send/route.ts` | ✨ NOVO |
| **Email Service** | `src/lib/email/auto-checkin.ts` | ✨ NOVO |
| **Component** | `src/components/alerts/AlertCenter.tsx` | 🔧 Aba "Check-ins Pendentes" OU seção em `/esforco` |
| **API** | `src/app/api/auto-checkin/[id]/route.ts` | ✨ NOVO (PATCH para approve/edit/cancel) |
| **Cron Config** | (externo) Job scheduler | 🔧 Agendar 2 novos endpoints |

**Risco técnico:** ALTO — complexidade Gemini + SMTP + estado distribuído (fila). Requer pairing session com Davi.

---

## 🔗 Dependências Técnicas

```
Story 23.1 (Governance)
    ↓ (migração deve rodar primeiro)
Story 14.2 (Playbook Alert)
    ↓ (pode testar isoladamente)
Story 15.1 (Auto Check-in)
    ↓ (depende de Email Service + Gemini)
```

### Pré-requisitos antes de iniciar

- [ ] Supabase migrations podem rodar (`supabase db push`)
- [ ] Gemini API funciona e `generateText()` está disponível em `src/lib/llm/gateway.ts`
- [ ] SMTP configurado (Office 365): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- [ ] nodemailer instalado (`npm list nodemailer`)
- [ ] Cron scheduler configurado (Vercel Cron ou similar)
- [ ] Banco de testes (staging) disponível para migrations

---

## 📊 Estimativas + Breakdown

### Story 23.1 — Playbook Governance (3 SP)

| Task | Est. | Owner | Notes |
|------|------|-------|-------|
| Migration + RLS | 4h | Arnaldo | Schema simple, campos nullable |
| Type updates | 2h | Dev | TypeScript apenas |
| PlaybookWidget + PlaybookHistoryModal | 6h | Dev | UI pequena, reusa componentes existentes |
| API PATCH estender | 2h | Dev | Endpoint simples, sem lógica complexa |
| Testes E2E (7 TCs) | 4h | QA/Dev | Playwright, fixtures simples |
| **Total** | **18h** | — | ≈ 2-3 dias 1 dev |

---

### Story 14.2 — Playbook Trigger Alert (3 SP)

| Task | Est. | Owner | Notes |
|------|------|-------|-------|
| AlertType enum + migration | 1h | Arnaldo | 1 linha SQL |
| `AlertService.checkPlaybookTrigger()` | 4h | Dev | Lógica: health < 50, sem playbook ativo, sem alerta dupe |
| AlertCenter UI button | 3h | Dev | Condicional no render existente |
| Integrate em `evaluateAllAlerts()` | 1h | Dev | 1 linha de código |
| Testes E2E (8 TCs) | 5h | QA/Dev | Unit (idempotência) + E2E |
| **Total** | **14h** | — | ≈ 2 dias 1 dev |

---

### Story 15.1 — Auto Check-in (8 SP)

| Task | Est. | Owner | Notes |
|------|------|-------|-------|
| Migration `auto_checkin_queue` + RLS | 3h | Arnaldo | Schema simples, índices |
| Constantes (tier silence days) | 1h | Dev | Config simples |
| Cron `generate` (Gemini, lógica complexa) | 8h | Dev | **PAIRING com Davi** — contexts, Gemini prompt, business hours calc |
| Cron `send` (SMTP, time_entry log) | 5h | Dev | Email dispatch, idempotência |
| Email service nodemailer | 2h | Dev | Wrapper simples |
| UI AlertCenter aba | 6h | Dev | Lista, timer, buttons (approve/edit/cancel) |
| API PATCH endpoint | 3h | Dev | Validações simples |
| Testes E2E (13 TCs) | 8h | QA/Dev | **PAIRING com QA** — Gemini mocks, timer logic |
| **Total** | **36h** | — | ≈ 4-5 dias (2 devs, com pairing) |

---

### Sequência Recomendada (2 semanas)

```
SEMANA 1:
  Day 1: Story 23.1 migration + types (Arnaldo + Dev A)
  Day 2: Story 23.1 UI + API (Dev A + Dev B)
  Day 3: Story 23.1 testes E2E (QA + Dev A) — MERGE
  Day 4: Story 14.2 migration + AlertService (Arnaldo + Dev A)
  Day 5: Story 14.2 UI + testes (Dev B + QA) — MERGE

SEMANA 2:
  Day 1: Story 15.1 migration + constants (Arnaldo + Dev A)
  Day 2: Story 15.1 cron `generate` (Dev B PAIRING com Davi) — **CRITICAL**
  Day 3: Story 15.1 cron `send` + email service (Dev A)
  Day 4: Story 15.1 UI + API (Dev B)
  Day 5: Story 15.1 testes E2E (QA PAIRING com Dev) + final review — MERGE
```

---

## 🧪 Teste Strategy

### Camadas

| Camada | Ferramental | Quando |
|--------|-------------|--------|
| **Unit** | vitest (se criado) | Depois de cada método (AlertService, business hours calc) |
| **API** | Playwright API routes | Depois de cada endpoint |
| **E2E** | Playwright full browser | Antes de merge de cada story |
| **Smoke** | Browser manual | 5 min antes de marcar story como done |

### Fixtures de Teste

**Story 23.1:**
- Conta com 1 playbook ativo (in_progress)
- 3 tasks de tipos distintos (manual, email, review)
- CSM owner validado

**Story 14.2:**
- Conta com health_score_v2 = 45 (crítica)
- Sem playbook ativo
- Sem alerta existente do tipo playbook_trigger

**Story 15.1 (complexa):**
- Conta Enterprise sem interação há 15 dias
- Conta SMB sem interação há 25 dias (não dispara)
- Conta com ticket aberto (não dispara)
- Conta com interação futura em 3 dias (não dispara)
- Conta com opt_out_auto_checkin = true (não dispara)
- Gemini mock: retorna JSON válido `{ subject, body }`
- SMTP mock: simula envio sem queimar quota

---

## 🚨 Riscos + Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|-------------|--------|-----------|
| Gemini prompt inconsistente (15.1) | Alta | Alto | Pairing dev+prompt engineer; validar prompt no sandbox antes |
| SMTP failure silencioso (15.1) | Média | Alto | Implementar retry logic + log detalhado; testar Office 365 antes |
| RLS policy bug em 23.1 | Baixa | Alto | Testar RLS com múltiplos usuários; validar unit tests |
| Business hours calculation errada (15.1) | Média | Médio | Unit test isolado; cobertura de casos edge (fds, antes/depois horário) |
| Idempotência cron falha (14.2, 15.1) | Baixa | Alto | Executar cron 2x consecutivas; validar que resultado é idêntico |
| Migração não é reversível (23.1, 14.2, 15.1) | Baixa | Médio | Testar `supabase migration down` antes de merge |

---

## ✅ Definition of Done — Wave 4

Para cada story estar "done":

### Code
- [x] Código escrito + reviewed (1 revisor mínimo)
- [x] Types TypeScript atualizados (`tsc --noEmit` passa)
- [x] Migration criada + reversível (`supabase db push` + `down`)
- [x] RLS policies atualizadas (se banco novo)
- [x] Sem `any` types (exceto legado)
- [x] Sem console.error ou logs desnecessários em produção

### Testes
- [x] Todos os TCs da story passam (Playwright)
- [x] Nenhum teste existente quebrou
- [x] Coverage > 70% em código novo (se vitest usado)
- [x] Cron testado: executado 2x, resultado idêntico (idempotência)

### Documentação
- [x] README.md atualizado (novas variáveis de env, scripts, endpoints)
- [x] docs/product/epics.md marcado como ✅ CONCLUÍDO
- [x] docs/product/XX.md (especificação de regras) atualizado se necessário
- [x] Comentários no código para lógica não-óbvia (ex: business hours calc)

### Qualidade
- [x] Smoke test: feature aberta no browser, golden path exercitado (5 min)
- [x] Sem quebras visuais em múltiplos breakpoints
- [x] Sem performance regressions (Lighthouse score)
- [x] RLS validado: CSM não vê dados de outro CSM

---

## 📅 Timeline Estimada

```
Sprint 1 (Semana 1):
  Story 23.1: 3 SP
  Story 14.2: 3 SP
  ───────────────────────
  Total: 6 SP

Sprint 2 (Semana 2):
  Story 15.1: 8 SP
  ───────────────────────
  Total: 8 SP

Wave 4 Complete: 14 SP ≈ 2 sprints de 1 semana = ~2 semanas
```

**Critical Path:** Story 15.1 (8 SP) — não há paralelização. Atenção com cron `generate` (8h).

---

## 🔄 Processo de Merge

1. **Feature branch:** `feature/wave4-story-{number}`
2. **Pré-merge checklist:**
   - [ ] Todos os TCs passam
   - [ ] README.md + epics.md atualizado
   - [ ] 1 reviewer aprova (Arnaldo ou Davi)
   - [ ] Migration testada (push + down)
3. **Merge strategy:** Squash (manter história limpa)
4. **Deploy:** Manual para staging primeiro; validar crons em staging; depois production

---

## 👥 Escalação

| Cenário | Ação | Responsável |
|---------|------|-------------|
| Gemini prompt não gera email válido (15.1) | Pairing com LLM specialist | Vinicius + Dev |
| SMTP Office 365 falha | Validar credentials; testar com Postman | Davi + DevOps |
| RLS policy bug em produção | Rollback via `supabase migration down`; investigar | Arnaldo + Davi |
| Performance cron timeout (15.1) | Aumentar `maxDuration` ou paralelizar lotes | Davi + Dev |

---

## 📞 Comunicação

- **Daily standup:** 10:00 (Arnaldo + Davi + Tim dev)
- **Pairing sessions:** Story 15.1 `generate` cron (Dev + Davi) — 2h dia 2 da semana 2
- **QA pairing:** Story 15.1 testes Gemini mocks (QA + Dev) — 2h dia 4
- **Weekly review:** Sexta 16:00 — demo staging + lessons learned

---

## 🎬 Próximo Passo

**Reunião de Kick-off:** Amanhã (2026-05-08) 10:00  
**Agenda:**
1. Overview do documento (10 min)
2. Q&A técnicas (15 min)
3. Validação de pré-requisitos (10 min)
4. Atribuição de tasks (10 min)
5. Agendamento de pairing sessions (5 min)

**Documentos de referência:**
- [`docs/product/refinement-wave4-wave5.md`](refinement-wave4-wave5.md) — Critérios de Aceitação detalhados
- [`docs/product/epics.md`](epics.md) — Status do roadmap
- [`README.md`](../../README.md) — Stack + Environment

---

**Status:** ✅ Pronto para execução.
