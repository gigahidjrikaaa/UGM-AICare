
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiCall } from '@/utils/adminApi';
import { FiGitMerge, FiEye } from 'react-icons/fi';

interface Node {
    id: string;
    type: string;
    data: any;
}

interface Edge {
    source: string;
    target: string;
}

interface GraphState {
    nodes: Node[];
    edges: Edge[];
}

const LangGraphViewer = () => {
    const [graphState, setGraphState] = useState<GraphState | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);

    const fetchGraphState = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiCall<GraphState>('/api/v1/admin/langgraph-state');
            setGraphState(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGraphState();
    }, [fetchGraphState]);

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    if (!graphState) {
        return <div>No graph state available.</div>;
    }

    return (
        <div className="relative w-full h-[600px] bg-white/5 rounded-lg border border-white/20 p-4">
            <svg className="w-full h-full">
                {graphState.edges.map((edge, i) => {
                    const sourceNode = graphState.nodes.find(n => n.id === edge.source);
                    const targetNode = graphState.nodes.find(n => n.id === edge.target);
                    if (!sourceNode || !targetNode) return null;

                    // This is a very basic layout algorithm. A real implementation would use a more sophisticated one.
                    const x1 = (graphState.nodes.indexOf(sourceNode) + 1) * 150;
                    const y1 = 150;
                    const x2 = (graphState.nodes.indexOf(targetNode) + 1) * 150;
                    const y2 = 300;

                    return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-current text-white/30" strokeWidth="2" />;
                })}
                {graphState.nodes.map((node, i) => {
                    const x = (i + 1) * 150;
                    const y = node.type === 'entrypoint' ? 50 : (node.type === 'output' ? 450 : 250);
                    return (
                        <g key={node.id} transform={`translate(${x}, ${y})`} onClick={() => setSelectedNode(node)} className="cursor-pointer">
                            <rect x="-50" y="-25" width="100" height="50" rx="10" className="fill-current text-white/10 stroke-current text-white/30" />
                            <text x="0" y="0" textAnchor="middle" dy=".3em" className="fill-current text-white">{node.id}</text>
                        </g>
                    );
                })}
            </svg>
            {selectedNode && (
                <div className="absolute top-4 right-4 bg-slate-800/80 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl p-4 max-w-sm">
                    <h3 className="text-lg font-medium text-white">{selectedNode.id}</h3>
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">{JSON.stringify(selectedNode.data, null, 2)}</pre>
                </div>
            )}
        </div>
    );
};

export default LangGraphViewer;
