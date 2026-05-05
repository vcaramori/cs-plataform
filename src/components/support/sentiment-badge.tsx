'use client';

import React, { useState } from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface SentimentBadgeProps {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // 0-1
  keywords?: string[];
  size?: 'sm' | 'md' | 'lg';
}

const sentimentConfig = {
  positive: {
    color: 'bg-emerald-100 dark:bg-emerald-900/40',
    dot: 'bg-emerald-500',
    label: 'Positivo',
    icon: '🟢',
  },
  neutral: {
    color: 'bg-slate-100 dark:bg-slate-800',
    dot: 'bg-slate-500',
    label: 'Neutro',
    icon: '⚪',
  },
  negative: {
    color: 'bg-red-100 dark:bg-red-900/40',
    dot: 'bg-red-500',
    label: 'Negativo',
    icon: '🔴',
  },
};

export function SentimentBadge({
  sentiment,
  score,
  keywords = [],
  size = 'sm',
}: SentimentBadgeProps) {
  const config = sentimentConfig[sentiment];
  const scorePercent = Math.round(score * 100);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const tooltipContent = (
    <div className="space-y-2">
      <div className="font-semibold text-sm">{config.label}</div>
      <div className="text-xs">Score: {scorePercent}%</div>
      {keywords.length > 0 && (
        <div className="text-xs">
          <div className="font-semibold mb-1">Palavras-chave:</div>
          <div className="flex flex-wrap gap-1">
            {keywords.map((keyword) => (
              <span
                key={keyword}
                className="bg-white/20 px-1.5 py-0.5 rounded text-xs"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full font-medium cursor-help transition-colors',
              config.color,
              sizeClasses[size]
            )}
          >
            <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
            <span>{config.label}</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className={cn('bg-slate-950 text-white')}>
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
