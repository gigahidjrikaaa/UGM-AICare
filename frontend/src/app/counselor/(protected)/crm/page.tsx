'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  FiUser,
  FiCalendar,
  FiClock,
  FiAlertTriangle,
  FiRefreshCw,
  FiMail,
  FiPhone,
  FiSend,
  FiMessageSquare,
  FiSearch,
  FiExternalLink
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
  user_email?: string;
  user_phone?: string;
  telegram_username?: string;
  summary_redacted?: string;
}

interface ContactRecord {
  user_hash: string;
  user_email?: string;
  user_phone?: string;
  telegram_username?: string;
  total_cases: number;
  active_cases: number;
  highest_severity: string;
  status: 'active' | 'inactive' | 'discharged';
  last_case_date: string;
}

const statusColors: Record<string, string> = {
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

function deriveContacts(cases: CaseItem[]): ContactRecord[] {
  const grouped = new Map<string, CaseItem[]>();
  for (const c of cases) {
    const key = c.user_hash;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(c);
  }

  const contacts: ContactRecord[] = [];
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
    let status: ContactRecord['status'] = 'active';
    if (activeCases.length === 0 && closedCases.length > 0) {
      status = 'discharged';
    } else if (activeCases.length === 0) {
      status = 'inactive';
    }

    contacts.push({
      user_hash: userHash,
      user_email: latestCase.user_email,
      user_phone: latestCase.user_phone,
      telegram_username: latestCase.telegram_username,
      last_case_date: latestCase.updated_at,
      total_cases: userCases.length,
      active_cases: activeCases.length,
      highest_severity: highestSeverity,
      status,
    });
  }

  // Sort: active first, then by last case date descending
  contacts.sort((a, b) => {
    const statusOrder = { active: 0, inactive: 1, discharged: 2 };
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(b.last_case_date).getTime() - new Date(a.last_case_date).getTime();
  });

  return contacts;
}

export default function CounselorCRMPage() {
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const loadContacts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await apiClient.get('/counselor/cases');
      const cases: CaseItem[] = response.data?.cases ?? response.data ?? [];

      const derived = deriveContacts(cases);
      setContacts(derived);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to load contacts';
      console.error('Failed to load contacts:', err);
      setError(message);
      toast.error('Failed to load CRM data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const filteredContacts = contacts.filter((contact) => {
    const statusMatch = filterStatus === 'all' || contact.status === filterStatus;
    const searchMatch =
      searchQuery === '' ||
      contact.user_hash.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contact.telegram_username?.toLowerCase().includes(searchQuery.toLowerCase());
    return statusMatch && searchMatch;
  });

  const activeCount = contacts.filter((c) => c.status === 'active').length;
  const withEmailCount = contacts.filter((c) => !!c.user_email).length;
  const withPhoneOrTelegramCount = contacts.filter(
    (c) => !!c.user_phone || !!c.telegram_username
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mb-4"></div>
          <p className="text-white/70">Loading CRM data...</p>
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
          <p className="text-red-300 font-semibold mb-2">Failed to load CRM</p>
          <p className="text-red-300/70 text-sm mb-4">{error}</p>
          <button
            onClick={loadContacts}
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
            Patient CRM
          </h1>
          <p className="text-white/60">
            Manage contacts and reach out to your assigned patients directly
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadContacts}
            className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/70 hover:text-white transition-all"
            title="Refresh"
          >
            <FiRefreshCw className="w-4 h-4" />
          </button>
          <div className="relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 w-4 h-4" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder-white/40 focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40] outline-none transition-all w-full md:w-64"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40] outline-none transition-all"
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
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 transition-all hover:bg-white/10">
          <div className="text-2xl font-bold text-white">{contacts.length}</div>
          <div className="text-xs text-white/60 mt-1 uppercase tracking-wide">Total Contacts</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 transition-all hover:bg-white/10">
          <div className="text-2xl font-bold text-[#FFCA40]">{activeCount}</div>
          <div className="text-xs text-white/60 mt-1 uppercase tracking-wide">Active Patients</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 transition-all hover:bg-white/10">
          <div className="text-2xl font-bold text-white">{withEmailCount}</div>
          <div className="text-xs text-white/60 mt-1 uppercase tracking-wide">With Email</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4 transition-all hover:bg-white/10">
          <div className="text-2xl font-bold text-white">{withPhoneOrTelegramCount}</div>
          <div className="text-xs text-white/60 mt-1 uppercase tracking-wide">With Phone/Telegram</div>
        </div>
      </div>

      {/* CRM Table */}
      <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Patient
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Contact Channels
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-white/70 uppercase tracking-wider">
                  Last Activity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <FiUser className="w-12 h-12 text-white/20 mx-auto mb-4" />
                    <p className="text-white/60 text-lg">
                      {contacts.length === 0
                        ? 'No contacts available yet.'
                        : 'No contacts match your search criteria.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredContacts.map((contact) => (
                  <tr
                    key={contact.user_hash}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-[#FFCA40]/20 flex items-center justify-center shrink-0 border border-[#FFCA40]/30 shadow-inner">
                          <span className="text-[#FFCA40] font-bold text-lg">
                            {contact.user_email
                              ? contact.user_email.charAt(0).toUpperCase()
                              : contact.user_hash.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-white truncate">
                            {contact.user_email || 'Anonymous User'}
                          </div>
                          <div className="text-xs text-white/50 font-mono mt-1 truncate max-w-[200px]" title={contact.user_hash}>
                            {contact.user_hash}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      <span
                        className={`px-3 py-1.5 rounded-md text-xs font-medium border ${statusColors[contact.status]}`}
                      >
                        {contact.status.charAt(0).toUpperCase() + contact.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center whitespace-nowrap">
                      <span
                        className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wide ${severityColors[contact.highest_severity] || 'bg-gray-500/20 text-gray-300'}`}
                      >
                        {contact.highest_severity}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-3">
                        {contact.user_phone ? (
                          <a
                            href={`https://wa.me/${contact.user_phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-green-500/10 hover:bg-green-500/20 border border-green-500/20 hover:border-green-500/40 rounded-lg text-green-400 transition-all shadow-sm group/btn"
                            title={`WhatsApp: ${contact.user_phone}`}
                          >
                            <FiMessageSquare className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          </a>
                        ) : (
                          <div className="p-2 bg-white/5 rounded-lg text-white/20 border border-transparent cursor-not-allowed">
                            <FiMessageSquare className="w-4 h-4" />
                          </div>
                        )}

                        {contact.telegram_username ? (
                          <a
                            href={`https://t.me/${contact.telegram_username.replace('@', '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 hover:border-blue-500/40 rounded-lg text-blue-400 transition-all shadow-sm group/btn"
                            title={`Telegram: @${contact.telegram_username}`}
                          >
                            <FiSend className="w-4 h-4 group-hover/btn:scale-110 transition-transform -ml-0.5" />
                          </a>
                        ) : (
                          <div className="p-2 bg-white/5 rounded-lg text-white/20 border border-transparent cursor-not-allowed">
                            <FiSend className="w-4 h-4 -ml-0.5" />
                          </div>
                        )}

                        {contact.user_email ? (
                          <a
                            href={`mailto:${contact.user_email}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-lg text-white/90 transition-all shadow-sm group/btn"
                            title={`Email: ${contact.user_email}`}
                          >
                            <FiMail className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          </a>
                        ) : (
                          <div className="p-2 bg-white/5 rounded-lg text-white/20 border border-transparent cursor-not-allowed">
                            <FiMail className="w-4 h-4" />
                          </div>
                        )}

                        {contact.user_phone ? (
                          <a
                            href={`tel:${contact.user_phone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/40 rounded-lg text-white/90 transition-all shadow-sm group/btn"
                            title={`Call: ${contact.user_phone}`}
                          >
                            <FiPhone className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                          </a>
                        ) : (
                          <div className="p-2 bg-white/5 rounded-lg text-white/20 border border-transparent cursor-not-allowed">
                            <FiPhone className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-white/70">
                        <div className="p-1.5 bg-white/5 rounded-md">
                          <FiClock className="w-3.5 h-3.5" />
                        </div>
                        {formatDate(contact.last_case_date)}
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