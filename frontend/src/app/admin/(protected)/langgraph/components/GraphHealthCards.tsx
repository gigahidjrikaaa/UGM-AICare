/**
 * GraphHealthCards Component
 * 
 * Displays health status cards for all 5 LangGraph agents:
 * - STA (Safety Triage Agent)
 * - SCA (Support Coach Agent)
 * - SDA (Service Desk Agent)
 * - IA (Insights Agent)
 * - Orchestrator
 * 
 * Each card shows:
 * - Status indicator (healthy/degraded/down)
 * - Success rate
 * - Average execution time
 * - Total executions (24h)
 */

'use client';

import { GraphHealthStatus } from '../hooks/useLangGraphHealth';

interface GraphHealthCardsProps {
  graphs: GraphHealthStatus[];
  loading: boolean;
}

// Graph metadata for display
const GRAPH_METADATA: Record<string, { name: string; description: string; icon: string }> = {
  sta: {
    name: 'Safety Triage Agent',
    description: 'Crisis detection and risk classification',
    icon: '🛡️'
  },
  sca: {
    name: 'Support Coach Agent',
    description: 'CBT-informed coaching and intervention plans',
    icon: '🧠'
  },
  sda: {
    name: 'Service Desk Agent',
    description: 'Clinical case management and SLA tracking',
    icon: '📋'
  },
  ia: {
    name: 'Insights Agent',
    description: 'Privacy-preserving analytics',
    icon: '📊'
  },
  orchestrator: {
    name: 'Orchestrator',
    description: 'Intent-based routing to appropriate agents',
    icon: '🎯'
  }
};

export function GraphHealthCards({ graphs, loading }: GraphHealthCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 animate-pulse">
            <div className="h-6 bg-white/20 rounded mb-2"></div>
            <div className="h-4 bg-white/20 rounded mb-4"></div>
            <div className="h-20 bg-white/20 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
      {graphs.map((graph) => {
        const metadata = GRAPH_METADATA[graph.graph_type];
        
        // Determine status colors
        const statusColors = {
          healthy: {
            bg: 'bg-green-50',
            border: 'border-green-200',
            text: 'text-green-800',
            dot: 'bg-green-500'
          },
          degraded: {
            bg: 'bg-yellow-50',
            border: 'border-yellow-200',
            text: 'text-yellow-800',
            dot: 'bg-yellow-500'
          },
          down: {
            bg: 'bg-red-50',
            border: 'border-red-200',
            text: 'text-red-800',
            dot: 'bg-red-500'
          }
        }[graph.status];

        return (
          <div
            key={graph.graph_type}
            className={`border rounded-lg p-4 ${statusColors.bg} ${statusColors.border}`}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{metadata.icon}</span>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${statusColors.dot}`}></div>
                  <span className={`text-xs font-semibold uppercase ${statusColors.text}`}>
                    {graph.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Graph Name */}
            <h3 className="font-semibold text-white mb-1">{metadata.name}</h3>
            <p className="text-xs text-white/60 mb-4">{metadata.description}</p>

            {/* Metrics */}
            <div className="space-y-2">
              {/* Success Rate */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/60">Success Rate</span>
                  <span className={`font-semibold ${statusColors.text}`}>
                    {graph.success_rate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-1.5 relative overflow-hidden">
                  <div
                    className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                      graph.status === 'healthy' ? 'bg-green-500' :
                      graph.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    data-width-percent={graph.success_rate}
                  ></div>
                </div>
              </div>

              {/* Executions */}
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Executions (24h)</span>
                <span className="font-semibold text-white">
                  {graph.total_executions.toLocaleString()}
                </span>
              </div>

              {/* Average Duration */}
              <div className="flex justify-between text-xs">
                <span className="text-white/60">Avg Duration</span>
                <span className="font-semibold text-white">
                  {graph.avg_duration_ms.toFixed(0)}ms
                </span>
              </div>

              {/* Error Count */}
              {graph.error_count > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/60">Errors</span>
                  <span className="font-semibold text-red-600">
                    {graph.error_count.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Last Execution Time */}
            {graph.last_execution_at && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <span className="text-xs text-white/50">
                  Last: {new Date(graph.last_execution_at).toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
