# F4-06: Integração Slack

## Contexto

CSMs check CSPlataform for alerts, then switch to Slack to communicate. Slack integration brings notifications to CSM's inbox: "Ticket #123 assigned", "SLA breach on ABC", "NPS detractor XYZ". Slash commands let CSMs act on CSPlataform without leaving Slack: `/cs-ticket #123` opens detail, `/cs-assign @agent` reassigns.

---

## Escopo

**É:**
- Slack Bot: OAuth app, installed per org
- Notifications: ticket assigned, SLA breach, new NPS response, alert triggered, renewal approaching
- Notifications can be toggled per CSM (settings)
- Slash commands: `/cs-ticket [id]`, `/cs-assign [csm]`, `/cs-status [account]`
- Slash command responses: rich cards with buttons (Mark resolved, Take, etc)
- Webhooks: CSPlataform → Slack when events occur
- Channel support: notifications in #cs-alerts channel or DM to CSM
- Message threading: related events threaded under ticket message

**Não é (MVP):**
- Two-way sync (Slack messages → CSPlataform notes)
- Interactive modals (F4+)
- Advanced slash commands beyond 3 basics
- Slackbot AI assistant (F4+)

---

## Decisões de Design (UX)

**Notifications:**
- Ticket assigned: "Ticket #123 assigned to @alice" with buttons [View, Resolve, Reassign]
- SLA breach: "Alert! Ticket #456 SLA breached. 2 hours overdue." [View, Escalate]
- NPS detractor: "NPS Alert: Account ABC scored 3 (Detractor)" [View NPS, Create task]
- Renewal reminder: "Renewal for ABC in 30 days. ARR $50k" [View, Send QBR]
- Alert triggered: "Churn risk: Account DEF health dropped 25 points" [View, Create task]

**Slash Commands:**
1. `/cs-ticket #123` → returns ticket detail card (subject, status, priority, assigned to, last update)
2. `/cs-assign #123 @alice` → reassigns ticket to alice, shows confirmation
3. `/cs-status ABC` → returns account health card (health score, MRR, last ticket, next renewal)

**Message Format (Rich Card):**
```
Ticket #123: "Customer can't login"
Status: Open | Priority: High | Assigned: @alice
SLA: 2h (1h remaining) ⏰
[View in CSPlataform] [Mark Resolved] [Reassign]
```

---

## Schema / Migrações

**Reutiliza integrations table** de F4-03:
```sql
-- Slack-specific config in integrations table
-- {
--   access_token: "xoxb-...",
--   bot_user_id: "U123...",
--   team_id: "T123...",
--   webhook_secret: "...",
--   channel_notifications: "#cs-alerts",
--   notification_preferences: {
--     ticket_assigned: true,
--     sla_breach: true,
--     nps_detractor: true,
--     renewal_reminder: true,
--     alert_triggered: true
--   }
-- }
```

**Notification preference per CSM:**
```sql
CREATE TABLE notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- 'ticket_assigned', 'sla_breach', etc
  channel text NOT NULL, -- 'slack_dm', 'slack_channel', 'email', 'in_app'
  enabled boolean DEFAULT true,
  
  UNIQUE(user_id, notification_type, channel)
);

CREATE INDEX idx_notification_preferences_user ON notification_preferences(user_id);
```

---

## Arquivos Afetados

- `src/app/api/auth/slack/callback/route.ts` — OAuth callback
- `src/app/api/webhooks/slack/commands/route.ts` — slash command handler
- `src/app/api/webhooks/slack/events/route.ts` — Slack event receiver (for future interactive actions)
- `src/lib/services/slackService.ts` — Slack API interactions
- `src/lib/services/notificationService.ts` — extend with Slack channel
- `src/app/(dashboard)/settings/notifications/page.tsx` — notification preferences UI

---

## Padrões a Seguir

**Slack Service:**
```typescript
// src/lib/services/slackService.ts
import { WebClient } from '@slack/web-api';

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

export async function sendTicketNotification(ticketId: string, csm: User, action: 'assigned' | 'sla_breach') {
  const ticket = await getTicket(ticketId);
  
  const color = action === 'sla_breach' ? 'danger' : 'good';
  const title = action === 'sla_breach' ? `Alert! Ticket #${ticketId} SLA Breached` : `Ticket #${ticketId} Assigned`;
  
  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: title }
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Subject:*\n${ticket.subject}` },
        { type: 'mrkdwn', text: `*Priority:*\n${ticket.priority}` },
        { type: 'mrkdwn', text: `*Assigned:*\n<@${csm.slack_user_id}>` },
        { type: 'mrkdwn', text: `*Status:*\n${ticket.status}` }
      ]
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'View in CSPlataform' },
          url: `${process.env.APP_URL}/suporte/${ticketId}`
        },
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Mark Resolved' },
          action_id: `ticket_resolve_${ticketId}`,
          value: ticketId
        }
      ]
    }
  ];

  await slack.chat.postMessage({
    channel: csm.slack_user_id, // DM to CSM
    blocks,
    text: title
  });
}

export async function sendSlashCommandResponse(channelId: string, userId: string, command: string, args: string) {
  if (command === 'cs-ticket') {
    const ticketId = args.replace(/^#/, '');
    const ticket = await getTicket(ticketId);

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Ticket #${ticketId}: "${ticket.subject}"*\nStatus: ${ticket.status} | Priority: ${ticket.priority} | Assigned: <@${ticket.assigned_to}>`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View' },
            url: `${process.env.APP_URL}/suporte/${ticketId}`
          },
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Resolve' },
            action_id: `quick_resolve_${ticketId}`
          }
        ]
      }
    ];

    return { blocks };
  }

  if (command === 'cs-status') {
    const accountName = args;
    const account = await getAccountByName(accountName);

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Account: ${account.name}*\nHealth: ${account.health_score}/100 | MRR: $${account.mrr}`
        }
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View Account' },
            url: `${process.env.APP_URL}/accounts/${account.id}`
          }
        ]
      }
    ];

    return { blocks };
  }
}
```

**Slash Command Handler:**
```typescript
// src/app/api/webhooks/slack/commands/route.ts
import { verifySlackRequest } from '@/lib/slack';

export async function POST(request: Request) {
  const signature = request.headers.get('x-slack-signature')!;
  const timestamp = request.headers.get('x-slack-request-timestamp')!;
  const body = await request.text();

  // Verify Slack signature
  if (!verifySlackRequest(signature, timestamp, body)) {
    return new Response(JSON.stringify({ error: 'Invalid signature' }), { status: 401 });
  }

  const params = new URLSearchParams(body);
  const command = params.get('command');
  const text = params.get('text');
  const userId = params.get('user_id');
  const channelId = params.get('channel_id');
  const responseUrl = params.get('response_url');

  try {
    const response = await sendSlashCommandResponse(channelId, userId, command, text);
    
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ text: 'Error processing command' }),
      { status: 500 }
    );
  }
}
```

**OAuth Callback:**
```typescript
// src/app/api/auth/slack/callback/route.ts
export async function GET(request: Request) {
  const { code } = request.nextUrl.searchParams;

  const response = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: `${process.env.APP_URL}/api/auth/slack/callback`
    })
  });

  const { access_token, bot_user_id, team_id } = await response.json();

  // Save integration
  await saveIntegration(orgId, 'slack', {
    access_token,
    bot_user_id,
    team_id
  });

  return redirect('/settings/integrations?status=slack_connected');
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**M (Médio)** — 1-1.5 sessões BMAD

- Slack OAuth setup
- Slash command handler (3 commands)
- Notification service (5 event types)
- Rich message formatting (Slack blocks)
- Notification preferences UI
- Testes: unit (command parsing), E2E (OAuth, slash commands)

---

## Dependências

**Precisa que:**
- Slack workspace admin access
- Tickets, accounts, users data

**Bloqueia:** Nenhum (can be added anytime post-release)

---

## Critérios de Aceite

### Funcional

- [ ] F1 — OAuth: click "Conectar Slack" → workspace selection → installation → token saved
- [ ] F2 — Verify Slack signature on all incoming requests
- [ ] F3 — Slash command `/cs-ticket #123` → returns ticket detail card
- [ ] F4 — Slash command `/cs-status ABC` → returns account health card
- [ ] F5 — Slash command `/cs-assign #123 @alice` → reassign + confirm message
- [ ] F6 — Notification: ticket assigned → DM to CSM with buttons
- [ ] F7 — Notification: SLA breach → DM to CSM with alert color
- [ ] F8 — Notification preferences: CSM can toggle per notification type
- [ ] F9 — Notification preferences: CSM can choose channel (DM, #cs-alerts, etc)
- [ ] F10 — Message button actions: "View in CSPlataform" links correctly

### Edge Cases

- [ ] E1 — Unknown ticket ID in slash command: return "Ticket not found"
- [ ] E2 — Slash command with no args: show usage hint
- [ ] E3 — CSM reassigns ticket via Slack: update in CSPlataform DB
- [ ] E4 — Slack workspace uninstalls app: disable notifications gracefully

### Performance

- [ ] P1 — Slash command response: < 3s (Slack timeout)
- [ ] P2 — Notification send: < 500ms per event
- [ ] P3 — OAuth callback: < 2s

### Data Quality

- [ ] Q1 — Ticket/account names: handle special chars in Slack search
- [ ] Q2 — Rich cards: all fields present, no null values

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Slack:**
- [ ] F1: OAuth complete
- [ ] F3-F5: Slash commands working
- [ ] F6-F9: Notifications + preferences
- [ ] Q1-Q2: Data quality checks

**Testes obrigatórios:**
```
E2E:
1. Settings > Integrations > Slack > Conectar
2. OAuth flow: select workspace, install
3. Verify bot in workspace
4. Test slash commands:
   - /cs-ticket #123 → detail card appears
   - /cs-status ABC → health card appears
   - /cs-assign #123 @alice → confirmation message
5. Trigger ticket assignment notification
6. Verify notification appears in DM

Unit:
- Slack signature verification: correct/incorrect
- Slash command parsing: extract args correctly
- Message formatting: all fields present
- Notification toggling: preference persists
```

**Fixtures:**
- Slack test workspace
- Bot app configured
- 3 test slash commands pre-configured

---

## Estimativa de Tokens

- Slack service: ~400 tokens
- Command handler: ~300 tokens
- Notification service: ~250 tokens
- OAuth flow: ~250 tokens
- UI preferences: ~300 tokens
- Tests: ~350 tokens
- **Total esperado:** 1.85k tokens por sessão BMAD

---

## Notas

1. **Rate limiting** — Slack API rate limits: 60 calls/min for most endpoints. Queue notifications.
2. **Threaded messages** — Related events (multiple tickets from same account) can be threaded under parent message.
3. **Interactive actions** — Slash command response buttons (Resolve, Reassign) can trigger subsequent API calls via action_id.
4. **Multi-workspace** — MVP single workspace per org. F4+ supports multiple workspaces.
5. **Message formatting** — Use Slack Block Kit for rich formatting. Simpler than HTML.

---

## Links Relacionados

- Anterior: [F4-05 Product Telemetry](F4-05-product-telemetry.md)
- Integrações: [_components-map.md](_components-map.md) → `SlackStatus`, `NotificationPreferences`
- Slack Docs: https://api.slack.com/
