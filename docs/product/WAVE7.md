# Wave 7 — Extensibility & Integrations (150 SP)

Complete implementation of webhooks, CRM integrations, support integrations, BI exports, advanced permissions, and observability infrastructure.

## Epic 30 — Webhooks Infrastructure (15 SP)

### Story 30.1: Webhook Management UI (3 SP)
- **Endpoint**: `POST /api/webhooks` - Create webhook
  - Body: `{ account_id, url, events[], auth_type, auth_token? }`
  - Returns: Webhook config with generated secret
  - Auth: Required

- **Endpoint**: `GET /api/webhooks` - List webhooks
  - Query: `account_id` (required)
  - Returns: Array of webhooks with metadata
  - Auth: Required

- **Endpoint**: `PUT /api/webhooks/[id]` - Update webhook
  - Body: Partial webhook config
  - Returns: Updated webhook
  - Auth: Required

- **Endpoint**: `DELETE /api/webhooks/[id]` - Delete webhook
  - Auth: Required

### Story 30.2: Event Dispatcher (5 SP)
- **Service**: `WebhookService.dispatchEvent(accountId, eventType, data)`
  - Events: `account.created`, `account.updated`, `account.deleted`, `contract.renewal`, `alert.triggered`, `health.degraded`, `ticket.resolved`, `risk.detected`
  - Rate limit: 100 req/min per endpoint
  - Retry logic: Exponential backoff (1m, 2m, 4m) for 5xx errors
  - Max retries: 3

### Story 30.3: Signature Verification (4 SP)
- **HMAC-SHA256** signing for all payloads
- **Header**: `X-Webhook-Signature`
- **Method**: `WebhookService.signPayload()` & `WebhookService.verifySignature()`
- **Auth Types**: `hmac`, `bearer`, `custom`

### Story 30.4: Testing & Monitoring (3 SP)
- **Endpoint**: `POST /api/webhooks/test`
  - Body: `{ webhook_id, event_type }`
  - Sends test delivery and logs result
  - Returns: `{ success, status_code, response, error, duration_ms }`

- **Endpoint**: `GET /api/webhooks/[id]`
  - Returns: Delivery metrics (success rate, latency, retry counts)
  - Returns: Recent deliveries (last 10)

- **Metrics**: Success rates, latency (avg, p95), retry counts

## Epic 31 — CRM Integration (40 SP)

### Story 31.1: Salesforce Sync (12 SP)
- **Service**: `CRMService.syncSalesforceAccounts(integrationId)`
- **API**: Salesforce REST API v61.0
- **Sync**: Accounts ↔ Salesforce Accounts (bidirectional)
- **Contacts**: Contacts ↔ Salesforce Contacts
- **Endpoint**: `POST /api/integrations/crm/sync`
  - Body: `{ integration_id, sync_type: 'accounts'|'contacts'|'deals' }`
  - Returns: `{ success, synced, failed, duration_ms }`

### Story 31.2: HubSpot Sync (12 SP)
- **Service**: `CRMService.syncHubSpotCompanies(integrationId)`
- **API**: HubSpot REST API
- **Sync**: Companies (accounts) & Contacts
- **Deal tracking**: Contracts ↔ HubSpot Deals
- **Revenue sync**: MRR → Custom field

### Story 31.3: Webhook Listener (10 SP)
- **Endpoint**: `POST /api/webhooks/crm-inbound`
  - Receives Salesforce/HubSpot webhooks
  - Updates local account data
  - Conflict resolution: CRM wins

- **Service**: `CRMService.handleInboundWebhook(integrationId, payload)`

### Story 31.4: CRM Settings (6 SP)
- **Endpoint**: `POST /api/integrations/crm` - Create integration
  - Body: `{ account_id, crm_type, api_key, instance_url, api_secret? }`
  - Returns: Integration config
  - Stores encrypted API keys in env

- **Field Mapping**: `field_mapping` JSONB column for custom field mapping
- **Toggle**: `is_active` boolean

## Epic 32 — Support/Ticketing Integration (25 SP)

### Story 32.1: Zendesk Sync (8 SP)
- **Service**: `SupportService.syncZendeskTickets(integrationId)`
- **API**: Zendesk REST API
- **Sync**: Tickets ↔ Zendesk Tickets (bidirectional)
- **Comments**: Auto-sync ticket replies

### Story 32.2: Jira Service Desk Sync (8 SP)
- **Service**: `SupportService.syncJiraTickets(integrationId)`
- **API**: Jira REST API v3
- **Sync**: Issues (tickets) with custom field mapping
- **Priority mapping**: CSM severity → Jira priority

### Story 32.3: Support Webhook (5 SP)
- **Endpoint**: `POST /api/webhooks/support-inbound`
  - Handles Zendesk/Jira webhooks
  - Creates/updates tickets
  - RLS: Ticket ownership preserved

- **Service**: `SupportService.handleInboundWebhook()`

### Story 32.4: Settings & Mapping (4 SP)
- **Endpoint**: `POST /api/integrations/support` - Create integration
  - Body: `{ account_id, support_type, api_key, instance_url, api_secret?, field_mapping? }`
  - Returns: Integration config

## Epic 33 — Business Intelligence Integration (20 SP)

### Story 33.1: Data Warehouse Export (8 SP)
- **Endpoint**: `POST /api/integrations/bi/export`
  - BigQuery: `POST /api/integrations/bi/export?destination=bigquery`
  - Snowflake: `POST /api/integrations/bi/export?destination=snowflake`

- **Service**: `BIService.exportAccountsToBigQuery()` & `BIService.exportContractsToSnowflake()`
- **Daily export**: Cron job via `POST /api/cron/integrations-sync`
- **Tables**: Timestamp partitioning by updated_at

### Story 33.2: Tableau/Looker Integration (6 SP)
- **Endpoint**: `GET /api/integrations/bi/export?entity_type=accounts`
  - Returns CSV of accounts
  - Content-Disposition: attachment

- **Service**: `BIService.getTableauDataSource()` - Returns JSON
- **OAuth**: Store API credentials securely

### Story 33.3: Dashboard Sync (4 SP)
- Embed Tableau reports in `/dashboard`
- Auto-refresh: 1 hour interval

### Story 33.4: Settings & API Keys (2 SP)
- **Endpoint**: `POST /api/integrations/bi` - Create integration
  - Stores BigQuery, Snowflake, Tableau credentials

## Epic 34 — Mobile MVP (30 SP)

Skipped in current implementation (Design phase completed Wave 6).
To implement:
1. React Native with Expo
2. Bottom tab navigation
3. Accounts, Alerts, Perguntar screens
4. Native notifications
5. Voice input with speech-to-text

## Epic 35 — Advanced Permissions (20 SP)

### Story 35.1: RBAC Expansion (8 SP)
- **New Roles**: `account_manager`, `report_viewer`, `finance_auditor`
- **Table**: `user_roles` with columns: `user_id`, `account_id`, `role`
- **Table**: `permission_matrix` with permission definitions
- **Endpoint**: `GET /api/permissions?user_id=X&account_id=Y`
  - Returns: User roles, resources, permissions

### Story 35.2: Resource-Level Access (6 SP)
- **Table**: `resource_access` with columns: `user_id`, `resource_type`, `resource_id`, `permission`
- **Endpoint**: `POST /api/permissions/access`
  - Body: `{ user_id, account_id, resource_type, resource_id, permission }`
  - Grants CSM access to specific accounts

### Story 35.3: Audit Trail (4 SP)
- **Table**: `permission_audit_logs` with immutable records
- **Endpoint**: `GET /api/audit-logs`
  - Query params: `action`, `user_id`, `resource_type`
  - Returns: Audit logs with pagination

- **Events**: `role_assigned`, `role_revoked`, `permission_granted`, `permission_revoked`

### Story 35.4: Permission UI (2 SP)
- `/admin/permissions` page for RBAC management
- User list + role assignment grid

## Epic 37 — Observability & Monitoring (15 SP)

### Story 37.1: Logging Infrastructure (5 SP)
- **Class**: `Logger` for structured logging
- **Levels**: `debug`, `info`, `warn`, `error`, `critical`
- **Table**: `application_logs` with context, user_id, trace_id
- **Endpoint**: `GET /api/observability/logs`
  - Query: `level`, `service`, `limit`, `offset`

### Story 37.2: Request Tracing (4 SP)
- **Class**: `RequestTracer` with trace ID generation
- **Table**: `request_traces` with method, path, status, duration
- **Method**: `RequestTracer.recordTrace(traceId, method, path, status, duration)`
- **Spans**: JSONB array for OpenTelemetry spans

### Story 37.3: Metrics & Alerting (4 SP)
- **Class**: `MetricsCollector` for recording metrics
- **Table**: `metrics` with name, type, value, labels, timestamp
- **Table**: `alert_rules` with condition, threshold, channels
- **Endpoint**: `GET /api/observability/metrics?metric_name=X`
  - Returns: Time-series data for metric

- **Metrics**: `http_request_duration_ms`, `errors_total`, `db_query_duration`

### Story 37.4: Error Tracking (2 SP)
- **Class**: `ErrorTracker` for aggregating errors
- **Table**: `error_events` with fingerprint, occurrence_count
- **Endpoint**: `GET /api/observability/errors`
  - Query: `severity`
  - Returns: Recent errors with context

- **Method**: `ErrorTracker.recordError(message, error, severity, context)`

## Database Schema

### Core Tables
- `webhooks`: Webhook endpoints with secrets
- `webhook_deliveries`: Delivery logs with retry tracking
- `crm_integrations`: Salesforce/HubSpot configs
- `support_integrations`: Zendesk/Jira configs
- `bi_integrations`: BigQuery/Snowflake/Tableau configs
- `crm_sync_logs`: Sync operation history
- `support_sync_logs`: Support sync history
- `bi_export_logs`: BI export history

### Permission Tables
- `user_roles`: User role assignments
- `permission_matrix`: Role→Resource→Action definitions
- `resource_access`: Resource-level access grants
- `permission_audit_logs`: Immutable audit trail

### Observability Tables
- `application_logs`: Structured logs
- `request_traces`: Request tracing
- `metrics`: Time-series metrics
- `error_events`: Aggregated errors
- `alert_rules`: Alert definitions
- `alert_incidents`: Triggered alerts

## Security

- API keys encrypted in database
- HMAC-SHA256 webhook signatures
- RLS policies on all tables
- Audit logging for permission changes
- Rate limiting: 100 req/min per webhook endpoint
- Admin-only access to observability endpoints

## Performance

- Indexes on frequently queried columns
- Pagination for large result sets
- Caching of permission matrix
- Batch syncing with retry logic
- Asynchronous webhook delivery

## File Structure

```
src/
├── lib/
│   ├── integrations/
│   │   ├── webhook-service.ts
│   │   ├── crm-service.ts
│   │   ├── support-service.ts
│   │   └── bi-service.ts
│   ├── observability/
│   │   └── logger.ts
│   └── schemas/
│       └── wave7.schema.ts
└── app/api/
    ├── webhooks/
    │   ├── route.ts (GET, POST)
    │   ├── [id]/route.ts (PUT, DELETE, GET)
    │   └── test/route.ts (POST)
    ├── integrations/
    │   ├── crm/
    │   │   ├── route.ts (GET, POST)
    │   │   └── sync/route.ts (POST)
    │   ├── support/
    │   │   ├── route.ts (GET, POST)
    │   │   └── sync/route.ts (POST)
    │   └── bi/
    │       ├── route.ts (GET, POST)
    │       └── export/route.ts (POST, GET)
    ├── permissions/route.ts (GET, POST)
    ├── audit-logs/route.ts (GET)
    ├── observability/
    │   ├── logs/route.ts (GET)
    │   ├── errors/route.ts (GET, PUT)
    │   └── metrics/route.ts (GET)
    └── cron/
        └── integrations-sync/route.ts (POST)

supabase/migrations/
├── 20260509000000_wave7_webhooks.sql
├── 20260509010000_wave7_integrations.sql
├── 20260509020000_wave7_advanced_permissions.sql
└── 20260509030000_wave7_observability.sql
```

## Deployment Checklist

- [ ] Run migrations: `supabase migration up`
- [ ] Set environment variables:
  - `CRON_SECRET` for cron endpoint validation
  - API keys for Salesforce, HubSpot, Zendesk, Jira, BigQuery, Snowflake
- [ ] Configure cron job to call `POST /api/cron/integrations-sync` hourly
- [ ] Test webhook delivery with `POST /api/webhooks/test`
- [ ] Verify CRM/support syncs with `POST /api/integrations/[type]/sync`
- [ ] Set up Sentry for error tracking (optional)
- [ ] Configure Datadog/Prometheus for metrics (optional)

## Testing

All endpoints include:
- Input validation with Zod schemas
- Error handling and logging
- Rate limiting
- RLS enforcement
- Comprehensive error messages

Test with:
```bash
# Create webhook
curl -X POST http://localhost:3000/api/webhooks \
  -H "Content-Type: application/json" \
  -d '{ "account_id": "...", "url": "https://example.com/webhook", "events": ["account.created"], "auth_type": "hmac" }'

# Test webhook delivery
curl -X POST http://localhost:3000/api/webhooks/test \
  -H "Content-Type: application/json" \
  -d '{ "webhook_id": "...", "event_type": "test.webhook" }'

# Create CRM integration
curl -X POST http://localhost:3000/api/integrations/crm \
  -H "Content-Type: application/json" \
  -d '{ "account_id": "...", "crm_type": "salesforce", "api_key": "...", "instance_url": "..." }'

# Sync CRM
curl -X POST http://localhost:3000/api/integrations/crm/sync \
  -H "Content-Type: application/json" \
  -d '{ "integration_id": "...", "sync_type": "accounts" }'
```

## Next Steps

1. **Mobile Implementation** (Epic 34): Implement React Native app
2. **Webhook Retry Queue**: Add dedicated job queue (Bull/RabbitMQ)
3. **Real-time Sync**: Implement WebSocket for real-time updates
4. **Advanced Analytics**: Add custom dashboards to CSPlataform
5. **AI-Powered Insights**: Use Perguntar for integration recommendations
