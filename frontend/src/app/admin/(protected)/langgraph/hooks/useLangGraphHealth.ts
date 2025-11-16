/**
 * Custom hook for fetching LangGraph health status
 * 
 * Returns health metrics for all 6 graphs:
 * - STA (Safety Triage Agent)
 * - TCA (Therapeutic Coach Agent)
 * - CMA (Case Management Agent)
 * - IA (Insights Agent)
 * - AIKA (Meta-Agent - Orchestrator)
 * - Orchestrator (Legacy routing)
 * 
 * Fetches data every 30 seconds
 */

'use client';

import { useEffect, useState } from 'react';
import * as langGraphApi from '@/services/langGraphApi';

export interface GraphHealthStatus {
  graph_type: 'sta' | 'tca' | 'cma' | 'ia' | 'aika' | 'orchestrator';
  status: 'healthy' | 'degraded' | 'down';
  total_executions: number;
  success_count: number;
  error_count: number;
  success_rate: number;
  avg_duration_ms: number;
  last_execution_at: string | null;
  last_error_at: string | null;
}

export interface LangGraphHealthData {
  graphs: GraphHealthStatus[];
  overall_status: 'healthy' | 'degraded' | 'down';
  last_updated: string;
}

export function useLangGraphHealth(autoRefreshSeconds: number = 30) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<LangGraphHealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      setError(null);
      
      // Fetch analytics overview (last 24 hours)
      const overview = await langGraphApi.getAnalyticsOverview(1);
      
      // For now, create placeholder health data for all 6 graphs
      // In a real implementation, we'd need per-graph analytics from backend
      const graphTypes: Array<'sta' | 'tca' | 'cma' | 'ia' | 'aika' | 'orchestrator'> = 
        ['sta', 'tca', 'cma', 'ia', 'aika', 'orchestrator'];
      
      const graphs: GraphHealthStatus[] = graphTypes.map(graphType => {
        // Use overall metrics for each graph (placeholder until backend provides per-graph data)
        const successRate = overview.data.success_rate_percent;
        
        let status: 'healthy' | 'degraded' | 'down';
        if (successRate >= 95) status = 'healthy';
        else if (successRate >= 70) status = 'degraded';
        else status = 'down';

        return {
          graph_type: graphType,
          status,
          total_executions: overview.data.total_executions,
          success_count: overview.data.successful_executions,
          error_count: overview.data.total_executions - overview.data.successful_executions,
          success_rate: successRate,
          avg_duration_ms: overview.data.average_execution_time_ms,
          last_execution_at: new Date().toISOString(), // Placeholder
          last_error_at: null // Not available in current backend response
        };
      });

      // Determine overall status
      const hasDown = graphs.some(g => g.status === 'down');
      const hasDegraded = graphs.some(g => g.status === 'degraded');
      const overall_status = hasDown ? 'down' : hasDegraded ? 'degraded' : 'healthy';

      setData({
        graphs,
        overall_status,
        last_updated: new Date().toISOString()
      });
      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch health status';
      console.error('Failed to fetch LangGraph health:', err);
      setError(errorMessage);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();

    // Auto-refresh every N seconds
    const interval = setInterval(fetchHealth, autoRefreshSeconds * 1000);

    return () => clearInterval(interval);
  }, [autoRefreshSeconds]);

  return { loading, data, error, refetch: fetchHealth };
}
