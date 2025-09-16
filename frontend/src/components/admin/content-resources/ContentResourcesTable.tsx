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
import { FiPlus, FiEdit, FiTrash2, FiSearch, FiFilter, FiChevronUp, FiChevronDown, FiEye, FiExternalLink } from 'react-icons/fi';

interface ContentResource {
    id: number;
    title: string;
    type: string;
    source: string | null;
    description?: string | null;
    created_at: string;
    updated_at: string;
    content: string;
    tags: string[];
    metadata: Record<string, unknown>;
    mime_type?: string | null;
    embedding_status: string;
    embedding_last_processed_at?: string | null;
    chunk_count: number;
    storage_backend: string;
    object_storage_key?: string | null;
    object_storage_bucket?: string | null;
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
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
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
            setResources(data.items.map((item) => ({
                ...item,
                tags: item.tags ?? [],
                metadata: item.metadata ?? {},
            })));
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
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Tags</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('embedding_status')}>
                                        Embedding {sortBy === 'embedding_status' && (sortOrder === 'asc' ? <FiChevronUp className="inline" /> : <FiChevronDown className="inline" />)}
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-transparent divide-y divide-white/20">
                                {resources.map((resource) => (
                                    <tr key={resource.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{resource.title}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{resource.type}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{resource.source ?? '—'}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{new Date(resource.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                                            {resource.tags.length ? resource.tags.join(', ') : '—'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${resource.embedding_status === 'succeeded' ? 'bg-green-500/20 text-green-200' : resource.embedding_status === 'failed' ? 'bg-red-500/20 text-red-200' : 'bg-yellow-500/20 text-yellow-200'}`}>
                                                {resource.embedding_status}
                                            </span>
                                        </td>
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
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 sm:p-8 z-50" onClick={() => setViewingResource(null)}>
                    <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 border-b border-white/20">
                            <h3 className="text-lg font-medium text-white">{viewingResource.title}</h3>
                            {viewingResource.description && (
                                <p className="mt-1 text-sm text-gray-300">{viewingResource.description}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-300">
                                <span className="rounded-full bg-white/10 px-3 py-1 uppercase tracking-wide">{viewingResource.type}</span>
                                {(viewingResource.tags || []).map((tag) => (
                                    <span key={tag} className="rounded-full bg-white/10 px-3 py-1">{tag}</span>
                                ))}
                                <span className="rounded-full bg-white/10 px-3 py-1">Embedding: {viewingResource.embedding_status}</span>
                                <span className="rounded-full bg-white/10 px-3 py-1">Chunks: {viewingResource.chunk_count}</span>
                                <span className="rounded-full bg-white/10 px-3 py-1">Storage: {viewingResource.storage_backend}</span>
                            </div>
                        </div>
                        <div className="p-6 flex-1 overflow-y-auto">
                            {viewingResource.type === 'pdf' && viewingResource.object_storage_key ? (
                                <iframe
                                    title={viewingResource.title}
                                    src={`/api/v1/admin/content-resources/${viewingResource.id}/file`}
                                    className="w-full min-h-[520px] rounded-xl border border-white/20 bg-black/10"
                                />
                            ) : viewingResource.type === 'url' ? (
                                <div className="space-y-4">
                                    {viewingResource.source && (
                                        <a href={viewingResource.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center text-[#FFCA40] hover:text-[#ffd86b]">
                                            <FiExternalLink className="mr-2" />
                                            {viewingResource.source}
                                        </a>
                                    )}
                                    <div className="bg-black/20 p-4 rounded-xl text-gray-200 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                                        {viewingResource.content || 'No extracted content available yet.'}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-black/20 p-4 rounded-xl text-gray-200 whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                                    {viewingResource.content}
                                </div>
                            )}
                        </div>
                        <div className="px-6 pb-6 text-xs text-gray-300 space-y-1">
                            <div>Created: {new Date(viewingResource.created_at).toLocaleString()}</div>
                            <div>Updated: {new Date(viewingResource.updated_at).toLocaleString()}</div>
                            {viewingResource.embedding_last_processed_at && (
                                <div>Embedded: {new Date(viewingResource.embedding_last_processed_at).toLocaleString()}</div>
                            )}
                            {viewingResource.metadata && Object.keys(viewingResource.metadata).length > 0 && (
                                <div className="mt-3">
                                    <h4 className="font-medium text-gray-200 mb-2">Metadata</h4>
                                    <pre className="bg-black/20 p-3 rounded-lg text-[11px] whitespace-pre-wrap break-words">{JSON.stringify(viewingResource.metadata, null, 2)}</pre>
                                </div>
                            )}
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
