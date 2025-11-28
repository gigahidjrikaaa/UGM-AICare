/**
 * ExecutionHistoryTable Component
 * 
 * Displays paginated table of LangGraph execution history with:
 * - Filtering by status and graph type
 * - Pagination controls
 * - Click to view details modal
 * - Status badges
 */

'use client';

import { useState, useEffect } from 'react';
import { useLangGraphAnalytics } from '../hooks/useLangGraphAnalytics';
import { getExecutionDetails } from '@/services/langGraphApi';
import type { ExecutionHistoryItem, ExecutionDetails } from '@/services/langGraphApi';

interface ExecutionHistoryTableProps {
  limit?: number;
}

export function ExecutionHistoryTable({ limit = 50 }: ExecutionHistoryTableProps) {
  const { history, loadingHistory, fetchHistory } = useLangGraphAnalytics();

  const [statusFilter, setStatusFilter] = useState<string>('');
  const [graphFilter, setGraphFilter] = useState<string>('');
  const [offset, setOffset] = useState(0);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionHistoryItem | null>(null);
  const [executionDetails, setExecutionDetails] = useState<ExecutionDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Fetch execution details when modal opens
  useEffect(() => {
    if (selectedExecution) {
      setLoadingDetails(true);
      getExecutionDetails(selectedExecution.execution_id)
        .then((response) => {
          setExecutionDetails(response.data);
        })
        .catch((error) => {
          console.error('Failed to fetch execution details:', error);
          setExecutionDetails(null);
        })
        .finally(() => {
          setLoadingDetails(false);
        });
    } else {
      setExecutionDetails(null);
    }
  }, [selectedExecution]);

  // Fetch history on mount and when filters/pagination change
  useEffect(() => {
    const validStatus = statusFilter as 'completed' | 'failed' | 'running' | '';
    const validGraph = graphFilter as 'sta' | 'tca' | 'cma' | 'ia' | 'aika' | 'orchestrator' | '';

    fetchHistory({
      limit,
      offset,
      status: validStatus || undefined,
      graph_name: (validGraph || undefined) as 'sta' | 'tca' | 'cma' | 'ia' | 'aika' | 'orchestrator' | undefined
    });
  }, [offset, statusFilter, graphFilter, limit, fetchHistory]);

  const handleRefresh = () => {
    const validStatus = statusFilter as 'completed' | 'failed' | 'running' | '';
    const validGraph = graphFilter as 'sta' | 'tca' | 'cma' | 'ia' | 'aika' | 'orchestrator' | '';

    setOffset(0);
    fetchHistory({
      limit,
      offset: 0,
      status: validStatus || undefined,
      graph_name: (validGraph || undefined) as 'sta' | 'tca' | 'cma' | 'ia' | 'aika' | 'orchestrator' | undefined
    });
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
      running: 'bg-blue-100 text-blue-800'
    }[status] || 'bg-white/10 text-white/80';

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const formatDuration = (ms: number | null | undefined) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getGraphIcon = (graphName: string) => {
    const icons: Record<string, string> = {
      sta: '🛡️',
      tca: '🧠',
      cma: '📋',
      ia: '📊',
      aika: '🤖',
      orchestrator: '🎯'
    };
    return icons[graphName.toLowerCase()] || '📦';
  };

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
      {/* Header with Filters */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Execution History</h2>
        <button
          onClick={handleRefresh}
          disabled={loadingHistory}
          className="px-4 py-2 bg-[#FFCA40] text-[#00153a] rounded-lg hover:bg-[#FFD666] disabled:bg-white/10 disabled:text-white/40 text-sm font-semibold transition-colors"
        >
          {loadingHistory ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {/* Filters and Table Container */}
      <div className="bg-[#00153a]/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white tracking-tight">Execution History</h2>

          {/* Filters */}
          <div className="flex gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl text-sm text-white px-4 py-2 focus:ring-1 focus:ring-[#FFCA40] focus:border-[#FFCA40] outline-none transition-all hover:bg-white/10"
            >
              <option value="" className="bg-[#00153a]">All Status</option>
              <option value="completed" className="bg-[#00153a]">Completed</option>
              <option value="failed" className="bg-[#00153a]">Failed</option>
              <option value="running" className="bg-[#00153a]">Running</option>
            </select>

            <select
              value={graphFilter}
              onChange={(e) => setGraphFilter(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl text-sm text-white px-4 py-2 focus:ring-1 focus:ring-[#FFCA40] focus:border-[#FFCA40] outline-none transition-all hover:bg-white/10"
            >
              <option value="" className="bg-[#00153a]">All Agents</option>
              <option value="sta" className="bg-[#00153a]">STA</option>
              <option value="tca" className="bg-[#00153a]">TCA</option>
              <option value="cma" className="bg-[#00153a]">CMA</option>
              <option value="ia" className="bg-[#00153a]">IA</option>
              <option value="aika" className="bg-[#00153a]">AIKA</option>
              <option value="orchestrator" className="bg-[#00153a]">Orchestrator</option>
            </select>
          </div>
        </div>

        {loadingHistory ? (
          <div className="animate-pulse space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-12 bg-white/20 rounded"></div>
            ))}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="pb-4 text-xs font-bold text-white/50 uppercase tracking-wider pl-4">Execution ID</th>
                    <th className="pb-4 text-xs font-bold text-white/50 uppercase tracking-wider">Graph</th>
                    <th className="pb-4 text-xs font-bold text-white/50 uppercase tracking-wider">Status</th>
                    <th className="pb-4 text-xs font-bold text-white/50 uppercase tracking-wider">Started At</th>
                    <th className="pb-4 text-xs font-bold text-white/50 uppercase tracking-wider">Duration</th>
                    <th className="pb-4 text-xs font-bold text-white/50 uppercase tracking-wider">Nodes</th>
                    <th className="pb-4 text-xs font-bold text-white/50 uppercase tracking-wider pr-4 text-right">Success Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {history && history.data.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-white/40">
                        No executions found matching filters
                      </td>
                    </tr>
                  ) : (
                    history?.data.map((execution) => (
                      <tr
                        key={execution.execution_id}
                        className="group hover:bg-white/5 transition-colors cursor-pointer"
                        onClick={() => setSelectedExecution(execution)}
                      >
                        <td className="py-4 pl-4 text-sm text-white/70 font-mono">
                          {execution.execution_id.substring(0, 8)}...
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getGraphIcon(execution.graph_name)}</span>
                            <span className="text-sm font-medium text-white capitalize">
                              {execution.graph_name}
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${execution.status === 'completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : execution.status === 'failed'
                              ? 'bg-red-500/10 text-red-400 border-red-500/20'
                              : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                            }`}>
                            {execution.status === 'completed' ? 'Completed' : execution.status === 'failed' ? 'Failed' : 'Running'}
                          </span>
                        </td>
                        <td className="py-4 text-sm text-white/70 font-mono">
                          {new Date(execution.started_at).toLocaleString()}
                        </td>
                        <td className="py-4 text-sm text-white/70 font-mono">
                          {formatDuration(execution.total_execution_time_ms)}
                        </td>
                        <td className="py-4 text-sm text-white/70">
                          {execution.total_nodes_executed} nodes
                          {execution.failed_nodes > 0 && (
                            <span className="text-red-400 ml-1">
                              ({execution.failed_nodes} failed)
                            </span>
                          )}
                        </td>
                        <td className="py-4 pr-4 text-right">
                          <span className={`font-semibold text-sm ${execution.success_rate >= 0.95 ? 'text-emerald-400' :
                            execution.success_rate >= 0.70 ? 'text-yellow-400' : 'text-red-400'
                            }`}>
                            {(execution.success_rate * 100).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {history && (
              <div className="flex justify-between items-center mt-4">
                <div className="text-sm text-white/60">
                  Showing {offset + 1} - {offset + history.pagination.returned} of {history.pagination.returned} results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOffset(Math.max(0, offset - limit))}
                    disabled={offset === 0 || loadingHistory}
                    className="px-4 py-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setOffset(offset + limit)}
                    disabled={history.pagination.returned < limit || loadingHistory}
                    className="px-4 py-2 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Enhanced Details Modal with Execution Trace */}
      {selectedExecution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex justify-between items-start p-6 border-b border-white/10">
              <div>
                <h3 className="text-lg font-bold text-white">Execution Trace</h3>
                <p className="text-sm text-white/50 mt-1">
                  {selectedExecution.graph_name.toUpperCase()} • {selectedExecution.execution_id.substring(0, 12)}...
                </p>
              </div>
              <button
                onClick={() => setSelectedExecution(null)}
                className="text-white/40 hover:text-white/60"
                aria-label="Close modal"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingDetails ? (
                <div className="bg-[#00153a]/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
                  <div className="animate-pulse space-y-6">
                    <div className="h-8 bg-white/10 rounded w-1/4"></div>
                    <div className="space-y-3">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-white/5 rounded-xl border border-white/5"></div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : executionDetails ? (
                <div className="space-y-6">
                  {/* Execution Summary */}
                  <div className="bg-white/5 rounded-lg p-4">
                    <h4 className="font-semibold text-white mb-3">Execution Summary</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-white/50">Status:</span>
                        <div className="mt-1">{getStatusBadge(executionDetails.execution.status)}</div>
                      </div>
                      <div>
                        <span className="text-white/50">Duration:</span>
                        <div className="mt-1 font-semibold text-white">
                          {formatDuration(executionDetails.execution.total_execution_time_ms)}
                        </div>
                      </div>
                      <div>
                        <span className="text-white/50">Nodes:</span>
                        <div className="mt-1 font-semibold text-white">
                          {executionDetails.nodes.length}
                        </div>
                      </div>
                      <div>
                        <span className="text-white/50">Edges:</span>
                        <div className="mt-1 font-semibold text-white">
                          {executionDetails.edges.length}
                        </div>
                      </div>
                    </div>
                    {executionDetails.execution.error_message && (
                      <div className="mt-4">
                        <span className="text-red-600 font-semibold">Error:</span>
                        <pre className="mt-2 p-3 bg-red-50 rounded text-red-800 text-xs overflow-x-auto">
                          {executionDetails.execution.error_message}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Node Execution Timeline */}
                  <div>
                    <h4 className="font-semibold text-white mb-3">Node Execution Timeline</h4>
                    <div className="space-y-3">
                      {executionDetails.nodes
                        .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
                        .map((node, index) => (
                          <div key={node.node_id} className="border border-white/10 rounded-lg overflow-hidden">
                            {/* Node Header */}
                            <div className="bg-white/5 px-4 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                  {index + 1}
                                </span>
                                <div>
                                  <div className="font-semibold text-white">{node.agent_id}</div>
                                  <div className="text-xs text-white/50">
                                    Started: {new Date(node.started_at).toLocaleTimeString()}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-semibold text-white/70">
                                  {formatDuration(node.execution_time_ms)}
                                </span>
                                {getStatusBadge(node.status)}
                              </div>
                            </div>

                            {/* Node Details */}
                            <div className="px-4 py-3 space-y-3">
                              {/* Input Data */}
                              {node.input_data && Object.keys(node.input_data).length > 0 && (
                                <details className="group">
                                  <summary className="cursor-pointer text-sm font-medium text-white/70 hover:text-white flex items-center gap-2">
                                    <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    Input Data ({Object.keys(node.input_data).length} fields)
                                  </summary>
                                  <pre className="mt-2 p-3 bg-blue-50 rounded text-xs overflow-x-auto text-white/80">
                                    {JSON.stringify(node.input_data, null, 2)}
                                  </pre>
                                </details>
                              )}

                              {/* Output Data */}
                              {node.output_data && Object.keys(node.output_data).length > 0 && (
                                <details className="group">
                                  <summary className="cursor-pointer text-sm font-medium text-white/70 hover:text-white flex items-center gap-2">
                                    <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    Output Data ({Object.keys(node.output_data).length} fields)
                                  </summary>
                                  <pre className="mt-2 p-3 bg-green-50 rounded text-xs overflow-x-auto text-white/80">
                                    {JSON.stringify(node.output_data, null, 2)}
                                  </pre>
                                </details>
                              )}

                              {/* Custom Metrics */}
                              {node.custom_metrics && Object.keys(node.custom_metrics).length > 0 && (
                                <details className="group">
                                  <summary className="cursor-pointer text-sm font-medium text-white/70 hover:text-white flex items-center gap-2">
                                    <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    Custom Metrics ({Object.keys(node.custom_metrics).length} metrics)
                                  </summary>
                                  <div className="mt-2 grid grid-cols-2 gap-2">
                                    {Object.entries(node.custom_metrics).map(([key, value]) => (
                                      <div key={key} className="p-2 bg-purple-50 rounded text-xs">
                                        <div className="text-white/60">{key}</div>
                                        <div className="font-semibold text-white">{String(value)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}

                              {/* Error Message */}
                              {node.error_message && (
                                <div className="p-3 bg-red-50 rounded">
                                  <div className="text-sm font-semibold text-red-600 mb-1">Error:</div>
                                  <pre className="text-xs text-red-800 overflow-x-auto">
                                    {node.error_message}
                                  </pre>
                                </div>
                              )}
                            </div>

                            {/* Edge Transition (if not last node) */}
                            {index < executionDetails.nodes.length - 1 && (
                              <div className="px-4 pb-3">
                                {executionDetails.edges
                                  .filter(edge => edge.source_node_id === node.node_id)
                                  .map(edge => (
                                    <div key={edge.edge_id} className="flex items-center gap-2 text-xs text-white/50 py-2">
                                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                      </svg>
                                      <span>
                                        {edge.edge_type}
                                        {edge.condition_expression && ` (${edge.condition_expression})`}
                                        {edge.evaluation_result !== undefined && ` → ${edge.evaluation_result ? 'TRUE' : 'FALSE'}`}
                                      </span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Global Metrics */}
                  {executionDetails.metrics && executionDetails.metrics.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-white mb-3">Global Metrics</h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {executionDetails.metrics.map((metric, index) => (
                          <div key={index} className="p-3 bg-indigo-50 rounded">
                            <div className="text-xs text-white/60">{metric.metric_name}</div>
                            <div className="text-lg font-bold text-indigo-600">{metric.metric_value}</div>
                            <div className="text-xs text-white/50">
                              {new Date(metric.recorded_at).toLocaleTimeString()}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-white/50">
                  <p>Failed to load execution details</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
