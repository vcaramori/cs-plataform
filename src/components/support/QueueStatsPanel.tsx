"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Users } from "lucide-react";
import React from "react";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CSMQueueStat {
  csm_id: string;
  csm_name: string;
  csm_email: string;
  max_capacity: number;
  assigned_count: number;
  available_slots: number;
  load_percentage: number;
  status: "active" | "inactive";
}

export function QueueStatsPanel() {
  const { data: stats = [], isLoading, error } = useQuery<CSMQueueStat[]>({
    queryKey: ["csm-queue-stats"],
    queryFn: async () => {
      const response = await fetch("/api/csm-queue-stats");
      if (!response.ok) throw new Error("Failed to fetch queue stats");
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds (align with cache)
  });

  const getCapacityColor = (percentage: number): string => {
    if (percentage < 50) return "bg-green-500"; // Green
    if (percentage < 80) return "bg-yellow-500"; // Yellow
    return "bg-red-500"; // Red
  };

  const getCapacityBadgeColor = (percentage: number): string => {
    if (percentage < 50) return "text-green-700 bg-green-100";
    if (percentage < 80) return "text-yellow-700 bg-yellow-100";
    return "text-red-700 bg-red-100";
  };

  const activeCSMs = stats.filter((s) => s.status === "active");

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center justify-center h-32">
          <Text variant="secondary">Carregando fila...</Text>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <Text variant="secondary">Erro ao carregar fila</Text>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-4 h-4 text-content-secondary" />
        <Text variant="primary" className="font-semibold">
          Fila de Capacidade
        </Text>
      </div>

      <div className="space-y-3">
        {activeCSMs.length === 0 ? (
          <Text variant="secondary" className="text-sm text-center py-4">
            Nenhum CSM ativo
          </Text>
        ) : (
          activeCSMs.map((csm) => (
            <TooltipProvider key={csm.csm_id}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-pointer">
                    {/* CSM Name */}
                    <div className="flex items-center justify-between mb-1">
                      <Text variant="secondary" className="text-sm font-medium">
                        {csm.csm_name}
                      </Text>
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded ${getCapacityBadgeColor(
                          csm.load_percentage
                        )}`}
                      >
                        {csm.load_percentage.toFixed(0)}%
                      </span>
                    </div>

                    {/* Capacity bar */}
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${getCapacityColor(
                          csm.load_percentage
                        )}`}
                        style={{ width: `${Math.min(csm.load_percentage, 100)}%` }}
                      />
                    </div>

                    {/* Count */}
                    <div className="flex items-center justify-between mt-1">
                      <Text variant="secondary" className="text-xs">
                        {csm.assigned_count}/{csm.max_capacity}
                      </Text>
                      {csm.available_slots > 0 && (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      )}
                    </div>
                  </div>
                </TooltipTrigger>

                {/* Tooltip content */}
                <TooltipContent side="right" className="text-sm">
                  <div className="space-y-1">
                    <div>
                      <strong>{csm.csm_name}</strong>
                    </div>
                    <div className="text-xs text-gray-200">
                      {csm.assigned_count}/{csm.max_capacity} tickets
                    </div>
                    <div className="text-xs text-gray-200">
                      {csm.available_slots} slots disponíveis
                    </div>
                    <div className="text-xs text-gray-200">
                      Capacidade: {csm.load_percentage.toFixed(1)}%
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))
        )}
      </div>

      {/* Summary stats */}
      <div className="mt-4 pt-4 border-t border-border-divider">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <Text variant="secondary" className="text-xs">
              CSMs ativos
            </Text>
            <Text variant="primary" className="font-semibold">
              {activeCSMs.length}
            </Text>
          </div>
          <div>
            <Text variant="secondary" className="text-xs">
              Total de tickets
            </Text>
            <Text variant="primary" className="font-semibold">
              {activeCSMs.reduce((sum, csm) => sum + csm.assigned_count, 0)}
            </Text>
          </div>
        </div>
      </div>
    </Card>
  );
}
