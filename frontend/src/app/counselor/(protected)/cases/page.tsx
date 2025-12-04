'use client';

import { useState, useEffect } from 'react';
import {
  FiClock,
  FiUser,
  FiMessageSquare,
  FiCheckCircle,
  FiEye,
  FiEdit,
  FiRefreshCw,
  FiAlertTriangle,
} from 'react-icons/fi';
import apiClient from '@/services/api';

interface Case {
  id: string;
  user_hash: string;
  severity: 'low' | 'med' | 'high' | 'critical';
  status: 'new' | 'in_progress' | 'waiting' | 'closed';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  summary_redacted?: string;
  sla_breach_at?: string;
}

interface CaseStats {
  total_cases: number;
  open_cases: number;
  in_progress_cases: number;
  closed_cases: number;
  critical_cases: number;
  high_priority_cases: number;
}

const severityColors = {
  low: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  med: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const statusColors = {
  new: 'bg-purple-500/20 text-purple-300',
  in_progress: 'bg-blue-500/20 text-blue-300',
  waiting: 'bg-yellow-500/20 text-yellow-300',
  closed: 'bg-gray-500/20 text-gray-300',
};

export default function CounselorCasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [stats, setStats] = useState<CaseStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  useEffect(() => {
    loadCases();
    loadStats();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get<{ cases: Case[] }>('/counselor/cases');
      setCases(response.data.cases || []);
    } catch (err) {
      console.error('Failed to load cases:', err);
      setError('Failed to load cases. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get<CaseStats>('/counselor/cases/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load case stats:', err);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredCases = cases.filter((c) => {
    const statusMatch = filterStatus === 'all' || c.status === filterStatus;
    const severityMatch = filterSeverity === 'all' || c.severity === filterSeverity;
    return statusMatch && severityMatch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mb-4"></div>
          <p className="text-white/70">Loading cases...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <FiAlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-red-300 font-semibold mb-2">Failed to load cases</p>
          <p className="text-red-300/70 text-sm mb-4">{error}</p>
          <button
            onClick={loadCases}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all flex items-center gap-2 mx-auto"
          >
            <FiRefreshCw className="w-4 h-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Cases</h1>
          <p className="text-white/60">Manage escalated cases and patient care</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { loadCases(); loadStats(); }}
            className="px-3 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white transition-all flex items-center gap-2"
          >
            <FiRefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40]"
            title="Filter by severity level"
          >
            <option value="all" className="bg-[#001d58]">All Severities</option>
            <option value="critical" className="bg-[#001d58]">Critical</option>
            <option value="high" className="bg-[#001d58]">High</option>
            <option value="med" className="bg-[#001d58]">Moderate</option>
            <option value="low" className="bg-[#001d58]">Low</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40]"
            title="Filter by case status"
          >
            <option value="all" className="bg-[#001d58]">All Status</option>
            <option value="new" className="bg-[#001d58]">New</option>
            <option value="in_progress" className="bg-[#001d58]">In Progress</option>
            <option value="waiting" className="bg-[#001d58]">Waiting</option>
            <option value="closed" className="bg-[#001d58]">Closed</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{stats?.open_cases ?? 0}</div>
          <div className="text-xs text-white/60 mt-1">New Cases</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{stats?.in_progress_cases ?? 0}</div>
          <div className="text-xs text-white/60 mt-1">In Progress</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-red-400">{(stats?.critical_cases ?? 0) + (stats?.high_priority_cases ?? 0)}</div>
          <div className="text-xs text-white/60 mt-1">High Priority</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{stats?.closed_cases ?? 0}</div>
          <div className="text-xs text-white/60 mt-1">Resolved</div>
        </div>
      </div>

      {/* Cases Table */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Case ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Summary
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  SLA Breach
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Last Updated
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <FiCheckCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/60">No cases found</p>
                    <p className="text-white/40 text-sm mt-1">Cases assigned to you will appear here</p>
                  </td>
                </tr>
              ) : (
                filteredCases.map((caseItem) => (
                  <tr 
                    key={caseItem.id}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-white/90">{caseItem.id.substring(0, 8)}...</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FiUser className="w-3 h-3 text-white/40" />
                        <span className="text-xs font-mono text-white/70">{caseItem.user_hash.substring(0, 12)}...</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${severityColors[caseItem.severity]}`}>
                        {caseItem.severity}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[caseItem.status]}`}>
                        {caseItem.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-4 max-w-xs">
                      <p className="text-sm text-white/80 line-clamp-2">{caseItem.summary_redacted || 'No summary available'}</p>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      {caseItem.sla_breach_at ? (
                        <div className="flex items-center gap-1.5 text-xs text-orange-400">
                          <FiClock className="w-3 h-3" />
                          {formatDate(caseItem.sla_breach_at)}
                        </div>
                      ) : (
                        <span className="text-xs text-white/40">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <FiClock className="w-3 h-3" />
                        {formatDate(caseItem.updated_at)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/70 hover:text-white transition-all"
                          title="Edit case"
                        >
                          <FiEdit className="w-3 h-3" />
                        </button>
                        <button className="px-3 py-1 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded text-xs font-medium text-[#FFCA40] transition-all flex items-center gap-1">
                          <FiEye className="w-3 h-3" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
