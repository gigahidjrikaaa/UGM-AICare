'use client';

import { useState, useEffect } from 'react';
import {
  FiUser,
  FiCalendar,
  FiClock,
} from 'react-icons/fi';

interface Patient {
  patient_id: string;
  user_id_hash: string;
  name?: string;
  email?: string;
  phone?: string;
  first_session: string;
  last_session: string;
  total_sessions: number;
  active_cases: number;
  status: 'active' | 'inactive' | 'discharged';
  progress_score?: number;
}

const statusColors = {
  active: 'bg-green-500/20 text-green-300 border-green-500/30',
  inactive: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  discharged: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
};

export default function CounselorPatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    loadPatients();
  }, []);

  const loadPatients = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      // const data = await apiCall<Patient[]>('/api/counselor/patients');
      
      // Mock data
      const mockPatients: Patient[] = [
        {
          patient_id: 'PAT-001',
          user_id_hash: 'user_abc123',
          name: 'Patient A',
          email: 'patient.a@example.com',
          first_session: '2025-09-15',
          last_session: '2025-10-20',
          total_sessions: 8,
          active_cases: 1,
          status: 'active',
          progress_score: 75,
        },
        {
          patient_id: 'PAT-002',
          user_id_hash: 'user_def456',
          name: 'Patient B',
          first_session: '2025-08-10',
          last_session: '2025-10-18',
          total_sessions: 12,
          active_cases: 0,
          status: 'active',
          progress_score: 85,
        },
        {
          patient_id: 'PAT-003',
          user_id_hash: 'user_ghi789',
          first_session: '2025-07-05',
          last_session: '2025-09-30',
          total_sessions: 15,
          active_cases: 0,
          status: 'discharged',
          progress_score: 92,
        },
      ];
      
      setPatients(mockPatients);
      setError(null);
    } catch (err) {
      console.error('Failed to load patients:', err);
      setError('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

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
      patient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.user_id_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email?.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  const activeCount = patients.filter((p) => p.status === 'active').length;
  const totalSessions = patients.reduce((sum, p) => sum + p.total_sessions, 0);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <FiUser className="w-8 h-8 text-[#FFCA40]" />
            My Patients
          </h1>
          <p className="text-white/60">View and manage your patient caseload</p>
        </div>
        <div className="flex items-center gap-3">
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
          <div className="text-2xl font-bold text-white">{totalSessions}</div>
          <div className="text-xs text-white/60 mt-1">Total Sessions</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">
            {patients.filter((p) => p.active_cases > 0).length}
          </div>
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
                  Sessions
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Active Cases
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Last Session
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
                    <p className="text-white/60">No patients found</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr
                    key={patient.patient_id}
                    className="hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#FFCA40]/20 flex items-center justify-center">
                          <span className="text-[#FFCA40] font-semibold">
                            {patient.name ? patient.name.charAt(0).toUpperCase() : 'P'}
                          </span>
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {patient.name || patient.user_id_hash}
                          </div>
                          <div className="text-xs text-white/50 font-mono">{patient.patient_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${statusColors[patient.status]}`}>
                        {patient.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <FiCalendar className="w-3 h-3 text-[#FFCA40]" />
                        <span className="text-sm text-white/80">{patient.total_sessions}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          patient.active_cases > 0
                            ? 'bg-orange-500/20 text-orange-300'
                            : 'bg-green-500/20 text-green-300'
                        }`}
                      >
                        {patient.active_cases}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center whitespace-nowrap">
                      {patient.progress_score !== undefined ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#FFCA40] transition-all"
                              style={{ width: `${patient.progress_score}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-white/70">{patient.progress_score}%</span>
                        </div>
                      ) : (
                        <span className="text-xs text-white/40">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-xs text-white/60">
                        <FiClock className="w-3 h-3" />
                        {formatDate(patient.last_session)}
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="px-3 py-1 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded text-xs font-medium text-[#FFCA40] transition-all">
                          View Profile
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
