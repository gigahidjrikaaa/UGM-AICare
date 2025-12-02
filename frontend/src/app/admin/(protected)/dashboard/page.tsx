'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ExclamationTriangleIcon,
  HeartIcon,
  CalendarIcon,
  FolderOpenIcon,
  CheckCircleIcon,
  ClockIcon,
  BellAlertIcon,
  MegaphoneIcon,
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
import { getDashboardOverview, getDashboardTrends, generateInsightsReport } from '@/services/adminDashboardApi';
import type { DashboardOverview, TrendsResponse, TimeRange } from '@/types/admin/dashboard';
import { useAdminSSE, useSSEEventHandler } from '@/contexts/AdminSSEContext';
import type { AlertData, IAReportGeneratedData } from '@/types/sse';

export default function AdminDashboardPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>(7);
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [trends, setTrends] = useState<TrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTrends, setShowTrends] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showInsightsCampaignModal, setShowInsightsCampaignModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [overviewData, trendsData] = await Promise.all([
        getDashboardOverview(timeRange),
        getDashboardTrends(timeRange),
      ]);
      setOverview(overviewData);
      setTrends(trendsData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Get SSE connection status from centralized context
  const { isConnected, error: sseError, reconnect } = useAdminSSE();

  // Handle alert_created events
  useSSEEventHandler('alert_created', useCallback((data: AlertData) => {
    // Show toast notification for critical/high severity alerts
    if (data.severity === 'critical' || data.severity === 'high') {
      setToast({
        message: `🚨 ${data.title}: ${data.message}`,
        type: data.severity === 'critical' ? 'error' : 'info',
      });
    }
    // Reload dashboard to update KPIs
    loadDashboard();
  }, []));

  // Handle case_updated events
  useSSEEventHandler('case_updated', useCallback(() => {
    // Reload dashboard to update case statistics
    loadDashboard();
  }, []));

  // Handle SLA breach events
  useSSEEventHandler('sla_breach', useCallback((data: AlertData) => {
    setToast({
      message: `⚠️ SLA BREACH: ${data.message}`,
      type: 'error',
    });
    loadDashboard();
  }, []));

  // Handle IA report generated events
  useSSEEventHandler('ia_report_generated', useCallback((data: IAReportGeneratedData) => {
    setToast({
      message: `📊 New IA Report: ${data.message}`,
      type: 'success',
    });
    // Reload to show new insights
    loadDashboard();
  }, []));

  const handleGenerateReport = async (params: GenerateReportParams) => {
    try {
      // Call the backend to generate report
      await generateInsightsReport(params);
      
      // Show success toast
      setToast({
        message: '✅ IA Report generated successfully! Dashboard will refresh in a moment.',
        type: 'success',
      });
      
      // Reload dashboard to show new report after a brief delay
      setTimeout(() => {
        loadDashboard();
      }, 1500);
    } catch (err) {
      setToast({
        message: '❌ Failed to generate report. Please try again.',
        type: 'error',
      });
      throw err; // Re-throw so modal can handle it
    }
  };

  const handleGenerateCampaign = () => {
    setShowInsightsCampaignModal(true);
  };

  const handleCampaignSuccess = () => {
    setToast({
      message: '✅ Campaign created successfully from insights!',
      type: 'success',
    });
    loadDashboard();
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

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
            onClick={loadDashboard}
            className="px-6 py-3 bg-[#FFCA40] hover:bg-[#FFCA40]/90 text-[#00153a] font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-[#FFCA40]/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!overview || !trends) {
    return <div className="p-6 text-white/70">No data available</div>;
  }

  const { kpis, insights, alerts } = overview;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a] p-6 space-y-6">
      {/* Header with Time Range Selector */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Mental Health Command Center</h1>
            <p className="text-white/60 text-sm">Real-time student well-being monitoring and insights</p>
          </div>
          <ConnectionStatus
            isConnected={isConnected}
            error={sseError}
            onReconnect={reconnect}
            className="hidden sm:flex"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile connection status */}
          <ConnectionStatus
            isConnected={isConnected}
            error={sseError}
            onReconnect={reconnect}
            className="flex sm:hidden"
          />
          
          {/* Time range selector */}
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

      {/* Critical KPIs Row - Most Important Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Critical Cases"
          value={kpis.active_critical_cases}
          subtitle="Requiring immediate attention"
          icon={<ExclamationTriangleIcon className="w-6 h-6 text-red-400" />}
          severity={kpis.active_critical_cases > 0 ? 'critical' : 'success'}
        />
        
        <KPICard
          title="Overall Sentiment"
          value={kpis.overall_sentiment !== null && kpis.overall_sentiment !== undefined ? `${kpis.overall_sentiment.toFixed(1)}%` : '—'}
          trend={kpis.sentiment_delta !== null && kpis.sentiment_delta !== undefined ? {
            direction: kpis.sentiment_delta >= 0 ? 'up' : 'down',
            value: Math.abs(kpis.sentiment_delta),
          } : undefined}
          icon={<HeartIcon className="w-6 h-6 text-blue-400" />}
          severity="info"
        />
        
        <KPICard
          title="SLA Breaches"
          value={kpis.sla_breach_count}
          subtitle="Cases past response time"
          icon={<BellAlertIcon className="w-6 h-6 text-yellow-400" />}
          severity={kpis.sla_breach_count > 0 ? 'warning' : 'success'}
        />
        
        <KPICard
          title="Appointments This Week"
          value={kpis.appointments_this_week}
          subtitle="Scheduled sessions"
          icon={<CalendarIcon className="w-6 h-6 text-green-400" />}
          severity="success"
        />
      </div>

      {/* Secondary KPIs Row - Supporting Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Cases Opened"
          value={kpis.cases_opened_this_week}
          subtitle="This week"
          icon={<FolderOpenIcon className="w-6 h-6 text-purple-400" />}
          severity="info"
        />
        
        <KPICard
          title="Cases Closed"
          value={kpis.cases_closed_this_week}
          subtitle="This week"
          icon={<CheckCircleIcon className="w-6 h-6 text-green-400" />}
          severity="success"
        />
        
        <KPICard
          title="Avg Resolution Time"
          value={kpis.avg_case_resolution_time !== null && kpis.avg_case_resolution_time !== undefined
            ? `${kpis.avg_case_resolution_time.toFixed(1)}h` 
            : '—'
          }
          subtitle="Time to resolve cases"
          icon={<ClockIcon className="w-6 h-6 text-blue-400" />}
          severity="info"
        />
        
        <KPICard
          title="Active Campaigns"
          value={kpis.active_campaigns_count}
          subtitle="Proactive outreach"
          icon={<MegaphoneIcon className="w-6 h-6 text-orange-400" />}
          severity="info"
        />
      </div>

      {/* LangGraph Health Status Widget */}
      <div className="w-full">
        <LangGraphHealthWidget />
      </div>

      {/* Toggle for Trends Section */}
      <div className="flex justify-center">
        <button
          onClick={() => setShowTrends(!showTrends)}
          className="group px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium text-white/80 transition-all duration-200 shadow-lg shadow-[#00153a]/20 backdrop-blur flex items-center gap-2"
        >
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${showTrends ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          {showTrends ? 'Hide Historical Trends' : 'Show Historical Trends'}
        </button>
      </div>

      {/* Historical Trends Section (Collapsible) */}
      {showTrends && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="space-y-5"
        >
          {/* Section Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Historical Trends</h2>
                <p className="text-xs text-white/50">Last {timeRange} days performance metrics</p>
              </div>
            </div>
          </div>
          
          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <TrendChart
              title="Sentiment Trend"
              data={trends.sentiment_trend}
              color="blue"
              suffix="%"
              height={200}
              showGrid
            />
            
            <TrendChart
              title="Cases Opened"
              data={trends.cases_opened_trend}
              color="purple"
              height={200}
              showGrid
            />
            
            <TrendChart
              title="Cases Closed"
              data={trends.cases_closed_trend}
              color="green"
              height={200}
              showGrid
            />
            
            {/* Show first topic trend if available */}
            {Object.keys(trends.topic_trends).length > 0 && (
              <TrendChart
                title={`Topic: ${Object.keys(trends.topic_trends)[0]}`}
                data={trends.topic_trends[Object.keys(trends.topic_trends)[0]]}
                color="orange"
                height={200}
                showGrid
              />
            )}
          </div>
        </motion.div>
      )}

      {/* Insights and Alerts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InsightsPanelCard 
          insights={insights} 
          onGenerateReport={() => setShowGenerateModal(true)}
          onGenerateCampaign={handleGenerateCampaign}
        />
        <AlertsFeed alerts={alerts} maxItems={5} />
      </div>

      {/* Generate Report Modal */}
      <GenerateReportModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerateReport}
      />

      {/* Insights Campaign Modal */}
      <InsightsCampaignModal
        isOpen={showInsightsCampaignModal}
        onClose={() => setShowInsightsCampaignModal(false)}
        onSuccess={handleCampaignSuccess}
        insightsSummary={insights.ia_summary || ''}
        trendingTopics={insights.trending_topics || []}
      />

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          isVisible={!!toast}
          onClose={() => setToast(null)}
        />
      )}

      {/* Footer Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-xs text-white/40 pt-4"
      >
        Last updated: {new Date().toLocaleString()} • Time range: Last {timeRange} days
      </motion.div>
    </div>
  );
}
