/**
 * LangGraph Monitoring Dashboard
 * 
 * Purpose: Real-time monitoring and analytics for all LangGraph StateGraphs
 * - Graph health status (STA/TCA/CMA/IA/AIKA/Orchestrator)
 * - Execution history with filtering
 * - Performance analytics
 * - Active alerts
 * 
 * User Role: Admin only
 */

'use client';

import { useState } from 'react';
import { GraphHealthCards } from './components/GraphHealthCards';
import { AnalyticsOverview } from './components/AnalyticsOverview';
import { ExecutionHistoryTable } from './components/ExecutionHistoryTable';
import { AlertsPanel } from './components/AlertsPanel';
import { useLangGraphHealth } from './hooks/useLangGraphHealth';

export default function LangGraphMonitoringPage() {
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const { loading, data, error, refetch } = useLangGraphHealth(30); // Auto-refresh every 30 seconds

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a] p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">LangGraph Monitoring</h1>
            <p className="text-white/60">
              Real-time execution monitoring and analytics for all Safety Agent Suite graphs
            </p>
          </div>
          
          {/* Overall Status Badge */}
          {data && (
            <div className={`flex items-center gap-2 backdrop-blur-sm rounded-lg px-4 py-2 border ${
              data.overall_status === 'healthy' ? 'bg-emerald-500/20 border-emerald-500/30' :
              data.overall_status === 'degraded' ? 'bg-yellow-500/20 border-yellow-500/30' :
              'bg-red-500/20 border-red-500/30'
            }`}>
              <div className={`h-3 w-3 rounded-full animate-pulse ${
                data.overall_status === 'healthy' ? 'bg-emerald-400' :
                data.overall_status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
              }`}></div>
              <span className={`text-sm font-semibold uppercase ${
                data.overall_status === 'healthy' ? 'text-emerald-300' :
                data.overall_status === 'degraded' ? 'text-yellow-300' : 'text-red-300'
              }`}>
                {data.overall_status}
              </span>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 backdrop-blur-sm border border-red-500/30 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span className="text-red-300 text-sm font-medium">Failed to load health data: {error}</span>
              <button
                onClick={refetch}
                className="ml-auto px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-sm hover:bg-red-500/30 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Graph Health Cards */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-white">Graph Health Status</h2>
            {data && (
              <span className="text-xs text-white/40">
                Last updated: {new Date(data.last_updated).toLocaleTimeString()}
              </span>
            )}
          </div>
          <GraphHealthCards graphs={data?.graphs || []} loading={loading} />
        </div>

        {/* Analytics Overview with Time Period Selector */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-white">Analytics Overview</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setAnalyticsDays(7)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  analyticsDays === 7
                    ? 'bg-[#FFCA40] text-[#00153a]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                7 days
              </button>
              <button
                onClick={() => setAnalyticsDays(30)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  analyticsDays === 30
                    ? 'bg-[#FFCA40] text-[#00153a]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                30 days
              </button>
              <button
                onClick={() => setAnalyticsDays(90)}
                className={`px-3 py-1 text-sm font-medium rounded-lg transition-colors ${
                  analyticsDays === 90
                    ? 'bg-[#FFCA40] text-[#00153a]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                90 days
              </button>
            </div>
          </div>
          <AnalyticsOverview days={analyticsDays} />
        </div>

        {/* Alerts Panel */}
        <div>
          <AlertsPanel />
        </div>

        {/* Execution History Table */}
        <div>
          <ExecutionHistoryTable limit={50} />
        </div>

        {/* Info Footer */}
        <div className="bg-blue-500/10 backdrop-blur-sm border border-blue-500/30 rounded-xl p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-300">About This Dashboard</h3>
              <div className="mt-2 text-sm text-blue-200/80">
                <p>
                  This dashboard monitors all LangGraph StateGraphs in the Safety Agent Suite.
                  Health data auto-refreshes every 30 seconds. Click on execution history rows
                  to view detailed traces. Resolve alerts when issues are addressed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
