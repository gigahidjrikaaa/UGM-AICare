'use client';

import { useState, useEffect, Fragment } from 'react';
import {
  FiClock,
  FiUser,
  FiMessageSquare,
  FiCheckCircle,
  FiEye,
  FiEdit,
  FiRefreshCw,
  FiAlertTriangle,
  FiMail,
  FiPhone,
  FiSend,
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
  user_email?: string;
  user_phone?: string;
  telegram_username?: string;
}

interface CaseStats {
  total_cases: number;
  open_cases: number;
  in_progress_cases: number;
  closed_cases: number;
  critical_cases: number;
  high_priority_cases: number;
}

interface CaseAssessmentsResponse {
  case_id: string;
  session_id: string | null;
  user_hash: string;
  screening_profile: {
    overall_risk: string;
    requires_attention: boolean;
    primary_concerns: string[];
    protective_factors: string[];
    updated_at: string | null;
  } | null;
  triage_assessments: Array<{
    id: number;
    risk_score: number;
    confidence_score: number;
    severity_level: string;
    recommended_action: string | null;
    intent: string | null;
    next_step: string | null;
    risk_factors: string[] | null;
    diagnostic_notes_redacted: string | null;
    created_at: string | null;
  }>;
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
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null);
  const [assessmentsByCaseId, setAssessmentsByCaseId] = useState<Record<string, CaseAssessmentsResponse | null>>({});
  const [loadingAssessments, setLoadingAssessments] = useState<string | null>(null);

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

  const toggleCaseDetails = async (caseId: string) => {
    if (expandedCaseId === caseId) {
      setExpandedCaseId(null);
      return;
    }

    setExpandedCaseId(caseId);
    if (assessmentsByCaseId[caseId] !== undefined) return;

    setLoadingAssessments(caseId);
    try {
      const response = await apiClient.get<CaseAssessmentsResponse>(`/counselor/cases/${caseId}/assessments`);
      setAssessmentsByCaseId((prev) => ({ ...prev, [caseId]: response.data }));
    } catch (err) {
      console.error('Failed to load case assessments:', err);
      setAssessmentsByCaseId((prev) => ({ ...prev, [caseId]: null }));
    } finally {
      setLoadingAssessments(null);
    }
  };

  const normalizePhoneForWhatsApp = (phoneRaw: string) => {
    // wa.me expects digits only, ideally E.164 without plus.
    const digits = phoneRaw.replace(/\D/g, '');
    return digits;
  };

  const normalizeTelegramUsername = (usernameRaw: string) => {
    const trimmed = usernameRaw.trim();
    if (!trimmed) return '';
    return trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  };

  const openWhatsApp = (caseItem: Case) => {
    const phone = caseItem.user_phone;
    if (!phone) return;
    const waPhone = normalizePhoneForWhatsApp(phone);
    if (!waPhone) return;
    window.open(`https://wa.me/${encodeURIComponent(waPhone)}`, '_blank', 'noopener,noreferrer');
  };

  const openEmail = (caseItem: Case) => {
    const email = caseItem.user_email;
    if (!email) return;
    window.location.href = `mailto:${encodeURIComponent(email)}`;
  };

  const openTelegram = (caseItem: Case) => {
    const username = caseItem.telegram_username;
    if (!username) return;
    const normalized = normalizeTelegramUsername(username);
    if (!normalized) return;
    window.open(`https://t.me/${encodeURIComponent(normalized)}`, '_blank', 'noopener,noreferrer');
  };

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
                  <Fragment key={caseItem.id}>
                  <tr 
                    className="hover:bg-white/5 transition-colors"
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
                          onClick={() => openWhatsApp(caseItem)}
                          disabled={!caseItem.user_phone}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/70 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          title={caseItem.user_phone ? 'Contact via WhatsApp' : 'No phone number on file'}
                        >
                          <FiPhone className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openEmail(caseItem)}
                          disabled={!caseItem.user_email}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/70 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          title={caseItem.user_email ? 'Contact via Email' : 'No email on file'}
                        >
                          <FiMail className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => openTelegram(caseItem)}
                          disabled={!caseItem.telegram_username}
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/70 hover:text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          title={caseItem.telegram_username ? 'Contact via Telegram' : 'No Telegram username on file'}
                        >
                          <FiSend className="w-3 h-3" />
                        </button>
                        <button 
                          className="px-2 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded text-xs text-white/70 hover:text-white transition-all"
                          title="Edit case"
                        >
                          <FiEdit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => toggleCaseDetails(caseItem.id)}
                          className="px-3 py-1 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded text-xs font-medium text-[#FFCA40] transition-all flex items-center gap-1"
                          title="View risk assessment transparency"
                        >
                          <FiEye className="w-3 h-3" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedCaseId === caseItem.id && (
                    <tr key={`${caseItem.id}-details`} className="bg-black/20">
                      <td colSpan={8} className="px-4 py-4">
                        {loadingAssessments === caseItem.id ? (
                          <div className="text-sm text-white/60 flex items-center gap-2">
                            <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-[#FFCA40]"></div>
                            Loading risk assessment…
                          </div>
                        ) : assessmentsByCaseId[caseItem.id] ? (
                          <div className="space-y-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                              <div className="text-xs text-white/60 mb-2">Case summary (redacted)</div>
                              <div className="text-sm text-white/80 whitespace-pre-wrap">
                                {caseItem.summary_redacted || 'No summary available.'}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                              <div className="text-xs text-white/60 mb-2">Screening profile (aggregated)</div>
                              {assessmentsByCaseId[caseItem.id]?.screening_profile ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/70">Overall risk</span>
                                    <span className="text-sm font-semibold text-white">
                                      {assessmentsByCaseId[caseItem.id]?.screening_profile?.overall_risk}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-sm text-white/70">Requires attention</span>
                                    <span className="text-sm text-white">
                                      {assessmentsByCaseId[caseItem.id]?.screening_profile?.requires_attention ? 'Yes' : 'No'}
                                    </span>
                                  </div>
                                  <div className="text-sm text-white/70">
                                    <div className="text-xs text-white/50">Primary concerns</div>
                                    <div className="text-white/80">
                                      {(assessmentsByCaseId[caseItem.id]?.screening_profile?.primary_concerns || []).slice(0, 6).join(', ') || '—'}
                                    </div>
                                  </div>
                                  <div className="text-sm text-white/70">
                                    <div className="text-xs text-white/50">Protective factors</div>
                                    <div className="text-white/80">
                                      {(assessmentsByCaseId[caseItem.id]?.screening_profile?.protective_factors || []).slice(0, 6).join(', ') || '—'}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-white/60">No screening profile found.</div>
                              )}
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                              <div className="text-xs text-white/60 mb-2">Recent triage assessments (STA)</div>
                              {(assessmentsByCaseId[caseItem.id]?.triage_assessments || []).length === 0 ? (
                                <div className="text-sm text-white/60">No triage assessments available.</div>
                              ) : (
                                <div className="space-y-3">
                                  {assessmentsByCaseId[caseItem.id]?.triage_assessments.slice(0, 3).map((t) => (
                                    <div key={t.id} className="bg-black/20 border border-white/10 rounded-lg p-3">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="text-sm text-white font-semibold">
                                          {t.severity_level} (score {t.risk_score.toFixed(2)})
                                        </div>
                                        <div className="text-xs text-white/50">
                                          {t.created_at ? formatDate(t.created_at) : ''}
                                        </div>
                                      </div>
                                      <div className="text-xs text-white/60 mt-1">
                                        intent: {t.intent || '—'} | next: {t.next_step || '—'} | action: {t.recommended_action || '—'}
                                      </div>
                                      <div className="text-xs text-white/60 mt-2">
                                        factors: {(t.risk_factors || []).slice(0, 4).join(' | ') || '—'}
                                      </div>
                                      {t.diagnostic_notes_redacted && (
                                        <div className="text-xs text-white/60 mt-2">
                                          notes: <span className="text-white/80">{t.diagnostic_notes_redacted}</span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-red-300">Failed to load risk assessment details.</div>
                        )}
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
