'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SentimentTrendSparklineProps {
  ticketId: string;
  compact?: boolean;
}

interface SentimentTrendData {
  timestamp: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  keywords?: string[];
}

interface TrendResponse {
  trend: SentimentTrendData[];
  overall: 'positive' | 'neutral' | 'negative';
  trend_direction: 'improving' | 'stable' | 'declining';
  cache_generated_at?: string;
}

const getSentimentColor = (sentiment: string): string => {
  switch (sentiment) {
    case 'positive':
      return '#10b981'; // emerald-500
    case 'negative':
      return '#ef4444'; // red-500
    case 'neutral':
    default:
      return '#a1a5a9'; // slate-500
  }
};

const getTrendIcon = (direction: string): string => {
  switch (direction) {
    case 'improving':
      return '↑';
    case 'declining':
      return '↓';
    case 'stable':
    default:
      return '→';
  }
};

const getTrendColor = (direction: string): string => {
  switch (direction) {
    case 'improving':
      return 'text-emerald-600';
    case 'declining':
      return 'text-red-600';
    case 'stable':
    default:
      return 'text-slate-600';
  }
};

export function SentimentTrendSparkline({
  ticketId,
  compact = false,
}: SentimentTrendSparklineProps) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  const { data, isLoading, error } = useQuery<TrendResponse>({
    queryKey: ['sentiment-trend', ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/support-tickets/${ticketId}/sentiment-trend`);
      if (!response.ok) throw new Error('Failed to fetch sentiment trend');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const svgDimensions = useMemo(() => {
    return compact
      ? { width: 120, height: 30, padding: 2 }
      : { width: 200, height: 50, padding: 4 };
  }, [compact]);

  const points = useMemo(() => {
    if (!data?.trend || data.trend.length === 0) return [];

    const trend = data.trend;
    const minScore = 0;
    const maxScore = 1;
    const range = maxScore - minScore;

    return trend.map((item, index) => {
      const x =
        (index / Math.max(trend.length - 1, 1)) *
        (svgDimensions.width - svgDimensions.padding * 2) +
        svgDimensions.padding;
      const y =
        svgDimensions.height -
        ((item.score - minScore) / range) * (svgDimensions.height - svgDimensions.padding * 2) -
        svgDimensions.padding;

      return {
        x,
        y,
        score: item.score,
        sentiment: item.sentiment,
        timestamp: new Date(item.timestamp),
        keywords: item.keywords || [],
      };
    });
  }, [data?.trend, svgDimensions]);

  const pathData = useMemo(() => {
    if (points.length === 0) return '';
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }, [points]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
      </div>
    );
  }

  if (error || !data || data.trend.length === 0) {
    return (
      <div className="text-xs text-slate-500">
        Sem dados de sentimento
      </div>
    );
  }

  const totalCount = data.trend.length;
  const positiveCount = data.trend.filter((t) => t.sentiment === 'positive').length;
  const neutralCount = data.trend.filter((t) => t.sentiment === 'neutral').length;
  const negativeCount = data.trend.filter((t) => t.sentiment === 'negative').length;

  const tooltipText = `Últimas ${totalCount} respostas: ${positiveCount} positivas, ${neutralCount} neutras, ${negativeCount} negativas`;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <svg
                width={svgDimensions.width}
                height={svgDimensions.height}
                viewBox={`0 0 ${svgDimensions.width} ${svgDimensions.height}`}
                className="inline-block"
              >
                {/* Grid background */}
                <defs>
                  <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.1" />
                    <stop offset="50%" stopColor="#a1a5a9" stopOpacity="0.05" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.1" />
                  </linearGradient>
                </defs>

                {/* Sentiment line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Data points */}
                {points.map((point, index) => (
                  <circle
                    key={index}
                    cx={point.x}
                    cy={point.y}
                    r={compact ? 1.5 : 2.5}
                    fill={getSentimentColor(point.sentiment)}
                    opacity={hoveredPoint === index ? 1 : 0.6}
                    className="transition-opacity cursor-pointer"
                    onMouseEnter={() => setHoveredPoint(index)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* Hover indicator line */}
                {hoveredPoint !== null && points[hoveredPoint] && (
                  <line
                    x1={points[hoveredPoint].x}
                    y1="0"
                    x2={points[hoveredPoint].x}
                    y2={svgDimensions.height}
                    stroke="#d1d5db"
                    strokeWidth="1"
                    strokeDasharray="2,2"
                    opacity="0.5"
                  />
                )}
              </svg>

              {/* Trend direction indicator */}
              <span
                className={cn(
                  'text-sm font-semibold',
                  getTrendColor(data.trend_direction)
                )}
              >
                {getTrendIcon(data.trend_direction)}
              </span>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2 text-sm">
            <div className="font-semibold">{tooltipText}</div>
            <div className="text-xs text-slate-300">
              Tendência: {data.trend_direction === 'improving' ? 'Melhorando ↑' : data.trend_direction === 'declining' ? 'Piorando ↓' : 'Estável →'}
            </div>
            {data.cache_generated_at && (
              <div className="text-xs text-slate-400">
                Cache: {new Date(data.cache_generated_at).toLocaleTimeString()}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
