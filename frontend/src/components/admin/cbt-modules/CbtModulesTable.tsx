'use client';

import React from 'react';
import { FiEdit } from 'react-icons/fi';

interface CbtModule {
    id: string;
    title: string;
    description: string;
}

const modules: CbtModule[] = [
    {
        id: 'cognitive_restructuring',
        title: 'Cognitive Restructuring',
        description: 'To guide the user in identifying, challenging, and reframing a specific automatic negative thought (ANT).',
    },
    {
        id: 'behavioral_activation',
        title: 'Behavioral Activation',
        description: 'To help the user identify and schedule a small, manageable activity to break the cycle of inactivity and low mood.',
    },
    {
        id: 'mindfulness_exercises',
        title: 'Mindfulness Exercises',
        description: 'To guide the user through a simple mindfulness exercise to reduce acute feelings of anxiety or being overwhelmed.',
    },
];

const CbtModulesTable = () => {
    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
            <div className="p-6 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-white">All Modules</h2>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/20">
                    <thead className="bg-white/5">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-transparent divide-y divide-white/20">
                        {modules.map((module) => (
                            <tr key={module.id} className="hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{module.title}</td>
                                <td className="px-6 py-4 whitespace-normal text-sm text-gray-300">{module.description}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button onClick={() => alert('Editing ' + module.title)} className="text-blue-400 hover:text-blue-300 mr-4"><FiEdit /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default CbtModulesTable;
