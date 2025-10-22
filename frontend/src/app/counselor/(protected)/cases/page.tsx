'use client';

import { useState, useEffect } from 'react';
import {
  FiClock,
  FiUser,
  FiMessageSquare,
  FiCheckCircle,
  FiEye,
  FiEdit,
} from 'react-icons/fi';

interface Case {
  case_id: string;
  user_id_hash: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  created_at: string;
  last_updated: string;
  assigned_to?: string;
  escalation_reason?: string;
  notes_count: number;
}

const severityColors = {
  low: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  moderate: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  high: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const statusColors = {
  open: 'bg-purple-500/20 text-purple-300',
  in_progress: 'bg-blue-500/20 text-blue-300',
  resolved: 'bg-green-500/20 text-green-300',
  closed: 'bg-gray-500/20 text-gray-300',
};

export default function CounselorCasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  useEffect(() => {
    loadCases();
  }, []);

  const loadCases = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint when backend is ready
      // const data = await apiCall<Case[]>('/api/counselor/cases');
      
      // Mock data for now
      const mockCases: Case[] = [
        {
          case_id: 'CASE-001',
          user_id_hash: 'user_abc123',
          severity: 'high',
          status: 'in_progress',
          created_at: new Date().toISOString(),
          last_updated: new Date().toISOString(),
          escalation_reason: 'Severe anxiety symptoms detected',
          notes_count: 3,
        },
        {
          case_id: 'CASE-002',
          user_id_hash: 'user_def456',
          severity: 'moderate',
          status: 'open',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          last_updated: new Date(Date.now() - 86400000).toISOString(),
          escalation_reason: 'Recurring negative thought patterns',
          notes_count: 1,
        },
      ];
      
      setCases(mockCases);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Cases</h1>
          <p className="text-white/60">Manage escalated cases and patient care</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40]"
            title="Filter by severity level"
          >
            <option value="all" className="bg-[#001d58]">All Severities</option>
            <option value="critical" className="bg-[#001d58]">Critical</option>
            <option value="high" className="bg-[#001d58]">High</option>
            <option value="moderate" className="bg-[#001d58]">Moderate</option>
            <option value="low" className="bg-[#001d58]">Low</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40]"
            title="Filter by case status"
          >
            <option value="all" className="bg-[#001d58]">All Status</option>
            <option value="open" className="bg-[#001d58]">Open</option>
            <option value="in_progress" className="bg-[#001d58]">In Progress</option>
            <option value="resolved" className="bg-[#001d58]">Resolved</option>
            <option value="closed" className="bg-[#001d58]">Closed</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{cases.filter(c => c.status === 'open').length}</div>
          <div className="text-xs text-white/60 mt-1">Open Cases</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{cases.filter(c => c.status === 'in_progress').length}</div>
          <div className="text-xs text-white/60 mt-1">In Progress</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{cases.filter(c => c.severity === 'critical' || c.severity === 'high').length}</div>
          <div className="text-xs text-white/60 mt-1">High Priority</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{cases.filter(c => c.status === 'resolved').length}</div>
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
                  Escalation Reason
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Notes
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
                  </td>
                </tr>
              ) : (
                filteredCases.map((caseItem) => (
                  <tr 
                    key={caseItem.case_id}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className="text-sm font-mono text-white/90">{caseItem.case_id}</span>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FiUser className="w-3 h-3 text-white/40" />
                        <span className="text-xs font-mono text-white/70">{caseItem.user_id_hash}</span>
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
                      <p className="text-sm text-white/80 line-clamp-2">{caseItem.escalation_reason}</p>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <FiMessageSquare className="w-3 h-3 text-[#FFCA40]" />
                        <span className="text-sm text-white/70">{caseItem.notes_count}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <FiClock className="w-3 h-3" />
                        {formatDate(caseItem.last_updated)}
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
