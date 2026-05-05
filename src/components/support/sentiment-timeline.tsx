'use client';

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export interface SentimentTimelineProps {
  ticketId: string;
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
}

const sentimentConfig = {
  positive: {
    label: 'Positivo',
    color: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-100',
    badgeColor: 'bg-emerald-500',
  },
  neutral: {
    label: 'Neutro',
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100',
    badgeColor: 'bg-slate-500',
  },
  negative: {
    label: 'Negativo',
    color: 'bg-red-100 dark:bg-red-900/40 text-red-900 dark:text-red-100',
    badgeColor: 'bg-red-500',
  },
};

export function SentimentTimeline({ ticketId }: SentimentTimelineProps) {
  const [filter, setFilter] = useState<string>('all');

  const { data, isLoading, error } = useQuery<TrendResponse>({
    queryKey: ['sentiment-trend', ticketId],
    queryFn: async () => {
      const response = await fetch(`/api/support-tickets/${ticketId}/sentiment-trend`);
      if (!response.ok) throw new Error('Failed to fetch sentiment trend');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  const filteredTrend = useMemo(() => {
    if (!data?.trend) return [];
    if (filter === 'all') return data.trend;
    return data.trend.filter((item) => item.sentiment === filter);
  }, [data?.trend, filter]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-sm text-slate-500 py-8 text-center">
        Não foi possível carregar a análise de sentimento
      </div>
    );
  }

  if (data.trend.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-8 text-center">
        Sem dados de sentimento ainda
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-content-secondary">Filtrar por sentimento:</span>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos ({data.trend.length})</SelectItem>
            <SelectItem value="positive">
              Positivos ({data.trend.filter((t) => t.sentiment === 'positive').length})
            </SelectItem>
            <SelectItem value="neutral">
              Neutros ({data.trend.filter((t) => t.sentiment === 'neutral').length})
            </SelectItem>
            <SelectItem value="negative">
              Negativos ({data.trend.filter((t) => t.sentiment === 'negative').length})
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {filteredTrend.length === 0 ? (
          <div className="text-sm text-slate-500 py-4 text-center">
            Nenhuma resposta com sentimento {filter}
          </div>
        ) : (
          filteredTrend.map((item, index) => {
            const config = sentimentConfig[item.sentiment];
            const scorePercent = Math.round(item.score * 100);
            const timestamp = new Date(item.timestamp);

            return (
              <div
                key={index}
                className={cn(
                  'p-4 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors',
                  config.color
                )}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full flex-shrink-0',
                        config.badgeColor
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="whitespace-nowrap">
                          {config.label}
                        </Badge>
                        <span className="text-sm font-semibold">
                          Score: {scorePercent}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                        {timestamp.toLocaleString('pt-BR', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Score Bar */}
                  <div className="flex-shrink-0">
                    <div className="w-20 h-1.5 bg-white/50 dark:bg-black/30 rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full transition-all',
                          item.sentiment === 'positive'
                            ? 'bg-emerald-500'
                            : item.sentiment === 'negative'
                              ? 'bg-red-500'
                              : 'bg-slate-500'
                        )}
                        style={{ width: `${scorePercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                {item.keywords && item.keywords.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/20 dark:border-black/20">
                    <div className="text-xs font-semibold mb-1.5 opacity-75">
                      Palavras-chave:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.keywords.map((keyword, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-xs font-medium bg-white/30 dark:bg-black/30"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Summary Stats */}
      {data.trend.length > 0 && (
        <div className="mt-6 pt-4 border-t border-border-divider">
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 rounded-lg bg-surface-card">
              <div className="text-xs text-content-secondary mb-1">Positivas</div>
              <div className="text-lg font-bold text-emerald-600">
                {data.trend.filter((t) => t.sentiment === 'positive').length}
              </div>
            </div>
            <div className="text-center p-2 rounded-lg bg-surface-card">
              <div className="text-xs text-content-secondary mb-1">Neutras</div>
              <div className="text-lg font-bold text-slate-600">
                {data.trend.filter((t) => t.sentiment === 'neutral').length}
              </div>
            </div>
            <div className="text-center p-2 rounded-lg bg-surface-card">
              <div className="text-xs text-content-secondary mb-1">Negativas</div>
              <div className="text-lg font-bold text-red-600">
                {data.trend.filter((t) => t.sentiment === 'negative').length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
