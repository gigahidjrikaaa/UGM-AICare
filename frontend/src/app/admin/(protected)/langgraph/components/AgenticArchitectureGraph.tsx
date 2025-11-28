'use client';

import { useCallback, useMemo } from 'react';
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

// Custom Node Component for Agents
const AgentNode = ({ data, isConnectable }: NodeProps) => {
    return (
        <div className={`px-4 py-3 rounded-xl border backdrop-blur-md shadow-lg min-w-[180px] transition-all duration-300 ${data.status === 'healthy' ? 'bg-emerald-500/10 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]' :
            data.status === 'degraded' ? 'bg-yellow-500/10 border-yellow-500/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' :
                data.status === 'down' ? 'bg-red-500/10 border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.1)]' :
                    'bg-[#00153a]/80 border-white/10'
            }`}>
            <Handle type="target" position={Position.Top} isConnectable={isConnectable} className="!bg-white/20 !w-3 !h-3" />

            <div className="flex items-center gap-3 mb-2">
                <div className="text-2xl">{data.icon}</div>
                <div>
                    <div className="text-sm font-bold text-white tracking-wide">{data.label}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${data.status === 'healthy' ? 'text-emerald-400' :
                        data.status === 'degraded' ? 'text-yellow-400' :
                            data.status === 'down' ? 'text-red-400' : 'text-white/50'
                        }`}>
                        {data.status || 'Unknown'}
                    </div>
                </div>
            </div>

            {data.metrics && (
                <div className="pt-2 border-t border-white/10 flex justify-between items-center">
                    <span className="text-[10px] text-white/50 uppercase tracking-wider">Success Rate</span>
                    <span className={`text-xs font-bold ${data.metrics.successRate >= 95 ? 'text-emerald-400' :
                        data.metrics.successRate >= 70 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                        {data.metrics.successRate}%
                    </span>
                </div>
            )}

            <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-white/20 !w-3 !h-3" />
        </div>
    );
};

// Custom Node for User
const UserNode = ({ data, isConnectable }: NodeProps) => (
    <div className="px-6 py-4 rounded-full bg-blue-500/20 border border-blue-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(59,130,246,0.2)] text-center">
        <div className="text-3xl mb-1">👤</div>
        <div className="text-sm font-bold text-blue-200">User</div>
        <Handle type="source" position={Position.Bottom} isConnectable={isConnectable} className="!bg-blue-400 !w-3 !h-3" />
    </div>
);

const nodeTypes = {
    agent: AgentNode,
    user: UserNode,
};

interface AgenticArchitectureGraphProps {
    onNodeClick: (nodeId: string) => void;
    healthData: any; // Using any for now, should be typed properly
}

export function AgenticArchitectureGraph({ onNodeClick, healthData }: AgenticArchitectureGraphProps) {
    // Helper to get status and metrics for a graph
    const getGraphData = (graphName: string) => {
        // Added safety check for g.graph_name
        const graph = healthData?.graphs?.find((g: any) => g?.graph_name && g.graph_name.toLowerCase() === graphName.toLowerCase());
        return {
            status: graph?.status || 'unknown',
            metrics: graph ? {
                successRate: (graph.success_rate * 100).toFixed(1),
            } : null
        };
    };

    const initialNodes: Node[] = [
        {
            id: 'user',
            type: 'user',
            position: { x: 400, y: 0 },
            data: { label: 'User' },
        },
        {
            id: 'aika',
            type: 'agent',
            position: { x: 400, y: 150 },
            data: {
                label: 'AIKA Meta-Agent',
                icon: '🤖',
                ...getGraphData('orchestrator') // Aika is the orchestrator
            },
        },
        {
            id: 'sta',
            type: 'agent',
            position: { x: 100, y: 350 },
            data: {
                label: 'Safety Triage',
                icon: '🛡️',
                ...getGraphData('sta')
            },
        },
        {
            id: 'tca',
            type: 'agent',
            position: { x: 300, y: 350 },
            data: {
                label: 'Therapeutic Coach',
                icon: '🧠',
                ...getGraphData('tca')
            },
        },
        {
            id: 'cma',
            type: 'agent',
            position: { x: 500, y: 350 },
            data: {
                label: 'Case Manager',
                icon: '📋',
                ...getGraphData('cma')
            },
        },
        {
            id: 'ia',
            type: 'agent',
            position: { x: 700, y: 350 },
            data: {
                label: 'Insights Agent',
                icon: '📊',
                ...getGraphData('ia')
            },
        },
    ];

    const initialEdges: Edge[] = [
        { id: 'e-user-aika', source: 'user', target: 'aika', animated: true, style: { stroke: '#60A5FA' } },
        { id: 'e-aika-sta', source: 'aika', target: 'sta', animated: true, style: { stroke: '#34D399' }, label: 'Risk Assessment' },
        { id: 'e-aika-tca', source: 'aika', target: 'tca', animated: true, style: { stroke: '#34D399' }, label: 'Support' },
        { id: 'e-aika-cma', source: 'aika', target: 'cma', animated: true, style: { stroke: '#34D399' }, label: 'Referral' },
        { id: 'e-aika-ia', source: 'aika', target: 'ia', animated: true, style: { stroke: '#34D399' }, label: 'Analytics' },
    ];

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update nodes when healthData changes
    useMemo(() => {
        setNodes((nds) => nds.map((node) => {
            if (node.type === 'agent') {
                // Map 'aika' node to 'orchestrator' data from backend
                const graphName = node.id === 'aika' ? 'orchestrator' : node.id;
                const data = getGraphData(graphName);
                return {
                    ...node,
                    data: {
                        ...node.data,
                        ...data
                    }
                };
            }
            return node;
        }));
    }, [healthData, setNodes]);

    return (
        <div className="h-[600px] w-full bg-[#00153a]/20 backdrop-blur-sm border border-white/5 rounded-3xl shadow-2xl overflow-hidden relative group">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#00153a]/40 pointer-events-none" />
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={(_, node) => onNodeClick(node.id)}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-right"
                className="!bg-transparent"
            >
                <Background color="#ffffff" gap={24} size={1} style={{ opacity: 0.03 }} />
                <Controls className="!bg-white/5 !border-white/5 !m-4 !rounded-xl overflow-hidden [&>button]:!fill-white/60 [&>button:hover]:!bg-white/10 [&>button]:!border-b-white/5" />
            </ReactFlow>
        </div>
    );
}
