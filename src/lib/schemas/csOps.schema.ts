import { z } from 'zod'

// CSM Capacity response
export const CSMCapacityResponseSchema = z.object({
  csmId: z.string().uuid(),
  csmName: z.string(),
  snapshotDate: z.string().date(),
  accountsManaged: z.number().nonnegative(),
  totalMrr: z.number().nonnegative(),
  totalArr: z.number().nonnegative(),
  avgHealthScore: z.number().min(0).max(100),
  capacityUtilizationPct: z.number().min(0).max(200), // Can exceed 100%
  idealAccountsPerCsm: z.number().nonnegative().default(12),
  workloadStatus: z.enum(['underutilized', 'balanced', 'at_capacity', 'overloaded']),
  hoursAllocatedWeekly: z.number().nonnegative(),
  hoursBillableWeekly: z.number().nonnegative(),
  hoursInternalWeekly: z.number().nonnegative(),
  billableUtilizationPct: z.number().min(0).max(100),
})

// Territory Rebalancer suggestion
export const TerritoryRebalancerResponseSchema = z.object({
  suggestions: z.array(z.object({
    suggestionId: z.string().uuid(),
    accountId: z.string().uuid(),
    accountName: z.string(),
    currentCsmId: z.string().uuid(),
    currentCsmName: z.string(),
    suggestedCsmId: z.string().uuid(),
    suggestedCsmName: z.string(),
    recommendationScore: z.number().min(0).max(1),
    rationale: z.string(),
    currentCsmUtilizationAfter: z.number().min(0),
    suggestedCsmUtilizationAfter: z.number().min(0),
    expectedImpact: z.object({
      currentCsmImpact: z.enum(['reduce_overload', 'optimize', 'utilize_better']),
      suggestedCsmImpact: z.enum(['utilize_better', 'balance', 'increase_capacity']),
    }),
  })),
  summary: z.object({
    totalSuggestions: z.number(),
    potentialCapacityImprovement: z.number().min(0).max(1),
  }),
})

// Execute rebalancing
export const ExecuteRebalancingRequestSchema = z.object({
  suggestionIds: z.array(z.string().uuid()).min(1),
})

// CSM Scorecard response
export const CSMScorecardResponseSchema = z.object({
  csmId: z.string().uuid(),
  csmName: z.string(),
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  accountsManaged: z.number().nonnegative(),
  totalMrr: z.number().nonnegative(),
  healthMetrics: z.object({
    escalationsOwned: z.number().nonnegative(),
    escalationsResolved: z.number().nonnegative(),
    escalationsResolvedPct: z.number().min(0).max(100),
    avgHealthManagedAccounts: z.number().min(0).max(100),
  }),
  customerSatisfaction: z.object({
    avgNps: z.number().min(-100).max(100),
    npsCount: z.number().nonnegative(),
    avgCsat: z.number().min(0).max(5),
    csatCount: z.number().nonnegative(),
  }),
  ticketPerformance: z.object({
    avgResponseTimeHours: z.number().nonnegative(),
    totalTicketsHandled: z.number().nonnegative(),
  }),
  engagement: z.object({
    interactionsPerAccount: z.number().nonnegative(),
    expansionDeals: z.number().nonnegative(),
    expansionValue: z.number().nonnegative(),
    renewalsClosed: z.number().nonnegative(),
    renewalRatePct: z.number().min(0).max(100),
    churnRatePct: z.number().min(0).max(100),
  }),
  overallScore: z.number().min(0).max(100),
  topPerformance: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
})

// CSM Health / Burnout detection
export const CSMHealthResponseSchema = z.object({
  csmId: z.string().uuid(),
  csmName: z.string(),
  snapshotDate: z.string().date(),
  utilizationPct: z.number().min(0).max(200),
  avgResponseTimeHours: z.number().nonnegative(),
  escalationsOwned: z.number().nonnegative(),
  avgCsatScore: z.number().min(0).max(5).nullable(),
  avgNpsTeam: z.number().min(-100).max(100).nullable(),
  burnoutRiskScore: z.number().min(0).max(1),
  burnoutIndicators: z.array(z.enum(['overutilized', 'high_escalations', 'low_csat', 'high_stress_signals'])),
  flaggedAsHighRisk: z.boolean(),
  recommendations: z.array(z.string()).optional(),
})

// Team Velocity response
export const TeamVelocityResponseSchema = z.object({
  periodStart: z.string().date(),
  periodEnd: z.string().date(),
  weekNumber: z.number().int().min(1).max(53).nullable(),
  teamMetrics: z.object({
    totalCsmsActive: z.number().nonnegative(),
    accountsOnboarded: z.number().nonnegative(),
    accountsRenewed: z.number().nonnegative(),
    accountsChurned: z.number().nonnegative(),
    avgTtvDays: z.number().nonnegative(),
  }),
  expansion: z.object({
    deals: z.number().nonnegative(),
    totalValue: z.number().nonnegative(),
  }),
  health: z.object({
    healthImprovements: z.number().nonnegative(),
    healthRegressions: z.number().nonnegative(),
  }),
  support: z.object({
    ticketsResolved: z.number().nonnegative(),
    avgResolutionTimeHours: z.number().nonnegative(),
  }),
  teamUtilization: z.object({
    utilizationPct: z.number().min(0).max(200),
    burnoutFlaggedCount: z.number().nonnegative(),
  }),
  forecast: z.object({
    renewalsExpected: z.number().nonnegative(),
    expansionPotential: z.number().nonnegative(),
  }).optional(),
  trend: z.enum(['accelerating', 'stable', 'declining']).optional(),
})

// CS Ops metrics (overview) — shape "flat" consumido pelos cards de resumo
export const CSOpsMetricsResponseSchema = z.object({
  snapshotDate: z.string().date(),
  teamSize: z.number().nonnegative(),
  avgCapacityUtilization: z.number().min(0).max(200),
  overloadedCount: z.number().nonnegative(),
  underutilizedCount: z.number().nonnegative(),
  avgNps: z.number().min(-100).max(100),
  avgCsat: z.number().min(0).max(5),
})
