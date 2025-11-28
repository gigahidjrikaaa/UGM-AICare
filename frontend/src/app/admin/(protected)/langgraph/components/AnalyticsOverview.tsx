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
      <div className="bg-[#00153a]/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-white/10 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl border border-white/5"></div>
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
    <div className="bg-[#00153a]/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-white tracking-tight">Analytics Overview</h2>
        <span className="text-xs font-mono text-white/40 uppercase tracking-wider bg-white/5 px-3 py-1 rounded-full border border-white/5">Last {days} days</span>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {/* Total Executions */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5 relative overflow-hidden group hover:bg-blue-500/20 transition-all">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-all"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Total Executions</p>
              <p className="text-3xl font-bold text-white tracking-tight">
                {data.data.total_executions.toLocaleString()}
              </p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 relative overflow-hidden group hover:bg-emerald-500/20 transition-all">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-all"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Success Rate</p>
              <p className="text-3xl font-bold text-white tracking-tight">
                {data.data.success_rate_percent.toFixed(1)}%
              </p>
            </div>
            <div className="bg-emerald-500/20 p-3 rounded-lg">
              <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Successful Executions */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-5 relative overflow-hidden group hover:bg-purple-500/20 transition-all">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl group-hover:bg-purple-500/30 transition-all"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-1">Successful</p>
              <p className="text-3xl font-bold text-white tracking-tight">
                {data.data.successful_executions.toLocaleString()}
              </p>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <svg className="h-6 w-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Average Execution Time */}
        <div className="bg-[#FFCA40]/10 border border-[#FFCA40]/20 rounded-xl p-5 relative overflow-hidden group hover:bg-[#FFCA40]/20 transition-all">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#FFCA40]/20 rounded-full blur-2xl group-hover:bg-[#FFCA40]/30 transition-all"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-xs font-bold text-[#FFCA40] uppercase tracking-wider mb-1">Avg Duration</p>
              <p className="text-3xl font-bold text-white tracking-tight">
                {data.data.average_execution_time_ms.toFixed(0)}<span className="text-lg font-normal text-white/50 ml-1">ms</span>
              </p>
            </div>
            <div className="bg-[#FFCA40]/20 p-3 rounded-lg">
              <svg className="h-6 w-6 text-[#FFCA40]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Most Active Nodes */}
      {data.data.most_active_nodes && data.data.most_active_nodes.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-white/50 uppercase tracking-wider mb-4">Most Active Nodes</h3>
          <div className="space-y-3">
            {data.data.most_active_nodes.slice(0, 5).map((node, index) => (
              <div key={index} className="flex items-center justify-between bg-white/5 p-4 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                <div className="flex items-center gap-4">
                  <span className="flex items-center justify-center w-8 h-8 bg-white/10 rounded-lg text-xs font-bold text-white/70 font-mono">
                    {index + 1}
                  </span>
                  <span className="text-sm font-bold text-white tracking-tight">{node.node_name}</span>
                </div>
                <div className="flex items-center gap-6 text-sm text-white/60">
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-white">{node.execution_count.toLocaleString()}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-60">executions</span>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="flex flex-col items-end">
                    <span className="font-bold text-white font-mono">{node.avg_time_ms?.toFixed(0) ?? 'N/A'}ms</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-60">avg time</span>
                  </div>
                  <div className="w-px h-8 bg-white/10"></div>
                  <div className="flex flex-col items-end w-20">
                    <span className={`font-bold ${(node.success_rate_percent ?? 0) >= 95 ? 'text-emerald-400' :
                        (node.success_rate_percent ?? 0) >= 70 ? 'text-[#FFCA40]' : 'text-red-400'
                      }`}>
                      {node.success_rate_percent?.toFixed(1) ?? 'N/A'}%
                    </span>
                    <span className="text-[10px] uppercase tracking-wider opacity-60">success</span>
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
