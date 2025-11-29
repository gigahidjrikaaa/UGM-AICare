"use client";

import React, { useState, useEffect } from 'react';
import api from '@/services/api';
import { FiDatabase, FiRefreshCw, FiChevronLeft, FiChevronRight, FiAlertCircle } from 'react-icons/fi';

interface Column {
    name: string;
    type: string;
    nullable: boolean;
    primary_key: boolean;
}

interface TableData {
    table_name: string;
    columns: Column[];
    data: any[];
    pagination: {
        page: number;
        limit: number;
        total_rows: number;
        total_pages: number;
    };
}

export default function DatabaseViewerPage() {
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);

    // Fetch table list on mount
    useEffect(() => {
        fetchTables();
    }, []);

    // Fetch table data when selected table or page changes
    useEffect(() => {
        if (selectedTable) {
            fetchTableData(selectedTable, page, limit);
        }
    }, [selectedTable, page, limit]);

    const fetchTables = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/database/tables');
            setTables(response.data);
            if (response.data.length > 0 && !selectedTable) {
                // Optionally select first table
                // setSelectedTable(response.data[0]);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch tables');
        } finally {
            setLoading(false);
        }
    };

    const fetchTableData = async (tableName: string, pageNum: number, limitNum: number) => {
        try {
            setLoading(true);
            setError(null);
            const response = await api.get(`/admin/database/tables/${tableName}`, {
                params: { page: pageNum, limit: limitNum }
            });
            setTableData(response.data);
        } catch (err: any) {
            setError(err.message || `Failed to fetch data for ${tableName}`);
            setTableData(null);
        } finally {
            setLoading(false);
        }
    };

    const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedTable(e.target.value);
        setPage(1); // Reset to first page on table change
    };

    return (
        <div className="p-6 max-w-[1600px] mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <FiDatabase className="text-blue-500" />
                        Database Viewer
                    </h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                        Inspect raw database tables and content.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={selectedTable}
                        onChange={handleTableChange}
                        className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        <option value="">Select a table...</option>
                        {tables.map(table => (
                            <option key={table} value={table}>{table}</option>
                        ))}
                    </select>

                    <button
                        onClick={() => selectedTable && fetchTableData(selectedTable, page, limit)}
                        className="p-2 text-slate-500 hover:text-blue-500 transition-colors"
                        title="Refresh Data"
                    >
                        <FiRefreshCw className={loading ? "animate-spin" : ""} size={20} />
                    </button>
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg flex items-center gap-2">
                    <FiAlertCircle />
                    {error}
                </div>
            )}

            {/* Data Table */}
            {selectedTable && tableData ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-250px)]">
                    {/* Table Info Bar */}
                    <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center text-xs text-slate-500">
                        <span>
                            Showing {tableData.data.length} rows (Total: {tableData.pagination.total_rows})
                        </span>
                        <div className="flex gap-4">
                            {tableData.columns.map(col => (
                                <span key={col.name} className={col.primary_key ? "text-blue-500 font-medium" : ""}>
                                    {col.name} <span className="opacity-50">({col.type})</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Table Area */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {tableData.columns.map((col) => (
                                        <th
                                            key={col.name}
                                            className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 whitespace-nowrap"
                                        >
                                            <div className="flex items-center gap-1">
                                                {col.name}
                                                {col.primary_key && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">PK</span>}
                                                {col.nullable && <span className="text-[10px] text-slate-400">null</span>}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                {tableData.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={tableData.columns.length} className="px-4 py-8 text-center text-slate-500">
                                            No data found in this table.
                                        </td>
                                    </tr>
                                ) : (
                                    tableData.data.map((row, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                            {tableData.columns.map((col) => {
                                                const cellValue = row[col.name];
                                                let displayValue = cellValue;

                                                if (cellValue === null) displayValue = <span className="text-slate-300 italic">null</span>;
                                                else if (typeof cellValue === 'boolean') displayValue = cellValue ? 'true' : 'false';
                                                else if (typeof cellValue === 'object') displayValue = JSON.stringify(cellValue);
                                                else if (String(cellValue).length > 50) displayValue = <span title={String(cellValue)}>{String(cellValue).substring(0, 50)}...</span>;

                                                return (
                                                    <td key={col.name} className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-300 max-w-xs truncate">
                                                        {displayValue}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Footer */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
                        <div className="text-sm text-slate-500">
                            Page {page} of {tableData.pagination.total_pages || 1}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiChevronLeft />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(tableData.pagination.total_pages, p + 1))}
                                disabled={page >= tableData.pagination.total_pages || loading}
                                className="p-2 rounded hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiChevronRight />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                !loading && (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                        <FiDatabase size={48} className="mb-4 opacity-50" />
                        <p>Select a table to view its contents</p>
                    </div>
                )
            )}
        </div>
    );
}
