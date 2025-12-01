'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  EyeIcon,
  ShieldExclamationIcon,
  ChartBarIcon,
  UserGroupIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  BookOpenIcon,
} from '@heroicons/react/24/outline';
import { KPICard } from '@/components/admin/dashboard/KPICard';
import { Toast } from '@/components/admin/dashboard/Toast';
import {
  getScreeningDashboard,
  listScreeningProfiles,
  markProfileReviewed,
} from '@/services/adminScreeningApi';
import type {
  ScreeningDashboard,
  ScreeningProfile,
  ScreeningDimension,
  RiskLevel,
} from '@/types/admin/screening';
import {
  INSTRUMENT_CONFIG,
  DIMENSION_LABELS,
  RISK_CONFIG,
  getSeverityLabel,
} from '@/types/admin/screening';

export default function AdminScreeningPage() {
  const [dashboard, setDashboard] = useState<ScreeningDashboard | null>(null);
  const [profiles, setProfiles] = useState<ScreeningProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<ScreeningProfile | null>(null);
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'all'>('all');
  const [attentionFilter, setAttentionFilter] = useState<boolean | undefined>(undefined);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [markingReviewed, setMarkingReviewed] = useState<number | null>(null);
  const [showInstrumentInfo, setShowInstrumentInfo] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [dashboardData, profilesData] = await Promise.all([
        getScreeningDashboard(),
        listScreeningProfiles({
          risk_level: riskFilter !== 'all' ? riskFilter : undefined,
          requires_attention: attentionFilter,
          limit: 50,
        }),
      ]);

      setDashboard(dashboardData);
      setProfiles(profilesData.profiles);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load screening data';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [riskFilter, attentionFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkReviewed = async (userId: number) => {
    setMarkingReviewed(userId);
    try {
      await markProfileReviewed(userId);
      setToast({ message: 'Profile marked as reviewed', type: 'success' });
      loadData();
      if (selectedProfile?.user_id === userId) {
        setSelectedProfile(null);
      }
    } catch {
      setToast({ message: 'Failed to mark profile as reviewed', type: 'error' });
    } finally {
      setMarkingReviewed(null);
    }
  };

  /** Render risk level badge */
  const renderRiskBadge = (level: RiskLevel) => {
    const config = RISK_CONFIG[level];
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor} ${config.borderColor} border`}>
        {config.label}
      </span>
    );
  };

  /** Render dimension score with instrument info */
  const renderDimensionBar = (dimension: string, score: number, _confidence: number) => {
    const dim = dimension as ScreeningDimension;
    const instrument = INSTRUMENT_CONFIG[dim];
    const severity = getSeverityLabel(dim, score);
    const severityConfig = RISK_CONFIG[severity];
    const width = Math.min(score * 100, 100);
    
    return (
      <div key={dimension} className="space-y-2">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${instrument?.bgColor || 'bg-white/10'} ${instrument?.color || 'text-white/70'}`}>
              {instrument?.code || dim}
            </span>
            <span className="text-sm text-white/80">{DIMENSION_LABELS[dim] || dimension}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs ${severityConfig.color}`}>{severityConfig.label}</span>
            <span className="text-xs text-white/40">{(score * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div 
            className={`h-full ${severityConfig.bgColor.replace('/10', '/50')} transition-all duration-300`}
            style={{ width: `${width}%` }}
          />
        </div>
        {instrument && (
          <p className="text-[10px] text-white/40 italic">{instrument.description}</p>
        )}
      </div>
    );
  };

  /** Get trend from profile */
  const getTrendLabel = (trajectory: string) => {
    if (trajectory === 'improving') return { label: '↗ Improving', color: 'text-green-400' };
    if (trajectory === 'declining') return { label: '↘ Worsening', color: 'text-red-400' };
    return { label: '→ Stable', color: 'text-white/50' };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-white/20 border-t-[#FFCA40] rounded-full animate-spin mx-auto" />
          <p className="text-white/60">Loading screening intelligence...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a]">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white">Error Loading Screening Data</h3>
          <p className="text-white/60">{error}</p>
          <button
            onClick={loadData}
            className="px-6 py-3 bg-[#FFCA40] hover:bg-[#FFCA40]/90 text-[#00153a] font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#FFCA40]/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a] p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <ShieldExclamationIcon className="w-8 h-8 text-[#FFCA40]" />
            Screening Intelligence
          </h1>
          <p className="text-white/60 text-sm">
            Evidence-based mental health monitoring using validated instruments
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowInstrumentInfo(!showInstrumentInfo)}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white/80 transition-all duration-200"
          >
            <BookOpenIcon className="w-4 h-4" />
            Instruments
          </button>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white/80 transition-all duration-200"
          >
            <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </motion.div>

      {/* Instrument Info Panel */}
      {showInstrumentInfo && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
        >
          <div className="flex items-center gap-2 mb-4">
            <InformationCircleIcon className="w-5 h-5 text-[#FFCA40]" />
            <h2 className="text-lg font-semibold text-white">Validated Psychological Instruments</h2>
          </div>
          <p className="text-sm text-white/60 mb-4">
            Screening dimensions are based on internationally validated psychological screening instruments. 
            Each dimension maps to a specific instrument with established reliability and validity.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(INSTRUMENT_CONFIG).map(([dim, info]) => (
              <div key={dim} className={`p-4 rounded-xl border ${info.borderColor} ${info.bgColor}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${info.color}`}>
                    {info.code}
                  </span>
                </div>
                <h3 className="text-sm font-medium text-white mb-1">{info.name}</h3>
                <p className="text-xs text-white/50 mb-2">{info.description}</p>
                <p className="text-[10px] text-white/40 italic">Ref: {info.reference}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="Total Profiles"
            value={dashboard.total_profiles}
            subtitle="Students screened"
            icon={<UserGroupIcon className="w-6 h-6 text-blue-400" />}
            severity="info"
          />
          
          <KPICard
            title="At Risk"
            value={dashboard.risk_distribution.moderate + dashboard.risk_distribution.severe + dashboard.risk_distribution.critical}
            subtitle="Moderate+ (clinical threshold)"
            icon={<ExclamationTriangleIcon className="w-6 h-6 text-orange-400" />}
            severity={(dashboard.risk_distribution.moderate + dashboard.risk_distribution.severe + dashboard.risk_distribution.critical) > 0 ? 'warning' : 'success'}
          />
          
          <KPICard
            title="Critical Cases"
            value={dashboard.risk_distribution.critical}
            subtitle="C-SSRS positive indicators"
            icon={<ShieldExclamationIcon className="w-6 h-6 text-red-400" />}
            severity={dashboard.risk_distribution.critical > 0 ? 'critical' : 'success'}
          />
          
          <KPICard
            title="Pending Review"
            value={dashboard.profiles_requiring_attention}
            subtitle="Awaiting clinical review"
            icon={<ClockIcon className="w-6 h-6 text-yellow-400" />}
            severity={dashboard.profiles_requiring_attention > 5 ? 'warning' : 'info'}
          />
        </div>
      )}

      {/* Risk Distribution */}
      {dashboard && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur"
        >
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-5 h-5 text-[#FFCA40]" />
            Risk Distribution (Based on Instrument Thresholds)
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {Object.entries(dashboard.risk_distribution).map(([level, count]) => {
              const config = RISK_CONFIG[level as RiskLevel];
              const percentage = dashboard.total_profiles > 0 
                ? ((count / dashboard.total_profiles) * 100).toFixed(1)
                : '0';
              
              return (
                <div
                  key={level}
                  className={`p-4 rounded-xl border ${config.borderColor} ${config.bgColor} text-center`}
                >
                  <div className={`text-2xl font-bold ${config.color}`}>{count}</div>
                  <div className="text-xs text-white/60 mt-1">{config.label}</div>
                  <div className="text-xs text-white/40">{percentage}%</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Risk Level:</span>
          <div className="flex gap-1">
            <button
              onClick={() => setRiskFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                riskFilter === 'all'
                  ? 'bg-[#FFCA40] text-[#00153a]'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              All
            </button>
            {(['critical', 'severe', 'moderate', 'mild', 'none'] as RiskLevel[]).map((level) => (
              <button
                key={level}
                onClick={() => setRiskFilter(level)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  riskFilter === level
                    ? `${RISK_CONFIG[level].bgColor} ${RISK_CONFIG[level].color} border ${RISK_CONFIG[level].borderColor}`
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {RISK_CONFIG[level].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Attention:</span>
          <button
            onClick={() => setAttentionFilter(attentionFilter === true ? undefined : true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              attentionFilter === true
                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10'
            }`}
          >
            Requires Clinical Review
          </button>
        </div>
      </div>

      {/* Profiles Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur overflow-hidden"
      >
        <div className="p-4 border-b border-white/10">
          <h2 className="text-lg font-semibold text-white">
            Screening Profiles ({profiles.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Risk Level</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Sessions</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Trend</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Primary Concerns</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/60 uppercase">Last Updated</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-white/60 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/50">
                    No screening profiles found matching filters
                  </td>
                </tr>
              ) : (
                profiles.map((profile) => {
                  const trend = getTrendLabel(profile.risk_trajectory);
                  return (
                    <tr
                      key={profile.user_id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFCA40]/30 to-[#FFCA40]/10 flex items-center justify-center text-xs font-bold text-[#FFCA40]">
                            {profile.user_email?.charAt(0).toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{profile.user_name || 'Unknown'}</div>
                            <div className="text-xs text-white/50">{profile.user_email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{renderRiskBadge(profile.overall_risk)}</td>
                      <td className="px-4 py-3 text-sm text-white/70">{profile.total_sessions_analyzed}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${trend.color}`}>
                          {trend.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {profile.primary_concerns.slice(0, 3).map((concern, i) => {
                            const instrument = INSTRUMENT_CONFIG[concern as ScreeningDimension];
                            return (
                              <span
                                key={i}
                                className={`px-2 py-0.5 rounded text-xs ${instrument?.bgColor || 'bg-white/10'} ${instrument?.color || 'text-white/70'}`}
                              >
                                {instrument?.code || concern}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-white/50">
                        {new Date(profile.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedProfile(profile)}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <EyeIcon className="w-4 h-4 text-white/60" />
                          </button>
                          {profile.requires_attention && (
                            <button
                              onClick={() => handleMarkReviewed(profile.user_id)}
                              disabled={markingReviewed === profile.user_id}
                              className="p-2 hover:bg-green-500/20 rounded-lg transition-colors"
                              title="Mark as Reviewed"
                            >
                              <CheckCircleIcon className={`w-4 h-4 ${
                                markingReviewed === profile.user_id ? 'animate-pulse' : ''
                              } text-green-400`} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Profile Detail Modal */}
      {selectedProfile && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setSelectedProfile(null)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a] rounded-2xl border border-white/10 p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-white">{selectedProfile.user_name || 'Unknown User'}</h2>
                <p className="text-sm text-white/50">{selectedProfile.user_email}</p>
              </div>
              {renderRiskBadge(selectedProfile.overall_risk)}
            </div>

            {/* Instrument-Based Dimension Scores */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide flex items-center gap-2">
                <BookOpenIcon className="w-4 h-4" />
                Instrument-Based Analysis
              </h3>
              <div className="space-y-4">
                {selectedProfile.dimension_scores.map(d => 
                  renderDimensionBar(d.dimension, d.net_score, d.indicator_count > 0 ? 0.8 : 0.3)
                )}
              </div>
            </div>

            {/* Protective Factors */}
            {selectedProfile.protective_factors && selectedProfile.protective_factors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wide mb-2">Protective Factors</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.protective_factors.map((factor, i) => (
                    <span key={i} className="px-3 py-1 rounded-full text-xs bg-green-500/10 text-green-400 border border-green-500/30">
                      {DIMENSION_LABELS[factor as ScreeningDimension] || factor}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-white/5 text-center">
                <div className="text-2xl font-bold text-[#FFCA40]">{selectedProfile.total_sessions_analyzed}</div>
                <div className="text-xs text-white/60">Sessions</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 text-center">
                <div className={`text-2xl font-bold ${getTrendLabel(selectedProfile.risk_trajectory).color}`}>
                  {selectedProfile.risk_trajectory === 'improving' ? '↗' :
                   selectedProfile.risk_trajectory === 'declining' ? '↘' : '→'}
                </div>
                <div className="text-xs text-white/60">Trajectory</div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 text-center">
                <div className="text-lg font-bold text-white/70">
                  {new Date(selectedProfile.updated_at).toLocaleDateString()}
                </div>
                <div className="text-xs text-white/60">Last Updated</div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              {selectedProfile.requires_attention && (
                <button
                  onClick={() => handleMarkReviewed(selectedProfile.user_id)}
                  disabled={markingReviewed === selectedProfile.user_id}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition-colors"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Mark as Reviewed
                </button>
              )}
              <button
                onClick={() => setSelectedProfile(null)}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-white/40 pt-4 space-y-1"
      >
        <p>Screening based on validated instruments: PHQ-9, GAD-7, DASS-21, PSQI, UCLA-LS3, RSES, AUDIT, C-SSRS</p>
        <p>Profiles update after each conversation analysis.</p>
      </motion.div>
    </div>
  );
}
