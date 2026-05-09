import { createClient } from '@supabase/supabase-js';

interface ZendeskTicket {
  id: number;
  external_id?: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  requester_id?: number;
  assignee_id?: number;
  created_at: string;
  updated_at: string;
}

interface JiraIssue {
  key: string;
  fields: {
    summary: string;
    description: string;
    status: { name: string };
    priority: { name: string };
    assignee?: { name: string };
    created: string;
    updated: string;
  };
}

export class SupportService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Sync Zendesk tickets to CSPlataform
   */
  async syncZendeskTickets(integrationId: string): Promise<any> {
    const startTime = Date.now();
    const logId = crypto.randomUUID();

    try {
      const integration = await this.getIntegration(integrationId, 'zendesk');
      if (!integration) {
        throw new Error('Integration not found');
      }

      await this.logSync(integrationId, 'tickets', 'in_progress', logId);

      const tickets = await this.fetchZendeskTickets(integration);

      let synced = 0;
      let failed = 0;

      for (const ticket of tickets) {
        try {
          await this.syncZendeskTicket(integration.account_id, ticket, integration.field_mapping);
          synced++;
        } catch (error) {
          failed++;
          console.error(`Failed to sync Zendesk ticket ${ticket.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      await this.supabase
        .from('support_sync_logs')
        .update({
          status: 'success',
          records_synced: synced,
          records_failed: failed,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', logId);

      return { synced, failed };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.supabase
        .from('support_sync_logs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', logId);

      throw error;
    }
  }

  /**
   * Sync Jira Service Desk issues
   */
  async syncJiraTickets(integrationId: string): Promise<any> {
    const startTime = Date.now();
    const logId = crypto.randomUUID();

    try {
      const integration = await this.getIntegration(integrationId, 'jira_sd');
      if (!integration) {
        throw new Error('Integration not found');
      }

      await this.logSync(integrationId, 'tickets', 'in_progress', logId);

      const issues = await this.fetchJiraIssues(integration);

      let synced = 0;
      let failed = 0;

      for (const issue of issues) {
        try {
          await this.syncJiraIssue(integration.account_id, issue, integration.field_mapping);
          synced++;
        } catch (error) {
          failed++;
          console.error(`Failed to sync Jira issue ${issue.key}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      await this.supabase
        .from('support_sync_logs')
        .update({
          status: 'success',
          records_synced: synced,
          records_failed: failed,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', logId);

      return { synced, failed };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.supabase
        .from('support_sync_logs')
        .update({
          status: 'failed',
          error_message: errorMessage,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', logId);

      throw error;
    }
  }

  /**
   * Fetch tickets from Zendesk API
   */
  private async fetchZendeskTickets(integration: any): Promise<ZendeskTicket[]> {
    const url = `${integration.instance_url}/api/v2/tickets.json`;
    const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString('base64');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Zendesk API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.tickets || [];
  }

  /**
   * Fetch issues from Jira API
   */
  private async fetchJiraIssues(integration: any): Promise<JiraIssue[]> {
    const jql = 'project = servicedesk';
    const url = `${integration.instance_url}/rest/api/3/search?jql=${encodeURIComponent(jql)}`;
    const auth = Buffer.from(`${integration.api_key}:${integration.api_secret}`).toString('base64');

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.issues || [];
  }

  /**
   * Sync Zendesk ticket to CSPlataform
   */
  private async syncZendeskTicket(accountId: string, ticket: ZendeskTicket, fieldMapping: any) {
    const mappedData = this.applyFieldMapping(ticket, fieldMapping);

    const { data: existing } = await this.supabase
      .from('support_tickets')
      .select('id')
      .eq('external_id', `zendesk_${ticket.id}`)
      .single();

    if (existing) {
      await this.supabase
        .from('support_tickets')
        .update({
          subject: mappedData.subject || ticket.subject,
          description: mappedData.description || ticket.description,
          status: mappedData.status || ticket.status,
          priority: mappedData.priority || ticket.priority,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await this.supabase.from('support_tickets').insert({
        account_id: accountId,
        external_id: `zendesk_${ticket.id}`,
        subject: mappedData.subject || ticket.subject,
        description: mappedData.description || ticket.description,
        status: mappedData.status || ticket.status,
        priority: mappedData.priority || ticket.priority,
        source: 'zendesk',
        created_at: ticket.created_at,
      });
    }
  }

  /**
   * Sync Jira issue to CSPlataform
   */
  private async syncJiraIssue(accountId: string, issue: JiraIssue, fieldMapping: any) {
    const fields = issue.fields;
    const mappedData = this.applyFieldMapping(fields, fieldMapping);

    const { data: existing } = await this.supabase
      .from('support_tickets')
      .select('id')
      .eq('external_id', `jira_${issue.key}`)
      .single();

    if (existing) {
      await this.supabase
        .from('support_tickets')
        .update({
          subject: mappedData.subject || fields.summary,
          description: mappedData.description || fields.description,
          status: mappedData.status || fields.status.name,
          priority: mappedData.priority || fields.priority.name,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    } else {
      await this.supabase.from('support_tickets').insert({
        account_id: accountId,
        external_id: `jira_${issue.key}`,
        subject: mappedData.subject || fields.summary,
        description: mappedData.description || fields.description,
        status: mappedData.status || fields.status.name,
        priority: mappedData.priority || fields.priority.name,
        source: 'jira',
        created_at: fields.created,
      });
    }
  }

  /**
   * Apply field mapping to support data
   */
  private applyFieldMapping(data: any, mapping: any): any {
    if (!mapping) return data;

    const mapped: any = {};
    for (const [externalField, localField] of Object.entries(mapping)) {
      if (data[externalField]) {
        mapped[localField] = data[externalField];
      }
    }
    return mapped;
  }

  /**
   * Handle inbound support webhook
   */
  async handleInboundWebhook(integrationId: string, payload: any) {
    const integration = await this.supabase
      .from('support_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (!integration.data) {
      throw new Error('Integration not found');
    }

    // Create or update ticket from webhook
    const ticketData = {
      account_id: integration.data.account_id,
      external_id: payload.id || payload.key,
      subject: payload.subject || payload.fields?.summary,
      description: payload.description || payload.fields?.description,
      status: payload.status || payload.fields?.status?.name,
      priority: payload.priority || payload.fields?.priority?.name,
      source: integration.data.support_type,
    };

    const { data: existing } = await this.supabase
      .from('support_tickets')
      .select('id')
      .eq('external_id', ticketData.external_id)
      .single();

    if (existing) {
      await this.supabase
        .from('support_tickets')
        .update(ticketData)
        .eq('id', existing.id);
    } else {
      await this.supabase.from('support_tickets').insert(ticketData);
    }
  }

  /**
   * Get integration
   */
  private async getIntegration(integrationId: string, type: string) {
    const { data } = await this.supabase
      .from('support_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('support_type', type)
      .single();

    return data;
  }

  /**
   * Log sync
   */
  private async logSync(integrationId: string, syncType: string, status: string, logId: string) {
    await this.supabase.from('support_sync_logs').insert({
      id: logId,
      integration_id: integrationId,
      sync_type: syncType,
      status,
      started_at: new Date().toISOString(),
    });
  }

  /**
   * List support integrations
   */
  async listIntegrations(accountId: string) {
    const { data } = await this.supabase
      .from('support_integrations')
      .select('id, support_type, is_active, last_sync_at, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  /**
   * Create support integration
   */
  async createIntegration(
    accountId: string,
    type: string,
    apiKey: string,
    instanceUrl: string,
    userId: string,
    apiSecret?: string
  ) {
    const { data } = await this.supabase
      .from('support_integrations')
      .insert({
        account_id: accountId,
        support_type: type,
        api_key: apiKey,
        api_secret: apiSecret,
        instance_url: instanceUrl,
        created_by: userId,
      })
      .select()
      .single();

    return data;
  }

  /**
   * Update integration
   */
  async updateIntegration(integrationId: string, updates: any) {
    const { data } = await this.supabase
      .from('support_integrations')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', integrationId)
      .select()
      .single();

    return data;
  }

  /**
   * Delete integration
   */
  async deleteIntegration(integrationId: string) {
    await this.supabase.from('support_integrations').delete().eq('id', integrationId);
  }
}

export default SupportService;
