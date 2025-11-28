/**
 * LangGraph Monitoring Dashboard
 * 
 * Purpose: Real-time monitoring and analytics for all LangGraph StateGraphs
 * - Interactive Agentic Architecture Graph
 * - Detailed Agent Metrics
 * - Execution History
 * - System Alerts
 * 
 * User Role: Admin only
 */

'use client';

import { useState } from 'react';
import { AgenticArchitectureGraph } from './components/AgenticArchitectureGraph';
import { AgentDetailsPanel } from './components/AgentDetailsPanel';
import { AnalyticsOverview } from './components/AnalyticsOverview';
import { ExecutionHistoryTable } from './components/ExecutionHistoryTable';
import { AlertsPanel } from './components/AlertsPanel';
import { ArchitectureGuide } from './components/ArchitectureGuide';
import { useLangGraphHealth } from './hooks/useLangGraphHealth';

export default function LangGraphMonitoringPage() {
  const [analyticsDays, setAnalyticsDays] = useState(7);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const { loading, data, error, refetch } = useLangGraphHealth(30); // Auto-refresh every 30 seconds

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#001d58] via-[#0a2a6e] to-[#173a7a] p-6 font-sans text-slate-200 selection:bg-[#FFCA40]/30 selection:text-[#FFCA40]">
      {/* Background Ambient Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px] animate-pulse-slow delay-1000"></div>
        <div className="absolute top-[20%] right-[20%] w-[30%] h-[30%] bg-emerald-500/5 rounded-full blur-[100px] animate-pulse-slow delay-2000"></div>
      </div>

      <div className="max-w-[1800px] mx-auto space-y-8 relative z-10">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-6 border-b border-white/5">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">LangGraph Monitoring</h1>
            <p className="text-white/60 text-sm">
              Interactive visualization and analytics for the Safety Agent Suite
            </p>
          </div>

          {/* Overall Status Badge */}
          {data && (
            <div className={`flex items-center gap-3 backdrop-blur-sm border rounded-lg px-4 py-2.5 transition-all duration-500 ${data.overall_status === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/20' :
                data.overall_status === 'degraded' ? 'bg-yellow-500/10 border-yellow-500/20' :
                  'bg-red-500/10 border-red-500/20'
              }`}>
              <div className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${data.overall_status === 'healthy' ? 'bg-emerald-400' :
                    data.overall_status === 'degraded' ? 'bg-yellow-400' : 'bg-red-400'
                  }`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${data.overall_status === 'healthy' ? 'bg-emerald-500' :
                    data.overall_status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></span>
              </div>
              <div className="flex flex-col">
                <span className={`text-xs font-medium uppercase tracking-wider ${data.overall_status === 'healthy' ? 'text-emerald-400' :
                    data.overall_status === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                  {data.overall_status} System
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 rounded-2xl p-6 flex items-center gap-4 shadow-lg shadow-red-500/5">
            <div className="bg-red-500/20 p-3 rounded-xl">
              <svg className="h-6 w-6 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-red-300 font-bold">Connection Error</h3>
              <p className="text-red-300/70 text-sm">Failed to load health data: {error}</p>
            </div>
            <button
              onClick={refetch}
              className="ml-auto px-6 py-2 bg-red-500/20 text-red-300 border border-red-500/30 rounded-xl text-sm font-bold hover:bg-red-500/30 transition-all hover:scale-105 active:scale-95"
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column: Graph & Analytics (8 cols) */}
          <div className="col-span-12 lg:col-span-8 space-y-10">
            {/* Agentic Architecture Graph */}
            <div className="space-y-6">
              <div className="flex justify-between items-end px-2">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">🕸️</span> Agentic Architecture
                </h2>
                <span className="text-sm font-medium text-white/40 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                  Click nodes to view detailed metrics
                </span>
              </div>
              <AgenticArchitectureGraph
                onNodeClick={setSelectedAgentId}
                healthData={data}
              />
            </div>

            {/* Architecture Guide */}
            <ArchitectureGuide />

            {/* Analytics Overview */}
            <div className="space-y-6">
              <div className="flex justify-between items-center px-2">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <span className="text-3xl">📈</span> Performance Analytics
                </h2>
                <div className="flex bg-white/5 p-1.5 rounded-xl border border-white/5">
                  {[7, 30, 90].map((days) => (
                    <button
                      key={days}
                      onClick={() => setAnalyticsDays(days)}
                      className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${analyticsDays === days
                        ? 'bg-[#FFCA40] text-[#00153a] shadow-lg scale-105'
                        : 'text-white/40 hover:text-white'
                        }`}
                    >
                      {days}d
                    </button>
                  ))}
                </div>
              </div>
              <AnalyticsOverview days={analyticsDays} />
            </div>
          </div>

          {/* Right Column: Alerts & History (4 cols) */}
          <div className="col-span-12 lg:col-span-4 space-y-8 flex flex-col">
            {/* Alerts Panel */}
            <div className="flex-1 min-h-[400px]">
              <AlertsPanel />
            </div>

            {/* Execution History (Compact) */}
            <div className="flex-1">
              <ExecutionHistoryTable limit={10} />
            </div>
          </div>
        </div>
      </div>

      {/* Slide-over Details Panel */}
      <AgentDetailsPanel
        agentId={selectedAgentId}
        onClose={() => setSelectedAgentId(null)}
        healthData={data}
      />
    </div>
  );
}
