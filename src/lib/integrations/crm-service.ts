import { createClient } from '@supabase/supabase-js';

interface SalesforceAccount {
  Id: string;
  Name: string;
  BillingCity?: string;
  BillingCountry?: string;
  Phone?: string;
  Website?: string;
  Revenue?: string;
}

interface HubSpotCompany {
  id: string;
  properties: {
    name: string;
    city?: string;
    country?: string;
    phone?: string;
    website?: string;
    annualrevenue?: string;
  };
}

export class CRMService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Sync Salesforce accounts to CSPlataform
   */
  async syncSalesforceAccounts(integrationId: string): Promise<any> {
    const startTime = Date.now();
    const logId = crypto.randomUUID();

    try {
      // Get integration config
      const integration = await this.getIntegration(integrationId, 'salesforce');
      if (!integration) {
        throw new Error('Integration not found');
      }

      // Log sync start
      await this.logSync(integrationId, 'accounts', 'in_progress', logId);

      // Fetch accounts from Salesforce
      const sfAccounts = await this.fetchSalesforceAccounts(integration);

      // Sync each account
      let synced = 0;
      let failed = 0;

      for (const sfAccount of sfAccounts) {
        try {
          await this.syncSalesforceAccount(integration.account_id, sfAccount, integration.field_mapping);
          synced++;
        } catch (error) {
          failed++;
          console.error(`Failed to sync Salesforce account ${sfAccount.Id}:`, error);
        }
      }

      // Log sync complete
      const duration = Date.now() - startTime;
      await this.supabase
        .from('crm_sync_logs')
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
        .from('crm_sync_logs')
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
   * Sync HubSpot companies to CSPlataform
   */
  async syncHubSpotCompanies(integrationId: string): Promise<any> {
    const startTime = Date.now();
    const logId = crypto.randomUUID();

    try {
      const integration = await this.getIntegration(integrationId, 'hubspot');
      if (!integration) {
        throw new Error('Integration not found');
      }

      await this.logSync(integrationId, 'accounts', 'in_progress', logId);

      const companies = await this.fetchHubSpotCompanies(integration);

      let synced = 0;
      let failed = 0;

      for (const company of companies) {
        try {
          await this.syncHubSpotCompany(integration.account_id, company, integration.field_mapping);
          synced++;
        } catch (error) {
          failed++;
          console.error(`Failed to sync HubSpot company ${company.id}:`, error);
        }
      }

      const duration = Date.now() - startTime;
      await this.supabase
        .from('crm_sync_logs')
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
        .from('crm_sync_logs')
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
   * Fetch accounts from Salesforce API
   */
  private async fetchSalesforceAccounts(integration: any): Promise<SalesforceAccount[]> {
    const query = "SELECT Id, Name, BillingCity, BillingCountry, Phone, Website, Revenue FROM Account";
    const url = `${integration.instance_url}/services/data/v61.0/query?q=${encodeURIComponent(query)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${integration.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Salesforce API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.records || [];
  }

  /**
   * Fetch companies from HubSpot API
   */
  private async fetchHubSpotCompanies(integration: any): Promise<HubSpotCompany[]> {
    const url = 'https://api.hubapi.com/crm/v3/objects/companies';
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${integration.api_key}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HubSpot API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.results || [];
  }

  /**
   * Sync single Salesforce account
   */
  private async syncSalesforceAccount(accountId: string, sfAccount: SalesforceAccount, fieldMapping: any) {
    // Apply field mapping if provided
    const mappedData = this.applyFieldMapping(sfAccount, fieldMapping);

    // Check if account exists
    const { data: existing } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('account_id', sfAccount.Id)
      .single();

    if (existing) {
      // Update existing account
      await this.supabase
        .from('accounts')
        .update({
          name: mappedData.name || sfAccount.Name,
          city: mappedData.city || sfAccount.BillingCity,
          country: mappedData.country || sfAccount.BillingCountry,
          website: mappedData.website || sfAccount.Website,
        })
        .eq('id', existing.id);
    } else {
      // Create new account
      await this.supabase.from('accounts').insert({
        account_id: sfAccount.Id,
        name: mappedData.name || sfAccount.Name,
        city: mappedData.city || sfAccount.BillingCity,
        country: mappedData.country || sfAccount.BillingCountry,
        website: mappedData.website || sfAccount.Website,
        csm_owner_id: accountId,
      });
    }
  }

  /**
   * Sync single HubSpot company
   */
  private async syncHubSpotCompany(accountId: string, company: HubSpotCompany, fieldMapping: any) {
    const props = company.properties;
    const mappedData = this.applyFieldMapping(props, fieldMapping);

    const { data: existing } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('crm_id', company.id)
      .single();

    if (existing) {
      await this.supabase
        .from('accounts')
        .update({
          name: mappedData.name || props.name,
          city: mappedData.city || props.city,
          country: mappedData.country || props.country,
          website: mappedData.website || props.website,
        })
        .eq('id', existing.id);
    } else {
      await this.supabase.from('accounts').insert({
        crm_id: company.id,
        name: mappedData.name || props.name,
        city: mappedData.city || props.city,
        country: mappedData.country || props.country,
        website: mappedData.website || props.website,
        csm_owner_id: accountId,
      });
    }
  }

  /**
   * Apply field mapping to CRM data
   */
  private applyFieldMapping(data: any, mapping: any): any {
    if (!mapping) return data;

    const mapped: any = {};
    for (const [crmField, localField] of Object.entries(mapping)) {
      const localFieldStr = localField as string;
      if (data[crmField]) {
        mapped[localFieldStr] = data[crmField];
      }
    }
    return mapped;
  }

  /**
   * Get integration config
   */
  private async getIntegration(integrationId: string, type: string) {
    const { data } = await this.supabase
      .from('crm_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('crm_type', type)
      .single();

    return data;
  }

  /**
   * Log sync operation
   */
  private async logSync(integrationId: string, syncType: string, status: string, logId: string) {
    await this.supabase.from('crm_sync_logs').insert({
      id: logId,
      integration_id: integrationId,
      sync_type: syncType,
      status,
      started_at: new Date().toISOString(),
    });
  }

  /**
   * List CRM integrations
   */
  async listIntegrations(accountId: string) {
    const { data } = await this.supabase
      .from('crm_integrations')
      .select('id, crm_type, is_active, last_sync_at, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  /**
   * Create CRM integration
   */
  async createIntegration(
    accountId: string,
    type: string,
    apiKey: string,
    instanceUrl: string,
    userId: string
  ) {
    const { data } = await this.supabase
      .from('crm_integrations')
      .insert({
        account_id: accountId,
        crm_type: type,
        api_key: apiKey,
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
      .from('crm_integrations')
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
    await this.supabase.from('crm_integrations').delete().eq('id', integrationId);
  }

  /**
   * Handle inbound CRM webhook
   */
  async handleInboundWebhook(integrationId: string, payload: any) {
    const integration = await this.supabase
      .from('crm_integrations')
      .select('*')
      .eq('id', integrationId)
      .single();

    if (!integration.data) {
      throw new Error('Integration not found');
    }

    // Handle Salesforce webhook
    if (integration.data.crm_type === 'salesforce') {
      // Update local account with CRM data (CRM wins on conflict)
      if (payload.sobject.type === 'Account') {
        await this.supabase
          .from('accounts')
          .update({
            name: payload.sobject.fields.Name,
            website: payload.sobject.fields.Website,
          })
          .eq('crm_id', payload.sobject.id);
      }
    }

    // Handle HubSpot webhook
    if (integration.data.crm_type === 'hubspot') {
      if (payload.objectType === 'company') {
        const company = payload.object;
        await this.supabase
          .from('accounts')
          .update({
            name: company.properties.name,
            website: company.properties.website,
          })
          .eq('crm_id', company.id);
      }
    }
  }
}

export default CRMService;
