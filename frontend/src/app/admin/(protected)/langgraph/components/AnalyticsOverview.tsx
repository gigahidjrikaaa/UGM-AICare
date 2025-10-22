/**
 * AnalyticsOverview Component
 * 
 * Displays high-level analytics metrics for LangGraph executions:
 * - Total executions
 * - Success rate
 * - Average execution time
 * - Most active nodes
 * 
 * Fetches data for the selected time period (7/30/90 days)
 */

'use client';

import { useEffect, useState } from 'react';
import { getAnalyticsOverview, AnalyticsOverviewResponse } from '@/services/langGraphApi';

interface AnalyticsOverviewProps {
  days: number;
}

export function AnalyticsOverview({ days }: AnalyticsOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsOverviewResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOverview = async () => {
      setLoading(true);
      setError(null);
      try {
        const overview = await getAnalyticsOverview(days);
        setData(overview);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [days]);

  if (loading) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-white/20 rounded w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-white/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800 text-sm">Failed to load analytics: {error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Analytics Overview</h2>
        <span className="text-sm text-white/60">Last {days} days</span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Executions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Total Executions</p>
              <p className="text-2xl font-bold text-blue-900 mt-1">
                {data.data.total_executions.toLocaleString()}
              </p>
            </div>
            <svg className="h-8 w-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Success Rate</p>
              <p className="text-2xl font-bold text-green-900 mt-1">
                {data.data.success_rate_percent.toFixed(1)}%
              </p>
            </div>
            <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        {/* Successful Executions */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-purple-600 font-medium">Successful</p>
              <p className="text-2xl font-bold text-purple-900 mt-1">
                {data.data.successful_executions.toLocaleString()}
              </p>
            </div>
            <svg className="h-8 w-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        {/* Average Execution Time */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Avg Duration</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {data.data.average_execution_time_ms.toFixed(0)}ms
              </p>
            </div>
            <svg className="h-8 w-8 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Most Active Nodes */}
      {data.data.most_active_nodes && data.data.most_active_nodes.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white/70 mb-3">Most Active Nodes</h3>
          <div className="space-y-2">
            {data.data.most_active_nodes.slice(0, 5).map((node, index) => (
              <div key={index} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-6 h-6 bg-white/20 rounded-full text-xs font-semibold text-white/70">
                    {index + 1}
                  </span>
                  <span className="text-sm font-medium text-white">{node.node_name}</span>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/60">
                  <div>
                    <span className="font-semibold">{node.execution_count.toLocaleString()}</span> executions
                  </div>
                  <div>
                    <span className="font-semibold">{node.avg_time_ms.toFixed(0)}ms</span> avg
                  </div>
                  <div>
                    <span className={`font-semibold ${
                      node.success_rate_percent >= 95 ? 'text-green-600' :
                      node.success_rate_percent >= 70 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {node.success_rate_percent.toFixed(1)}%
                    </span> success
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
