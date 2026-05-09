import { z } from 'zod'

// Adoption data for an account × feature
export const AdoptionDataSchema = z.object({
  featureId: z.string().uuid(),
  featureName: z.string().min(1),
  adoptionStatus: z.enum(['not_started', 'in_progress', 'adopted', 'abandoned']),
  adoptionPct: z.number().min(0).max(100),
  adoptionVelocity: z.number().optional(),
  lastUsageDate: z.string().datetime().nullable().optional(),
  firstAdoptionDate: z.string().datetime().nullable().optional(),
  blockers: z.array(z.object({
    type: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
  })).optional(),
})

// Adoption heatmap response
export const AdoptionHeatmapResponseSchema = z.object({
  accountId: z.string().uuid(),
  accountName: z.string(),
  data: z.array(z.object({
    featureId: z.string().uuid(),
    featureName: z.string(),
    adoptionHistory: z.array(z.object({
      date: z.string().date(),
      adoptionPct: z.number().min(0).max(100),
    })),
  })),
  summary: z.object({
    overallAdoptionPct: z.number().min(0).max(100),
    adoptionTrend: z.enum(['accelerating', 'stable', 'declining']),
    featuresAdopted: z.number().nonnegative(),
    featuresTotal: z.number().nonnegative(),
    topFeatures: z.array(z.string()),
    bottomFeatures: z.array(z.string()),
  }),
  timeRange: z.object({
    startDate: z.string().date(),
    endDate: z.string().date(),
  }),
})

// Adoption forecasting request
export const AdoptionForecastRequestSchema = z.object({
  accountId: z.string().uuid(),
  forecastDays: z.number().int().min(1).max(365).default(90),
  confidence: z.boolean().default(true),
})

// Adoption forecast response
export const AdoptionForecastResponseSchema = z.object({
  accountId: z.string().uuid(),
  accountName: z.string(),
  forecastDays: z.number(),
  baselineAdoptionPct: z.number().min(0).max(100),
  forecastedAdoptionPct: z.number().min(0).max(100),
  forecastedDate: z.string().date(),
  confidence: z.number().min(0).max(1),
  forecastTrend: z.enum(['accelerating', 'stable', 'declining']),
  recommendations: z.array(z.string()),
  methodology: z.string().optional(),
})

// Feature blockers response
export const FeatureBlockersResponseSchema = z.object({
  accountId: z.string().uuid(),
  accountName: z.string(),
  blockers: z.array(z.object({
    blockerId: z.string().uuid(),
    featureId: z.string().uuid(),
    featureName: z.string(),
    blockerType: z.enum(['technical', 'training', 'organizational', 'business', 'other']),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    description: z.string(),
    rootCauseAnalysis: z.object({
      factors: z.array(z.string()),
      recommendations: z.array(z.string()),
    }).optional(),
    detectedAt: z.string().datetime(),
    detectionSource: z.enum(['usage_metrics', 'support_tickets', 'interview', 'system_inference']),
  })),
  summary: z.object({
    totalBlockers: z.number(),
    criticalCount: z.number(),
    highCount: z.number(),
    mediumCount: z.number(),
    topBlockers: z.array(z.string()),
  }),
})

// Feature dependency graph response
export const FeatureDependencyGraphResponseSchema = z.object({
  features: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    category: z.enum(['core', 'advanced', 'enterprise', 'beta']),
    launchDate: z.string().date(),
    tier: z.enum(['Basic', 'Professional', 'Enterprise']),
  })),
  dependencies: z.array(z.object({
    fromFeatureId: z.string().uuid(),
    toFeatureId: z.string().uuid(),
    relationshipType: z.enum(['requires', 'enables', 'recommends']),
  })),
  accountAdoption: z.record(z.string().uuid(), z.number().min(0).max(100)).optional(),
})
