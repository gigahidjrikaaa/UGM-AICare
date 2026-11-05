"use client";

import React, { useState, useEffect, useRef } from 'react';
import api from '@/services/api';
import { FiDatabase, FiRefreshCw, FiChevronLeft, FiChevronRight, FiAlertCircle, FiChevronDown, FiSearch, FiArrowRight } from 'react-icons/fi';

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

interface TableSchemaColumn {
    name: string;
    type: string;
    nullable: boolean;
    primary_key: boolean;
}

interface TableSchema {
    table_name: string;
    columns: TableSchemaColumn[];
}

interface TableRelationship {
    source_table: string;
    source_column: string;
    target_table: string;
    target_column: string;
    constraint_name: string | null;
}

interface DatabaseSchema {
    tables: TableSchema[];
    relationships: TableRelationship[];
}

export default function DatabaseViewerPage() {
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [tableData, setTableData] = useState<TableData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50);
    const [schema, setSchema] = useState<DatabaseSchema | null>(null);
    const [schemaLoading, setSchemaLoading] = useState(false);

    // Dropdown state
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch table list on mount
    useEffect(() => {
        fetchTables();
        fetchSchema();
    }, []);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
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
            // Sort tables alphabetically
            const sortedTables = (response.data as string[]).sort((a, b) => a.localeCompare(b));
            setTables(sortedTables);
            if (sortedTables.length > 0 && !selectedTable) {
                // Optionally select first table
                // setSelectedTable(sortedTables[0]);
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

    const fetchSchema = async () => {
        try {
            setSchemaLoading(true);
            const response = await api.get('/admin/database/schema');
            setSchema(response.data as DatabaseSchema);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch schema relationships');
        } finally {
            setSchemaLoading(false);
        }
    };

    const filteredTables = tables.filter(table =>
        table.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const selectedTableRelationships = selectedTable && schema
        ? schema.relationships.filter(
            (rel) => rel.source_table === selectedTable || rel.target_table === selectedTable
        )
        : [];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FiDatabase className="text-[#FFCA40]" />
                        Database Viewer
                    </h1>
                    <p className="text-white/50 mt-1">
                        Read-only view of raw database tables and content.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* Custom Searchable Dropdown */}
                    <div className="relative w-64" ref={dropdownRef}>
                        <div
                            className="flex items-center justify-between px-4 py-2 border border-white/10 bg-white/5 rounded-lg text-sm cursor-pointer hover:border-blue-500 transition-colors"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        >
                            <span className={`truncate ${!selectedTable ? "text-white/40" : "text-white"}`}>
                                {selectedTable || "Select a table..."}
                            </span>
                            <FiChevronDown className={`transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
                        </div>

                        {isDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full border border-white/10 bg-white/5 rounded-lg shadow-xl z-50 max-h-80 flex flex-col overflow-hidden">
                                <div className="p-2 border-b border-white/10 bg-white/5">
                                    <div className="flex items-center px-2 rounded border border-white/10 bg-white/5 focus-within:ring-2 focus-within:ring-[#FFCA40]/30 focus-within:border-[#FFCA40]/50">
                                        <FiSearch className="text-white/40 shrink-0" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder="Search tables..."
                                            className="w-full p-2 bg-transparent border-none focus:ring-0 text-sm outline-none text-white placeholder:text-white/40"
                                            autoFocus
                                            onClick={(e) => e.stopPropagation()}
                                        />
                                    </div>
                                </div>
                                <div className="overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-white/20">
                                    {filteredTables.length === 0 ? (
                                        <div className="px-4 py-3 text-white/40 text-sm text-center italic">
                                            No tables found
                                        </div>
                                    ) : (
                                        filteredTables.map(table => (
                                            <div
                                                key={table}
                                                className={`px-4 py-2 cursor-pointer text-sm transition-colors flex items-center justify-between
                                                    ${selectedTable === table 
                                                        ? 'bg-[#FFCA40]/15 text-[#FFCA40] font-medium' 
                                                        : 'hover:bg-white/10 text-white/80'
                                                    }`}
                                                onClick={() => {
                                                    setSelectedTable(table);
                                                    setPage(1);
                                                    setIsDropdownOpen(false);
                                                    setSearchQuery("");
                                                }}
                                            >
                                                {table}
                                                {selectedTable === table && <div className="w-1.5 h-1.5 rounded-full bg-[#FFCA40]"></div>}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => {
                            if (selectedTable) {
                                fetchTableData(selectedTable, page, limit);
                            }
                            fetchSchema();
                        }}
                        className="p-2 text-white/50 hover:text-[#FFCA40] transition-colors border border-white/10 bg-white/5 rounded-lg"
                        title="Refresh Data & Schema"
                    >
                        <FiRefreshCw className={loading ? "animate-spin" : ""} size={20} />
                    </button>
                </div>
            </div>

            {/* ERD / Relationship Figure */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-white">Table Relationship Figure</h2>
                    <div className="text-xs text-white/50">
                        {schemaLoading
                            ? 'Loading schema...'
                            : `Tables: ${schema?.tables.length ?? 0} · Relationships: ${schema?.relationships.length ?? 0}`}
                    </div>
                </div>

                {selectedTable ? (
                    <p className="text-xs text-white/50">
                        Showing relationships for <span className="font-medium text-white/80">{selectedTable}</span>
                    </p>
                ) : (
                    <p className="text-xs text-white/50">Select a table to focus its inbound/outbound relationships.</p>
                )}

                <div className="overflow-x-auto">
                    {selectedTable && selectedTableRelationships.length > 0 ? (
                        <div className="min-w-180 space-y-2">
                            {selectedTableRelationships.map((rel, idx) => {
                                const isOutbound = rel.source_table === selectedTable;
                                return (
                                    <div key={`${rel.source_table}-${rel.source_column}-${rel.target_table}-${rel.target_column}-${idx}`} className="flex items-center gap-3 text-sm">
                                        <span className={`rounded-md border px-2 py-1 ${isOutbound ? 'border-[#FFCA40]/30 bg-[#FFCA40]/10 text-[#FFCA40]' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'}`}>
                                            {rel.source_table}.{rel.source_column}
                                        </span>
                                        <FiArrowRight className="text-white/40" />
                                        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/80">
                                            {rel.target_table}.{rel.target_column}
                                        </span>
                                        <span className="text-xs text-white/40">{rel.constraint_name ?? 'fk'}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-sm text-white/40 py-2">
                            {selectedTable ? 'No foreign-key relationship found for selected table.' : 'No table selected.'}
                        </div>
                    )}
                </div>
            </div>

            {/* Error Message */}
            {error && (
                <div className="p-4 border border-red-500/40 bg-red-500/10 text-red-200 rounded-lg flex items-center gap-2">
                    <FiAlertCircle />
                    {error}
                </div>
            )}

            {/* Data Table */}
            {selectedTable && tableData ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md overflow-hidden flex flex-col h-[calc(100vh-250px)]">
                    {/* Table Info Bar */}
                    <div className="px-4 py-3 border-b border-white/10 bg-white/5 flex justify-between items-center text-xs text-white/50">
                        <span>
                            Showing {tableData.data.length} rows (Total: {tableData.pagination.total_rows})
                        </span>
                        <div className="flex gap-4">
                            {tableData.columns.map(col => (
                                <span key={col.name} className={col.primary_key ? "text-[#FFCA40] font-medium" : ""}>
                                    {col.name} <span className="opacity-50">({col.type})</span>
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Scrollable Table Area */}
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="bg-white/5 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {tableData.columns.map((col) => (
                                        <th
                                            key={col.name}
                                            className="px-4 py-3 font-semibold text-white/85 border-b border-white/10 whitespace-nowrap"
                                        >
                                            <div className="flex items-center gap-1">
                                                {col.name}
                                                {col.primary_key && <span className="text-[10px] bg-[#FFCA40]/15 text-[#FFCA40] px-1 rounded">PK</span>}
                                                {col.nullable && <span className="text-[10px] text-white/40">null</span>}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/10">
                                {tableData.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={tableData.columns.length} className="px-4 py-8 text-center text-white/50">
                                            No data found in this table.
                                        </td>
                                    </tr>
                                ) : (
                                    tableData.data.map((row, idx) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-white/5 transition-colors"
                                        >
                                            {tableData.columns.map((col) => {
                                                const cellValue = row[col.name];
                                                let displayValue = cellValue;

                                                if (cellValue === null) displayValue = <span className="text-white/30 italic">null</span>;
                                                else if (typeof cellValue === 'boolean') displayValue = cellValue ? 'true' : 'false';
                                                else if (typeof cellValue === 'object') displayValue = JSON.stringify(cellValue);
                                                else if (String(cellValue).length > 50) displayValue = <span title={String(cellValue)}>{String(cellValue).substring(0, 50)}...</span>;

                                                return (
                                                    <td key={col.name} className="px-4 py-2.5 border-b border-white/10 text-white/70 max-w-xs truncate">
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
                    <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between">
                        <div className="text-sm text-white/50">
                            Page {page} of {tableData.pagination.total_pages || 1}
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1 || loading}
                                className="p-2 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiChevronLeft />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(tableData.pagination.total_pages, p + 1))}
                                disabled={page >= tableData.pagination.total_pages || loading}
                                className="p-2 rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <FiChevronRight />
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                !loading && (
                    <div className="flex flex-col items-center justify-center h-64 text-white/40 border-2 border-dashed border-white/10 rounded-2xl">
                        <FiDatabase size={48} className="mb-4 opacity-50" />
                        <p>Select a table to view its contents</p>
                    </div>
                )
            )}
        </div>
    );
}
