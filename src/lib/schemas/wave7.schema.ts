import { z } from 'zod';

// Webhook schemas
export const WebhookEventSchema = z.enum([
  'account.created',
  'account.updated',
  'account.deleted',
  'contract.created',
  'contract.updated',
  'contract.renewal',
  'ticket.created',
  'ticket.resolved',
  'ticket.closed',
  'alert.triggered',
  'health.degraded',
  'risk.detected',
  'test.webhook',
]);

export const WebhookAuthTypeSchema = z.enum(['hmac', 'bearer', 'custom']);

export const CreateWebhookSchema = z.object({
  account_id: z.string().uuid(),
  url: z.string().url(),
  events: z.array(WebhookEventSchema),
  auth_type: WebhookAuthTypeSchema,
  auth_token: z.string().optional(),
});

export const UpdateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(WebhookEventSchema).optional(),
  auth_type: WebhookAuthTypeSchema.optional(),
  auth_token: z.string().optional(),
  is_active: z.boolean().optional(),
});

export const WebhookPayloadSchema = z.object({
  event_type: z.string(),
  timestamp: z.string().datetime(),
  data: z.record(z.any()),
  account_id: z.string().uuid(),
});

// CRM Integration schemas
export const CRMTypeSchema = z.enum(['salesforce', 'hubspot']);
export const CRMSyncDirectionSchema = z.enum(['bidirectional', 'inbound', 'outbound']);

export const CreateCRMIntegrationSchema = z.object({
  account_id: z.string().uuid(),
  crm_type: CRMTypeSchema,
  api_key: z.string(),
  instance_url: z.string().url(),
  api_secret: z.string().optional(),
  sync_direction: CRMSyncDirectionSchema.default('bidirectional'),
  field_mapping: z.record(z.string()).optional(),
});

export const UpdateCRMIntegrationSchema = z.object({
  is_active: z.boolean().optional(),
  sync_direction: CRMSyncDirectionSchema.optional(),
  field_mapping: z.record(z.string()).optional(),
});

export const CRMSyncSchema = z.object({
  integration_id: z.string().uuid(),
  sync_type: z.enum(['accounts', 'contacts', 'deals']),
});

// Support Integration schemas
export const SupportTypeSchema = z.enum(['zendesk', 'jira_sd']);

export const CreateSupportIntegrationSchema = z.object({
  account_id: z.string().uuid(),
  support_type: SupportTypeSchema,
  api_key: z.string(),
  instance_url: z.string().url(),
  api_secret: z.string().optional(),
  field_mapping: z.record(z.string()).optional(),
});

export const UpdateSupportIntegrationSchema = z.object({
  is_active: z.boolean().optional(),
  field_mapping: z.record(z.string()).optional(),
});

export const SupportSyncSchema = z.object({
  integration_id: z.string().uuid(),
  sync_type: z.enum(['tickets', 'comments']),
});

// BI Integration schemas
export const BITypeSchema = z.enum(['bigquery', 'snowflake', 'tableau', 'looker']);
export const ExportFrequencySchema = z.enum(['hourly', 'daily', 'weekly']);

export const CreateBIIntegrationSchema = z.object({
  account_id: z.string().uuid(),
  bi_type: BITypeSchema,
  api_key: z.string(),
  instance_url: z.string().url(),
  dataset_id: z.string().optional(),
  schema_name: z.string().optional(),
  export_frequency: ExportFrequencySchema.default('daily'),
});

export const UpdateBIIntegrationSchema = z.object({
  is_active: z.boolean().optional(),
  export_frequency: ExportFrequencySchema.optional(),
});

export const BIExportSchema = z.object({
  integration_id: z.string().uuid(),
  export_type: z.enum(['accounts', 'contracts', 'health_scores']),
  destination: z.enum(['bigquery', 'snowflake']).optional(),
});

// Permission schemas
export const RoleSchema = z.enum([
  'admin',
  'csm',
  'account_manager',
  'report_viewer',
  'finance_auditor',
  'read_only',
]);

export const ResourceTypeSchema = z.enum(['account', 'contract', 'ticket', 'interaction']);
export const PermissionTypeSchema = z.enum(['view', 'create', 'edit', 'delete', 'export']);
export const PermissionActionSchema = z.enum(['view', 'edit', 'manage']);

export const AssignRoleSchema = z.object({
  user_id: z.string().uuid(),
  account_id: z.string().uuid(),
  role: RoleSchema,
});

export const GrantAccessSchema = z.object({
  user_id: z.string().uuid(),
  account_id: z.string().uuid(),
  resource_type: ResourceTypeSchema,
  resource_id: z.string().uuid(),
  permission: PermissionActionSchema,
});

export const RevokeAccessSchema = z.object({
  user_id: z.string().uuid(),
  resource_type: ResourceTypeSchema,
  resource_id: z.string().uuid(),
  permission: PermissionActionSchema,
});

// Observability schemas
export const LogLevelSchema = z.enum(['debug', 'info', 'warn', 'error', 'critical']);
export const SeveritySchema = z.enum(['low', 'medium', 'high', 'critical']);
export const MetricTypeSchema = z.enum(['counter', 'gauge', 'histogram', 'summary']);
export const ConditionSchema = z.enum([
  'greater_than',
  'less_than',
  'greater_than_or_equal',
  'less_than_or_equal',
  'equals',
]);

export const CreateAlertRuleSchema = z.object({
  name: z.string().min(1).max(255),
  metric_name: z.string(),
  condition: ConditionSchema,
  threshold: z.number(),
  duration_seconds: z.number().int().min(60).default(300),
  notification_channels: z.array(z.string()).default([]),
});

export const UpdateAlertRuleSchema = z.object({
  name: z.string().optional(),
  metric_name: z.string().optional(),
  condition: ConditionSchema.optional(),
  threshold: z.number().optional(),
  duration_seconds: z.number().int().optional(),
  notification_channels: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
});

// Export all types
export type Webhook = z.infer<typeof CreateWebhookSchema>;
export type WebhookEvent = z.infer<typeof WebhookEventSchema>;
export type WebhookAuthType = z.infer<typeof WebhookAuthTypeSchema>;
export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

export type CRMIntegration = z.infer<typeof CreateCRMIntegrationSchema>;
export type CRMType = z.infer<typeof CRMTypeSchema>;
export type CRMSync = z.infer<typeof CRMSyncSchema>;

export type SupportIntegration = z.infer<typeof CreateSupportIntegrationSchema>;
export type SupportType = z.infer<typeof SupportTypeSchema>;
export type SupportSync = z.infer<typeof SupportSyncSchema>;

export type BIIntegration = z.infer<typeof CreateBIIntegrationSchema>;
export type BIType = z.infer<typeof BITypeSchema>;
export type BIExport = z.infer<typeof BIExportSchema>;

export type Role = z.infer<typeof RoleSchema>;
export type ResourceType = z.infer<typeof ResourceTypeSchema>;
export type PermissionType = z.infer<typeof PermissionTypeSchema>;
export type PermissionAction = z.infer<typeof PermissionActionSchema>;

export type LogLevel = z.infer<typeof LogLevelSchema>;
export type Severity = z.infer<typeof SeveritySchema>;
export type MetricType = z.infer<typeof MetricTypeSchema>;
export type AlertCondition = z.infer<typeof ConditionSchema>;
