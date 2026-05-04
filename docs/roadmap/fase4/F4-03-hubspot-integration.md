# F4-03: Integração HubSpot

## Contexto

Sales team lives in HubSpot. CS team lives in CSPlataform. Syncing accounts/contacts between systems prevents duplicates and keeps data fresh. Integration pulls HubSpot deals/contacts, maps to CSPlataform accounts, syncs activity (calls, emails, meetings).

---

## Escopo

**É:**
- OAuth2 auth with HubSpot API
- Account sync: pull HubSpot deals → create/update CSPlataform accounts
- Contact sync: pull HubSpot contacts → create/update CSPlataform contacts
- Activity log: HubSpot activities (calls, emails, meetings) → CSPlataform interactions
- Webhook: HubSpot notifies CSPlataform on account/contact changes (near real-time)
- Data mapping: HubSpot fields → CSPlataform fields (name, email, phone, stage, etc)
- Sync status: UI shows last sync time, sync errors, retry button

**Não é (MVP):**
- Two-way sync (CSPlataform → HubSpot)
- Advanced field mapping (custom HubSpot properties)
- Deal stage automation (F4+)
- HubSpot reporting dashboard (F4+)

---

## Decisões de Design (UX)

**Setup Flow:**
1. Settings > Integrations > HubSpot
2. "Conectar HubSpot" button → OAuth popup
3. User logs in with HubSpot account, approves scopes
4. Callback: token saved, sync runs immediately
5. Status: "Sincronizado em XX minutos"
6. Manual sync: "Sincronizar agora" button

**Integration Settings:**
- Auth status: connected / disconnected
- Last sync: timestamp
- Sync frequency: options (never, hourly, daily)
- Sync scope: accounts only, contacts only, both
- Field mapping: show which HubSpot fields map to CSPlataform fields
- Error log: "Últimas 10 sincronizações"

**Activity Log in Ticket/Account Detail:**
- Section: "HubSpot Activity"
- Shows recent calls, emails, meetings from HubSpot
- Linked to contact/deal in HubSpot (with link icon)

---

## Schema / Migrações

**Tabelas novas:**

```sql
CREATE TABLE integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  integration_type text NOT NULL, -- 'hubspot', 'stripe', 'slack', etc
  config jsonb NOT NULL, -- { access_token, refresh_token, expiry, scope }
  enabled boolean DEFAULT true,
  last_sync_at timestamptz,
  last_error text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(org_id, integration_type)
);

CREATE TABLE external_ids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  local_entity text NOT NULL, -- 'account', 'contact'
  local_id uuid NOT NULL,
  external_system text NOT NULL, -- 'hubspot'
  external_id text NOT NULL,
  
  UNIQUE(local_entity, local_id, external_system),
  UNIQUE(external_system, external_id)
);

CREATE TABLE sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id),
  integration_type text NOT NULL,
  entity_type text NOT NULL, -- 'account', 'contact', 'activity'
  sync_status text NOT NULL, -- 'success', 'partial', 'failed'
  error_message text,
  synced_count int DEFAULT 0,
  failed_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_integrations_org ON integrations(org_id);
CREATE INDEX idx_external_ids_local ON external_ids(local_entity, local_id);
CREATE INDEX idx_sync_logs_org ON sync_logs(org_id, integration_type);
```

---

## Arquivos Afetados

- `src/app/(dashboard)/settings/integrations/page.tsx` — integrations overview
- `src/app/(dashboard)/settings/integrations/hubspot/page.tsx` — HubSpot setup
- `src/app/api/auth/hubspot/callback/route.ts` — OAuth callback
- `src/app/api/integrations/hubspot/sync/route.ts` — manual sync trigger
- `src/app/api/webhooks/hubspot/route.ts` — HubSpot webhook receiver
- `src/lib/services/hubspotService.ts` — HubSpot API interactions
- `src/lib/services/syncService.ts` — sync orchestration
- `src/components/integrations/HubSpotStatus.tsx` — status display component

---

## Padrões a Seguir

**HubSpot Service:**
```typescript
// src/lib/services/hubspotService.ts
import axios from 'axios';

const HUBSPOT_API = 'https://api.hubapi.com';

export async function syncHubSpotDeals(accessToken: string) {
  const response = await axios.get(`${HUBSPOT_API}/crm/v3/objects/deals`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      limit: 100,
      properties: ['dealname', 'dealstage', 'amount', 'hs_analytics_close_date']
    }
  });

  const deals = response.data.results;
  const synced = [];

  for (const deal of deals) {
    const { id, properties } = deal;
    
    // Check if account exists in our system
    const localAccount = await findOrCreateAccount({
      name: properties.dealname,
      externalId: id,
      externalSystem: 'hubspot'
    });

    // Store mapping
    await saveExternalId('account', localAccount.id, 'hubspot', id);
    synced.push(localAccount.id);
  }

  return { synced, failed: deals.length - synced.length };
}

export async function syncHubSpotContacts(accessToken: string) {
  const response = await axios.get(`${HUBSPOT_API}/crm/v3/objects/contacts`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      limit: 100,
      properties: ['firstname', 'lastname', 'email', 'phone', 'hs_lead_status']
    }
  });

  const contacts = response.data.results;
  const synced = [];

  for (const contact of contacts) {
    const { id, properties } = contact;
    
    const localContact = await findOrCreateContact({
      name: `${properties.firstname} ${properties.lastname}`,
      email: properties.email,
      phone: properties.phone,
      externalId: id,
      externalSystem: 'hubspot'
    });

    await saveExternalId('contact', localContact.id, 'hubspot', id);
    synced.push(localContact.id);
  }

  return { synced, failed: contacts.length - synced.length };
}
```

**Webhook Handler:**
```typescript
// src/app/api/webhooks/hubspot/route.ts
export async function POST(request: Request) {
  const body = await request.json();
  const events = body;

  for (const event of events) {
    const { objectId, objectType, changeSource } = event;

    if (changeSource !== 'CRM_UI') continue; // ignore internal changes

    if (objectType === 'contact') {
      await syncHubSpotContactById(objectId);
    } else if (objectType === 'deal') {
      await syncHubSpotDealById(objectId);
    }
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
}
```

**OAuth Flow:**
```typescript
// src/app/api/auth/hubspot/callback/route.ts
export async function GET(request: Request) {
  const { code } = request.nextUrl.searchParams;
  
  const tokenResponse = await fetch('https://api.hubapi.com/oauth/v1/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.HUBSPOT_CLIENT_ID!,
      client_secret: process.env.HUBSPOT_CLIENT_SECRET!,
      redirect_uri: `${process.env.APP_URL}/api/auth/hubspot/callback`,
      code
    })
  });

  const { access_token, refresh_token, expires_in } = await tokenResponse.json();

  // Save to integrations table
  await saveIntegration(orgId, 'hubspot', {
    access_token,
    refresh_token,
    expiry: new Date(Date.now() + expires_in * 1000)
  });

  // Run initial sync
  await syncHubSpotDeals(access_token);
  await syncHubSpotContacts(access_token);

  return redirect('/settings/integrations?status=success');
}
```

**LLM:** Não aplica

---

## Complexidade Estimada

**M (Médio)** — 1-1.5 sessões BMAD

- OAuth flow setup
- HubSpot API client (deals, contacts, activities)
- Sync orchestration + mapping logic
- Webhook receiver
- UI for settings
- Testes: unit (sync logic), E2E (OAuth, sync)

---

## Dependências

**Precisa que:**
- Accounts table (already exists)
- Contacts table (already exists)
- Organizations table (for org-scoped integrations)

**Bloqueia:** F4-04 (depends on accounts/contacts from HubSpot)

---

## Critérios de Aceite

### Funcional

- [ ] F1 — OAuth flow: click "Conectar HubSpot" → redirect to HubSpot → callback → token saved
- [ ] F2 — Initial sync: after OAuth, sync all deals and contacts automatically
- [ ] F3 — Account mapping: HubSpot deal → create CSPlataform account with external ID
- [ ] F4 — Contact mapping: HubSpot contact → create CSPlataform contact with external ID
- [ ] F5 — Field mapping: HubSpot fields (dealname, amount) → CSPlataform (name, arr)
- [ ] F6 — Manual sync: click "Sincronizar agora" → sync runs, status updates
- [ ] F7 — Sync status: display "Sincronizado em XX minutos" or "Erro na sincronização"
- [ ] F8 — Webhook receiver: HubSpot POST /webhooks/hubspot → sync updated contact/deal
- [ ] F9 — Activity log: show HubSpot activities in account detail
- [ ] F10 — Disconnect: click "Desconectar" → revoke token, clear sync data option

### Edge Cases

- [ ] E1 — Duplicate accounts (HubSpot deal + email match): merge or link?
- [ ] E2 — HubSpot field missing: use default or skip row?
- [ ] E3 — Token expires: refresh token automatically, or show error?
- [ ] E4 — Sync fails midway (500+ deals): log partial success, retry

### Performance

- [ ] P1 — Initial sync (1000 deals + 5000 contacts): < 5 minutes
- [ ] P2 — Manual sync: response < 2s (async job in background)
- [ ] P3 — Webhook processing: < 1s per event

### Data Quality

- [ ] Q1 — Account name normalization: trim whitespace, handle special chars
- [ ] Q2 — Email validation: skip invalid emails
- [ ] Q3 — De-duplication: if email matches existing contact, update instead of create

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Integração:**
- [ ] F1: OAuth complete flow
- [ ] F2-F5: Sync mapping correct
- [ ] F8: Webhook receiver works
- [ ] Q1-Q3: Data quality checks

**Testes obrigatórios:**
```
E2E:
1. Settings > Integrations > HubSpot
2. Click "Conectar HubSpot"
3. OAuth flow: login, approve, callback
4. Verify status: "Sincronizado agora"
5. Account detail: verify HubSpot activity section
6. Click manual "Sincronizar agora"

Unit:
- syncHubSpotDeals: maps fields correctly
- syncHubSpotContacts: handles missing fields
- Webhook: parses event, calls sync
- Token refresh: refreshes on expiry
```

**Fixtures:**
- HubSpot test account with 5 deals, 10 contacts
- Webhook secret configured

---

## Estimativa de Tokens

- HubSpot service: ~500 tokens
- OAuth flow: ~300 tokens
- Sync orchestration: ~300 tokens
- Webhook: ~200 tokens
- UI: ~300 tokens
- Tests: ~400 tokens
- **Total esperado:** 2k tokens por sessão BMAD

---

## Notas

1. **Token refresh** — Store refresh token, auto-refresh when access_token expires
2. **Rate limiting** — HubSpot has rate limits (100 API calls/10 seconds). Implement queue/backoff.
3. **Selective sync** — Allow org to choose: sync all deals, only active deals, specific properties
4. **Activity enrichment** — Map HubSpot activities (calls, emails) to CSPlataform interactions for unified timeline

---

## Links Relacionados

- Anterior: [F4-02 Renewal Management](F4-02-renewal-management.md)
- Próximo: [F4-04 Billing Integration](F4-04-billing-integration.md)
- Integrations: [_components-map.md](_components-map.md) → `HubSpotStatus`
