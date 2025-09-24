/**
 * LangGraph Analytics Dashboard - Phase 2 Enhancement
 * 
 * Comprehensive analytics and performance monitoring for LangGraph executions.
 * Includes historical data, performance trends, bottleneck analysis, and alerts.
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import apiCall from '@/services/api';

// Types for analytics data
interface ExecutionAnalytics {
  period_days: number;
  total_executions: number;
  successful_executions: number;
  success_rate_percent: number;
  average_execution_time_ms: number;
  most_active_nodes: Array<{
    node_id: string;
    execution_count: number;
    avg_execution_time_ms: number;
  }>;
}

interface ExecutionHistory {
  execution_id: string;
  graph_name: string;
  status: string;
  started_at: string;
  completed_at?: string;
  total_execution_time_ms?: number;
  total_nodes_executed: number;
  failed_nodes: number;
  success_rate?: number;
  error_message?: string;
}

interface PerformanceBottleneck {
  node_id: string;
  agent_id: string;
  execution_count: number;
  average_time_ms: number;
  max_time_ms: number;
  min_time_ms: number;
  performance_impact: 'low' | 'medium' | 'high';
}

interface Alert {
  id: number;
  execution_id?: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  created_at: string;
  resolved_at?: string;
  status: string;
  threshold_value?: number;
  actual_value?: number;
  metric_name?: string;
}

interface PerformanceTrend {
  period: string;
  average_value: number;
  max_value: number;
  min_value: number;
  data_points: number;
}

const LangGraphAnalyticsDashboard = () => {
  const [analytics, setAnalytics] = useState<ExecutionAnalytics | null>(null);
  const [history, setHistory] = useState<ExecutionHistory[]>([]);
  const [bottlenecks, setBottlenecks] = useState<PerformanceBottleneck[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [trends, setTrends] = useState<PerformanceTrend[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState(7);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'performance' | 'alerts'>('overview');

  const fetchAnalytics = useCallback(async () => {
    try {
      const response = await apiCall<{success: boolean; data: ExecutionAnalytics}>(`/api/v1/admin/langgraph/analytics/overview?days=${selectedPeriod}`);
      if (response.data.success) {
        setAnalytics(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, [selectedPeriod]);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await apiCall<{success: boolean; data: ExecutionHistory[]}>('/api/v1/admin/langgraph/executions/history?limit=20');
      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch history:', err);
    }
  }, []);

  const fetchBottlenecks = useCallback(async () => {
    try {
      const response = await apiCall<{success: boolean; data: {bottlenecks: PerformanceBottleneck[]}}>(`/api/v1/admin/langgraph/performance/bottlenecks?days=${selectedPeriod}`);
      if (response.data.success) {
        setBottlenecks(response.data.data.bottlenecks);
      }
    } catch (err) {
      console.error('Failed to fetch bottlenecks:', err);
    }
  }, [selectedPeriod]);

  const fetchAlerts = useCallback(async () => {
    try {
      const response = await apiCall<{success: boolean; data: Alert[]}>('/api/v1/admin/langgraph/alerts?limit=20');
      if (response.data.success) {
        setAlerts(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  }, []);

  const fetchTrends = useCallback(async () => {
    try {
      const response = await apiCall<{success: boolean; data: {trends: PerformanceTrend[]}}>(`/api/v1/admin/langgraph/metrics/trends?days=30&metric_name=execution_time_ms&granularity=daily`);
      if (response.data.success) {
        setTrends(response.data.data.trends);
      }
    } catch (err) {
      console.error('Failed to fetch trends:', err);
    }
  }, []);

  const resolveAlert = async (alertId: number) => {
    try {
      await apiCall(`/api/v1/admin/langgraph/alerts/${alertId}/resolve`, {
        method: 'POST'
      });
      // Refresh alerts
      fetchAlerts();
    } catch (err) {
      console.error('Failed to resolve alert:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        await Promise.all([
          fetchAnalytics(),
          fetchHistory(),
          fetchBottlenecks(),
          fetchAlerts(),
          fetchTrends()
        ]);
      } catch {
        setError('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchAnalytics, fetchHistory, fetchBottlenecks, fetchAlerts, fetchTrends]);

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 text-green-300';
      case 'failed': return 'bg-red-500/20 text-red-300';
      case 'running': return 'bg-blue-500/20 text-blue-300';
      case 'cancelled': return 'bg-gray-500/20 text-gray-300';
      default: return 'bg-gray-500/20 text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
        <span className="ml-3 text-gray-300">Loading analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-6 text-sm text-red-200">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">LangGraph Analytics</h2>
        <select
          value={selectedPeriod}
          onChange={(e) => setSelectedPeriod(Number(e.target.value))}
          className="rounded-lg bg-white/10 border border-white/20 px-3 py-2 text-sm text-white"
          title="Select time period for analytics"
        >
          <option value={1}>Last 24 hours</option>
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 rounded-xl bg-white/5 p-1">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'history', label: 'Execution History' },
          { id: 'performance', label: 'Performance' },
          { id: 'alerts', label: 'Alerts' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as 'overview' | 'history' | 'performance' | 'alerts')}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {tab.label}
            {tab.id === 'alerts' && alerts.filter(a => a.status === 'active').length > 0 && (
              <span className="ml-2 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
                {alerts.filter(a => a.status === 'active').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Key Metrics */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Total Executions</h3>
            <p className="text-3xl font-bold text-white">{analytics.total_executions}</p>
            <p className="text-sm text-gray-400 mt-1">Last {analytics.period_days} days</p>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Success Rate</h3>
            <p className="text-3xl font-bold text-green-400">{analytics.success_rate_percent.toFixed(1)}%</p>
            <p className="text-sm text-gray-400 mt-1">{analytics.successful_executions} successful</p>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Avg Execution Time</h3>
            <p className="text-3xl font-bold text-blue-400">{formatDuration(analytics.average_execution_time_ms)}</p>
          </div>

          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-sm font-medium text-gray-400 mb-2">Active Alerts</h3>
            <p className="text-3xl font-bold text-red-400">{alerts.filter(a => a.status === 'active').length}</p>
          </div>

          {/* Most Active Nodes */}
          <div className="md:col-span-2 lg:col-span-4 bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-medium text-white mb-4">Most Active Nodes</h3>
            <div className="space-y-3">
              {analytics.most_active_nodes.slice(0, 5).map((node) => (
                <div key={node.node_id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-white font-medium">{node.node_id}</p>
                    <p className="text-sm text-gray-400">{node.execution_count} executions</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white">{formatDuration(node.avg_execution_time_ms)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Execution ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Graph
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Nodes
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {history.map((execution) => (
                  <tr key={execution.execution_id} className="hover:bg-white/5">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-gray-300">
                        {execution.execution_id.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-white">{execution.graph_name || 'Unknown'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(execution.status)}`}>
                        {execution.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDuration(execution.total_execution_time_ms)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(execution.started_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {execution.total_nodes_executed} 
                      {execution.failed_nodes > 0 && (
                        <span className="text-red-400"> ({execution.failed_nodes} failed)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'performance' && (
        <div className="space-y-6">
          {/* Performance Bottlenecks */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-medium text-white mb-4">Performance Bottlenecks</h3>
            <div className="space-y-3">
              {bottlenecks.map((bottleneck) => (
                <div key={`${bottleneck.node_id}-${bottleneck.agent_id}`} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                  <div>
                    <p className="text-white font-medium">{bottleneck.node_id}</p>
                    <p className="text-sm text-gray-400">Agent: {bottleneck.agent_id}</p>
                    <p className="text-xs text-gray-500">{bottleneck.execution_count} executions</p>
                  </div>
                  <div className="text-right">
                    <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      bottleneck.performance_impact === 'high' ? 'bg-red-500/20 text-red-300' :
                      bottleneck.performance_impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                      'bg-green-500/20 text-green-300'
                    }`}>
                      {bottleneck.performance_impact} impact
                    </div>
                    <p className="text-white font-medium mt-1">{formatDuration(bottleneck.average_time_ms)}</p>
                    <p className="text-xs text-gray-400">avg ({formatDuration(bottleneck.min_time_ms)} - {formatDuration(bottleneck.max_time_ms)})</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Trends */}
          <div className="bg-white/5 rounded-xl p-6 border border-white/10">
            <h3 className="text-lg font-medium text-white mb-4">Execution Time Trends (Last 30 Days)</h3>
            <div className="h-64 flex items-end justify-between space-x-1">
              {trends.slice(-14).map((trend) => {
                const maxValue = Math.max(...trends.map(t => t.average_value));
                const height = (trend.average_value / maxValue) * 100;
                
                return (
                  <div key={trend.period} className="flex-1 flex flex-col items-center">
                    <div 
                      className="w-full bg-blue-500/30 rounded-t"
                      style={{ height: `${height}%`, minHeight: '4px' }}
                      title={`${formatDate(trend.period)}: ${formatDuration(trend.average_value)}`}
                    />
                    <div className="text-xs text-gray-400 mt-2 transform -rotate-45 origin-left">
                      {new Date(trend.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No alerts found</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <div key={alert.id} className={`rounded-xl p-6 border ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium">{alert.title}</h3>
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-gray-400">{alert.alert_type}</span>
                    </div>
                    <p className="text-sm mb-3">{alert.message}</p>
                    <div className="flex gap-4 text-xs text-gray-400">
                      <span>Created: {formatDate(alert.created_at)}</span>
                      {alert.execution_id && (
                        <span>Execution: {alert.execution_id.substring(0, 8)}...</span>
                      )}
                      {alert.threshold_value && alert.actual_value && (
                        <span>
                          Threshold: {alert.threshold_value} | Actual: {alert.actual_value}
                        </span>
                      )}
                    </div>
                  </div>
                  {alert.status === 'active' && (
                    <button
                      onClick={() => resolveAlert(alert.id)}
                      className="ml-4 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-xs font-medium transition-colors"
                    >
                      Resolve
                    </button>
                  )}
                </div>
                {alert.resolved_at && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <p className="text-xs text-gray-400">Resolved: {formatDate(alert.resolved_at)}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default LangGraphAnalyticsDashboard;