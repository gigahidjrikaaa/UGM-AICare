'use client';

import { useMemo } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Edge,
    Node,
    Position,
    useNodesState,
    useEdgesState,
    MarkerType,
    Handle,
    NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';

// ── Standard agent node (Aika, TCA, CMA, IA) ─────────────────────────────────
const AgentNode = ({ data, isConnectable }: NodeProps) => (
    <div className={`px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg min-w-40 transition-all duration-300 ${
        data.status === 'healthy'  ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
        data.status === 'degraded' ? 'bg-yellow-500/10  border-yellow-500/30  shadow-[0_0_15px_rgba(234,179,8,0.1)]'  :
        data.status === 'down'     ? 'bg-red-500/10     border-red-500/30     shadow-[0_0_15px_rgba(239,68,68,0.1)]'  :
                                     'bg-[#00153a]/80   border-white/10'
    }`}>
        <Handle type="target" position={Position.Top}    isConnectable={isConnectable} className="bg-white/20! w-3! h-3!" />
        <div className="flex items-center gap-3 mb-1">
            <div className="text-2xl">{data.icon}</div>
            <div>
                <div className="text-sm font-bold text-white tracking-wide">{data.label}</div>
                <div className={`text-[10px] font-bold uppercase tracking-wider ${
                    data.status === 'healthy'  ? 'text-emerald-400' :
                    data.status === 'degraded' ? 'text-yellow-400'  :
                    data.status === 'down'     ? 'text-red-400'     : 'text-white/50'
                }`}>
                    {data.statusLabel ?? data.status ?? 'Unknown'}
                </div>
            </div>
        </div>
        {data.metrics && (
            <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                <span className="text-[10px] text-white/50 uppercase tracking-wider">Success Rate</span>
                <span className={`text-xs font-bold ${
                    Number(data.metrics.successRate) >= 95 ? 'text-emerald-400' :
                    Number(data.metrics.successRate) >= 70 ? 'text-yellow-400'  : 'text-red-400'
                }`}>{data.metrics.successRate}%</span>
            </div>
        )}
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="bg-white/20! w-3! h-3!" />
    </div>
);

// ── Parallel crisis "fan-out" node (TCA ∥ CMA) ───────────────────────────────
const ParallelCrisisNode = ({ data, isConnectable }: NodeProps) => (
    <div className="px-5 py-4 rounded-2xl border-2 border-red-500/40 bg-red-500/10 backdrop-blur-md shadow-[0_0_24px_rgba(239,68,68,0.18)] min-w-56">
        <Handle type="target" position={Position.Top}    isConnectable={isConnectable} className="bg-red-400! w-3! h-3!" />
        <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">⚡</span>
            <div>
                <div className="text-sm font-bold text-red-200 tracking-wide">Parallel Crisis</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-red-400">asyncio.gather fan-out</div>
            </div>
        </div>
        {/* Internal sub-agents shown side-by-side */}
        <div className="flex gap-2">
            <div className="flex-1 bg-white/5 border border-yellow-500/20 rounded-xl px-3 py-2 text-center">
                <div className="text-base mb-0.5">🧠</div>
                <div className="text-[11px] font-bold text-yellow-300">TCA</div>
                <div className="text-[9px] text-white/40">CBT Plan</div>
            </div>
            <div className="flex items-center text-white/30 text-xs font-bold">∥</div>
            <div className="flex-1 bg-white/5 border border-red-500/20 rounded-xl px-3 py-2 text-center">
                <div className="text-base mb-0.5">📋</div>
                <div className="text-[11px] font-bold text-red-300">CMA</div>
                <div className="text-[9px] text-white/40">Escalate</div>
            </div>
        </div>
        <div className="mt-2 text-[9px] text-white/30 text-center tracking-wide uppercase">
            max(TCA_time, CMA_time) latency
        </div>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="bg-red-400! w-3! h-3!" />
    </div>
);

// ── Synthesize node ───────────────────────────────────────────────────────────
const SynthesizeNode = ({ data, isConnectable }: NodeProps) => (
    <div className="px-4 py-3 rounded-xl border border-blue-400/30 bg-blue-500/10 backdrop-blur-md shadow-[0_0_15px_rgba(96,165,250,0.15)] min-w-40 text-center">
        <Handle type="target" position={Position.Top}    isConnectable={isConnectable} className="bg-blue-400! w-3! h-3!" />
        <div className="text-xl mb-1">✨</div>
        <div className="text-sm font-bold text-blue-200">Synthesize</div>
        <div className="text-[9px] text-white/40 uppercase tracking-wider mt-0.5">Final Response</div>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="bg-blue-400! w-3! h-3!" />
    </div>
);

// ── END terminal node ─────────────────────────────────────────────────────────
const EndNode = ({ isConnectable }: NodeProps) => (
    <div className="px-6 py-3 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-center">
        <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="bg-white/30! w-3! h-3!" />
        <div className="text-xs font-bold text-white/50 uppercase tracking-widest">END</div>
    </div>
);

// ── Background STA node (fire-and-forget, not in live graph) ──────────────────
const BackgroundNode = ({ data, isConnectable }: NodeProps) => (
    <div className="px-4 py-3 rounded-xl border border-dashed border-purple-400/30 bg-purple-500/5 backdrop-blur-md min-w-44">
        <Handle type="target" position={Position.Left}   isConnectable={isConnectable} className="bg-purple-400! w-3! h-3!" id="target-left" />
        <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">🔍</span>
            <div>
                <div className="text-sm font-bold text-purple-200">{data.label}</div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Background Task</div>
            </div>
        </div>
        <div className="text-[9px] text-white/30 leading-relaxed">
            PHQ-9 · GAD-7 · DASS-21<br />Post-conversation analysis
        </div>
    </div>
);

// ── User node ─────────────────────────────────────────────────────────────────
const UserNode = ({ data, isConnectable }: NodeProps) => (
    <div className="px-6 py-4 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.2)] text-center">
        <div className="text-3xl mb-1">👤</div>
        <div className="text-sm font-bold text-blue-200">User</div>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="bg-blue-400! w-3! h-3!" />
    </div>
);

const nodeTypes = {
    agent:          AgentNode,
    user:           UserNode,
    parallelCrisis: ParallelCrisisNode,
    synthesize:     SynthesizeNode,
    endNode:        EndNode,
    background:     BackgroundNode,
};

interface AgenticArchitectureGraphProps {
    onNodeClick: (nodeId: string) => void;
    healthData: any;
}

export function AgenticArchitectureGraph({ onNodeClick, healthData }: AgenticArchitectureGraphProps) {
    const getGraphData = (graphName: string) => {
        const graph = healthData?.graphs?.find(
            (g: any) => g?.graph_name && g.graph_name.toLowerCase() === graphName.toLowerCase()
        );
        return {
            status: graph?.status ?? 'unknown',
            metrics: graph ? { successRate: (graph.success_rate * 100).toFixed(1) } : null,
        };
    };

    // ── Nodes: mirrors create_aika_unified_graph() exactly ───────────────────
    const initialNodes: Node[] = [
        {
            id: 'user',
            type: 'user',
            position: { x: 370, y: 0 },
            data: { label: 'User' },
        },
        {
            id: 'aika',
            type: 'agent',
            position: { x: 340, y: 130 },
            data: {
                label: 'AIKA Decision',
                icon: '🤖',
                statusLabel: 'Orchestrator',
                ...getGraphData('orchestrator'),
            },
        },
        // ── Three live routing targets ───────────────────────────────────────
        {
            id: 'tca',
            type: 'agent',
            position: { x: 60, y: 320 },
            data: {
                label: 'TCA (execute_sca)',
                icon: '🧠',
                statusLabel: 'Moderate Risk',
                ...getGraphData('tca'),
            },
        },
        {
            id: 'parallel_crisis',
            type: 'parallelCrisis',
            position: { x: 290, y: 300 },
            data: {},
        },
        {
            id: 'ia',
            type: 'agent',
            position: { x: 620, y: 320 },
            data: {
                label: 'Insights Agent (IA)',
                icon: '📊',
                statusLabel: 'Analytics',
                ...getGraphData('ia'),
            },
        },
        // ── Synthesize and END ───────────────────────────────────────────────
        {
            id: 'synthesize',
            type: 'synthesize',
            position: { x: 340, y: 510 },
            data: {},
        },
        {
            id: 'end',
            type: 'endNode',
            position: { x: 358, y: 610 },
            data: {},
        },
        // ── STA background task (NOT a live graph node) ──────────────────────
        {
            id: 'sta_bg',
            type: 'background',
            position: { x: 700, y: 480 },
            data: {
                label: 'STA Analysis',
                ...getGraphData('sta'),
            },
        },
    ];

    // ── Edges: mirror the final add_conditional_edges / add_edge calls ────────
    const initialEdges: Edge[] = [
        // User → Aika
        {
            id: 'e-user-aika',
            source: 'user', target: 'aika',
            animated: true,
            style: { stroke: '#60A5FA', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#60A5FA' },
        },
        // Aika → TCA (moderate)
        {
            id: 'e-aika-tca',
            source: 'aika', target: 'tca',
            animated: true,
            label: 'Moderate',
            labelStyle: { fill: '#fde68a', fontSize: 10, fontWeight: 700 },
            labelBgStyle: { fill: 'rgba(0,0,0,0.4)' },
            style: { stroke: '#fde68a', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#fde68a' },
        },
        // Aika → Parallel Crisis (high/critical)
        {
            id: 'e-aika-pc',
            source: 'aika', target: 'parallel_crisis',
            animated: true,
            label: 'High / Critical',
            labelStyle: { fill: '#fca5a5', fontSize: 10, fontWeight: 700 },
            labelBgStyle: { fill: 'rgba(0,0,0,0.4)' },
            style: { stroke: '#f87171', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#f87171' },
        },
        // Aika → IA (analytics)
        {
            id: 'e-aika-ia',
            source: 'aika', target: 'ia',
            animated: true,
            label: 'Analytics',
            labelStyle: { fill: '#c4b5fd', fontSize: 10, fontWeight: 700 },
            labelBgStyle: { fill: 'rgba(0,0,0,0.4)' },
            style: { stroke: '#a78bfa', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
        },
        // Aika → END (direct / none)
        {
            id: 'e-aika-end',
            source: 'aika', target: 'end',
            animated: false,
            label: 'Direct Resp.',
            labelStyle: { fill: '#94a3b8', fontSize: 10 },
            labelBgStyle: { fill: 'rgba(0,0,0,0.4)' },
            style: { stroke: '#475569', strokeWidth: 1.5, strokeDasharray: '5,4' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
        },
        // TCA → Synthesize
        {
            id: 'e-tca-synth',
            source: 'tca', target: 'synthesize',
            animated: true,
            style: { stroke: '#fde68a', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#fde68a' },
        },
        // Parallel Crisis → Synthesize
        {
            id: 'e-pc-synth',
            source: 'parallel_crisis', target: 'synthesize',
            animated: true,
            style: { stroke: '#f87171', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#f87171' },
        },
        // IA → Synthesize
        {
            id: 'e-ia-synth',
            source: 'ia', target: 'synthesize',
            animated: true,
            style: { stroke: '#a78bfa', strokeWidth: 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#a78bfa' },
        },
        // Synthesize → END
        {
            id: 'e-synth-end',
            source: 'synthesize', target: 'end',
            animated: true,
            style: { stroke: '#60A5FA', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#60A5FA' },
        },
        // Aika → STA Background (dashed, fire-and-forget)
        {
            id: 'e-aika-sta-bg',
            source: 'aika', target: 'sta_bg',
            animated: false,
            label: 'Conversation End (bg)',
            labelStyle: { fill: '#c084fc', fontSize: 9 },
            labelBgStyle: { fill: 'rgba(0,0,0,0.4)' },
            style: { stroke: '#7e22ce', strokeWidth: 1.5, strokeDasharray: '6,4' },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#7e22ce' },
            // Custom target handle on left side of the background node
            targetHandle: 'target-left',
        },
    ];

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync live health metrics into node data when healthData updates
    useMemo(() => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.type !== 'agent') return node;
                const graphName = node.id === 'aika' ? 'orchestrator' : node.id === 'sta_bg' ? 'sta' : node.id;
                return { ...node, data: { ...node.data, ...getGraphData(graphName) } };
            })
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [healthData]);

    return (
        <div className="h-[680px] w-full bg-[#00153a]/20 backdrop-blur-sm border border-white/5 rounded-3xl shadow-2xl overflow-hidden relative group">
            {/* Legend */}
            <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 bg-black/30 backdrop-blur-sm border border-white/5 rounded-xl p-3">
                <div className="text-[9px] font-bold text-white/30 uppercase tracking-widest mb-1">Routing Legend</div>
                {[
                    { color: '#60A5FA', label: 'User / Response' },
                    { color: '#fde68a', label: 'Moderate risk → TCA' },
                    { color: '#f87171', label: 'High/Critical → TCA ∥ CMA' },
                    { color: '#a78bfa', label: 'Analytics → IA' },
                    { color: '#475569', dash: true, label: 'Direct response (no agents)' },
                    { color: '#7e22ce', dash: true, label: 'Background STA (fire-and-forget)' },
                ].map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <svg width="22" height="8">
                            <line x1="0" y1="4" x2="22" y2="4"
                                stroke={item.color}
                                strokeWidth="2"
                                strokeDasharray={item.dash ? '4,3' : undefined}
                            />
                        </svg>
                        <span className="text-[9px] text-white/50">{item.label}</span>
                    </div>
                ))}
            </div>

            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#00153a]/40 pointer-events-none" />
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => onNodeClick(node.id)}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                attributionPosition="bottom-right"
                className="!bg-transparent"
            >
                <Background color="#ffffff" gap={24} size={1} style={{ opacity: 0.03 }} />
                <Controls className="!bg-white/5 !border-white/5 !m-4 !rounded-xl overflow-hidden [&>button]:!fill-white/60 [&>button:hover]:!bg-white/10 [&>button]:!border-b-white/5" />
            </ReactFlow>
        </div>
    );
}
