'use client';

import { useState, useEffect } from 'react';
import {
  FiAlertTriangle,
  FiClock,
  FiUser,
  FiCheckCircle,
  FiArrowRight,
  FiRefreshCw,
  FiBell,
} from 'react-icons/fi';

interface Escalation {
  escalation_id: string;
  user_id_hash: string;
  severity: 'low' | 'moderate' | 'high' | 'critical';
  trigger_type: 'crisis_keywords' | 'high_distress_score' | 'repeated_negative_thoughts' | 'manual_escalation';
  agent_type: 'STA' | 'SCA' | 'SDA' | 'IA';
  agent_notes: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'reassigned' | 'resolved';
  message_excerpt?: string;
}

const severityConfig = {
  critical: {
    color: 'bg-red-500/20 text-red-300 border-red-500/30',
    icon: 'bg-red-500',
    label: 'Critical',
  },
  high: {
    color: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    icon: 'bg-orange-500',
    label: 'High',
  },
  moderate: {
    color: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    icon: 'bg-yellow-500',
    label: 'Moderate',
  },
  low: {
    color: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    icon: 'bg-blue-500',
    label: 'Low',
  },
};

const agentColors = {
  STA: 'bg-purple-500/20 text-purple-300',
  TCA: 'bg-blue-500/20 text-blue-300',
  CMA: 'bg-green-500/20 text-green-300',
  IA: 'bg-pink-500/20 text-pink-300',
};

export default function CounselorEscalationsPage() {
  const [escalations, setEscalations] = useState<Escalation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'accepted'>('pending');

  useEffect(() => {
    loadEscalations();
  }, []);

  const loadEscalations = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API endpoint
      // const data = await apiCall<Escalation[]>('/api/counselor/escalations');
      
      // Mock data
      const mockEscalations: Escalation[] = [
        {
          escalation_id: 'ESC-001',
          user_id_hash: 'user_abc123',
          severity: 'critical',
          trigger_type: 'crisis_keywords',
          agent_type: 'STA',
          agent_notes: 'User mentioned self-harm thoughts. Immediate intervention recommended.',
          created_at: new Date().toISOString(),
          status: 'pending',
          message_excerpt: 'I feel like there is no way out...',
        },
        {
          escalation_id: 'ESC-002',
          user_id_hash: 'user_def456',
          severity: 'high',
          trigger_type: 'high_distress_score',
          agent_type: 'SCA',
          agent_notes: 'Distress score: 8.5/10. Multiple negative thought patterns detected.',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          status: 'pending',
        },
      ];
      
      setEscalations(mockEscalations);
      setError(null);
    } catch (err) {
      console.error('Failed to load escalations:', err);
      setError('Failed to load escalations');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (escalationId: string) => {
    // TODO: Implement accept logic
    console.log('Accept escalation:', escalationId);
  };

  const handleReassign = async (escalationId: string) => {
    // TODO: Implement reassign logic
    console.log('Reassign escalation:', escalationId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const filteredEscalations = escalations.filter((e) => {
    if (filter === 'all') return true;
    return e.status === filter;
  });

  const pendingCount = escalations.filter(e => e.status === 'pending').length;
  const criticalCount = escalations.filter(e => e.severity === 'critical' && e.status === 'pending').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40] mb-4"></div>
          <p className="text-white/70">Loading escalations...</p>
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
          <p className="text-red-300 font-semibold mb-2">Failed to load escalations</p>
          <p className="text-red-300/70 text-sm mb-4">{error}</p>
          <button
            onClick={loadEscalations}
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
            <FiBell className="w-8 h-8 text-[#FFCA40]" />
            Escalations
          </h1>
          <p className="text-white/60">Priority queue of AI-escalated cases requiring attention</p>
        </div>
        <button
          onClick={loadEscalations}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-sm text-white transition-all flex items-center gap-2"
        >
          <FiRefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Alert Banner for Critical Cases */}
      {criticalCount > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <FiAlertTriangle className="w-6 h-6 text-red-400" />
            <div>
              <p className="text-red-300 font-semibold">
                {criticalCount} critical {criticalCount === 1 ? 'case' : 'cases'} requiring immediate attention
              </p>
              <p className="text-red-300/70 text-sm">Please review and take action as soon as possible</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{pendingCount}</div>
          <div className="text-xs text-white/60 mt-1">Pending Review</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{criticalCount}</div>
          <div className="text-xs text-white/60 mt-1">Critical Priority</div>
        </div>
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-xl p-4">
          <div className="text-2xl font-bold text-white">{escalations.filter(e => e.status === 'accepted').length}</div>
          <div className="text-xs text-white/60 mt-1">Accepted Today</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setFilter('pending')}
          className={`px-4 py-2 font-medium text-sm transition-all ${
            filter === 'pending'
              ? 'text-[#FFCA40] border-b-2 border-[#FFCA40]'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Pending ({pendingCount})
        </button>
        <button
          onClick={() => setFilter('accepted')}
          className={`px-4 py-2 font-medium text-sm transition-all ${
            filter === 'accepted'
              ? 'text-[#FFCA40] border-b-2 border-[#FFCA40]'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          Accepted ({escalations.filter(e => e.status === 'accepted').length})
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 font-medium text-sm transition-all ${
            filter === 'all'
              ? 'text-[#FFCA40] border-b-2 border-[#FFCA40]'
              : 'text-white/60 hover:text-white/80'
          }`}
        >
          All
        </button>
      </div>

      {/* Escalations List */}
      <div className="space-y-4">
        {filteredEscalations.length === 0 ? (
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-12 text-center">
            <FiCheckCircle className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60">No escalations found</p>
          </div>
        ) : (
          filteredEscalations.map((escalation) => (
            <div
              key={escalation.escalation_id}
              className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Severity Indicator */}
                <div className="flex-shrink-0">
                  <div className={`w-3 h-3 rounded-full ${severityConfig[escalation.severity].icon} animate-pulse`}></div>
                </div>

                {/* Middle: Content */}
                <div className="flex-1 space-y-3">
                  {/* Header Row */}
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-mono text-white/90">{escalation.escalation_id}</span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${severityConfig[escalation.severity].color}`}>
                      {severityConfig[escalation.severity].label}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${agentColors[escalation.agent_type]}`}>
                      {escalation.agent_type}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-white/50">
                      <FiClock className="w-3 h-3" />
                      {formatDate(escalation.created_at)}
                    </div>
                  </div>

                  {/* Patient ID */}
                  <div className="flex items-center gap-2">
                    <FiUser className="w-4 h-4 text-white/40" />
                    <span className="text-sm font-mono text-white/70">{escalation.user_id_hash}</span>
                  </div>

                  {/* Agent Notes */}
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm font-medium text-white/90 mb-1">Agent Notes:</p>
                    <p className="text-sm text-white/70">{escalation.agent_notes}</p>
                  </div>

                  {/* Message Excerpt if available */}
                  {escalation.message_excerpt && (
                    <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-orange-300 mb-1">Recent Message:</p>
                      <p className="text-sm italic text-orange-200/80">&quot;{escalation.message_excerpt}&quot;</p>
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                {escalation.status === 'pending' && (
                  <div className="flex-shrink-0 flex flex-col gap-2">
                    <button
                      onClick={() => handleAccept(escalation.escalation_id)}
                      className="px-4 py-2 bg-[#FFCA40]/20 hover:bg-[#FFCA40]/30 border border-[#FFCA40]/30 rounded-lg text-sm font-medium text-[#FFCA40] transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      <FiCheckCircle className="w-4 h-4" />
                      Accept Case
                    </button>
                    <button
                      onClick={() => handleReassign(escalation.escalation_id)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/20 rounded-lg text-sm text-white/70 hover:text-white transition-all flex items-center gap-2 whitespace-nowrap"
                    >
                      <FiArrowRight className="w-4 h-4" />
                      Reassign
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}