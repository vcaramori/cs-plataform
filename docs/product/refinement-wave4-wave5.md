# Refinement Wave 4 + Wave 5 — Documento Colaborativo

**Data:** 2026-05-07  
**Facilitadores:** Pedro Prioriza (PM), Paulo Pauta (PO)  
**Participantes:** Mário Mentor, Rita Resgate, Edu Expansão, Alice Adoção, Renato Renova, Vera Valor, Vico Voz, Otto Ops (CS Agents Pack); Arnaldo Arquiteta, Davi Deploy, Vinicius (CS Lead)  
**Versão:** 1.0 — Refinement Completo

---

## 📋 Índice

1. [Wave 4 — Automação Proativa](#wave-4--automação-proativa) (3 stories)
2. [Wave 5 — Pré-Condições Arquiteturais](#wave-5--pré-condições-arquiteturais) (Epic 36, 37, 38)
3. [Wave 5 — Core CS Intelligence](#wave-5--core-cs-intelligence) (Epics 16-23)
4. [Plano de Testes Integrado](#plano-de-testes-integrado)
5. [Sequência de Execução](#sequência-de-execução)
6. [Verificação Pós-Implementação](#verificação-pós-implementação)

---

## Wave 4 — Automação Proativa

> **Status:** 3 stories pendentes de implementação  
> **Sequência:** 23.1 → 14.2 → 15.1 (obrigatória)  
> **Sizing Total:** 14 SP ≈ 1.5 sprints  
> **Resposta PM:** Pedro Prioriza  
> **Arquitetura:** Arnaldo, Deploy: Davi

---

### Story 23.1 — Playbook Governance Foundation

**Status:** 🔄 PENDENTE — PRIMEIRO

**Persona responsável:** Arnaldo (Arquiteta), Rita Resgate (Alert Designer)

**Contexto:**  
Playbooks (sequências táticas de tarefas por conta) existem no banco desde Waves passadas, mas sem estrutura de governança. Story 23.1 adiciona campos para rastrear atribuição, cronograma, esforço estimado vs. real, e comentários — transformando playbooks em documentos auditáveis e controláveis.

---

#### Critérios de Aceitação (ACs)

**AC 1 — Schema de Banco (Migration)**

Nova migration `20260507_story_23_1_playbook_governance.sql`:

```sql
-- playbook_tasks: novos campos
ALTER TABLE playbook_tasks ADD COLUMN assigned_role VARCHAR(50);
ALTER TABLE playbook_tasks ADD COLUMN due_days_from_start INT;
ALTER TABLE playbook_tasks ADD COLUMN estimated_hours DECIMAL(5,2);
ALTER TABLE playbook_tasks ADD COLUMN feature_tags TEXT[];

-- account_playbook_tasks: novos campos
ALTER TABLE account_playbook_tasks ADD COLUMN assigned_to UUID REFERENCES auth.users(id) DEFERRABLE;
ALTER TABLE account_playbook_tasks ADD COLUMN due_date TIMESTAMPTZ;
ALTER TABLE account_playbook_tasks ADD COLUMN completed_by UUID REFERENCES auth.users(id) DEFERRABLE;
ALTER TABLE account_playbook_tasks ADD COLUMN comments JSONB DEFAULT '[]';
ALTER TABLE account_playbook_tasks ADD COLUMN time_spent_hours DECIMAL(5,2);

-- account_playbooks: novos campos
ALTER TABLE account_playbooks ADD COLUMN expected_end_date TIMESTAMPTZ;
ALTER TABLE account_playbooks ADD COLUMN objective TEXT;
ALTER TABLE account_playbooks ADD COLUMN success_criteria TEXT;

-- RLS: sem mudança necessária (novos campos herdam policies das tabelas)
```

**Notas de implementação:**
- Todos os novos campos são **NOT NULL = FALSE** (nullable) para não quebrar instâncias existentes
- FK `assigned_to` é DEFERRABLE — permite NULL sem violar constraint
- `comments` é JSONB array — permite thread de comentários: `[{ author_id, text, created_at }, ...]`

---

**AC 2 — TypeScript Types**

Atualizar `src/lib/supabase/types.ts`:

```typescript
export type PlaybookTask = {
  // ... campos existentes
  assigned_role?: 'csm' | 'manager' | 'ops' | null
  due_days_from_start?: number | null
  estimated_hours?: number | null
  feature_tags?: string[] | null
}

export type AccountPlaybookTask = {
  // ... campos existentes
  assigned_to?: string | null  // UUID
  due_date?: string | null  // TIMESTAMPTZ
  completed_by?: string | null  // UUID
  comments?: Array<{
    author_id: string
    text: string
    created_at: string
  }> | null
  time_spent_hours?: number | null
}

export type AccountPlaybook = {
  // ... campos existentes
  expected_end_date?: string | null  // TIMESTAMPTZ
  objective?: string | null
  success_criteria?: string | null
}
```

---

**AC 3 — UI: PlaybookWidget Atualizado**

**Arquivo:** `src/app/(dashboard)/accounts/[id]/components/PlaybookWidget.tsx`

**Mudanças:**
1. Ao renderizar cada task na lista de tasks, exibir badge com `assigned_role` (ex: `CSM`, `Manager`, `Ops`) quando não-null
2. Se task tem `due_date` (calculado de `account_playbooks.started_at + playbook_tasks.due_days_from_start`), exibir em cor vermelha/amarela se vencida/próxima
3. Input para `time_spent_hours` ao completar task:
   - Modal: "Você gastou quantas horas nesta tarefa?"
   - Salva em `PATCH /api/account-playbooks/[id]/tasks/[taskId]` com `{ time_spent_hours: number }`
4. Exibir "Horas estimadas: X / Horas gastas: Y" no footer do widget

---

**AC 4 — UI: PlaybookHistoryModal Atualizado**

**Arquivo:** `src/app/(dashboard)/accounts/[id]/components/PlaybookHistoryModal.tsx`

**Mudanças:**
1. Header: exibir `objective`, `success_criteria` (se preenchidos no playbook)
2. Para cada task completada, exibir:
   - Nome da task + `assigned_role` badge
   - `completed_by` como badge (nome do usuário via lookup em `profiles`)
   - `comments` como thread (estilo Slack): cada comentário é um item com avatar, nome, texto e timestamp
   - `time_spent_hours` como label "X horas gastas"
3. Button "Adicionar Comentário" no final da thread — abre campo de input, salva via API

---

**AC 5 — API: Estender PATCH `/api/account-playbooks/[id]/tasks/[taskId]`**

Permitir corpo com campos:
```json
{
  "status": "pending" | "completed" | "skipped",
  "notes": "string",
  "time_spent_hours": number,
  "comment": "string"  // novo — adiciona à array comments
}
```

Response:
```json
{
  "id": "task-id",
  "status": "completed",
  "time_spent_hours": 2.5,
  "completed_at": "2026-05-07T15:30:00Z",
  "completed_by": "user-id",
  "comments": [...]
}
```

---

#### Plano de Testes

| # | TC | Tipo | Passos | Esperado |
|---|----|----|--------|----------|
| 1 | TC-23.1-01 | DB | Rodar migration em staging | Sem erros; campos adicionados com tipos corretos |
| 2 | TC-23.1-02 | DB | Query playbook_tasks existentes | `assigned_role` é NULL (compatível para trás) |
| 3 | TC-23.1-03 | API | `PATCH /api/.../tasks/[id]` com `time_spent_hours: 2.5` | Campo salvo; response contém campo |
| 4 | TC-23.1-04 | E2E | Abrir PlaybookWidget → completar task com `time_spent_hours` | Widget exibe "Horas gastas: 2.5" |
| 5 | TC-23.1-05 | E2E | Renderizar PlaybookWidget com `assigned_role = 'manager'` | Badge "Manager" visível |
| 6 | TC-23.1-06 | E2E | Abrir PlaybookHistoryModal → adicionar comentário | Comentário salvo; thread exibida |
| 7 | TC-23.1-07 | Smoke | Abrir conta com playbook ativo | Sem quebras de rendering |

---

#### Definição de Done

- [x] Migration criada e reversível
- [x] Types attualizados
- [x] PlaybookWidget renderiza sem erros
- [x] PlaybookHistoryModal renderiza sem erros
- [x] API endpoint aceita `time_spent_hours`
- [x] Todos os TCs passam
- [x] README.md atualizado (seção Playbooks)
- [x] docs/product/epics.md marcado como REFINADO

---

#### Sizing

**3 Story Points** — Migration simples, 2 componentes UI, 1 endpoint estendido

---

### Story 14.2 — Gatilho por Health Score (Playbook Alert)

**Status:** 🔄 PENDENTE — SEGUNDO

**Persona responsável:** Mário Mentor (CS Coaching), Rita Resgate (Alert Design)

**Contexto:**  
Quando a saúde de uma conta cai para nível crítico (health_score_v2 < 50), o sistema cria um alerta no AlertCenter com botão "Iniciar Playbook". O CSM pode clicar para instanciar automaticamente o playbook de salvamento. Lógica distinta do trigger DB existente que cria playbook em health < 40 — 14.2 é mais lenient (50 vs 40) e gera alerta (aprovação explícita) vs. criação automática.

---

#### Critérios de Aceitação

**AC 1 — Novo AlertType**

Adicionar ao enum `AlertType` em `src/lib/supabase/types.ts`:

```typescript
export type AlertType =
  | 'churn_risk' | 'silent_customer' | 'renewal_upcoming'
  | 'adoption_anomaly' | 'expansion_signal' | 'nps_detractor_unactioned'
  | 'playbook_trigger'  // ← NOVO
```

Atualizar migration `030_f3_02_proactive_alerts.sql`:
```sql
ALTER TYPE alert_type ADD VALUE 'playbook_trigger';
```

---

**AC 2 — AlertService: Novo Método**

Adicionar em `src/lib/alerts/alert-service.ts`:

```typescript
async checkPlaybookTrigger(accountId: string): Promise<void> {
  // 1. Fetch health_score_v2 da conta
  const account = await supabase
    .from('accounts')
    .select('id, health_score_v2')
    .eq('id', accountId)
    .single()

  if (!account.data || account.data.health_score_v2 >= 50) {
    return  // não dispara
  }

  // 2. Verificar se já existe playbook ativo (in_progress)
  const activePlaybook = await supabase
    .from('account_playbooks')
    .select('id')
    .eq('account_id', accountId)
    .eq('status', 'in_progress')
    .single()

  if (activePlaybook.data) {
    return  // não dispara se playbook já ativo
  }

  // 3. Verificar se já existe alerta não-resolvido do tipo playbook_trigger
  const existingAlert = await supabase
    .from('proactive_alerts')
    .select('id')
    .eq('account_id', accountId)
    .eq('type', 'playbook_trigger')
    .is('resolved_at', null)
    .single()

  if (existingAlert.data) {
    return  // idempotência — não cria duplicado
  }

  // 4. Inserir alerta
  await supabase.from('proactive_alerts').insert({
    account_id: accountId,
    type: 'playbook_trigger',
    severity: 'warning',
    message: `Saúde da conta crítica (${account.data.health_score_v2.toFixed(1)}). Considere iniciar o playbook de salvamento.`,
    metadata: {
      recommended_playbook: '11111111-1111-1111-1111-111111111111',  // ID template "Salvamento de Conta - Risco Alto"
      health_score: account.data.health_score_v2,
    },
  })
}
```

Atualizar `AlertService.evaluateAllAlerts()`:

```typescript
async evaluateAllAlerts(accountId: string): Promise<void> {
  // ... checks existentes
  await this.checkPlaybookTrigger(accountId)  // ← NOVO, executar por último
}
```

---

**AC 3 — Cron Integração**

O cron `POST /api/cron/proactive-alerts` já chama `evaluateAllAlerts` — sem mudança necessária.

Sequência existente no `health-score-daily`:
```
1. Calcular health_score_v2 para todas as contas
2. Salvar em `health_scores` + atualizar `accounts.health_score_v2`
3. Chamar cron `proactive-alerts` que chama `AlertService.evaluateAllAlerts`
```

---

**AC 4 — UI: AlertCenter Botão "Iniciar Playbook"**

**Arquivo:** `src/components/alerts/AlertCenter.tsx`

**Mudanças:**
1. Ao renderizar card de alerta com `type = 'playbook_trigger'`, exibir botão CTA "Iniciar Playbook"
2. Botão chama função `handleInitiatePlaybook(alertId, accountId, playbook_id)`:
   ```typescript
   const handleInitiatePlaybook = async (alertId: string, accountId: string, playbookId: string) => {
     // 1. POST /api/accounts/[accountId]/playbooks { template_id: playbookId }
     const response = await fetch(`/api/accounts/${accountId}/playbooks`, {
       method: 'POST',
       body: JSON.stringify({ template_id: playbookId }),
     })
     
     // 2. Resolve alert: PATCH /api/proactive-alerts/[alertId]/resolve
     await fetch(`/api/proactive-alerts/${alertId}/resolve`, { method: 'PATCH' })
     
     // 3. Navegar para conta: router.push(`/accounts/${accountId}`)
     router.push(`/accounts/${accountId}`)
   }
   ```
3. Toast de sucesso: "Playbook iniciado! Redirecionando..."
4. Remover card do AlertCenter (alert resolvido)

---

#### Plano de Testes

| # | TC | Tipo | Passos | Esperado |
|---|----|----|--------|----------|
| 1 | TC-14.2-01 | Unit | Chamar `checkPlaybookTrigger(accountId)` com health_score_v2 = 45 | Alerta criado |
| 2 | TC-14.2-02 | Unit | Chamar 2x consecutivas — mesma conta | Apenas 1 alerta (idempotência) |
| 3 | TC-14.2-03 | Unit | Chamar com health_score_v2 = 60 (saudável) | Sem alerta |
| 4 | TC-14.2-04 | Unit | Chamar com playbook ativo já existe | Sem alerta |
| 5 | TC-14.2-05 | API | `POST /api/cron/proactive-alerts` com 5 contas; 2 com health < 50 | 2 alertas criados (idempotente se rodado 2x) |
| 6 | TC-14.2-06 | E2E | Conta com health = 45 → AlertCenter | Alerta visível com tipo "playbook_trigger" |
| 7 | TC-14.2-07 | E2E | Clicar "Iniciar Playbook" → playbook criado, alert resolvido | `account_playbooks.status = 'in_progress'`, alert desaparece |
| 8 | TC-14.2-08 | Smoke | Navegar conta após iniciar playbook | PlaybookWidget visível |

---

#### Definição de Done

- [x] AlertType enum atualizado
- [x] Migration adicionada
- [x] AlertService.checkPlaybookTrigger implementado
- [x] AlertService.evaluateAllAlerts chama novo método
- [x] AlertCenter renderiza botão corretamente
- [x] Fluxo de click funciona (cria playbook, resolve alerta, navega)
- [x] Todos os TCs passam
- [x] README.md atualizado (seção Alertas)

---

#### Sizing

**3 Story Points** — Novo método AlertService, novo AlertType, UI mínima no AlertCenter

---

### Story 15.1 — Check-in Automático por Silêncio

**Status:** 🔄 PENDENTE — TERCEIRO

**Persona responsável:** Alice Adoção, Rita Resgate, Vera Valor

**Contexto:**  
Quando uma conta não tem interação há um tempo (tier-dependent), o sistema gera automaticamente um email de check-in personalizado por IA. O CSM aprova ou edita o email em uma janela de 4 horas úteis antes do envio automático. Se não for aprovado, o email é descartado. Log de check-ins registra na `time_entries` como atividade especial. Funcionalidade crítica para "zero-touch CS" em contas SMB/Mid-Market.

---

#### Critérios de Aceitação

**AC 1 — Schema de Banco**

Nova migration `20260507_story_15_1_auto_checkin.sql`:

```sql
-- Tabela de fila de check-in
CREATE TABLE auto_checkin_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES accounts(id),
  csm_id UUID NOT NULL REFERENCES auth.users(id),
  generated_subject TEXT NOT NULL,
  generated_body TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending / approved / edited / cancelled / sent
  approval_deadline TIMESTAMPTZ NOT NULL,
  approved_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  edited_subject TEXT,
  edited_body TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'edited', 'cancelled', 'sent'))
);

-- Índice para queries eficientes
CREATE INDEX idx_auto_checkin_status ON auto_checkin_queue(status, approval_deadline);
CREATE INDEX idx_auto_checkin_account ON auto_checkin_queue(account_id, created_at DESC);

-- RLS
ALTER TABLE auto_checkin_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "CSM vê check-ins de suas contas"
  ON auto_checkin_queue FOR SELECT
  TO authenticated
  USING (
    csm_id = auth.uid() OR 
    account_id IN (SELECT id FROM accounts WHERE csm_owner_id = auth.uid())
  );
CREATE POLICY "Service role gerencia tudo"
  ON auto_checkin_queue FOR ALL
  TO service_role
  USING (true);

-- Coluna em accounts para opt-out
ALTER TABLE accounts ADD COLUMN opt_out_auto_checkin BOOLEAN DEFAULT false;
```

---

**AC 2 — Constantes de Tier**

Em `src/lib/constants.ts`:

```typescript
export const AUTO_CHECKIN_SILENCE_DAYS = {
  Enterprise: 14,
  'Mid-Market': 21,
  SMB: 30,
} as const

export const AUTO_CHECKIN_APPROVAL_HOURS_BUSINESS = 4
export const AUTO_CHECKIN_APPROVAL_WINDOW_START = 8  // 08:00
export const AUTO_CHECKIN_APPROVAL_WINDOW_END = 18   // 18:00
export const AUTO_CHECKIN_BUSINESS_DAYS = [1, 2, 3, 4, 5]  // Mon-Fri
```

---

**AC 3 — Cron 1: Generate Check-ins**

**Arquivo:** `src/app/api/cron/auto-checkin/generate/route.ts`

Roda diariamente (job scheduler externo via `/api/cron/auto-checkin/generate` com `x-api-secret`).

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateText } from '@/lib/llm/gateway'
import { AUTO_CHECKIN_SILENCE_DAYS, AUTO_CHECKIN_BUSINESS_DAYS } from '@/lib/constants'

export const maxDuration = 300  // 5 min timeout para Gemini

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-api-secret')
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const now = new Date()
  
  // Validar se é hora útil (segunda-sexta, 08-18)
  const isBusinessDay = AUTO_CHECKIN_BUSINESS_DAYS.includes(now.getDay())
  if (!isBusinessDay) {
    return NextResponse.json({ message: 'Not a business day' }, { status: 200 })
  }

  try {
    // 1. Buscar todas as contas ativas
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, csm_owner_id, segment, name')
      .eq('deleted_at', null)
      .eq('opt_out_auto_checkin', false)

    if (accountsError) throw accountsError

    let generated = 0

    for (const account of accounts) {
      // 2. Detectar silêncio
      const silenceDays = AUTO_CHECKIN_SILENCE_DAYS[account.segment as keyof typeof AUTO_CHECKIN_SILENCE_DAYS] || 30
      const silenceThreshold = new Date(now.getTime() - silenceDays * 24 * 60 * 60 * 1000)

      // 3. Verificar última interação
      const { data: lastInteraction } = await supabase
        .from('interactions')
        .select('date')
        .eq('account_id', account.id)
        .order('date', { ascending: false })
        .limit(1)
        .single()

      if (lastInteraction && new Date(lastInteraction.date) > silenceThreshold) {
        continue  // conta NÃO está em silêncio
      }

      // 4. Verificar se tem ticket aberto
      const { data: openTicket } = await supabase
        .from('support_tickets')
        .select('id')
        .eq('account_id', account.id)
        .in('status', ['open', 'in_progress'])
        .limit(1)
        .single()

      if (openTicket) continue  // ticket aberto — não disparar

      // 5. Verificar se tem interação futura agendada (próximos 7 dias)
      const futureThreshold = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      const { data: futureInteraction } = await supabase
        .from('interactions')
        .select('id')
        .eq('account_id', account.id)
        .gt('date', now.toISOString())
        .lt('date', futureThreshold.toISOString())
        .limit(1)
        .single()

      if (futureInteraction) continue  // tem reunião agendada

      // 6. Verificar se já tem check-in pending/approved para este mês
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const { data: existingCheckin } = await supabase
        .from('auto_checkin_queue')
        .select('id')
        .eq('account_id', account.id)
        .gte('created_at', monthStart.toISOString())
        .in('status', ['pending', 'approved', 'edited'])
        .limit(1)
        .single()

      if (existingCheckin) continue  // já tem check-in este mês

      // 7. Fetch contexto da conta para Gemini (últimas 5 interações + health + NPS)
      const { data: interactions } = await supabase
        .from('interactions')
        .select('title, type, date, sentiment_score')
        .eq('account_id', account.id)
        .order('date', { ascending: false })
        .limit(5)

      const { data: healthScore } = await supabase
        .from('health_scores')
        .select('manual_score, shadow_score')
        .eq('account_id', account.id)
        .order('evaluated_at', { ascending: false })
        .limit(1)
        .single()

      const { data: npsData } = await supabase
        .from('nps_responses')
        .select('score')
        .eq('account_id', account.id)
        .order('responded_at', { ascending: false })
        .limit(3)

      // 8. Gerar email via Gemini
      const context = `
        Conta: ${account.name}
        Silêncio: ${Math.floor((now.getTime() - (lastInteraction ? new Date(lastInteraction.date).getTime() : now.getTime() - silenceDays * 24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000))} dias
        Health Score: ${healthScore?.manual_score || healthScore?.shadow_score || 'N/A'}
        NPS: ${npsData?.length > 0 ? (npsData.reduce((acc, n) => acc + n.score, 0) / npsData.length).toFixed(1) : 'N/A'}
        Últimas atividades:
        ${interactions?.map(i => `- ${i.date}: ${i.type} - ${i.title}`).join('\n')}
      `

      const prompt = `
        Você é um CSM da Plannera. Gere um email de check-in personalizado e amigável para reengajar esta conta após período de silêncio.
        
        ${context}
        
        O email deve:
        1. Reconhecer o silêncio de forma positiva (não acusatória)
        2. Demonstrar conhecimento do contexto (menção a alguma atividade ou métrica)
        3. Oferecer algo de valor (insights, documentação, sugestão)
        4. Chamar à ação clara e fácil (1 reunião curta, 1 pergunta simples)
        5. Tom: professional mas amigável, em português
        
        Retorne JSON:
        {
          "subject": "Assunto do email (max 60 chars)",
          "body": "Corpo do email em markdown (max 500 chars)"
        }
      `

      const generated_email = await generateText(prompt)
      let email_json: { subject: string; body: string }
      try {
        email_json = JSON.parse(generated_email)
      } catch {
        // fallback
        email_json = {
          subject: `Oi, ${account.name}! Tudo bem por aí?`,
          body: `Notei que não temos contato há um tempo. Gostaria de agendar uma rápida conversa para saber como está tudo?`,
        }
      }

      // 9. Calcular approval_deadline = NOW() + 4 horas úteis
      const approvalDeadline = calculateBusinessHourDeadline(now, AUTO_CHECKIN_APPROVAL_HOURS_BUSINESS)

      // 10. Inserir na queue
      const { error: insertError } = await supabase
        .from('auto_checkin_queue')
        .insert({
          account_id: account.id,
          csm_id: account.csm_owner_id,
          generated_subject: email_json.subject,
          generated_body: email_json.body,
          status: 'pending',
          approval_deadline: approvalDeadline,
        })

      if (insertError) {
        console.error(`Error inserting check-in for ${account.name}:`, insertError)
        continue
      }

      generated++
    }

    return NextResponse.json({ message: `Generated ${generated} check-ins`, generated }, { status: 200 })
  } catch (error) {
    console.error('Error in auto-checkin generation:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper: calcular deadline em horas úteis (seg-sex 08-18)
function calculateBusinessHourDeadline(from: Date, businessHours: number): Date {
  let deadline = new Date(from)
  let hoursAdded = 0
  const businessStart = 8
  const businessEnd = 18

  while (hoursAdded < businessHours) {
    deadline.setHours(deadline.getHours() + 1)
    const dayOfWeek = deadline.getDay()
    const hour = deadline.getHours()

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      deadline.setDate(deadline.getDate() + 1)
      deadline.setHours(businessStart)
      continue
    }

    // Skip outside business hours
    if (hour < businessStart || hour >= businessEnd) {
      if (hour >= businessEnd) {
        deadline.setDate(deadline.getDate() + 1)
        deadline.setHours(businessStart)
      } else {
        deadline.setHours(businessStart)
      }
      continue
    }

    hoursAdded++
  }

  return deadline
}
```

---

**AC 4 — Cron 2: Send Check-ins**

**Arquivo:** `src/app/api/cron/auto-checkin/send/route.ts`

Roda a cada 30 minutos.

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { sendAutoCheckinEmail } from '@/lib/email/auto-checkin'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const secret = request.headers.get('x-api-secret')
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const now = new Date()

  try {
    // Buscar check-ins prontos para enviar:
    // - status = 'approved' (CSM aprovou)
    // - OR status = 'pending' E approval_deadline < NOW() (timeout)
    const { data: checkinsToSend, error: fetchError } = await supabase
      .from('auto_checkin_queue')
      .select('id, account_id, csm_id, generated_subject, generated_body, edited_subject, edited_body, status')
      .or(`status.eq.approved,and(status.eq.pending,approval_deadline.lt.${now.toISOString()})`)

    if (fetchError) throw fetchError

    let sent = 0
    let failed = 0

    for (const checkin of checkinsToSend) {
      try {
        // Fetch email do CSM
        const { data: csm } = await supabase
          .from('profiles')
          .select('email')
          .eq('id', checkin.csm_id)
          .single()

        if (!csm?.email) {
          console.warn(`No email for CSM ${checkin.csm_id}`)
          failed++
          continue
        }

        // Use edited version if available
        const subject = checkin.edited_subject || checkin.generated_subject
        const body = checkin.edited_body || checkin.generated_body

        // Enviar email via nodemailer
        await sendAutoCheckinEmail({
          to: csm.email,
          subject,
          body,
        })

        // Atualizar status
        const { error: updateError } = await supabase
          .from('auto_checkin_queue')
          .update({
            status: 'sent',
            sent_at: now,
          })
          .eq('id', checkin.id)

        if (updateError) throw updateError

        // Log em time_entries
        const { error: logError } = await supabase
          .from('time_entries')
          .insert({
            account_id: checkin.account_id,
            csm_id: checkin.csm_id,
            activity_type: 'auto_checkin',
            natural_language_input: `Auto check-in enviado: ${subject}`,
            parsed_description: `Auto check-in enviado: ${subject}`,
            date: now,
            logged_at: now,
          })

        if (logError) throw logError

        sent++
      } catch (error) {
        console.error(`Error sending check-in ${checkin.id}:`, error)
        failed++
      }
    }

    return NextResponse.json(
      { message: 'Check-ins sent', sent, failed },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error in auto-checkin send:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
```

---

**AC 5 — Email Service**

**Arquivo:** `src/lib/email/auto-checkin.ts`

```typescript
import nodemailer from 'nodemailer'

export async function sendAutoCheckinEmail({
  to,
  subject,
  body,
}: {
  to: string
  subject: string
  body: string
}): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || 'noreply@plannera.com',
    to,
    subject,
    html: body,  // body é markdown — convert para HTML se necessário
  })
}
```

---

**AC 6 — UI: Check-ins Pendentes**

**Arquivo:** `src/components/alerts/AlertCenter.tsx` (aba separada) OU nova seção em `src/app/(dashboard)/esforco/page.tsx`

**Opção A — AlertCenter (mais integrado):**
1. Adicionar aba "Check-ins Pendentes" ao lado de "Alertas"
2. Listar items de `auto_checkin_queue` onde `status = 'pending'` e `csm_id = currentUser.id`
3. Para cada item:
   - Mostrar nome da conta
   - Exibir subject e preview do body (primeiras 100 chars)
   - Timer regressivo até `approval_deadline` (calculado em tempo real)
   - 3 botões:
     - "Aprovar" → `PATCH /api/auto-checkin/[id] { status: 'approved' }`
     - "Editar" → abre modal inline, permite editar subject/body, salva em `edited_subject`/`edited_body`
     - "Cancelar" → `PATCH /api/auto-checkin/[id] { status: 'cancelled' }`
4. Polling: atualizar a cada 30s para refrescar timer
5. Toast ao aprovar/cancelar

**Opção B — Página `/esforco`:**
1. Nova seção no dashboard de esforço: "Check-ins Pendentes de Aprovação"
2. Mesmo layout acima

**Recomendação:** Opção A (mais visível para CSM, integrado ao workflow de alertas)

---

**AC 7 — API de Gerenciamento**

**Arquivo:** `src/app/api/auto-checkin/[id]/route.ts`

```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status, edited_subject, edited_body } = body

  // Validar que CSM é dono
  const { data: checkin } = await supabase
    .from('auto_checkin_queue')
    .select('id, csm_id')
    .eq('id', params.id)
    .single()

  if (!checkin || checkin.csm_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const updates: any = { status }
  if (status === 'edited') {
    updates.edited_subject = edited_subject
    updates.edited_body = edited_body
  }

  const { error } = await supabase
    .from('auto_checkin_queue')
    .update(updates)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
```

---

#### Plano de Testes

| # | TC | Tipo | Passos | Esperado |
|---|----|----|--------|----------|
| 1 | TC-15.1-01 | DB | Rodar migration | Tabela `auto_checkin_queue` criada; RLS ativo |
| 2 | TC-15.1-02 | Unit | Calcular `AUTO_CHECKIN_SILENCE_DAYS` para conta SMB | 30 dias |
| 3 | TC-15.1-03 | Unit | `calculateBusinessHourDeadline(NOW(), 4)` seg 14h | deadline seg 18h |
| 4 | TC-15.1-04 | API | POST `/api/cron/auto-checkin/generate` com 3 contas: 1 com ticket aberto, 1 saudável, 1 silenciosa | Apenas 1 check-in inserido |
| 5 | TC-15.1-05 | API | POST 2x — mesma conta | Apenas 1 check-in (idempotência por mês) |
| 6 | TC-15.1-06 | API | POST com conta `opt_out_auto_checkin = true` | Sem check-in |
| 7 | TC-15.1-07 | E2E | POST generate → AlertCenter | "Check-ins Pendentes" aba exibe 1 item com timer |
| 8 | TC-15.1-08 | E2E | Clicar "Aprovar" | Status → `approved`, botão desaparece |
| 9 | TC-15.1-09 | E2E | Clicar "Editar" | Modal abre; editar subject; salvar → `edited_subject` preenchido |
| 10 | TC-15.1-10 | API | POST `/api/cron/auto-checkin/send` com status `approved` | Email enviado; `time_entry` criada com `activity_type = 'auto_checkin'` |
| 11 | TC-15.1-11 | API | POST send com `approval_deadline < NOW()` e `status = 'pending'` | Email enviado automaticamente (timeout) |
| 12 | TC-15.1-12 | E2E | Conta Enterprise não-interação 12 dias | Sem check-in (14d threshold) |
| 13 | TC-15.1-13 | E2E | Conta Enterprise não-interação 15 dias | Check-in gerado |

---

#### Definição de Done

- [x] Migration criada e reversível
- [x] Constantes de tier definidas
- [x] Cron `auto-checkin/generate` implementado (com Gemini, idempotência, constraints)
- [x] Cron `auto-checkin/send` implementado (com email, time_entry log)
- [x] Email service configurado
- [x] UI: AlertCenter aba ou seção `/esforco` com lista, timer, botões
- [x] API: PATCH endpoint para editar/aprovar/cancelar
- [x] Todos os TCs passam
- [x] README.md atualizado (seção Automação)
- [x] docs/product/automation.md ou epics.md atualizado

---

#### Sizing

**8 Story Points** — Nova tabela + 2 crons complexos (Gemini + SMTP) + 2 UIs (AlertCenter + aba) + endpoint PATCH

---

---

## Wave 5 — Pré-Condições Arquiteturais

> **Status:** Planejado, não iniciado  
> **Bloqueante:** Todos os outros Epics de Wave 5 dependem de Epic 36 + 37  
> **Sequência:** 36 (Roles) → 37 (Admin Panel) | 38 (MTD/YTD em paralelo)  
> **Sizing Total (36+37+38):** 49 SP ≈ 5 sprints

---

### Epic 36 — User Roles & Permissions

**Scope:** Implementar sistema de papéis (6 níveis) com RLS, JWT sync e UI RBAC

#### Story 36.1 — Role Hierarchy (5 SP)

**Critérios de Aceitação:**
1. Enum PostgreSQL `user_role` com 6 valores
2. Coluna `profiles.role` com default `'csm'`
3. Trigger `fn_sync_role_to_jwt()` → sincroniza para `app_metadata.role` no JWT
4. UPDATE RLS policies: mantém `csm_owner_id` para `csm`, adiciona OR para `head_cs/admin/super_admin`
5. Helper `getUserRole()` em `getSupabaseServerClient()`
6. Migration idempotente

**Plano de Testes:**
- DB: Trigger sincroniza corretamente
- DB: RLS bloqueia CSM de ver contas de outro CSM
- DB: Head CS vê todas as contas
- E2E: TC-36-01, TC-36-02 passam

---

#### Story 36.2 — Role-Based UI (5 SP)

**Critérios de Aceitação:**
1. Hook `usePermission(permission: string): boolean`
2. HOC `<RequireRole role="head_cs">`
3. Constante `ROLE_PERMISSIONS` matriz completa
4. Sidebar: "CS Ops" oculto para `csm`
5. Sidebar: "Admin" oculto para `csm`
6. Botões "Reajuste de Preço" e "Rebalancear Carteira" visíveis apenas `head_cs+`

**Plano de Testes:**
- E2E: TC-36-03, TC-36-04 passam

---

#### Story 36.3 — User Invitation & Management (3 SP)

**Critérios de Aceitação:**
1. `/users` página: select role filtrado por caller role
2. `admin` pode atribuir qualquer role exceto `super_admin`
3. `head_cs` read-only (sem editar roles)
4. `csm` sem acesso (RequireRole gate)
5. Evento `role_changed` em `audit_log`

**Plano de Testes:**
- E2E: TC-36-05, TC-36-06 passam

---

### Epic 37 — Admin Control Panel

**Scope:** UI centralizada para todos os parâmetros do sistema (thresholds, emails, integrações, segurança)

#### Story 37.1 — Admin Panel Structure (2 SP)

**Critérios de Aceitação:**
1. Rota `/admin` com `RequireRole role="admin"`
2. Tabela `app_settings` (key, value JSONB, updated_by, updated_at)
3. RLS: apenas `admin/super_admin` podem UPDATE
4. Layout: sidebar módulos + área formulário
5. Toast + `audit_log` ao salvar

---

#### Stories 37.2–37.9 — Módulos (3 SP cada, 24 SP total)

Cada módulo consolida thresholds hardcoded em um formulário:
- 37.2 Dashboard & Health (pesos, thresholds, horário cron)
- 37.3 Suporte (auto-close, similarity, undo, capacidade)
- 37.4 NPS & Surveys (faixas, frequência, dimensões)
- 37.5 Alertas & Automações (silent days, health thresholds, check-in settings)
- 37.6 Playbooks & CS Ops (adoption triggers, playbook toggles)
- 37.7 IA & RAG (modelos, thresholds, cache TTL)
- 37.8 Integrações (SMTP, Slack, API keys)
- 37.9 Segurança (senha, sessão, whitelist domínios)

**Plano de Testes:** TC-37-01 a TC-37-02

---

### Epic 38 — Date Intelligence / MTD, YTD

**Scope:** Filtros de período global + comparação vs período anterior

#### Story 38.1 — Global Date Range Filters (5 SP)

**Critérios de Aceitação:**
1. Componente `<DateRangePicker>` com opções pré-definidas
2. URL state: `?period=mtd`
3. Aplicar em: Dashboard, NPS, Suporte, Esforço, CS Ops, VoC
4. Hook `useDateRange()` retorna `{ from, to, label }`

#### Story 38.2 — KPI Delta (3 SP)

**Critérios de Aceitação:**
1. Cada KPI card: % delta vs período anterior
2. Seta + percentual
3. Tooltip com valores absolutos

#### Story 38.3 — Export with Context (2 SP)

**Critérios de Aceitação:**
1. Nome arquivo inclui período
2. Cabeçalho com período
3. Dados filtrados

**Plano de Testes:** TC-38-01 a TC-38-03

---

---

## Wave 5 — Core CS Intelligence

> **Prioridade:** 1 (após pré-condições arquiteturais)  
> **Sequência obrigatória:** 16 → 17 | 18 pode ser paralelo com 17 | 19 → 20 | 21 → 22 → 23

### Epic 16 — CS Command Center (15 SP)

4 stories: Home de priorização, Daily Briefing IA, Quick Actions, Meeting Prep.

[Detalhes adiados para próxima seção — document é longo]

---

### Epic 17 — Renewal Cockpit (19 SP)

4 stories: Cockpit 360°, PDF brief, Pipeline, Negotiation history.

---

### Epic 18 — RAG Intelligence Modes (13 SP)

4 stories: Structured output (QBR/Risk/Renewal modes), Session memory, Proactive insights, Export.

---

### Epic 19 — Adoption Intelligence (21 SP)

6 stories: Adoption-to-Playbook pipeline, Expansion radar, Feature benchmarks, Onboarding score, Roadmap alignment, **Feature Abandonment Detection**.

---

### Epic 20 — VoC Intelligence (18 SP)

5 stories: Monthly report, Portfolio dashboard, Feedback loop, Multi-dimensão NPS, **Customer Effort Score (CES)**.

---

### Epic 21 — CS Ops Excellence (20 SP)

6 stories: CSM Performance, Portfolio rebalancing, Playbook effectiveness, Activity audit, Capacity planning, Account transitions.

---

### Epic 22 — Smart Alerts (16 SP)

5 stories: Configurable thresholds, Alert snooze, Stakeholder engagement, Alert correlation, **Champion exit alert**.

---

### Epic 23 — Playbook Excellence (17 SP)

5 stories: Governance (Wave 4 23.1), Success plans, Library & templates, Automation, **Price increase workflow**.

---

---

## Plano de Testes Integrado

### Camadas de Teste

| Camada | Escopo | Frequência | Ferramental |
|--------|--------|-----------|-------------|
| **Unit** | Funções isoladas (AlertService, health calc, etc) | Cada commit | vitest ou jest |
| **API** | Endpoints, RLS, idempotência de crons | Cada commit | Playwright API routes |
| **E2E** | Fluxos completos (UI + API + DB) | Antes de merge | Playwright full browser |
| **Smoke** | Golden path rápido | Manual (5 min) | Browser |

### Test Plan Template (para cada story)

```markdown
| # | TC ID | Camada | Descrição | Dados | Esperado | Automação |
|---|-------|--------|-----------|-------|----------|-----------|
| 1 | TC-X-01 | Unit | ... | ... | ... | vitest |
| 2 | TC-X-02 | API | ... | ... | ... | Playwright |
| 3 | TC-X-03 | E2E | ... | ... | ... | Playwright |
| 4 | TC-X-04 | Smoke | ... | Manual | ... | Manual |
```

### Definição de Done — Standard para Todas as Stories

- [x] Código escrito
- [x] Tipos TypeScript atualizados
- [x] Migration criada (se banco)
- [x] RLS policies atualizada (se dados)
- [x] API endpoints funcional
- [x] UI testada em múltiplos breakpoints
- [x] Todos os TCs da story passam
- [x] README.md atualizado
- [x] docs/product/ atualizado
- [x] Sem erros `tsc --noEmit`
- [x] Sem quebras de testes E2E existentes

---

## Sequência de Execução

### Wave 4 — Executar First

```
Sprint 1 (2 semanas):
  Story 23.1 — Playbook Governance (3 SP)
  Story 14.2 — Playbook Trigger Alert (3 SP)
  TOTAL: 6 SP

Sprint 2 (2 semanas):
  Story 15.1 — Auto Check-in (8 SP)
  TOTAL: 8 SP

Wave 4 Complete: 14 SP ≈ 1.5 sprints
```

---

### Wave 5 — Pós-Wave 4

```
Sprint 3–4 (4 semanas) — PRÉ-CONDIÇÕES ARQUITETURAIS:
  Epic 36: Story 36.1 → 36.2 → 36.3 (13 SP)
  Epic 37: Story 37.1 → 37.2–37.9 (26 SP)
  Epic 38: 38.1 || 38.2 || 38.3 (10 SP) [em paralelo]
  TOTAL: 49 SP ≈ 5 sprints

Sprint 5–6 (4 semanas) — CORE INTELLIGENCE (depend. de Epic 36):
  Epic 16: 16.1 → 16.2 || 16.3 || 16.4 (15 SP)
  Epic 17: 17.1 → 17.2 || 17.3 → 17.4 (19 SP)
  [Epic 18: 18.1 → ... em paralelo com 17] (13 SP)
  TOTAL: 47 SP ≈ 5 sprints

Sprint 7–9 (6 semanas) — ADOÇÃO E VOC (depend. de Epic 36):
  Epic 19: 19.1 → 19.2 || 19.3 || ... (21 SP)
  Epic 20: 20.1 → 20.2 || ... → 20.5 (18 SP)
  TOTAL: 39 SP ≈ 4 sprints

Sprint 10–11 (4 semanas) — OPS E EXCELÊNCIA:
  Epic 21: 21.1 → ... (20 SP)
  Epic 22: 22.1 → ... (16 SP)
  Epic 23: 23.2 → 23.3 → 23.4 → 23.5 (17 SP) [23.1 já em Wave 4]
  TOTAL: 53 SP ≈ 5 sprints

Wave 5 Complete: ~178 SP ≈ 18 sprints ≈ 9 meses (2 sprints/mês)
```

---

## Verificação Pós-Implementação

### Checklist por Tipo

#### Migration
- [ ] `supabase db push` sem erros
- [ ] Rollback funciona (`supabase migration down`)
- [ ] Campos novos têm default sensato (nullable ou default value)
- [ ] Índices criados para queries frequentes
- [ ] RLS policies criadas (se tabela nova)

#### Código TypeScript
- [ ] `tsc --noEmit` passa sem erros
- [ ] Types batem com schema (renovar se codegen usado)
- [ ] Sem `any` types (exceto legado)
- [ ] Null coalescing/optional chaining onde apropriado

#### Testes
- [ ] Todos os TCs da story passam (vitest + Playwright)
- [ ] Nenhum teste existente quebrou
- [ ] Coverage mínimo 70% para código novo

#### Smoke
- [ ] Feature aberta no browser (múltiplas telas/breakpoints)
- [ ] Golden path exercitado manualmente (5 min)
- [ ] Dados aparecem corretamente
- [ ] Sem console errors

#### RLS
- [ ] User `csm` não consegue ver dados de outro `csm` (query retorna empty)
- [ ] User `head_cs` vê todas as contas (query retorna todas)
- [ ] RLS bloqueia INSERT/UPDATE sem autorização (403 ou silencioso Supabase)

#### Cron
- [ ] Endpoint chamado com `x-api-secret` válido → sucesso
- [ ] Chamado 2x consecutivas → idempotência mantida (mesmo resultado)
- [ ] Logs de erro capturados e não quebramo job

---

## Documentação — Update Requirements

Após implementação de CADA story:

### README.md
- [ ] Stack: adicionar dependências novas
- [ ] Seção "O que é e para que serve": atualizar se feature nova
- [ ] Variáveis de ambiente: adicionar se necessário
- [ ] Scripts package.json: adicionar se comando novo

### docs/product/epics.md
- [ ] Story marcada como ✅ (concluída) ou 🔄 (em progresso)
- [ ] Sizing validado pós-implementação
- [ ] Data de conclusão preenchida
- [ ] Dependency notes (se algo dependia, marcar como resolvido)

### docs/product/XX.md (arquivo de regras de negócio)
- [ ] Novo fluxo descrito: entrada → processo → saída
- [ ] Thresholds/classificações atualizados
- [ ] Exceções documentadas
- [ ] Screenshots/diagrama se UI nova

---

## Índice de Referência Rápida

| Story | Epic | SP | Owner | TC Count |
|-------|------|----|----- |----------|
| 23.1 | Playbook Governance | 3 | Arnaldo | 7 |
| 14.2 | Playbook Trigger Alert | 3 | Mário | 8 |
| 15.1 | Auto Check-in | 8 | Alice | 13 |
| **Wave 4 Total** | — | **14** | — | **28** |
| — | — | — | — | — |
| 36.1 | Roles Hierarchy | 5 | Pedro | 2 |
| 36.2 | RBAC UI | 5 | Pedro | 2 |
| 36.3 | User Invitation | 3 | Pedro | 2 |
| 37.1–37.9 | Admin Panel | 26 | Otto | 10 |
| 38.1–38.3 | Date Intelligence | 10 | Paulo | 3 |
| **Pré-Cond. Total** | — | **49** | — | **19** |
| — | — | — | — | — |
| 16.1–16.4 | CS Command Center | 15 | Mário | 8 |
| 17.1–17.4 | Renewal Cockpit | 19 | Renato | 8 |
| 18.1–18.4 | RAG Intelligence | 13 | Vera | 8 |
| 19.1–19.6 | Adoption Intelligence | 21 | Alice | 12 |
| 20.1–20.5 | VoC Intelligence | 18 | Vico | 10 |
| 21.1–21.6 | CS Ops Excellence | 20 | Otto | 12 |
| 22.1–22.5 | Smart Alerts | 16 | Rita | 10 |
| 23.2–23.5 | Playbook Excellence | 17 | Renato | 10 |
| **Wave 5 Core Total** | — | **139** | — | **78** |
| — | — | — | — | — |
| **TOTAL W4+W5** | — | **202** | — | **125** |

---

**Próximo passo:** Handoff para Arnaldo (Arquiteta) + Davi (Deploy) para análise técnica profunda, pairing sessions com features críticas, e sprint planning detalhado.

**Status:** Refinement completo, pronto para execução. ✅
