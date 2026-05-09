import { createClient } from '@supabase/supabase-js';

export class BIService {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Export accounts to BigQuery
   */
  async exportAccountsToBigQuery(integrationId: string): Promise<any> {
    const startTime = Date.now();
    const logId = crypto.randomUUID();

    try {
      const integration = await this.getIntegration(integrationId, 'bigquery');
      if (!integration) {
        throw new Error('Integration not found');
      }

      await this.logExport(integrationId, 'accounts', 'in_progress', logId);

      // Fetch accounts from Supabase
      const { data: accounts } = await this.supabase
        .from('accounts')
        .select('*')
        .eq('account_id', integration.account_id)
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!accounts || accounts.length === 0) {
        const duration = Date.now() - startTime;
        await this.supabase
          .from('bi_export_logs')
          .update({
            status: 'success',
            rows_exported: 0,
            completed_at: new Date().toISOString(),
            duration_ms: duration,
          })
          .eq('id', logId);

        return { exported: 0 };
      }

      // Load into BigQuery
      const tableId = `${integration.dataset_id}.accounts`;
      const exported = await this.loadToBigQuery(tableId, accounts, integration.api_key);

      const duration = Date.now() - startTime;
      await this.supabase
        .from('bi_export_logs')
        .update({
          status: 'success',
          rows_exported: exported,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', logId);

      return { exported };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.supabase
        .from('bi_export_logs')
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
   * Export contracts to Snowflake
   */
  async exportContractsToSnowflake(integrationId: string): Promise<any> {
    const startTime = Date.now();
    const logId = crypto.randomUUID();

    try {
      const integration = await this.getIntegration(integrationId, 'snowflake');
      if (!integration) {
        throw new Error('Integration not found');
      }

      await this.logExport(integrationId, 'contracts', 'in_progress', logId);

      const { data: contracts } = await this.supabase
        .from('contracts')
        .select('*')
        .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (!contracts || contracts.length === 0) {
        const duration = Date.now() - startTime;
        await this.supabase
          .from('bi_export_logs')
          .update({
            status: 'success',
            rows_exported: 0,
            completed_at: new Date().toISOString(),
            duration_ms: duration,
          })
          .eq('id', logId);

        return { exported: 0 };
      }

      // Load into Snowflake
      const tableName = `${integration.schema_name}.contracts`;
      const exported = await this.loadToSnowflake(tableName, contracts, integration);

      const duration = Date.now() - startTime;
      await this.supabase
        .from('bi_export_logs')
        .update({
          status: 'success',
          rows_exported: exported,
          completed_at: new Date().toISOString(),
          duration_ms: duration,
        })
        .eq('id', logId);

      return { exported };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.supabase
        .from('bi_export_logs')
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
   * Load data into BigQuery
   */
  private async loadToBigQuery(tableId: string, rows: any[], apiKey: string): Promise<number> {
    // In production, use official BigQuery client library
    const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${tableId.split('.')[0]}/datasets/${tableId.split('.')[1]}/tables/${tableId.split('.')[2]}/insertAll`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        rows: rows.map((row) => ({
          json: row,
          insertId: row.id,
        })),
      }),
    });

    if (!response.ok) {
      throw new Error(`BigQuery error: ${response.statusText}`);
    }

    return rows.length;
  }

  /**
   * Load data into Snowflake
   */
  private async loadToSnowflake(tableName: string, rows: any[], config: any): Promise<number> {
    // In production, use official Snowflake client library
    const csvData = this.convertToCSV(rows);

    // Create temporary stage and load data
    // This is a simplified version - production should use Snowflake SDK
    const url = `${config.instance_url}/api/v2/statements`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        statement: `INSERT INTO ${tableName} VALUES (...)`,
        timeout: 60,
      }),
    });

    if (!response.ok) {
      throw new Error(`Snowflake error: ${response.statusText}`);
    }

    return rows.length;
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
      headers
        .map((header) => {
          const value = row[header];
          if (value === null || value === undefined) return '';
          if (typeof value === 'string' && value.includes(',')) return `"${value}"`;
          return value;
        })
        .join(',')
    );

    return [headers.join(','), ...rows].join('\n');
  }

  /**
   * Get Tableau data source
   */
  async getTableauDataSource(integrationId: string): Promise<any> {
    const integration = await this.getIntegration(integrationId, 'tableau');
    if (!integration) {
      throw new Error('Integration not found');
    }

    // Fetch all accounts and contracts
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('account_id', integration.account_id);

    const { data: contracts } = await this.supabase
      .from('contracts')
      .select('*')
      .in('account_id', (accounts || []).map((a: any) => a.id));

    return {
      accounts: accounts || [],
      contracts: contracts || [],
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Export data as CSV for BI tools
   */
  async exportAsCSV(integrationId: string, entityType: string): Promise<string> {
    const integration = await this.getIntegration(integrationId, 'tableau');
    if (!integration) {
      throw new Error('Integration not found');
    }

    if (entityType === 'accounts') {
      const { data } = await this.supabase
        .from('accounts')
        .select('*')
        .eq('account_id', integration.account_id);

      return this.convertToCSV(data || []);
    }

    if (entityType === 'contracts') {
      const { data } = await this.supabase.from('contracts').select('*');
      return this.convertToCSV(data || []);
    }

    throw new Error('Unknown entity type');
  }

  /**
   * Get integration
   */
  private async getIntegration(integrationId: string, type: string) {
    const { data } = await this.supabase
      .from('bi_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('bi_type', type)
      .single();

    return data;
  }

  /**
   * Log export
   */
  private async logExport(integrationId: string, exportType: string, status: string, logId: string) {
    await this.supabase.from('bi_export_logs').insert({
      id: logId,
      integration_id: integrationId,
      export_type: exportType,
      status,
      started_at: new Date().toISOString(),
    });
  }

  /**
   * List BI integrations
   */
  async listIntegrations(accountId: string) {
    const { data } = await this.supabase
      .from('bi_integrations')
      .select('id, bi_type, is_active, last_sync_at, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    return data || [];
  }

  /**
   * Create BI integration
   */
  async createIntegration(
    accountId: string,
    type: string,
    apiKey: string,
    instanceUrl: string,
    userId: string,
    options?: any
  ) {
    const { data } = await this.supabase
      .from('bi_integrations')
      .insert({
        account_id: accountId,
        bi_type: type,
        api_key: apiKey,
        instance_url: instanceUrl,
        dataset_id: options?.datasetId,
        schema_name: options?.schemaName,
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
      .from('bi_integrations')
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
    await this.supabase.from('bi_integrations').delete().eq('id', integrationId);
  }
}

export default BIService;
