/* eslint-disable */
// frontend/src/components/admin/content-resources/ContentResourcesTable.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiCall } from '@/utils/adminApi';
import { Button } from '@/components/ui/Button';
import GlobalSkeleton from '@/components/ui/GlobalSkeleton';
import ErrorMessage from '@/components/ui/ErrorMessage';
import ContentResourceForm from './ContentResourceForm';
import DeleteResourceButton from './DeleteResourceButton';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';

interface ContentResource {
    id: number;
    title: string;
    type: string;
    source: string | null;
    created_at: string;
    updated_at: string;
    content: string;
}

interface ContentResourceResponse {
    items: ContentResource[];
    total_count: number;
}

const ContentResourcesTable = () => {
    const [resources, setResources] = useState<ContentResource[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [isFormVisible, setIsFormVisible] = useState(false);
    const [selectedResource, setSelectedResource] = useState<ContentResource | undefined>(undefined);

    const fetchResources = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiCall<ContentResourceResponse>(`/api/v1/admin/content-resources?page=${page}&limit=10`);
            setResources(data.items);
            setTotalPages(Math.ceil(data.total_count / 10));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [page]);

    useEffect(() => {
        fetchResources();
    }, [fetchResources]);

    const handleFormSuccess = () => {
        setIsFormVisible(false);
        setSelectedResource(undefined);
        fetchResources();
    };

    const handleAddNew = () => {
        setSelectedResource(undefined);
        setIsFormVisible(true);
    };

    const handleEdit = (resource: ContentResource) => {
        setSelectedResource(resource);
        setIsFormVisible(true);
    };

    if (isLoading) {
        return <GlobalSkeleton />;
    }

    if (error) {
        return <ErrorMessage message={error} />;
    }

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 overflow-hidden">
            {!isFormVisible ? (
                <>
                    <div className="p-6 flex justify-between items-center">
                        <h2 className="text-xl font-semibold text-white">All Resources</h2>
                        <Button onClick={handleAddNew} className="inline-flex items-center px-4 py-2 bg-[#FFCA40] hover:bg-[#ffda63] text-black rounded-lg text-sm font-medium transition-colors">
                            <FiPlus className="mr-2" />
                            Add New
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/20">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Title</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Source</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Created At</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-white/20">
                                {resources.map((resource) => (
                                    <tr key={resource.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{resource.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{resource.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{resource.source}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(resource.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button onClick={() => handleEdit(resource)} className="text-blue-400 hover:text-blue-300 mr-4"><FiEdit /></button>
                                            <DeleteResourceButton resourceId={resource.id} onSuccess={fetchResources} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Pagination */}
                    <div className="bg-white/5 px-4 py-3 flex items-center justify-between border-t border-white/20 sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</Button>
                            <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="ml-2">Next</Button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-300">
                                    Page {page} of {totalPages}
                                </p>
                            </div>
                            <div>
                                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                                    <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-white/20 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/20">Previous</Button>
                                    <Button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-white/20 bg-white/10 text-sm font-medium text-gray-300 hover:bg-white/20">Next</Button>
                                </nav>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="p-6">
                    <h2 className="text-xl font-semibold text-white mb-4">
                        {selectedResource ? 'Edit Resource' : 'Add New Resource'}
                    </h2>
                    <ContentResourceForm resource={selectedResource} onSuccess={handleFormSuccess} />
                    <Button onClick={() => setIsFormVisible(false)} className="mt-4 bg-white/10 hover:bg-white/20 text-white">Cancel</Button>
                </div>
            )}
        </div>
    );
};

export default ContentResourcesTable;
