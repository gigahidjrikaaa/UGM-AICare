/**
 * CaseListTable Component
 * Displays paginated, filterable, sortable list of cases with SLA indicators
 */

'use client';

import { useState } from 'react';
import type { CaseListItem, CaseFilters, CaseSeverity, CaseStatus, SLAStatus } from '@/types/admin/cases';
import { formatDistanceToNow } from 'date-fns';

interface CaseListTableProps {
  cases: CaseListItem[];
  total: number;
  page: number;
  pageSize: number;
  hasNext: boolean;
  hasPrev: boolean;
  filters: CaseFilters;
  onFilterChange: (filters: CaseFilters) => void;
  onCaseClick: (caseId: string) => void;
  loading?: boolean;
}

export default function CaseListTable({
  cases,
  total,
  page,
  pageSize,
  hasNext,
  hasPrev,
  filters,
  onFilterChange,
  onCaseClick,
  loading = false,
}: CaseListTableProps) {
  const [searchInput, setSearchInput] = useState(filters.search || '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilterChange({ ...filters, search: searchInput, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    onFilterChange({ ...filters, page: newPage });
  };

  const handleSortChange = (sortBy: CaseFilters['sort_by']) => {
    const newOrder = filters.sort_by === sortBy && filters.sort_order === 'asc' ? 'desc' : 'asc';
    onFilterChange({ ...filters, sort_by: sortBy, sort_order: newOrder });
  };

  // Severity badge styling
  const getSeverityClass = (severity: CaseSeverity): string => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    switch (severity) {
      case 'critical':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200`;
      case 'high':
        return `${baseClasses} bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200`;
      case 'med':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200`;
      case 'low':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
    }
  };

  // Status badge styling
  const getStatusClass = (status: CaseStatus): string => {
    const baseClasses = 'px-2 py-1 text-xs font-semibold rounded-full';
    switch (status) {
      case 'new':
        return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`;
      case 'in_progress':
        return `${baseClasses} bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200`;
      case 'resolved':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200`;
      case 'closed':
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200`;
    }
  };

  // SLA status indicator
  const getSLAIndicator = (slaStatus: SLAStatus, minutesUntil: number | null) => {
    const getColorClass = () => {
      switch (slaStatus) {
        case 'breached':
          return 'bg-red-500';
        case 'critical':
          return 'bg-red-400 animate-pulse';
        case 'warning':
          return 'bg-yellow-400';
        case 'safe':
        default:
          return 'bg-green-400';
      }
    };

    const getTooltip = () => {
      if (slaStatus === 'breached') return 'SLA breached!';
      if (minutesUntil !== null) return `${minutesUntil} min until breach`;
      return 'No SLA set';
    };

    return (
      <div className="flex items-center gap-2">
        <div
          className={`w-3 h-3 rounded-full ${getColorClass()}`}
          title={getTooltip()}
        />
        {slaStatus === 'critical' && minutesUntil !== null && (
          <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
            {minutesUntil}m
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search by user hash or summary..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Search
          </button>
          {searchInput && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                onFilterChange({ ...filters, search: undefined, page: 1 });
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Clear
            </button>
          )}
        </form>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {/* Status Filter */}
          <select
            value={filters.status || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                status: e.target.value as CaseStatus | undefined,
                page: 1,
              })
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>

          {/* Severity Filter */}
          <select
            value={filters.severity || ''}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                severity: e.target.value as CaseSeverity | undefined,
                page: 1,
              })
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Severities</option>
            <option value="low">Low</option>
            <option value="med">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>

          {/* Assignment Filter */}
          <select
            value={
              filters.unassigned
                ? 'unassigned'
                : filters.assigned_to || ''
            }
            onChange={(e) => {
              if (e.target.value === 'unassigned') {
                onFilterChange({ ...filters, unassigned: true, assigned_to: undefined, page: 1 });
              } else if (e.target.value === '') {
                onFilterChange({ ...filters, unassigned: undefined, assigned_to: undefined, page: 1 });
              } else {
                onFilterChange({ ...filters, unassigned: undefined, assigned_to: e.target.value, page: 1 });
              }
            }}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">All Assignments</option>
            <option value="unassigned">Unassigned</option>
          </select>

          {/* SLA Filter */}
          <label className="flex items-center gap-2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700">
            <input
              type="checkbox"
              checked={filters.sla_breached || false}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  sla_breached: e.target.checked || undefined,
                  page: 1,
                })
              }
              className="rounded"
            />
            <span className="text-sm text-gray-900 dark:text-gray-100">SLA Breached</span>
          </label>

          {/* Page Size */}
          <select
            value={filters.page_size || 20}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                page_size: parseInt(e.target.value),
                page: 1,
              })
            }
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="10">10 per page</option>
            <option value="20">20 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  SLA
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSortChange('severity')}
                >
                  Severity {filters.sort_by === 'severity' && (filters.sort_order === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User Hash
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Summary
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Risk Score
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSortChange('created_at')}
                >
                  Created {filters.sort_by === 'created_at' && (filters.sort_order === 'asc' ? '↑' : '↓')}
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => handleSortChange('updated_at')}
                >
                  Updated {filters.sort_by === 'updated_at' && (filters.sort_order === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading cases...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No cases found
                  </td>
                </tr>
              ) : (
                cases.map((caseItem) => (
                  <tr
                    key={caseItem.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                    onClick={() => onCaseClick(caseItem.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      {getSLAIndicator(caseItem.sla_status, caseItem.minutes_until_breach)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={getSeverityClass(caseItem.severity)}>
                        {caseItem.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={getStatusClass(caseItem.status)}>
                        {caseItem.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-gray-100">
                      {caseItem.user_hash.substring(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 max-w-xs truncate">
                      {caseItem.summary_redacted || 'No summary'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {caseItem.assigned_to || (
                        <span className="text-gray-500 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {caseItem.latest_triage ? (
                        <span className={caseItem.latest_triage.risk_score >= 0.7 ? 'font-semibold text-red-600' : ''}>
                          {(caseItem.latest_triage.risk_score * 100).toFixed(0)}%
                        </span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(caseItem.created_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(new Date(caseItem.updated_at), { addSuffix: true })}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCaseClick(caseItem.id);
                        }}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, total)} of {total} cases
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={!hasPrev}
              className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700 dark:text-gray-300">
              Page {page}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={!hasNext}
              className="px-3 py-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
