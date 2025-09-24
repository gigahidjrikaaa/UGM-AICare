'use client';

import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Edge as FlowEdge,
  MiniMap,
  Node as FlowNode,
  NodeProps,
  Panel,
  Position,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { apiCall } from '@/utils/adminApi';

interface ExecutionState {
  node_id: string;
  status: 'idle' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  execution_time_ms?: number;
  error_message?: string;
  metrics?: Record<string, unknown>;
}

interface EdgeExecutionState {
  edge_id: string;
  triggered: boolean;
  evaluation_result?: boolean;
}

interface ApiNode {
  id: string;
  type: string;
  data: Record<string, unknown>;
  execution_state?: ExecutionState;
}

interface ApiEdge {
  source: string;
  target: string;
  data?: Record<string, unknown> | null;
  edge_type?: 'normal' | 'conditional';
  condition?: string;
  execution_state?: EdgeExecutionState;
}

interface GraphExecutionState {
  graph_id: string;
  execution_id: string;
  status: 'idle' | 'running' | 'completed' | 'failed';
  current_node?: string;
}

interface GraphState {
  nodes: ApiNode[];
  edges: ApiEdge[];
  execution_state?: GraphExecutionState;
  performance_metrics?: Record<string, Record<string, number>>;
}

type AgentNodeData = {
  label: string;
  agent: string;
  agentId: string;
  description?: string;
  executionState?: ExecutionState;
};

const agentPalette: Record<string, string> = {
  orchestrator: '#FF6B6B',
  triage: '#FFCA40',
  analytics: '#38BDF8',
  intervention: '#A855F7',
};

const agentDisplayOrder = ['orchestrator', 'triage', 'analytics', 'intervention'];
const columnWidth = 220;
const agentOffset = 520;
const rowHeight = 170;

const AgentNode = ({ data }: NodeProps<AgentNodeData>) => {
  const color = agentPalette[data.agentId] ?? '#FFCA40';
  return (
    <div className="rounded-xl border border-white/20 bg-slate-900/80 shadow-xl backdrop-blur-md px-4 py-3 text-left">
      <p className="text-[11px] uppercase tracking-wide" style={{ color }}>
        {data.agent}
      </p>
      <p className="text-sm font-semibold text-white">{data.label}</p>
      {data.description && (
        <p className="mt-1 text-xs text-gray-300 leading-snug max-w-[220px]">
          {data.description}
        </p>
      )}
    </div>
  );
};

const nodeTypes = { agent: AgentNode };

const LangGraphViewer = () => {
  const [graphState, setGraphState] = useState<GraphState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<ApiNode | null>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchGraphState = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Use enhanced endpoint for execution state and metrics
      const data = await apiCall<GraphState>('/api/v1/admin/agents-config/enhanced');
      setGraphState(data);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Unable to load agent configuration.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const connectWebSocket = useCallback(() => {
    if (!realTimeUpdates || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsRef.current = new WebSocket(`${protocol}//${window.location.host}/api/v1/admin/agents-config/ws`);
      
      wsRef.current.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as GraphState;
          setGraphState(data);
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      wsRef.current.onclose = () => {
        // Reconnect after 5 seconds if real-time updates are still enabled
        if (realTimeUpdates) {
          setTimeout(connectWebSocket, 5000);
        }
      };

      wsRef.current.onerror = (error: Event) => {
        console.error('WebSocket error:', error);
      };
    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
    }
  }, [realTimeUpdates]);

  useEffect(() => {
    fetchGraphState();
    
    if (realTimeUpdates) {
      connectWebSocket();
    } else {
      // Set up polling for updates when real-time is not available
      const interval = setInterval(fetchGraphState, 5000);
      return () => clearInterval(interval);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [fetchGraphState, realTimeUpdates, connectWebSocket]);

  const apiNodeMap = useMemo(() => {
    const map = new Map<string, ApiNode>();
    graphState?.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [graphState]);

  const agentOrder = useMemo(() => {
    if (!graphState) return agentDisplayOrder;

    const discovered = Array.from(
      new Set(graphState.nodes.map((node) => (node.data?.agentId as string) ?? 'agent')),
    );

    return [...discovered].sort((a, b) => {
      const preferredIndexA = agentDisplayOrder.indexOf(a);
      const preferredIndexB = agentDisplayOrder.indexOf(b);
      if (preferredIndexA !== -1 && preferredIndexB !== -1) {
        return preferredIndexA - preferredIndexB;
      }
      if (preferredIndexA !== -1) return -1;
      if (preferredIndexB !== -1) return 1;
      return a.localeCompare(b);
    });
  }, [graphState]);

  const sortedNodes = useMemo(() => {
    if (!graphState) return [];
    const laneIndex = (agentId: string) => {
      const idx = agentOrder.indexOf(agentId);
      return idx === -1 ? agentOrder.length : idx;
    };

    return [...graphState.nodes].sort((a, b) => {
      const agentA = (a.data?.agentId as string) ?? 'agent';
      const agentB = (b.data?.agentId as string) ?? 'agent';
      const agentDiff = laneIndex(agentA) - laneIndex(agentB);
      if (agentDiff !== 0) return agentDiff;

      const columnA = Number(a.data?.column ?? 0);
      const columnB = Number(b.data?.column ?? 0);
      if (columnA !== columnB) return columnA - columnB;

      const rowA = Number(a.data?.row ?? 0);
      const rowB = Number(b.data?.row ?? 0);
      return rowA - rowB;
    });
  }, [graphState, agentOrder]);

  const reactFlowNodes: FlowNode<AgentNodeData>[] = useMemo(() => {
    if (!graphState) return [];

    const laneIndex = (agentId: string) => {
      const idx = agentOrder.indexOf(agentId);
      return idx === -1 ? agentOrder.length : idx;
    };

    return sortedNodes.map((node) => {
      const agentId: string = (node.data?.agentId as string) ?? 'agent';
      const column = Number(node.data?.column ?? 0);
      const row = Number(node.data?.row ?? 0);

      const position = {
        x: laneIndex(agentId) * agentOffset + column * columnWidth,
        y: row * rowHeight,
      };

      // Determine node color based on execution state
      const executionState = node.execution_state;
      const isRunning = executionState?.status === 'running';
      const hasFailed = executionState?.status === 'failed';
      const isCompleted = executionState?.status === 'completed';
      
      let nodeColor = agentPalette[agentId] ?? '#FFCA40';
      if (isRunning) nodeColor = '#FFA500'; // Orange for running
      if (hasFailed) nodeColor = '#FF4444'; // Red for failed
      if (isCompleted) nodeColor = '#44FF44'; // Green for completed

      return {
        id: node.id,
        position,
        type: 'agent',
        data: {
          label: (node.data?.label as string) ?? node.id,
          agent: (node.data?.agent as string) ?? agentId,
          agentId,
          description: node.data?.description as string,
          executionState,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          borderRadius: 16,
          border: `2px solid ${nodeColor}`,
          backgroundColor: isRunning ? `${nodeColor}20` : undefined,
        },
      } satisfies FlowNode<AgentNodeData>;
    });
  }, [sortedNodes, agentOrder, graphState]);

  const agentLegend = useMemo(() => {
    const seen = new Map<string, string>();
    sortedNodes.forEach((node) => {
      const agentId: string = (node.data?.agentId as string) ?? 'agent';
      if (!seen.has(agentId)) {
        seen.set(agentId, (node.data?.agent as string) ?? agentId);
      }
    });
    return agentOrder
      .filter((agentId) => seen.has(agentId))
      .map((agentId) => ({
        id: agentId,
        label: seen.get(agentId) ?? agentId,
        color: agentPalette[agentId] ?? '#FFCA40',
      }));
  }, [sortedNodes, agentOrder]);

  const reactFlowEdges: FlowEdge[] = useMemo(() => {
    if (!graphState) return [];

    const laneIndex = (agentId: string) => {
      const idx = agentOrder.indexOf(agentId);
      return idx === -1 ? agentOrder.length : idx;
    };

    return [...graphState.edges]
      .sort((a, b) => {
        const sourceA = apiNodeMap.get(a.source);
        const sourceB = apiNodeMap.get(b.source);
        const agentA = (sourceA?.data?.agentId as string) ?? (a.data?.agentId as string) ?? 'agent';
        const agentB = (sourceB?.data?.agentId as string) ?? (b.data?.agentId as string) ?? 'agent';
        const agentDiff = laneIndex(agentA) - laneIndex(agentB);
        if (agentDiff !== 0) return agentDiff;
        return a.source.localeCompare(b.source);
      })
      .map((edge) => {
        const agentId =
          (edge.data?.agentId as string) ?? (apiNodeMap.get(edge.source)?.data?.agentId as string) ?? 'agent';
        const color = agentPalette[agentId] ?? '#FFCA40';
        
        // Style conditional edges differently
        const isConditional = edge.edge_type === 'conditional' || edge.condition;
        const strokeDasharray = isConditional ? '5,5' : undefined;
        
        return {
          id: `${edge.source}->${edge.target}`,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: true,
          style: { 
            stroke: color, 
            strokeWidth: isConditional ? 3 : 2,
            strokeDasharray 
          },
          label: (edge.data?.label as string) || (edge.condition ? `if ${edge.condition}` : undefined),
          labelStyle: { fill: '#CBD5F5', fontSize: 12 },
        } satisfies FlowEdge;
      });
  }, [graphState, apiNodeMap, agentOrder]);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: FlowNode) => {
      const original = apiNodeMap.get(node.id) ?? null;
      setSelectedNode(original);
    },
    [apiNodeMap],
  );

  if (isLoading) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-xl border border-white/10 bg-white/5">
        <div className="animate-pulse text-sm text-gray-300">Loading agent graph...</div>
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

  if (!graphState) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-gray-300">
        No LangGraph configuration available yet.
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        {agentLegend.map(({ id, label, color }) => (
          <div key={id} className="flex items-center gap-2">
            <span 
              className="h-3 w-3 rounded-full" 
              style={{ backgroundColor: color }}
            />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-300">
              {label}
            </span>
          </div>
        ))}
        <button
          onClick={() => setRealTimeUpdates(!realTimeUpdates)}
          className={`ml-auto flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            realTimeUpdates
              ? 'bg-green-500/20 text-green-300 hover:bg-green-500/30'
              : 'bg-white/10 text-gray-300 hover:bg-white/20'
          }`}
        >
          <div className={`h-2 w-2 rounded-full ${realTimeUpdates ? 'bg-green-400' : 'bg-gray-400'}`} />
          {realTimeUpdates ? 'Live Updates' : 'Polling Mode'}
        </button>
      </div>

      <div className="h-[560px] overflow-hidden rounded-xl border border-white/15 bg-slate-950/60">
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          nodeTypes={nodeTypes}
          fitView
          defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
          onNodeClick={handleNodeClick}
          onPaneClick={() => setSelectedNode(null)}
          proOptions={{ hideAttribution: true }}
          fitViewOptions={{ padding: 0.2 }}
        >
          <Background color="rgba(255,255,255,0.08)" gap={24} />
          <MiniMap pannable zoomable maskColor="rgba(2,6,23,0.85)" />
          <Controls />

          {selectedNode && (
            <Panel
              position="top-right"
              className="max-h-[500px] w-80 max-w-[320px] overflow-y-auto rounded-xl border border-white/15 bg-slate-900/85 p-4 text-xs text-gray-200 shadow-xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                    {(selectedNode.data?.agent as string) ?? 'Agent'}
                  </p>
                  <h3 className="text-lg font-semibold text-white">
                    {(selectedNode.data?.label as string) ?? selectedNode.id}
                  </h3>
                </div>
                <button
                  className="text-[11px] text-gray-400 transition hover:text-gray-100"
                  onClick={() => setSelectedNode(null)}
                  type="button"
                >
                  Close
                </button>
              </div>
              {(() => {
                const description = selectedNode.data?.description;
                return description && typeof description === 'string' ? (
                  <p className="mt-2 text-gray-300">
                    {description}
                  </p>
                ) : null;
              })()}
              <div className="mt-3 rounded-lg bg-white/5 p-3 text-[11px] text-gray-200">
                <pre className="whitespace-pre-wrap break-words">
                  {JSON.stringify(selectedNode.data, null, 2)}
                </pre>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
};

export default LangGraphViewer;
