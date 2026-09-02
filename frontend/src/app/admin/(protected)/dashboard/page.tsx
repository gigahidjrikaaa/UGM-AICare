'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowPathIcon,
  BellAlertIcon,
  ExclamationTriangleIcon,
  ArrowUpRightIcon,
} from '@heroicons/react/24/outline';
import { KPICard } from '@/components/admin/dashboard/KPICard';
import { InsightsPanelCard } from '@/components/admin/dashboard/InsightsPanelCard';
import { AlertsFeed } from '@/components/admin/dashboard/AlertsFeed';
import { GenerateReportModal } from '@/components/admin/dashboard/GenerateReportModal';
import { Toast } from '@/components/admin/dashboard/Toast';
import { InsightsCampaignModal } from '@/components/admin/campaigns';
import { QuickLinksPanel } from '@/components/admin/dashboard/QuickLinksPanel';
import { MicroTrendsGrid } from '@/components/admin/dashboard/MicroTrendsGrid';
import { InteractiveMetricsCharts } from '@/components/admin/dashboard/InteractiveMetricsCharts';
import { OnDutyCounselorsPanel } from '@/components/admin/dashboard/OnDutyCounselorsPanel';
import {
  AmbientLayer,
  Bezel,
  Eyebrow,
  EASE,
  Reveal,
  ZoneLabel,
} from '@/components/admin/dashboard/primitives';
import type { GenerateReportParams } from '@/components/admin/dashboard/GenerateReportModal';
import {
  generateInsightsReport,
  getActiveUsers,
  getDashboardOverview,
  getDashboardTrends,
} from '@/services/adminDashboardApi';
import type {
  ActiveUsersSummary,
  DashboardOverview,
  DashboardKPIs,
  TimeRange,
  TrendsResponse,
} from '@/types/admin/dashboard';
import { useSSEEventHandler } from '@/contexts/AdminSSEContext';
import type { AlertData, IAReportGeneratedData } from '@/types/sse';

const RANGE_OPTIONS: TimeRange[] = [7, 30, 90];

interface DashboardCardModel {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down';
    value: number;
  };
  icon: ReactNode;
  severity: 'critical' | 'warning' | 'success' | 'info';
}

/**
 * Only the two "requires immediate action" KPIs live here.
 * Well-being, Active Users, and Avg Resolution are surfaced in the
 * Platform Health zone via MicroTrendsGrid (value + sparkline, no duplication).
 */
function buildCriticalStatusCards(kpis: DashboardKPIs): DashboardCardModel[] {
  return [
    {
      title: 'Critical Cases',
      value: kpis.active_critical_cases,
      subtitle: 'Requiring immediate attention',
      icon: <ExclamationTriangleIcon className="h-5 w-5" />,
      severity: kpis.active_critical_cases > 0 ? 'critical' : 'success',
    },
    {
      title: 'SLA Breaches',
      value: kpis.sla_breach_count,
      subtitle: 'Cases past response deadline',
      icon: <BellAlertIcon className="h-5 w-5" />,
      severity: kpis.sla_breach_count > 0 ? 'warning' : 'success',
    },
  ];
}

/** Ghost pill link — hairline ring, fluid hover lift. */
function GhostPill({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-full px-4 py-2 text-sm font-medium text-white/65 ring-1 ring-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.06] hover:text-white active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

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

  const loadDashboard = useCallback(async (silent = false) => {
    if (!silent) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const [overviewRes, trendsRes, activeUsersRes] = await Promise.allSettled([
        getDashboardOverview(timeRange),
        getDashboardTrends(timeRange),
        getActiveUsers(),
      ]);

      if (overviewRes.status === 'fulfilled') {
        setOverview(overviewRes.value);
      } else {
        throw new Error(overviewRes.reason?.message ?? 'Failed to load dashboard overview');
      }

      if (trendsRes.status === 'fulfilled') {
        setTrends(trendsRes.value);
      }

      if (activeUsersRes.status === 'fulfilled') {
        setActiveUsers(activeUsersRes.value);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard';
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timeRange]);

  const loadRef = useRef<((silent?: boolean) => Promise<void>) | undefined>(undefined);
  loadRef.current = loadDashboard;

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

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const kpis = overview?.kpis;

  const criticalCards = useMemo(() => {
    if (!kpis) return [];
    return buildCriticalStatusCards(kpis);
  }, [kpis]);

  // True when any emergency metric is non-zero — drives the zone 1 tint.
  const hasCriticalIssues = kpis
    ? kpis.active_critical_cases > 0 || kpis.sla_breach_count > 0
    : false;

  if (loading) {
    return (
      <div className="relative flex min-h-[60vh] items-center justify-center">
        <AmbientLayer />
        <div className="relative space-y-5 text-center">
          <div className="relative mx-auto h-14 w-14">
            <div className="absolute inset-0 animate-spin rounded-full border border-white/10 border-t-[#FFCA40] [animation-duration:1.4s]" />
            <div className="absolute inset-2 animate-spin rounded-full border border-white/5 border-b-[#FFCA40]/50 [animation-duration:2.2s] [animation-direction:reverse]" />
          </div>
          <p className="text-sm tracking-wide text-white/50">Calibrating console…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex min-h-[60vh] items-center justify-center px-4">
        <AmbientLayer />
        <Reveal className="relative w-full max-w-md">
          <Bezel>
            <div className="space-y-5 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10 text-red-300 ring-1 ring-red-500/20">
                <ExclamationTriangleIcon className="h-6 w-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-semibold tracking-tight text-white">Console offline</h3>
                <p className="text-sm leading-relaxed text-white/50">{error}</p>
              </div>
              <button
                type="button"
                onClick={() => loadDashboard()}
                className="group mx-auto flex items-center gap-2 rounded-full bg-[#FFCA40] py-2 pl-6 pr-2 text-sm font-semibold text-[#00153a] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_8px_40px_-8px_rgba(255,202,64,0.45)] active:scale-[0.98]"
              >
                Retry connection
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px]">
                  <ArrowPathIcon className="h-4 w-4" />
                </span>
              </button>
            </div>
          </Bezel>
        </Reveal>
      </div>
    );
  }

  if (!overview || !kpis) {
    return <div className="p-6 text-white/70">No data available</div>;
  }

  const { insights, alerts } = overview;

  return (
    <div className="relative min-h-[100dvh] space-y-10 px-4 py-8 md:px-6 md:py-10 lg:px-8 lg:py-12">
      <AmbientLayer />

      {/* ── Page Header ───────────────────────────────────────── */}
      <Reveal>
        <header className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-3">
            <Eyebrow>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Operations Console
            </Eyebrow>
            <h1 className="max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight text-white md:text-5xl">
              Mental Health
              <span className="block text-white/40">Command Center</span>
            </h1>
            {lastRefreshed && (
              <p className="text-xs tabular-nums tracking-wide text-white/40">
                Synced {lastRefreshed.toLocaleTimeString()} · live via SSE
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Primary CTA — button-in-button trailing icon */}
            <button
              type="button"
              onClick={() => setShowGenerateModal(true)}
              className="group flex items-center gap-2.5 rounded-full bg-[#FFCA40] py-2 pl-5 pr-2 text-sm font-semibold text-[#00153a] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_8px_40px_-8px_rgba(255,202,64,0.5)] active:scale-[0.98]"
            >
              Generate IA Report
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:scale-105">
                <ArrowUpRightIcon className="h-4 w-4" />
              </span>
            </button>

            <GhostPill href="/admin/agent-decisions">Agent Decisions</GhostPill>
            <GhostPill href="/admin/testing">Testing Console</GhostPill>

            <button
              type="button"
              onClick={() => loadDashboard(true)}
              disabled={refreshing}
              aria-label="Refresh dashboard"
              className="flex h-10 w-10 items-center justify-center rounded-full text-white/60 ring-1 ring-white/10 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.06] hover:text-white active:scale-[0.94] disabled:opacity-50"
            >
              <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Fluid island — active pill morphs between ranges */}
            <div className="flex items-center rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10">
              {RANGE_OPTIONS.map((range) => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setTimeRange(range)}
                  className={`relative rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-500 ${
                    timeRange === range ? 'text-[#00153a]' : 'text-white/55 hover:text-white'
                  }`}
                >
                  {timeRange === range && (
                    <motion.span
                      layoutId="range-pill"
                      transition={{ duration: 0.6, ease: EASE }}
                      className="absolute inset-0 rounded-full bg-[#FFCA40]"
                    />
                  )}
                  <span className="relative tabular-nums">{range}d</span>
                </button>
              ))}
            </div>
          </div>
        </header>
      </Reveal>

      {/* ── Zone 1: Requires Immediate Attention ──────────────── */}
      {/*
       * Critical KPIs and the live alert feed are grouped together so an admin
       * can answer "what needs my attention right now?" in a single glance.
       * Asymmetrical bento: 5/7 split on xl, single column below.
       */}
      <Reveal index={1} className="space-y-4">
        <ZoneLabel>Requires Immediate Attention</ZoneLabel>
        <Bezel
          shellClassName={
            hasCriticalIssues ? 'ring-red-500/25 bg-red-500/[0.05]' : ''
          }
        >
          <section
            aria-label="Critical status and live alerts"
            className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-12"
          >
            {/* Left column: two critical KPI cards stacked */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-5 xl:grid-cols-1">
              {criticalCards.map((item) => (
                <KPICard
                  key={item.title}
                  title={item.title}
                  value={item.value}
                  subtitle={item.subtitle}
                  trend={item.trend}
                  icon={item.icon}
                  severity={item.severity}
                />
              ))}
            </div>
            {/* Right column: live alerts feed */}
            <div className="xl:col-span-7">
              <AlertsFeed alerts={alerts} maxItems={5} />
            </div>
          </section>
        </Bezel>
      </Reveal>

      {/* ── Zone 2: Platform Health ────────────────────────────── */}
      {/*
       * Point-in-time values merged with their sparklines into a single card each.
       * Eliminates duplication that previously existed between the KPI grid and
       * the micro-trend strip.
       */}
      <Reveal index={2} className="space-y-4">
        <ZoneLabel>Platform Health</ZoneLabel>
        <MicroTrendsGrid
          trends={trends}
          sentimentValue={kpis.overall_sentiment}
          avgResolutionHours={kpis.avg_case_resolution_time}
          activeUsers={activeUsers}
        />
      </Reveal>

      {/* ── Zone 3: Trend Analysis ─────────────────────────────── */}
      {/*
       * Historical pattern charts for deeper diagnostic work. Positioned after
       * current-state metrics so the admin first knows "where we are", then
       * investigates "how we got here".
       */}
      <Reveal index={3} className="space-y-4">
        <ZoneLabel>Trend Analysis</ZoneLabel>
        <InteractiveMetricsCharts overview={overview} trends={trends} />
      </Reveal>

      {/* ── Zone 4: Operations & Intelligence ─────────────────── */}
      {/*
       * Two distinct but complementary management layers:
       *   - On-duty counselors  →  who is available, how loaded, how effective
       *   - AI Insights         →  what patterns and interventions the system recommends
       * Pairing them reflects the "decide, then act" management workflow.
       */}
      <Reveal index={4} className="space-y-4">
        <ZoneLabel>Operations &amp; Intelligence</ZoneLabel>
        <section
          className="grid grid-cols-1 gap-6 xl:grid-cols-12"
          aria-label="Operations and AI intelligence"
        >
          <div className="xl:col-span-7">
            <OnDutyCounselorsPanel />
          </div>
          <div className="xl:col-span-5">
            <InsightsPanelCard
              insights={insights}
              onGenerateReport={() => setShowGenerateModal(true)}
              onGenerateCampaign={() => setShowInsightsCampaignModal(true)}
            />
          </div>
        </section>
      </Reveal>

      {/* ── Zone 5: Quick Navigation ───────────────────────────── */}
      {/*
       * Navigation links carry zero informational value and should not compete
       * with operational content for visual attention. Placed last as a utility
       * tier, styled smaller to signal secondary importance.
       */}
      <Reveal index={5} className="space-y-4">
        <ZoneLabel>Quick Navigation</ZoneLabel>
        <QuickLinksPanel />
      </Reveal>

      <GenerateReportModal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        onGenerate={handleGenerateReport}
      />

      <InsightsCampaignModal
        isOpen={showInsightsCampaignModal}
        onClose={() => setShowInsightsCampaignModal(false)}
        onSuccess={() => {
          setToast({ message: 'Campaign created successfully from insights!', type: 'success' });
          loadRef.current?.(true);
        }}
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

      <Reveal index={6}>
        <footer className="flex flex-col items-center justify-between gap-2 pt-4 text-center text-xs tabular-nums tracking-wide text-white/35 sm:flex-row">
          <span>{lastRefreshed ? `Data as of ${lastRefreshed.toLocaleString()}` : 'Loading…'}</span>
          <span>Time range · last {timeRange} days</span>
        </footer>
      </Reveal>
    </div>
  );
}
