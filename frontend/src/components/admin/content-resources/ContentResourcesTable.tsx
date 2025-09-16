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
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiFilter, FiChevronUp, FiChevronDown, FiEye } from 'react-icons/fi';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [resourceTypes, setResourceTypes] = useState<string[]>([]);
    const [selectedType, setSelectedType] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState('desc');
    const [viewingResource, setViewingResource] = useState<ContentResource | null>(null);

    const fetchResourceTypes = useCallback(async () => {
        try {
            const types = await apiCall<string[]>('/api/v1/admin/content-resources/types');
            setResourceTypes(types);
        } catch (err: any) {
            // Ignore error
        }
    }, []);

    const fetchResources = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                search: searchTerm,
                type: selectedType,
                sort_by: sortBy,
                sort_order: sortOrder,
            });
            const data = await apiCall<ContentResourceResponse>(`/api/v1/admin/content-resources?${params.toString()}`);
            setResources(data.items);
            setTotalPages(Math.ceil(data.total_count / 10));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, [page, searchTerm, selectedType, sortBy, sortOrder]);

    useEffect(() => {
        fetchResourceTypes();
    }, [fetchResourceTypes]);

    useEffect(() => {
        const debounceTimer = setTimeout(() => {
            fetchResources();
        }, 500);
        return () => clearTimeout(debounceTimer);
    }, [fetchResources]);

    const handleSort = (column: string) => {
        if (sortBy === column) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(column);
            setSortOrder('asc');
        }
    };

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
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search resources..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    aria-label="Search resources"
                                    className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
                                />
                            </div>
                            <div className="relative">
                                <FiFilter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <select
                                    value={selectedType}
                                    onChange={(e) => setSelectedType(e.target.value)}
                                    title="Filter by type"
                                    aria-label="Filter by type"
                                    className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
                                >
                                    <option value="">All Types</option>
                                    {resourceTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Button onClick={handleAddNew} className="inline-flex items-center px-4 py-2 bg-[#FFCA40] hover:bg-[#ffda63] text-black rounded-lg text-sm font-medium transition-colors">
                            <FiPlus className="mr-2" />
                            Add New
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-white/20">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('title')}>
                                        Title {sortBy === 'title' && (sortOrder === 'asc' ? <FiChevronUp className="inline" /> : <FiChevronDown className="inline" />)}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('type')}>
                                        Type {sortBy === 'type' && (sortOrder === 'asc' ? <FiChevronUp className="inline" /> : <FiChevronDown className="inline" />)}
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Source</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('created_at')}>
                                        Created At {sortBy === 'created_at' && (sortOrder === 'asc' ? <FiChevronUp className="inline" /> : <FiChevronDown className="inline" />)}
                                    </th>
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
                                            <button onClick={() => setViewingResource(resource)} className="text-green-400 hover:text-green-300 mr-4"><FiEye /></button>
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
            {viewingResource && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50" onClick={() => setViewingResource(null)}>
                    <div className="bg-slate-800/80 backdrop-blur-lg rounded-xl border border-white/20 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-white/20">
                            <h3 className="text-lg font-medium text-white">{viewingResource.title}</h3>
                        </div>
                        <div className="p-6">
                            <div className="bg-black/20 p-4 rounded-lg text-gray-200 whitespace-pre-wrap max-h-96 overflow-y-auto">
                                {viewingResource.content}
                            </div>
                        </div>
                        <div className="px-6 py-3 bg-black/20 border-t border-white/20 text-right">
                            <Button onClick={() => setViewingResource(null)} className="bg-white/20 hover:bg-white/30 text-white">Close</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ContentResourcesTable;