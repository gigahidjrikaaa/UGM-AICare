'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  FiUser,
  FiCalendar,
  FiClock,
  FiAlertTriangle,
  FiRefreshCw,
  FiMail,
  FiPhone,
  FiSend,
} from 'react-icons/fi';
import apiClient from '@/services/api';
import toast from 'react-hot-toast';

interface CaseItem {
  id: string;
  user_hash: string;
  severity: 'low' | 'med' | 'high' | 'critical';
  status: 'new' | 'in_progress' | 'waiting' | 'closed';
  created_at: string;
  updated_at: string;
  assigned_to?: string;
  summary_redacted?: string;
  user_email?: string;
  user_phone?: string;
  telegram_username?: string;
}

interface Patient {
  user_hash: string;
  user_email?: string;
  user_phone?: string;
  telegram_username?: string;
  first_case_date: string;
  last_case_date: string;
  total_cases: number;
  active_cases: number;
  closed_cases: number;
  highest_severity: 'low' | 'med' | 'high' | 'critical';
  status: 'active' | 'inactive' | 'discharged';
}

const statusColors = {
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  discharged: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

const severityColors: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300',
  high: 'bg-orange-500/20 text-orange-300',
  med: 'bg-yellow-500/20 text-yellow-300',
  low: 'bg-green-500/20 text-green-300',
};

const severityRank: Record<string, number> = {
  critical: 4,
  high: 3,
  med: 2,
  low: 1,
};

function derivePatients(cases: CaseItem[]): Patient[] {
  const grouped = new Map<string, CaseItem[]>();
  for (const c of cases) {
    const key = c.user_hash;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(c);
  }

  const patients: Patient[] = [];
  for (const [userHash, userCases] of grouped) {
    const sorted = userCases.sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

    const activeCases = userCases.filter(
      (c) => c.status === 'new' || c.status === 'in_progress' || c.status === 'waiting'
    );
    const closedCases = userCases.filter((c) => c.status === 'closed');

    // Use the most recent case for contact info
    const latestCase = userCases.reduce((latest, c) =>
      new Date(c.updated_at) > new Date(latest.updated_at) ? c : latest
    );

    // Highest severity across all active cases (or all cases if none active)
    const relevantCases = activeCases.length > 0 ? activeCases : userCases;
    const highestSeverity = relevantCases.reduce(
      (max, c) => ((severityRank[c.severity] || 0) > (severityRank[max] || 0) ? c.severity : max),
      'low' as CaseItem['severity']
    );

    // Determine patient status
    let status: Patient['status'] = 'active';
    if (activeCases.length === 0 && closedCases.length > 0) {
      status = 'discharged';
    } else if (activeCases.length === 0) {
      status = 'inactive';
    }

    patients.push({
      user_hash: userHash,
      user_email: latestCase.user_email,
      user_phone: latestCase.user_phone,
      telegram_username: latestCase.telegram_username,
      first_case_date: sorted[0].created_at,
      last_case_date: latestCase.updated_at,
      total_cases: userCases.length,
      active_cases: activeCases.length,
      closed_cases: closedCases.length,
      highest_severity: highestSeverity,
      status,
    });
  }

  // Sort: active first, then by last case date descending
  patients.sort((a, b) => {
    const statusOrder = { active: 0, inactive: 1, discharged: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(b.last_case_date).getTime() - new Date(a.last_case_date).getTime();
  });

  return patients;
}

export default function CounselorPatientsPage() {
  const router = useRouter();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/counselor/cases');
      const cases: CaseItem[] = response.data?.cases ?? response.data ?? [];

      const derived = derivePatients(cases);
      setPatients(derived);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load patients';
      console.error('Failed to load patients:', err);
      setError(message);
      toast.error('Failed to load patient data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredPatients = patients.filter((patient) => {
    const statusMatch = filterStatus === 'all' || patient.status === filterStatus;
    const searchMatch =
      searchQuery === '' ||
      patient.user_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.telegram_username?.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  const activeCount = patients.filter((p) => p.status === 'active').length;
  const totalActiveCases = patients.reduce((sum, p) => sum + p.active_cases, 0);
  const totalCases = patients.reduce((sum, p) => sum + p.total_cases, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mb-4"></div>
          <p className="text-white/70">Loading patients...</p>
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
          <p className="text-red-300 font-semibold mb-2">Failed to load patients</p>
          <p className="text-red-300/70 text-sm mb-4">{error}</p>
          <button
            onClick={loadPatients}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-sm text-red-300 transition-all"
          >
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
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FiUser className="w-8 h-8 text-[#FFCA40]" />
            My Patients
          </h1>
          <p className="text-white/60">
            Patients derived from your assigned cases ({patients.length} unique patients)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadPatients}
            className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 hover:text-white transition-all"
            title="Refresh"
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>
          <input
            type="text"
            placeholder="Search patients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40]"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40]"
            title="Filter by patient status"
          >
            <option value="all" className="bg-[#001d58]">All Status</option>
            <option value="active" className="bg-[#001d58]">Active</option>
            <option value="inactive" className="bg-[#001d58]">Inactive</option>
            <option value="discharged" className="bg-[#001d58]">Discharged</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{activeCount}</div>
          <div className="text-xs text-white/60 mt-1">Active Patients</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{patients.length}</div>
          <div className="text-xs text-white/60 mt-1">Total Patients</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{totalCases}</div>
          <div className="text-xs text-white/60 mt-1">Total Cases</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{totalActiveCases}</div>
          <div className="text-xs text-white/60 mt-1">Active Cases</div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Cases
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <FiUser className="w-12 h-12 text-white/20 mx-auto mb-3" />
                    <p className="text-white/60">
                      {patients.length === 0
                        ? 'No patients yet. Patients appear when cases are assigned to you.'
                        : 'No patients match your search criteria'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr
                    key={patient.user_hash}
                    className="hover:bg-white/5 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
                          <span className="text-[#FFCA40] font-semibold">
                            {patient.user_email
                              ? patient.user_email.charAt(0).toUpperCase()
                              : patient.user_hash.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {patient.user_email || 'Anonymous User'}
                          </div>
                          <div className="text-xs text-white/50 font-mono truncate max-w-[180px]">
                            {patient.user_hash}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[patient.status]}`}
                      >
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex flex-col items-center gap-0.5">
                        <div className="flex items-center gap-1">
                          <FiCalendar className="w-3 h-3 text-[#FFCA40]" />
                          <span className="text-sm text-white/80">{patient.total_cases}</span>
                        </div>
                        {patient.active_cases > 0 && (
                          <span className="text-[10px] text-orange-300">
                            {patient.active_cases} active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${severityColors[patient.highest_severity] || 'bg-gray-500/20 text-gray-300'}`}
                      >
                        {patient.highest_severity}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-2">
                        {patient.user_email && (
                          <a
                            href={`mailto:${patient.user_email}`}
                            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                            title={patient.user_email}
                          >
                            <FiMail className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {patient.user_phone && (
                          <a
                            href={`tel:${patient.user_phone}`}
                            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                            title={patient.user_phone}
                          >
                            <FiPhone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {patient.telegram_username && (
                          <a
                            href={`https://t.me/${patient.telegram_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:bg-white/10 rounded text-white/50 hover:text-white transition-colors"
                            title={`@${patient.telegram_username}`}
                          >
                            <FiSend className="w-3.5 h-3.5" />
                          </a>
                        )}
                        {!patient.user_email && !patient.user_phone && !patient.telegram_username && (
                          <span className="text-xs text-white/30">N/A</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <FiClock className="w-3 h-3" />
                        {formatDate(patient.last_case_date)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            router.push(`/counselor/cases?search=${encodeURIComponent(patient.user_hash)}`)
                          }
                          className="px-3 py-1 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded text-xs font-medium text-[#FFCA40] transition-all"
                        >
                          View Cases
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
