# F3-01: Playbooks MVP

## Contexto

CSM has 10 steps to onboard new enterprise customer: send welcome email, schedule kickoff, assign success plan, etc. Currently manual checklist. Playbooks automate: trigger on "contract signed", execute tasks in sequence.

MVP: simple template-based task automation with event triggers.

---

## Escopo

**É:**
- Playbook: named template with tasks + trigger condition
- Trigger types: ticket_created, sla_breach, account_segment_match, manual_execute
- Tasks: send email, create task, add note, assign CSM, run action, create alert
- Store: playbooks table with trigger jsonb + tasks jsonb
- Execution: background job when trigger fires
- Logging: ticket_events log each task execution
- Manual trigger: CSM can click "Run playbook X" on account/ticket

**Não é (MVP):**
- Branching logic (if/else — F3+)
- Scheduled playbooks (cron-triggered — F3)
- Loop/repeat tasks (F3+)
- Playbook versioning (F3+)

---

## Decisões de Design (UX)

**Playbook Admin UI (Future):**
- Create page: "Create Playbook"
- Name, trigger type, tasks list
- Drag-to-reorder tasks
- Save playbook

**Manual Trigger UI:**
- Account detail: "Executar Playbooks" button
- Dropdown: list of available playbooks
- Click: execute playbook (confirm modal)
- Progress: show "Executando..." then "Completo" with task list

**Execution Flow:**
1. Trigger fires (e.g. new ticket created)
2. Query playbooks with matching trigger
3. Execute each task in sequence
4. Log to ticket_events for each task
5. If any task fails, log error but continue (best effort)

---

## Schema / Migrações

**Tabela nova:**

```sql
CREATE TABLE playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid REFERENCES accounts(id), -- NULL = org-wide
  name text NOT NULL,
  description text,
  trigger jsonb NOT NULL, -- { type: 'ticket_created', conditions: {...} }
  tasks jsonb NOT NULL, -- [ { type: 'send_email', params: {...} }, ... ]
  enabled boolean DEFAULT true,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_playbooks_account ON playbooks(account_id);
CREATE INDEX idx_playbooks_enabled ON playbooks(enabled);
```

---

## Arquivos Afetados

- `src/app/(dashboard)/playbooks/page.tsx` — playbook list (future full UI)
- `src/app/(dashboard)/accounts/components/PlaybookExecutor.tsx` — manual trigger UI
- `src/lib/services/playbookService.ts` — execution logic
- `scripts/jobs/execute-playbooks.ts` — trigger-based execution (cron)
- `src/app/api/playbooks/route.ts` — CRUD (future)
- `src/app/api/playbooks/[id]/execute/route.ts` — manual trigger endpoint

---

## Padrões a Seguir

**Playbook Execution Service:**
```typescript
// src/lib/services/playbookService.ts
export async function executePlaybook(
  playbookId: string,
  context: { ticketId?: string; accountId: string; userId: string }
) {
  const playbook = await getPlaybook(playbookId);

  for (const task of playbook.tasks) {
    try {
      await executeTask(task, context);
      
      // Log task execution
      await logTicketEvent(context.ticketId, 'playbook_task_executed', {
        playbook_id: playbookId,
        task_type: task.type,
        task_status: 'success'
      });
    } catch (error) {
      console.error(`Playbook task error:`, error);
      
      // Log failure but continue
      await logTicketEvent(context.ticketId, 'playbook_task_executed', {
        playbook_id: playbookId,
        task_type: task.type,
        task_status: 'failed',
        error: error.message
      });
    }
  }
}

async function executeTask(
  task: { type: string; params: any },
  context: any
) {
  switch (task.type) {
    case 'send_email':
      return await sendEmail(task.params.to, task.params.subject, task.params.body);
    case 'create_task':
      return await createTask(context.accountId, task.params.title);
    case 'add_note':
      return await addTicketNote(context.ticketId, task.params.note);
    case 'assign_csm':
      return await assignTicket(context.ticketId, task.params.csm_id);
    default:
      throw new Error(`Unknown task type: ${task.type}`);
  }
}
```

**Manual Trigger Component:**
```typescript
// src/app/(dashboard)/accounts/components/PlaybookExecutor.tsx
export function PlaybookExecutor({ accountId }: { accountId: string }) {
  const [playbooks, setPlaybooks] = useState([]);
  const [executing, setExecuting] = useState(false);

  useEffect(() => {
    const fetchPlaybooks = async () => {
      const res = await fetch(`/api/playbooks?account_id=${accountId}`);
      setPlaybooks(await res.json());
    };
    fetchPlaybooks();
  }, [accountId]);

  const handleExecute = async (playbookId: string) => {
    setExecuting(true);
    await fetch(`/api/playbooks/${playbookId}/execute`, {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId })
    });
    setExecuting(false);
  };

  return (
    <div>
      <button className="btn" onClick={() => setShowDropdown(!showDropdown)}>
        Executar Playbooks
      </button>
      {showDropdown && (
        <div className="dropdown">
          {playbooks.map(pb => (
            <button key={pb.id} onClick={() => handleExecute(pb.id)}>
              {pb.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**M (Médio)** — 1-1.5 sessões BMAD

- Playbook schema + storage
- Task execution logic
- Manual trigger UI + endpoint
- Event logging

---

## Dependências

**Precisa que:** F2-03 (segments for future trigger matching)

**Bloqueia:** Nenhum (extensible for F3+)

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Create playbook with trigger + tasks (manual via API or hardcoded)
- [ ] F2 — Trigger fires: playbook executes tasks in order
- [ ] F3 — Each task execution logged to ticket_events
- [ ] F4 — Task failure doesn't block next tasks (best effort)
- [ ] F5 — Manual trigger: click "Executar Playbooks" → dropdown shows playbooks
- [ ] F6 — Select playbook → executes (show progress)
- [ ] F7 — Playbook execution appears in timeline/events
- [ ] F8 — org-wide playbooks visible to all, account-specific to CSMs
- [ ] F9 — Disable playbook: doesn't execute on trigger
- [ ] F10 — Task types: send_email, create_task, add_note, assign_csm (MVP 4 types)

### Edge Cases

- [ ] E1 — Playbook with 0 tasks: executes (no-op)
- [ ] E2 — Task references unknown CSM: fails gracefully
- [ ] E3 — Same trigger matches 2 playbooks: execute both (sequence TBD)
- [ ] E4 — Playbook triggered during execution: queue or drop? (Define: queue with cooldown)
- [ ] E5 — Playbook task involves external API (Slack, email): timeout 30s

### Performance

- [ ] P1 — Playbook execution (5 tasks) < 10s
- [ ] P2 — Manual trigger response < 2s
- [ ] P3 — Task logging doesn't block execution (async)

### Isolation

- [ ] T1 — Account-specific playbooks isolated by RLS
- [ ] T2 — CSM A can't execute org playbook on CSM B's account (if private)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Automation/Task Execution:**
- [ ] F1-F3: Playbook creation + execution end-to-end
- [ ] F4-F5: Error handling + logging
- [ ] P1-P2: Performance acceptable

**Testes obrigatórios:**
```
E2E:
1. Create playbook: "Welcome" with tasks [send_email, create_task]
2. Manual trigger: click "Executar Playbooks" → select "Welcome"
3. Verify both tasks execute
4. Verify ticket_events logs both

Unit:
- playbookService: test 4 task types
- Task failures don't block others
- Event logging correct

Edge cases:
- Task references invalid CSM → logs error, continues
- Playbook with 0 tasks → executes (no-op)
```

**Fixtures:**
- 2 predefined playbooks (Welcome, SLA Breach)
- Sample tasks configured

---

## Notas

1. **MVP scope** — manual trigger only. F3+ adds automatic triggers (ticket created, segment match, etc).

2. **Task types extensibility** — easy to add more:
   - run_flow (call webhook)
   - create_calendar_event
   - send_slack_message
   - run_custom_script

3. **UI for creation** — MVP might hardcode playbooks. F3+ adds admin UI to create/edit.

4. **Auditing** — each task logs actor + outcome in ticket_events for full audit trail.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `PlaybookExecutor`
- Anterior: [F2-03 Segmentação Dinâmica](../fase2/F2-03-segmentacao-dinamica.md)
- Próximo: [F3-02 Motor de Alertas Proativos](F3-02-motor-alertas.md)
