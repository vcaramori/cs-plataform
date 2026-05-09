import { z } from 'zod'

// Alert object schema
export const AlertSchema = z.object({
  alertId: z.string().uuid(),
  accountId: z.string().uuid(),
  accountName: z.string(),
  alertType: z.enum([
    'churn_risk',
    'anomaly',
    'sentiment_trigger',
    'contract_risk',
    'adoption_cliff',
    'custom',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  status: z.enum(['active', 'acknowledged', 'resolved', 'dismissed']),
  riskScore: z.number().min(0).max(1),
  riskFactors: z.array(z.object({
    factor: z.string(),
    weight: z.number().min(0).max(1),
    evidence: z.string().optional(),
  })),
  recommendedAction: z.string(),
  metadata: z.record(z.any()).optional(),
  triggeredAt: z.string().datetime(),
  acknowledgedAt: z.string().datetime().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
})

// Alerts list response
export const AlertsListResponseSchema = z.object({
  alerts: z.array(AlertSchema),
  summary: z.object({
    totalAlerts: z.number().nonnegative(),
    criticalCount: z.number().nonnegative(),
    highCount: z.number().nonnegative(),
    mediumCount: z.number().nonnegative(),
    lowCount: z.number().nonnegative(),
    activeCount: z.number().nonnegative(),
  }),
  filters: z.object({
    alertType: z.string().optional(),
    severity: z.string().optional(),
    status: z.string().optional(),
    csm: z.string().optional(),
  }).optional(),
})

// Acknowledge alert request
export const AcknowledgeAlertRequestSchema = z.object({
  alertIds: z.array(z.string().uuid()).min(1),
  notes: z.string().optional(),
})

// Resolve alert request
export const ResolveAlertRequestSchema = z.object({
  alertIds: z.array(z.string().uuid()).min(1),
  resolutionNotes: z.string().min(1),
})

// Alert timeline response (for AlertTimeline component)
export const AlertTimelineResponseSchema = z.object({
  accountId: z.string().uuid(),
  accountName: z.string(),
  timeline: z.array(z.object({
    date: z.string().date(),
    alertsCount: z.number(),
    criticalCount: z.number(),
    highCount: z.number(),
    mediumCount: z.number(),
    lowCount: z.number(),
    topAlerts: z.array(z.object({
      type: z.string(),
      severity: z.string(),
      description: z.string(),
    })).max(3),
  })),
  summary: z.object({
    period: z.object({
      startDate: z.string().date(),
      endDate: z.string().date(),
    }),
    trend: z.enum(['increasing', 'stable', 'decreasing']),
    peakAlertDay: z.string().date().optional(),
  }),
})

// Predictive Churn Alert specific
export const ChurnRiskAlertSchema = z.object({
  alertId: z.string().uuid(),
  accountId: z.string().uuid(),
  accountName: z.string(),
  severity: z.enum(['medium', 'high', 'critical']),
  healthScore: z.number().min(0).max(100),
  healthTrend: z.enum(['up', 'stable', 'down', 'critical']),
  daysWithLowHealth: z.number().nonnegative(),
  triggeredReason: z.string(), // "3 consecutive days with health < 40"
  riskFactors: z.array(z.string()),
  recommendedAction: z.string(),
  suggestedPlaybooks: z.array(z.object({
    playbookId: z.string().uuid(),
    playbookName: z.string(),
    expectedImpact: z.string(),
  })).optional(),
})

// Anomaly Alert specific
export const AnomalyAlertSchema = z.object({
  alertId: z.string().uuid(),
  accountId: z.string().uuid(),
  accountName: z.string(),
  metricType: z.enum(['health_score', 'nps', 'ticket_volume', 'response_time', 'engagement', 'adoption']),
  metricValue: z.number(),
  expectedValue: z.number(),
  zScore: z.number(), // How many standard deviations away
  anomalyType: z.enum(['spike', 'drop', 'shift', 'trend']),
  severity: z.enum(['low', 'medium', 'high']),
  explanation: z.string(),
})

// Sentiment Trigger Alert specific
export const SentimentTriggerAlertSchema = z.object({
  alertId: z.string().uuid(),
  accountId: z.string().uuid(),
  accountName: z.string(),
  sentimentScore: z.number().min(-1).max(1),
  sentimentText: z.string(),
  severity: z.enum(['medium', 'high']),
  associatedNps: z.number().min(0).max(10).optional(),
  suggestedResponse: z.string().optional(),
})

// Contract Risk Alert specific
export const ContractRiskAlertSchema = z.object({
  alertId: z.string().uuid(),
  accountId: z.string().uuid(),
  accountName: z.string(),
  contractId: z.string().uuid(),
  renewalDate: z.string().date(),
  daysUntilRenewal: z.number().nonnegative(),
  healthScore: z.number().min(0).max(100),
  contractValue: z.number().nonnegative(),
  severity: z.enum(['high', 'critical']),
  riskFactors: z.array(z.string()),
  recommendedActions: z.array(z.string()),
})

// Adoption Cliff Alert specific
export const AdoptionCliffAlertSchema = z.object({
  alertId: z.string().uuid(),
  accountId: z.string().uuid(),
  accountName: z.string(),
  cliffDate: z.string().date(),
  adoptionPct7dAgo: z.number().min(0).max(100),
  adoptionPctToday: z.number().min(0).max(100),
  dropPct: z.number().nonnegative(),
  affectedFeatures: z.array(z.object({
    featureName: z.string(),
    dropPct: z.number().nonnegative(),
  })),
  severity: z.enum(['medium', 'high']),
  usageDeclineReason: z.string().optional(),
  recommendedAction: z.string(),
})
