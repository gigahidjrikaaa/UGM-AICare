'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  HeartIcon,
  ClockIcon,
  BellAlertIcon,
  UsersIcon,
  ArrowPathIcon,
  FolderOpenIcon,
  CheckCircleIcon,
  CalendarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
} from '@heroicons/react/24/outline';
import { KPICard } from '@/components/admin/dashboard/KPICard';
import { InsightsPanelCard } from '@/components/admin/dashboard/InsightsPanelCard';
import { AlertsFeed } from '@/components/admin/dashboard/AlertsFeed';
import { TrendChart } from '@/components/admin/dashboard/TrendChart';
import { GenerateReportModal } from '@/components/admin/dashboard/GenerateReportModal';
import { Toast } from '@/components/admin/dashboard/Toast';
import { ConnectionStatus } from '@/components/admin/dashboard/ConnectionStatus';
import { InsightsCampaignModal } from '@/components/admin/campaigns';
import LangGraphHealthWidget from '@/components/admin/dashboard/LangGraphHealthWidget';
import type { GenerateReportParams } from '@/components/admin/dashboard/GenerateReportModal';
import { getDashboardOverview, getDashboardTrends, getActiveUsers, generateInsightsReport } from '@/services/adminDashboardApi';
import type { DashboardOverview, TrendsResponse, TimeRange, ActiveUsersSummary } from '@/types/admin/dashboard';
import { useAdminSSE, useSSEEventHandler } from '@/contexts/AdminSSEContext';
import type { AlertData, IAReportGeneratedData } from '@/types/sse';

/* ------------------------------------------------------------------ */
/*  Compact stat block for the "Period Activity" row                   */
/* ------------------------------------------------------------------ */
function CompactStat({
  label,
  value,
  icon,
  color = 'text-white/80',
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
      <div className="p-1.5 rounded-lg bg-white/5">{icon}</div>
      <div>
        <div className={`text-lg font-bold ${color}`}>{value}</div>
        <div className="text-[11px] text-white/50 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
}

/* ================================================================== */
/*  Main Page Component                                                */
/* ================================================================== */
export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUsersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showInsightsCampaignModal, setShowInsightsCampaignModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  /* ------ Data fetcher ------------------------------------------- */
  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      // Use Promise.allSettled so a failure in trends/activeUsers doesn't block the dashboard
      const [overviewRes, trendsRes, activeUsersRes] = await Promise.allSettled([
        getDashboardOverview(timeRange),
        getDashboardTrends(timeRange),
        getActiveUsers(),
      ]);

      if (overviewRes.status === 'fulfilled') {
        setOverview(overviewRes.value);
      } else {
        throw new Error(overviewRes.reason?.message || 'Failed to load dashboard overview');
      }

      if (trendsRes.status === 'fulfilled') {
        setTrends(trendsRes.value);
      }

      if (activeUsersRes.status === 'fulfilled') {
        setActiveUsers(activeUsersRes.value);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(errorMessage);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  /* ------ Stable ref so SSE callbacks always invoke latest loader -- */
  const loadRef = useRef<((silent?: boolean) => Promise<void>) | undefined>(undefined);
  loadRef.current = loadDashboard;

  /* ------ SSE handlers -------------------------------------------- */
  const { isConnected, error: sseError, reconnect } = useAdminSSE();

  useSSEEventHandler('alert_created', useCallback((data: AlertData) => {
    if (data.severity === 'critical' || data.severity === 'high') {
      setToast({
        message: `${data.title}: ${data.message}`,
        type: data.severity === 'critical' ? 'error' : 'info',
      });
    }
    loadRef.current?.(true);
  }, []));

  useSSEEventHandler('case_updated', useCallback(() => {
    loadRef.current?.(true);
  }, []));

  useSSEEventHandler('sla_breach', useCallback((data: AlertData) => {
    setToast({
      message: `SLA BREACH: ${data.message}`,
      type: 'error',
    });
    loadRef.current?.(true);
  }, []));

  useSSEEventHandler('ia_report_generated', useCallback((data: IAReportGeneratedData) => {
    setToast({
      message: `New IA Report: ${data.message}`,
      type: 'success',
    });
    loadRef.current?.(true);
  }, []));

  /* ------ Report generation --------------------------------------- */
  const handleGenerateReport = async (params: GenerateReportParams) => {
    try {
      await generateInsightsReport(params);
      setToast({
        message: 'IA Report generated successfully! Dashboard will refresh in a moment.',
        type: 'success',
      });
      setTimeout(() => {
        loadRef.current?.(true);
      }, 1500);
    } catch (err) {
      setToast({
        message: 'Failed to generate report. Please try again.',
        type: 'error',
      });
      throw err;
    }
  };

  const handleGenerateCampaign = () => setShowInsightsCampaignModal(true);

  const handleCampaignSuccess = () => {
    setToast({ message: 'Campaign created successfully from insights!', type: 'success' });
    loadRef.current?.(true);
  };

  /* ------ Initial load + time range change ------------------------ */
  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  /* ------ Derived metrics ----------------------------------------- */
  const kpis = overview?.kpis;
  const netCases = kpis
    ? kpis.cases_opened_this_week - kpis.cases_closed_this_week
    : 0;

  /* ================================================================ */
  /*  RENDER                                                           */
  /* ================================================================ */

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-white/20 border-t-[#FFCA40] rounded-full animate-spin mx-auto" />
          <p className="text-white/60">Loading dashboard...</p>
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
          <h3 className="text-xl font-semibold text-white">Error Loading Dashboard</h3>
          <p className="text-white/60">{error}</p>
          <button
            onClick={() => loadDashboard()}
            className="px-6 py-3 bg-[#FFCA40] hover:bg-[#FFCA40]/90 text-[#00153a] font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#FFCA40]/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!overview) {
    return <div className="p-6 text-white/70">No data available</div>;
  }

  const { insights, alerts } = overview;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a] p-6 space-y-6">
      {/* ============================================================ */}
      {/*  1. HEADER                                                    */}
      {/* ============================================================ */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Mental Health Command Center</h1>
            <div className="flex items-center gap-3 text-xs text-white/50">
              {lastRefreshed && (
                <span>
                  Last refreshed: {lastRefreshed.toLocaleTimeString()}
                </span>
              )}
              <ConnectionStatus
                isConnected={isConnected}
                error={sseError}
                onReconnect={reconnect}
                className="hidden sm:flex"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile connection status */}
          <ConnectionStatus
            isConnected={isConnected}
            error={sseError}
            onReconnect={reconnect}
            className="flex sm:hidden"
          />

          {/* Refresh button */}
          <button
            onClick={() => loadDashboard(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80 transition-all duration-200 disabled:opacity-50"
            title="Refresh dashboard"
          >
            <ArrowPathIcon className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          {/* Time range pills */}
          {([7, 30, 90] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`
                px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                ${timeRange === range
                  ? 'bg-[#FFCA40] text-[#00153a] shadow-lg shadow-[#FFCA40]/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white/80 border border-white/10'
                }
              `}
            >
              {range}d
            </button>
          ))}
        </div>
      </motion.div>

      {/* ============================================================ */}
      {/*  2. KEY METRICS — 5 hero KPI cards                            */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <KPICard
          title="Critical Cases"
          value={kpis!.active_critical_cases}
          subtitle="Requiring immediate attention"
          icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-400" />}
          severity={kpis!.active_critical_cases > 0 ? 'critical' : 'success'}
        />

        <KPICard
          title="Well-being Index"
          value={kpis!.overall_sentiment != null ? `${kpis!.overall_sentiment.toFixed(1)}%` : '\u2014'}
          trend={kpis!.sentiment_delta != null ? {
            direction: kpis!.sentiment_delta >= 0 ? 'up' : 'down',
            value: Math.abs(kpis!.sentiment_delta),
          } : undefined}
          icon={<HeartIcon className="w-6 h-6 text-blue-400" />}
          severity="info"
        />

        <KPICard
          title="Active Users (DAU)"
          value={activeUsers?.dau ?? '\u2014'}
          subtitle={activeUsers ? `WAU ${activeUsers.wau} / MAU ${activeUsers.mau}` : 'Unavailable'}
          icon={<UsersIcon className="w-6 h-6 text-cyan-400" />}
          severity="info"
        />

        <KPICard
          title="SLA Breaches"
          value={kpis!.sla_breach_count}
          subtitle="Cases past response time"
          icon={<BellAlertIcon className="w-6 h-6 text-yellow-400" />}
          severity={kpis!.sla_breach_count > 0 ? 'warning' : 'success'}
        />

        <KPICard
          title="Avg Resolution"
          value={kpis!.avg_case_resolution_time != null ? `${kpis!.avg_case_resolution_time.toFixed(1)}h` : '\u2014'}
          subtitle="Time to resolve cases"
          icon={<ClockIcon className="w-6 h-6 text-blue-400" />}
          severity="info"
        />
      </div>

      {/* ============================================================ */}
      {/*  3. TREND CHARTS — always visible, side by side              */}
      {/* ============================================================ */}
      {trends && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <TrendChart
            title="Well-being Trend"
            data={trends.sentiment_trend}
            color="blue"
            suffix="%"
            height={200}
            showGrid
          />
          <TrendChart
            title="New Cases"
            data={trends.cases_opened_trend}
            color="purple"
            height={200}
            showGrid
          />
        </div>
      )}

      {/* ============================================================ */}
      {/*  4. PERIOD ACTIVITY — compact stat blocks                    */}
      {/* ============================================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <CompactStat
          label="Cases Opened"
          value={kpis!.cases_opened_this_week}
          icon={<FolderOpenIcon className="w-5 h-5 text-purple-400" />}
        />
        <CompactStat
          label="Cases Resolved"
          value={kpis!.cases_closed_this_week}
          icon={<CheckCircleIcon className="w-5 h-5 text-green-400" />}
        />
        <CompactStat
          label="Appointments"
          value={kpis!.appointments_this_week}
          icon={<CalendarIcon className="w-5 h-5 text-blue-400" />}
        />
        <CompactStat
          label="Case Flow"
          value={`${netCases >= 0 ? '+' : ''}${netCases}`}
          icon={
            netCases > 0
              ? <ArrowTrendingUpIcon className="w-5 h-5 text-orange-400" />
              : <ArrowTrendingDownIcon className="w-5 h-5 text-green-400" />
          }
          color={netCases > 0 ? 'text-orange-400' : netCases < 0 ? 'text-green-400' : 'text-white/80'}
        />
      </div>

      {/* ============================================================ */}
      {/*  5. AI INSIGHTS + ALERTS                                     */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InsightsPanelCard
          insights={insights}
          onGenerateReport={() => setShowGenerateModal(true)}
          onGenerateCampaign={handleGenerateCampaign}
        />
        <AlertsFeed alerts={alerts} maxItems={5} />
      </div>

      {/* ============================================================ */}
      {/*  6. SYSTEM HEALTH — LangGraph at the bottom                  */}
      {/* ============================================================ */}
      <div className="w-full">
        <LangGraphHealthWidget />
      </div>

      {/* ============================================================ */}
      {/*  MODALS & TOAST                                              */}
      {/* ============================================================ */}
      <GenerateReportModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerateReport}
      />

      <InsightsCampaignModal
        isOpen={showInsightsCampaignModal}
        onClose={() => setShowInsightsCampaignModal(false)}
        onSuccess={handleCampaignSuccess}
        insightsSummary={insights.ia_summary || ''}
        trendingTopics={insights.trending_topics || []}
      />

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
        className="text-center text-xs text-white/40 pt-4"
      >
        {lastRefreshed
          ? `Data as of ${lastRefreshed.toLocaleString()}`
          : 'Loading...'
        }
        {' '}&bull; Time range: Last {timeRange} days
      </motion.div>
    </div>
  );
}
