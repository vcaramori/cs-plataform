import { createClient } from '@supabase/supabase-js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: any;
  error?: Error;
}

export class Logger {
  private supabase: any;
  private serviceName: string;
  private requestId?: string;
  private traceId?: string;

  constructor(supabaseUrl: string, supabaseKey: string, serviceName: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.serviceName = serviceName;
  }

  /**
   * Set request and trace context
   */
  setContext(requestId: string, traceId: string) {
    this.requestId = requestId;
    this.traceId = traceId;
  }

  /**
   * Debug level log
   */
  async debug(message: string, context?: any) {
    await this.log('debug', message, context);
  }

  /**
   * Info level log
   */
  async info(message: string, context?: any) {
    await this.log('info', message, context);
  }

  /**
   * Warn level log
   */
  async warn(message: string, context?: any) {
    await this.log('warn', message, context);
  }

  /**
   * Error level log
   */
  async error(message: string, error?: Error, context?: any) {
    await this.log('error', message, context, error);
  }

  /**
   * Critical level log
   */
  async critical(message: string, error?: Error, context?: any) {
    await this.log('critical', message, context, error);
  }

  /**
   * Core logging method
   */
  private async log(
    level: LogLevel,
    message: string,
    context?: any,
    error?: Error
  ) {
    const entry = {
      level,
      service: this.serviceName,
      message,
      context: context || {},
      user_id: context?.userId,
      request_id: this.requestId,
      trace_id: this.traceId,
      error_stack: error?.stack,
      created_at: new Date().toISOString(),
    };

    // Log to database
    try {
      await this.supabase.from('application_logs').insert(entry);
    } catch (err) {
      // Fallback to console if database fails
      console.error('[Logging Error]', err);
    }

    // Also log to console
    const logFn = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
      critical: console.error,
    }[level];

    logFn(`[${level.toUpperCase()}] ${this.serviceName}: ${message}`, {
      context,
      error: error?.message,
    });
  }
}

/**
 * Request tracing utilities
 */
export class RequestTracer {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Generate unique trace ID
   */
  generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Record request trace
   */
  async recordTrace(
    traceId: string,
    method: string,
    path: string,
    status: number,
    responseTimeMs: number,
    userId?: string,
    error?: Error
  ) {
    const entry = {
      trace_id: traceId,
      request_method: method,
      request_path: path,
      response_status: status,
      response_time_ms: responseTimeMs,
      user_id: userId,
      error_message: error?.message,
      created_at: new Date().toISOString(),
    };

    try {
      await this.supabase.from('request_traces').insert(entry);
    } catch (err) {
      console.error('[Trace Recording Error]', err);
    }
  }

  /**
   * Get traces for debugging
   */
  async getTraces(limit: number = 100, offset: number = 0) {
    const { data } = await this.supabase
      .from('request_traces')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    return data || [];
  }

  /**
   * Get traces for user
   */
  async getUserTraces(userId: string, limit: number = 50) {
    const { data } = await this.supabase
      .from('request_traces')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    return data || [];
  }
}

/**
 * Metrics collection
 */
export class MetricsCollector {
  private supabase: any;
  private serviceName: string;

  constructor(supabaseUrl: string, supabaseKey: string, serviceName: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.serviceName = serviceName;
  }

  /**
   * Record metric
   */
  async recordMetric(name: string, value: number, labels?: Record<string, string>) {
    const entry = {
      metric_name: name,
      metric_type: this.inferMetricType(name),
      value,
      labels: labels || {},
      service: this.serviceName,
      timestamp: new Date().toISOString(),
    };

    try {
      await this.supabase.from('metrics').insert(entry);
    } catch (err) {
      console.error('[Metrics Error]', err);
    }
  }

  /**
   * Infer metric type from name
   */
  private inferMetricType(name: string): 'counter' | 'gauge' | 'histogram' | 'summary' {
    if (name.includes('_total')) return 'counter';
    if (name.includes('_duration') || name.includes('_ms')) return 'histogram';
    if (name.includes('_sum')) return 'summary';
    return 'gauge';
  }

  /**
   * Record response time
   */
  async recordResponseTime(endpoint: string, durationMs: number, labels?: Record<string, string>) {
    await this.recordMetric(`http_request_duration_ms`, durationMs, {
      endpoint,
      ...labels,
    });
  }

  /**
   * Record error
   */
  async recordError(endpoint: string, errorCode: string, labels?: Record<string, string>) {
    await this.recordMetric(`errors_total`, 1, {
      endpoint,
      error_code: errorCode,
      ...labels,
    });
  }

  /**
   * Get metrics
   */
  async getMetrics(metricName: string, limit: number = 1000) {
    const { data } = await this.supabase
      .from('metrics')
      .select('*')
      .eq('metric_name', metricName)
      .order('timestamp', { ascending: false })
      .limit(limit);

    return data || [];
  }
}

/**
 * Error tracking
 */
export class ErrorTracker {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Record error event
   */
  async recordError(
    message: string,
    error: Error,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    context?: any
  ) {
    const fingerprint = this.generateFingerprint(message, error);

    // Check if error already exists
    const { data: existing } = await this.supabase
      .from('error_events')
      .select('id, occurrence_count, last_occurrence')
      .eq('fingerprint', fingerprint)
      .eq('is_resolved', false)
      .single();

    const entry = {
      error_code: error.name,
      message,
      stack_trace: error.stack,
      context,
      severity,
      fingerprint,
      first_occurrence: existing ? existing.first_occurrence : new Date().toISOString(),
      last_occurrence: new Date().toISOString(),
      occurrence_count: (existing?.occurrence_count || 0) + 1,
    };

    if (existing) {
      await this.supabase.from('error_events').update(entry).eq('id', existing.id);
    } else {
      await this.supabase.from('error_events').insert(entry);
    }
  }

  /**
   * Generate error fingerprint
   */
  private generateFingerprint(message: string, error: Error): string {
    // Create a simple fingerprint from error type and first stack line
    const stackLine = error.stack?.split('\n')[1] || '';
    return `${error.name}_${message}_${stackLine}`.substring(0, 128);
  }

  /**
   * Get recent errors
   */
  async getRecentErrors(limit: number = 50, severity?: string) {
    let query = this.supabase.from('error_events').select('*').eq('is_resolved', false);

    if (severity) {
      query = query.eq('severity', severity);
    }

    const { data } = await query
      .order('last_occurrence', { ascending: false })
      .limit(limit);

    return data || [];
  }

  /**
   * Mark error as resolved
   */
  async resolveError(errorId: string) {
    await this.supabase
      .from('error_events')
      .update({
        is_resolved: true,
      })
      .eq('id', errorId);
  }
}

/**
 * Alert management
 */
export class AlertManager {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Create alert rule
   */
  async createAlertRule(
    name: string,
    metricName: string,
    condition: string,
    threshold: number,
    durationSeconds: number = 300,
    notificationChannels: string[] = []
  ) {
    const { data } = await this.supabase
      .from('alert_rules')
      .insert({
        name,
        metric_name: metricName,
        condition,
        threshold,
        duration_seconds: durationSeconds,
        notification_channels: notificationChannels,
      })
      .select()
      .single();

    return data;
  }

  /**
   * Evaluate alert rules
   */
  async evaluateRules() {
    const { data: rules } = await this.supabase
      .from('alert_rules')
      .select('*')
      .eq('is_active', true);

    if (!rules) return;

    for (const rule of rules) {
      await this.evaluateRule(rule);
    }
  }

  /**
   * Evaluate single rule
   */
  private async evaluateRule(rule: any) {
    // Fetch recent metrics for this rule
    const { data: metrics } = await this.supabase
      .from('metrics')
      .select('value')
      .eq('metric_name', rule.metric_name)
      .gte(
        'timestamp',
        new Date(Date.now() - rule.duration_seconds * 1000).toISOString()
      );

    if (!metrics || metrics.length === 0) return;

    const values = metrics.map((m: any) => m.value);
    const shouldTrigger = this.evaluateCondition(rule.condition, values, rule.threshold);

    if (shouldTrigger) {
      // Create incident
      await this.supabase.from('alert_incidents').insert({
        alert_rule_id: rule.id,
        value: Math.max(...values),
        is_active: true,
      });
    }
  }

  /**
   * Evaluate condition against values
   */
  private evaluateCondition(condition: string, values: number[], threshold: number): boolean {
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    switch (condition) {
      case 'greater_than':
        return avg > threshold;
      case 'less_than':
        return avg < threshold;
      case 'greater_than_or_equal':
        return avg >= threshold;
      case 'less_than_or_equal':
        return avg <= threshold;
      case 'equals':
        return avg === threshold;
      default:
        return false;
    }
  }

  /**
   * Get active incidents
   */
  async getActiveIncidents() {
    const { data } = await this.supabase
      .from('alert_incidents')
      .select('*, alert_rules(*)')
      .eq('is_active', true)
      .order('triggered_at', { ascending: false });

    return data || [];
  }
}
