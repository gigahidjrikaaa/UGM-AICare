'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

interface ApiNode {
  id: string;
  type: string;
  data: Record<string, any>;
}

interface ApiEdge {
  source: string;
  target: string;
  data?: Record<string, any> | null;
}

interface GraphState {
  nodes: ApiNode[];
  edges: ApiEdge[];
}

type AgentNodeData = {
  label: string;
  agent: string;
  agentId: string;
  description?: string;
};

const agentPalette: Record<string, string> = {
  triage: '#FFCA40',
  analytics: '#38BDF8',
  intervention: '#A855F7',
};

const agentDisplayOrder = ['triage', 'analytics', 'intervention'];
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

  const fetchGraphState = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiCall<GraphState>('/api/v1/admin/agents-config');
      setGraphState(data);
    } catch (err: any) {
      setError(err.message ?? 'Unable to load agent configuration.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGraphState();
  }, [fetchGraphState]);

  const apiNodeMap = useMemo(() => {
    const map = new Map<string, ApiNode>();
    graphState?.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [graphState]);

  const agentOrder = useMemo(() => {
    if (!graphState) return agentDisplayOrder;

    const discovered = Array.from(
      new Set(graphState.nodes.map((node) => node.data?.agentId ?? 'agent')),
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
      const agentA = a.data?.agentId ?? 'agent';
      const agentB = b.data?.agentId ?? 'agent';
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
      const agentId: string = node.data?.agentId ?? 'agent';
      const column = Number(node.data?.column ?? 0);
      const row = Number(node.data?.row ?? 0);

      const position = {
        x: laneIndex(agentId) * agentOffset + column * columnWidth,
        y: row * rowHeight,
      };

      return {
        id: node.id,
        position,
        type: 'agent',
        data: {
          label: node.data?.label ?? node.id,
          agent: node.data?.agent ?? agentId,
          agentId,
          description: node.data?.description,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
        style: {
          borderRadius: 16,
          border: `1px solid ${(agentPalette[agentId] ?? '#FFCA40') + '30'}`,
        },
      } satisfies FlowNode<AgentNodeData>;
    });
  }, [sortedNodes, agentOrder, graphState]);

  const agentLegend = useMemo(() => {
    const seen = new Map<string, string>();
    sortedNodes.forEach((node) => {
      const agentId: string = node.data?.agentId ?? 'agent';
      if (!seen.has(agentId)) {
        seen.set(agentId, node.data?.agent ?? agentId);
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
        const agentA = sourceA?.data?.agentId ?? a.data?.agentId ?? 'agent';
        const agentB = sourceB?.data?.agentId ?? b.data?.agentId ?? 'agent';
        const agentDiff = laneIndex(agentA) - laneIndex(agentB);
        if (agentDiff !== 0) return agentDiff;
        return a.source.localeCompare(b.source);
      })
      .map((edge) => {
        const agentId =
          edge.data?.agentId ?? apiNodeMap.get(edge.source)?.data?.agentId ?? 'agent';
        const color = agentPalette[agentId] ?? '#FFCA40';

        return {
          id: `${edge.source}->${edge.target}`,
          source: edge.source,
          target: edge.target,
          type: 'smoothstep',
          animated: true,
          style: { stroke: color, strokeWidth: 2 },
          markerEnd: { type: 'arrowclosed', color },
          label: edge.data?.label,
          labelStyle: { fill: '#CBD5F5', fontSize: 12 },
        } satisfies FlowEdge;
      });
  }, [graphState, apiNodeMap, agentOrder]);

  const handleNodeClick = useCallback(
    (_: any, node: FlowNode) => {
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
            <span className="h-3 w-3 rounded-full" style={{ background: color }} />
            <span className="text-xs font-medium uppercase tracking-wide text-gray-300">
              {label}
            </span>
          </div>
        ))}
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
              position="right"
              className="max-h-[500px] w-80 max-w-[320px] overflow-y-auto rounded-xl border border-white/15 bg-slate-900/85 p-4 text-xs text-gray-200 shadow-xl"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-gray-400">
                    {selectedNode.data?.agent ?? 'Agent'}
                  </p>
                  <h3 className="text-lg font-semibold text-white">
                    {selectedNode.data?.label ?? selectedNode.id}
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
              {selectedNode.data?.description && (
                <p className="mt-2 text-gray-300">{selectedNode.data.description}</p>
              )}
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
