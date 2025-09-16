
import React from 'react';
import { Metadata } from 'next';
import { FiGitMerge } from 'react-icons/fi';
import LangGraphViewer from '@/components/admin/langgraph/LangGraphViewer';

export const metadata: Metadata = {
    title: 'Admin: LangGraph Visualization',
};

const LangGraphVizPage = () => {
    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white flex items-center">
                        <FiGitMerge className="mr-3 text-[#FFCA40]" />
                        LangGraph Visualization
                    </h1>
                    <p className="text-gray-400 mt-1">Visualize LangGraph agent executions.</p>
                </div>
            </div>
            <LangGraphViewer />
        </div>
    );
};

export default LangGraphVizPage;
