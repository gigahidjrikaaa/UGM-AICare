'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';

import {
  FiActivity,
  FiAlertTriangle,
  FiBarChart2,
  FiCheckCircle,
  FiClock,
  FiPieChart,
  FiPlayCircle,
  FiRefreshCw,
  FiTrendingUp,
  FiUsers,
  FiDownload,
  FiFileText,
} from '@/icons';
import { apiCall, authenticatedFetch } from '@/utils/adminApi';
import { CohortDimension, getCohortHotspots, getInterventionSummary, getPredictiveSignals, getTriageMetrics } from '@/services/adminAnalytics';
import {
  AnalyticsReport as AnalyticsReportType,
  ComparisonMetric,
  ComparisonResponse,
  CohortHotspot,
  CohortHotspotsResponse,
  HeatmapCell,
  HighRiskUser,
  Insight,
  InterventionOutcomeItem,
  InterventionOutcomes,
  InterventionSummary as InterventionSummaryResponse,
  InterventionTotals,
  TopCampaignSummary,
  Pattern,
  PredictiveSignal,
  PredictiveSignalsResponse,
  ReportHistoryItem,
  ResourceEngagement,
  ResourceEngagementItem,
  RiskTrendPoint,
  SegmentImpact,
  SeverityDelta,
  SlaMetrics,
  ThresholdAlert,
  ThemeTrend,
  TriageMetricsInsight,
  TopicBreakdown,
  TopicExcerptGroup,
  TopicExcerptsResponse,
} from '@/types/admin/analytics';

const TREND_COLORS = ['#38BDF8', '#FFCA40', '#F97316', '#A855F7'];
const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_BUCKETS = ['00:00-05:59', '06:00-11:59', '12:00-17:59', '18:00-23:59'];

const severityOrder = ['High', 'Medium', 'Low'];
const severityAccent: Record<string, string> = {
  High: 'bg-rose-500/20 text-rose-200 border border-rose-400/30',
  Medium: 'bg-amber-500/20 text-amber-200 border border-amber-400/30',
  Low: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30',
};
const severityText: Record<string, string> = {
  High: 'text-rose-300',
  Medium: 'text-amber-200',
  Low: 'text-emerald-200',
};

const COHORT_DIMENSIONS: Array<{ label: string; value: CohortDimension }> = [
  { label: 'Major', value: 'major' },
  { label: 'Year', value: 'year_of_study' },
  { label: 'Gender', value: 'gender' },
  { label: 'City', value: 'city' },
];

const StatCard = ({
  title,
  value,
  description,
  icon,
  accentClass,
}: {
  title: string;
  value: number | string;
  description: string;
  icon: React.ReactNode;
  accentClass: string;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25 }}
    className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner backdrop-blur"
  >
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-wide text-white/50">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-white">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="mt-2 text-xs text-white/60">{description}</p>
      </div>
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accentClass}`}>{icon}</div>
    </div>
  </motion.div>
);

const TopicBreakdownList = ({ topics }: { topics: TopicBreakdown[] }) => {
  if (!topics.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        No topical signals detected in this window.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {topics.map((topic) => {
        const totalSentiment =
          topic.sentiment_scores.positive + topic.sentiment_scores.negative + topic.sentiment_scores.neutral || 1;
        return (
          <div
            key={topic.topic}
            className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner"
          >
            <div className="flex items-center justify-between text-sm text-white/80">
              <p className="font-semibold text-white">{topic.topic}</p>
              <span className="text-white/60">{topic.total_mentions.toLocaleString()} mentions</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-white/70">
              <div>
                <p className="text-white/50">Negative</p>
                <p className="font-medium text-rose-300">
                  {topic.sentiment_scores.negative} ({Math.round((topic.sentiment_scores.negative / totalSentiment) * 100)}%)
                </p>
              </div>
              <div>
                <p className="text-white/50">Neutral</p>
                <p className="font-medium text-white/80">
                  {topic.sentiment_scores.neutral} ({Math.round((topic.sentiment_scores.neutral / totalSentiment) * 100)}%)
                </p>
              </div>
              <div>
                <p className="text-white/50">Positive</p>
                <p className="font-medium text-emerald-200">
                  {topic.sentiment_scores.positive} ({Math.round((topic.sentiment_scores.positive / totalSentiment) * 100)}%)
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ThemeTrendChart = ({
  themeTrends,
  selectedTopics,
}: {
  themeTrends: ThemeTrend[];
  selectedTopics: string[];
}) => {
  if (!themeTrends.length || !selectedTopics.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        Trend data will appear once enough signals are captured.
      </div>
    );
  }

  const topicSet = new Set(selectedTopics);
  const trendMap = themeTrends.filter((trend) => topicSet.has(trend.topic));

  type ChartRow = { date: string } & { [key: string]: number | string };
  const combined = new Map<string, ChartRow>();
  trendMap.forEach((trend) => {
    trend.data.forEach((point) => {
      const row = combined.get(point.date) ?? { date: point.date };
      row[`${trend.topic}-count`] = point.count;
      row[`${trend.topic}-avg`] = point.rolling_average;
      combined.set(point.date, row);
    });
  });

  const chartData: ChartRow[] = Array.from(combined.values())
    .sort((a, b) => (String(a.date) > String(b.date) ? 1 : -1));

  return (
    <ResponsiveContainer height={320}>
      <LineChart data={chartData} margin={{ left: 16, right: 24, top: 16, bottom: 8 }}>
        <CartesianGrid stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="#CBD5F5" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#CBD5F5" fontSize={12} tickLine={false} axisLine={false} allowDecimals />
        <Tooltip
          contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: 12 }}
          cursor={{ strokeDasharray: '4 4', stroke: 'rgba(148, 163, 184, 0.3)' }}
        />
        <Legend wrapperStyle={{ color: '#CBD5F5' }} />
        {trendMap.map((trend, index) => (
          <>
            <Line
              key={`${trend.topic}-count`}
              dataKey={`${trend.topic}-count`}
              name={`${trend.topic} (daily)`}
              stroke={TREND_COLORS[index % TREND_COLORS.length]}
              strokeWidth={2.2}
              dot={false}
              type="monotone"
              activeDot={{ r: 5 }}
            />
            <Line
              key={`${trend.topic}-avg`}
              dataKey={`${trend.topic}-avg`}
              name={`${trend.topic} (rolling avg)`}
              stroke={TREND_COLORS[index % TREND_COLORS.length]}
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              type="monotone"
            />
          </>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

const DistressHeatmap = ({ data }: { data: HeatmapCell[] }) => {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        Heatmap will populate once the analytics agent runs.
      </div>
    );
  }

  const maxCount = data.reduce((max, cell) => Math.max(max, cell.count), 0) || 1;
  const cellMap = new Map<string, number>();
  data.forEach((cell) => {
    cellMap.set(`${cell.day}-${cell.block}`, cell.count);
  });

  const intensityToColor = (count: number) => {
    const ratio = count / maxCount;
    if (ratio === 0) return 'rgba(236, 72, 153, 0)';
    return `rgba(236, 72, 153, ${0.25 + 0.65 * ratio})`;
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="grid grid-cols-[120px_repeat(7,1fr)] gap-px text-xs">
        <div className="bg-slate-900/60 px-2 py-3 text-white/60">Time window</div>
        {DAYS_ORDER.map((day) => (
          <div key={day} className="bg-slate-900/60 px-2 py-3 text-center text-white/60">
            {day.slice(0, 3)}
          </div>
        ))}
        {TIME_BUCKETS.map((bucket) => (
          <>
            <div key={`${bucket}-label`} className="bg-slate-900/70 px-2 py-6 text-white/60">
              {bucket}
            </div>
            {DAYS_ORDER.map((day) => {
              const count = cellMap.get(`${day}-${bucket}`) ?? 0;
              return (
                <div
                  key={`${day}-${bucket}`}
                  className={`flex h-16 items-center justify-center text-sm font-semibold text-white distress-cell-bg`}
                  data-bg={intensityToColor(count)}
                >
                  {count || ''}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
};

const SegmentAlertList = ({ segments }: { segments: SegmentImpact[] }) => {
  if (!segments.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        No segments stand out for negative sentiment in this report.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {segments.map((segment) => (
        <div
          key={`${segment.segment}-${segment.group}`}
          className="rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex items-center justify-between text-sm text-white/70">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/50">{segment.segment}</p>
              <p className="text-sm font-semibold text-white">{segment.group}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-white">{segment.metric}</p>
              <p className="text-xs text-white/50">{segment.percentage.toFixed(1)}% of negative signals</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};


const RiskTrendChart = ({ data, loading = false }: { data: RiskTrendPoint[]; loading?: boolean }) => {
  if (loading) {
    return <div className="h-60 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;
  }
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        Risk trend data will appear once triage assessments are recorded for this window.
      </div>
    );
  }
  const chartData = data.map((point) => ({
    date: point.date.slice(5),
    High: point.high,
    Medium: point.medium,
    Low: point.low,
  }));
  return (
    <ResponsiveContainer height={260}>
      <LineChart data={chartData} margin={{ left: 12, right: 12, top: 12, bottom: 8 }}>
        <CartesianGrid stroke="rgba(148, 163, 184, 0.15)" strokeDasharray="3 3" />
        <XAxis dataKey="date" stroke="#CBD5F5" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="#CBD5F5" fontSize={12} tickLine={false} axisLine={false} allowDecimals />
        <Tooltip
          contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(148, 163, 184, 0.25)', borderRadius: 12 }}
          cursor={{ strokeDasharray: '4 4', stroke: 'rgba(148, 163, 184, 0.3)' }}
        />
        <Legend wrapperStyle={{ color: '#CBD5F5' }} />
        <Line type="monotone" dataKey="High" stroke="#f87171" strokeWidth={2.4} dot={false} />
        <Line type="monotone" dataKey="Medium" stroke="#fb923c" strokeWidth={2.2} dot={false} />
        <Line type="monotone" dataKey="Low" stroke="#34d399" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};

const SeverityDeltaList = ({ delta, loading = false }: { delta?: SeverityDelta; loading?: boolean }) => {
  if (loading) {
    return <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;
  }
  if (!delta) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        Severity deltas will populate once a prior window is available.
      </div>
    );
  }
  const order: Array<'high' | 'medium' | 'low'> = ['high', 'medium', 'low'];
  const labels: Record<'high' | 'medium' | 'low', string> = { high: 'High', medium: 'Medium', low: 'Low' };
  return (
    <div className="space-y-2">
      {order.map((key) => {
        const current = delta.current[key] ?? 0;
        const change = delta.delta[key] ?? 0;
        const pct = delta.delta_pct[key];
        if (current === 0 && (delta.previous[key] ?? 0) === 0 && change === 0) {
          return null;
        }
        const trendClass =
          change > 0 ? 'text-emerald-300' : change < 0 ? 'text-rose-300' : 'text-white/70';
        return (
          <div
            key={key}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/80"
          >
            <span className="font-semibold text-white">{labels[key]}</span>
            <span className="text-white/50">{current.toLocaleString()} current</span>
            <span className={`text-xs font-semibold ${trendClass}`}>{change > 0 ? '+' : ''}{change}</span>
              <span className="text-white/50">{pct != null ? `${(pct * 100).toFixed(1)}%` : '--'}</span>
          </div>
        );
      })}
    </div>
  );
};

const SlaMetricsCard = ({ metrics, loading = false }: { metrics?: SlaMetrics | null; loading?: boolean }) => {
  if (loading) {
    return <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;
  }
  if (!metrics) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        SLA metrics will appear once triage processing times are recorded.
      </div>
    );
  }
  const formatMs = (value: number | null | undefined) => {
      if (value == null) return '--';
    if (value >= 60000) {
      return `${(value / 60000).toFixed(1)} min`;
    }
    return `${Math.round(value / 1000)} sec`;
  };
  return (
    <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-white/50">Average</p>
        <p className="mt-1 text-sm font-semibold text-white">{formatMs(metrics.average_ms)}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-white/50">P90</p>
        <p className="mt-1 text-sm font-semibold text-white">{formatMs(metrics.p90_ms)}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-white/50">P95</p>
        <p className="mt-1 text-sm font-semibold text-white">{formatMs(metrics.p95_ms)}</p>
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 p-3">
        <p className="text-white/50">Within target</p>
        <p className="mt-1 text-sm font-semibold text-white">
          {metrics.within_target_percent != null ? `${metrics.within_target_percent.toFixed(1)}%` : '�'}
        </p>
      </div>
    </div>
  );
};

const CohortHotspotTable = ({
  items,
  loading = false,
  dimension,
  windowLabel,
}: {
  items: CohortHotspot[];
  loading?: boolean;
  dimension: string;
  windowLabel?: string | null;
}) => {
  if (loading) {
    return <div className="h-40 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;
  }
  if (!items.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        No significant hotspots detected for this cohort dimension.
      </div>
    );
  }
  const dimensionLabel = dimension.replace(/_/g, ' ');
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5">
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-3 text-xs text-white/60">
        <span className="uppercase tracking-wide">{dimensionLabel}</span>
        {windowLabel ? <span>{windowLabel}</span> : null}
      </div>
      <div className="divide-y divide-white/5 text-sm text-white/80">
        {items.map((item) => {
          const deltaClass =
            item.delta > 0 ? 'text-emerald-300' : item.delta < 0 ? 'text-rose-300' : 'text-white/70';
          return (
            <div key={item.label} className="grid grid-cols-[2fr_repeat(3,1fr)] gap-3 px-4 py-3">
              <div>
                <p className="font-semibold text-white">{item.label}</p>
                <p className="text-xs text-white/50">{item.cohort_population.toLocaleString()} students</p>
              </div>
              <div className="text-white/60">{item.current_high.toLocaleString()} now</div>
              <div className="text-white/60">{item.previous_high.toLocaleString()} prev</div>
              <div className={`text-right text-xs font-semibold ${deltaClass}`}>
                {item.delta > 0 ? '+' : ''}{item.delta}{' '}
                {item.delta_pct != null ? `(${(item.delta_pct * 100).toFixed(1)}%)` : ''}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const InterventionSummaryPanel = ({
  summary,
  totals,
  topCampaigns,
  fallbackItems,
  loading = false,
}: {
  summary: InterventionSummaryResponse | null;
  totals: InterventionTotals | null;
  topCampaigns: TopCampaignSummary[];
  fallbackItems: InterventionOutcomeItem[];
  loading?: boolean;
}) => {
  if (loading) {
    return <div className="h-60 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;
  }
  if (summary && totals) {
    const statusEntries = Object.entries(totals.by_status ?? {}).sort((a, b) => b[1] - a[1]);
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-white/50">Total executions</p>
            <p className="mt-1 text-sm font-semibold text-white">{totals.overall.toLocaleString()}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-white/50">Success rate</p>
            <p className="mt-1 text-sm font-semibold text-white">
                {totals.success_rate != null ? `${(totals.success_rate * 100).toFixed(1)}%` : '--'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-white/50">Failure rate</p>
            <p className="mt-1 text-sm font-semibold text-white">
                {totals.failure_rate != null ? `${(totals.failure_rate * 100).toFixed(1)}%` : '--'}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3">
            <p className="text-white/50">Avg engagement score</p>
            <p className="mt-1 text-sm font-semibold text-white">
                {totals.avg_engagement_score != null ? totals.avg_engagement_score.toFixed(2) : '--'}
            </p>
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Status breakdown</p>
          <div className="mt-2 space-y-2 text-sm text-white/80">
            {statusEntries.map(([status, count]) => (
              <div key={status} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                <span className="capitalize">{status}</span>
                <span>{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-white/50">Top campaigns</p>
          {topCampaigns.length ? (
            <div className="mt-2 space-y-2 text-sm text-white/80">
              {topCampaigns.map((campaign) => (
                <div key={campaign.campaign_id} className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">{campaign.title}</span>
                    <span className="text-xs text-white/50">{campaign.executed.toLocaleString()} sent</span>
                  </div>
                  <p className="mt-1 text-xs text-white/60">
                    Failures {campaign.failed.toLocaleString()} | Success rate
                    {campaign.success_rate != null ? ` ${(campaign.success_rate * 100).toFixed(1)}%` : '--'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-4 text-xs text-white/60">
              No campaign executions recorded in this window.
            </div>
          )}
        </div>
      </div>
    );
  }
  if (fallbackItems.length) {
    return (
      <div className="mt-4 space-y-3">
        {fallbackItems.map((item) => (
          <div
            key={item.status}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80"
          >
            <div>
              <p className="font-semibold text-white capitalize">{item.status}</p>
              <p className="text-xs text-white/50">{item.timeframe}</p>
            </div>
            <div className="text-right">
              <p className="text-white">{item.count.toLocaleString()}</p>
              <p className="text-xs text-white/60">
                {item.percentage != null ? `${item.percentage.toFixed(1)}% of total` : '--'}
              </p>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
      Intervention outcomes will appear once campaigns have been executed in this window.
    </div>
  );
};

const PredictiveSignalList = ({ signals, meta, loading = false }: { signals: PredictiveSignal[]; meta?: { generatedAt?: string; source?: string; warning?: string | null }; loading?: boolean }) => {
  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;
  }

  const generatedLabel = meta?.generatedAt ? new Date(meta.generatedAt).toLocaleString() : null;

  return (
    <div className="space-y-3">
      {meta && (generatedLabel || meta.source || meta?.warning) ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
          <div className="flex flex-col gap-1">
            <span className="text-white">
              Last updated {generatedLabel ?? 'n/a'}{meta.source ? ` � Source: ${meta.source}` : ''}
            </span>
            {meta.warning ? <span className="text-amber-200">{meta.warning}</span> : null}
          </div>
        </div>
      ) : null}

      {signals.length ? (
        signals.map((signal) => {
          const directionColor =
            signal.direction === 'up'
              ? 'text-emerald-300'
              : signal.direction === 'down'
              ? 'text-rose-300'
              : 'text-white/60';
          return (
            <div
              key={`${signal.metric}-${signal.topic ?? 'global'}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner"
            >
              <div className="flex items-center justify-between text-sm text-white">
                <div>
                  <p className="text-xs uppercase tracking-wide text-white/50">{signal.window}</p>
                  <p className="text-lg font-semibold text-white">{signal.topic ?? signal.metric}</p>
                </div>
                <span className={`text-xs font-semibold ${directionColor}`}>{signal.direction.toUpperCase()}</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-white/70">
                <div>
                  <p className="text-white/50">Current</p>
                  <p className="font-semibold text-white">{signal.current_value.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-white/50">Moving avg</p>
                  <p className="font-semibold text-white">{signal.moving_average.toFixed(1)}</p>
                </div>
                <div>
                  <p className="text-white/50">Forecast</p>
                  <p className="font-semibold text-white">{signal.forecast.toFixed(1)}</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/50">Confidence {Math.round(signal.confidence * 100)}%</p>
            </div>
          );
        })
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          Predictive signals will appear after multiple trend points are collected.
        </div>
      )}
    </div>
  );
};

const ThresholdAlertList = ({ alerts }: { alerts: ThresholdAlert[] }) => {
  if (!alerts.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        No threshold alerts triggered for this window.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <div
          key={`${alert.metric}-${alert.name}`}
          className="rounded-2xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex items-center justify-between text-sm text-white">
            <div>
              <p className="text-xs uppercase tracking-wide text-white/50">{alert.metric}</p>
              <p className="text-sm font-semibold text-white">{alert.name}</p>
            </div>
            <span className={`text-xs font-semibold ${severityText[alert.severity] ?? 'text-white/70'}`}>{alert.severity}</span>
          </div>
          <p className="mt-2 text-xs text-white/60">{alert.description}</p>
          <div className="mt-2 text-xs text-white/50">Value {alert.value} / Threshold {alert.threshold}</div>
        </div>
      ))}
    </div>
  );
};

const HeatmapHotspotList = ({ hotspots }: { hotspots: Array<{ day: string; block: string; count: number }> }) => {
  if (!hotspots.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
        No high-distress hotspots detected.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {hotspots.map((spot) => (
        <div
          key={`${spot.day}-${spot.block}`}
          className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70"
        >
          <span className="font-semibold text-white">{spot.day} {spot.block}</span>
          <span className="text-white/50">{spot.count} signals</span>
        </div>
      ))}
    </div>
  );
};

const HighRiskList = ({ users }: { users: HighRiskUser[] }) => {
  if (!users.length) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
        No students are currently flagged for sustained high-risk triage scores.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
      <table className="min-w-full divide-y divide-white/10 text-sm">
        <thead>
          <tr className="text-xs uppercase tracking-wide text-white/50">
            <th className="px-4 py-3 text-left">Student</th>
            <th className="px-4 py-3 text-left">Assessments</th>
            <th className="px-4 py-3 text-left">Last severity</th>
            <th className="px-4 py-3 text-left">Last assessed</th>
            <th className="px-4 py-3 text-left">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5 text-white/80">
          {users.map((user) => (
            <tr key={user.user_id}>
              <td className="px-4 py-3">
                <div className="font-semibold text-white">{user.name || user.email || 'Unknown student'}</div>
                {user.email && <p className="text-xs text-white/60">{user.email}</p>}
              </td>
              <td className="px-4 py-3">{user.recent_assessments}</td>
              <td className="px-4 py-3 capitalize">{user.last_severity}</td>
              <td className="px-4 py-3 text-white/60">
                {new Date(user.last_assessed_at).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <Link
                  href={user.triage_link}
                  className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-white/30 hover:bg-white/10"
                >
                  <FiUsers className="h-3.5 w-3.5" /> Review triage
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};


const normalizeReport = (raw: Partial<AnalyticsReportType> | Record<string, unknown> | null | undefined): AnalyticsReportType => {
  if (!raw) {
    return {
      report_period: '7 days',
      insights: [],
      patterns: [],
      recommendations: [],
      metrics: {},
      topic_breakdown: [],
      theme_trends: [],
      distress_heatmap: [],
      segment_alerts: [],
      high_risk_users: [],
      resource_engagement: { timeframe: '7 days', items: [] },
      intervention_outcomes: { timeframe: '7 days', items: [] },
      comparison_snapshot: {},
      topic_excerpts: [],
      predictive_signals: [],
      threshold_alerts: [],
    };
  }

  const loose = (raw ?? {}) as Record<string, unknown>;
  const reportRaw = loose as Partial<AnalyticsReportType>;
  // Defensive fallback for trends property (may not exist on all report types)
  // Use only loose['trends'] for fallback, do not access reportRaw.trends directly
  const trends = (loose['trends'] ?? {}) as Partial<AnalyticsReportType>;

  const resourceBaseline = (reportRaw.resource_engagement
    ?? trends.resource_engagement
    ?? (loose['resource_engagement'] as ResourceEngagement | undefined)
    ?? { items: [], timeframe: reportRaw.report_period ?? '7 days' }) as Partial<ResourceEngagement> & { items?: ResourceEngagementItem[] };

  const resource_engagement = {
    timeframe: resourceBaseline.timeframe ?? reportRaw.report_period ?? '7 days',
    items: Array.isArray(resourceBaseline.items) ? (resourceBaseline.items as ResourceEngagementItem[]) : [],
  };

  const interventionBaseline = (reportRaw.intervention_outcomes
    ?? trends.intervention_outcomes
    ?? (loose['intervention_outcomes'] as InterventionOutcomes | undefined)
    ?? { items: [], timeframe: reportRaw.report_period ?? '7 days' }) as Partial<InterventionOutcomes> & { items?: InterventionOutcomeItem[] };

  const intervention_outcomes = {
    timeframe: interventionBaseline.timeframe ?? reportRaw.report_period ?? '7 days',
    items: Array.isArray(interventionBaseline.items)
      ? (interventionBaseline.items as InterventionOutcomeItem[])
      : [],
  };

  const comparison_snapshot = (
    reportRaw.comparison_snapshot
    ?? (loose['comparison_snapshot'] as Record<string, unknown> | undefined)
    ?? (loose['baseline_snapshot'] as Record<string, unknown> | undefined)
    ?? (loose['comparisonSnapshot'] as Record<string, unknown> | undefined)
    ?? (loose['baselineSnapshot'] as Record<string, unknown> | undefined)
    ?? {}
  ) as Record<string, unknown>;

  const topic_excerpts = (
    reportRaw.topic_excerpts
    ?? (loose['topic_excerpts'] as TopicExcerptGroup[] | undefined)
    ?? (loose['topicExcerpts'] as TopicExcerptGroup[] | undefined)
    ?? trends.topic_excerpts
    ?? []
  ) as TopicExcerptGroup[];

  const predictiveSignalsSource =
    reportRaw.predictive_signals
    ?? (loose['predictive_signals'] as PredictiveSignal[] | undefined)
    ?? (loose['predictiveSignals'] as PredictiveSignal[] | undefined)
    ?? trends.predictive_signals
    ?? [];

  const thresholdAlertsSource =
    reportRaw.threshold_alerts
    ?? (loose['threshold_alerts'] as ThresholdAlert[] | undefined)
    ?? (loose['thresholdAlerts'] as ThresholdAlert[] | undefined)
    ?? trends.threshold_alerts
    ?? [];

  const predictive_signals = Array.isArray(predictiveSignalsSource)
    ? (predictiveSignalsSource as PredictiveSignal[])
    : [];

  const threshold_alerts = Array.isArray(thresholdAlertsSource)
    ? (thresholdAlertsSource as ThresholdAlert[])
    : [];

  return {
    id: reportRaw.id,
    generated_at: reportRaw.generated_at ?? (loose['generatedAt'] as string | undefined),
    report_period: reportRaw.report_period ?? '7 days',
    window_start: reportRaw.window_start ?? (loose['windowStart'] as string | null | undefined) ?? null,
    window_end: reportRaw.window_end ?? (loose['windowEnd'] as string | null | undefined) ?? null,
    insights: (reportRaw.insights ?? trends.insights ?? []) as Insight[],
    patterns: (reportRaw.patterns ?? trends.patterns ?? []) as Pattern[],
    recommendations: (reportRaw.recommendations ?? trends.recommendations ?? []) as string[],
    metrics: (reportRaw.metrics ?? trends.metrics ?? {}) as Record<string, unknown>,
    topic_breakdown: (reportRaw.topic_breakdown ?? trends.topic_breakdown ?? []) as TopicBreakdown[],
    theme_trends: (reportRaw.theme_trends ?? trends.theme_trends ?? []) as ThemeTrend[],
    distress_heatmap: (reportRaw.distress_heatmap ?? trends.distress_heatmap ?? []) as HeatmapCell[],
    segment_alerts: (reportRaw.segment_alerts ?? trends.segment_alerts ?? []) as SegmentImpact[],
    high_risk_users: (reportRaw.high_risk_users ?? trends.high_risk_users ?? []) as HighRiskUser[],
    resource_engagement,
    intervention_outcomes,
    comparison_snapshot: comparison_snapshot as Record<string, unknown>,
    topic_excerpts,
    predictive_signals,
    threshold_alerts,
  } as AnalyticsReportType;
};





export default function AnalyticsPanelPage() {
  const [report, setReport] = useState<AnalyticsReportType | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'pdf' | null>(null);
  const [history, setHistory] = useState<ReportHistoryItem[]>([]);
  const [comparison, setComparison] = useState<ComparisonResponse | null>(null);
  const [topicExcerpts, setTopicExcerpts] = useState<TopicExcerptsResponse | null>(null);
  const [triageMetrics, setTriageMetrics] = useState<TriageMetricsInsight | null>(null);
  const [triageMetricsLoading, setTriageMetricsLoading] = useState(true);
  const [cohortDimension, setCohortDimension] = useState<CohortDimension>('major');
  const [cohortHotspots, setCohortHotspots] = useState<CohortHotspotsResponse | null>(null);
  const [cohortHotspotsLoading, setCohortHotspotsLoading] = useState(true);
  const [predictiveSnapshot, setPredictiveSnapshot] = useState<PredictiveSignalsResponse | null>(null);
  const [predictiveLoading, setPredictiveLoading] = useState(true);
  const [interventionSummary, setInterventionSummary] = useState<InterventionSummaryResponse | null>(null);
  const [interventionLoading, setInterventionLoading] = useState(true);

  const fetchTriageMetrics = useCallback(async () => {
    try {
      setTriageMetricsLoading(true);
      const response = await getTriageMetrics();
      setTriageMetrics(response);
    } catch (error) {
      console.error('Error fetching triage metrics:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load triage metrics');
      setTriageMetrics(null);
    } finally {
      setTriageMetricsLoading(false);
    }
  }, []);

  const fetchHotspots = useCallback(async () => {
    try {
      setCohortHotspotsLoading(true);
      const response = await getCohortHotspots({ dimension: cohortDimension, limit: 6 });
      setCohortHotspots(response);
    } catch (error) {
      console.error('Error fetching cohort hotspots:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load cohort hotspots');
      setCohortHotspots(null);
    } finally {
      setCohortHotspotsLoading(false);
    }
  }, [cohortDimension]);

  const fetchPredictiveSnapshot = useCallback(async (forceRefresh = false) => {
    try {
      setPredictiveLoading(true);
      const response = await getPredictiveSignals({ forceRefresh });
      setPredictiveSnapshot(response);
    } catch (error) {
      console.error('Error fetching predictive scores:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load predictive scores');
      setPredictiveSnapshot(null);
    } finally {
      setPredictiveLoading(false);
    }
  }, []);

  const fetchInterventionSummary = useCallback(async () => {
    try {
      setInterventionLoading(true);
      const response = await getInterventionSummary({ limit: 5 });
      setInterventionSummary(response);
    } catch (error) {
      console.error('Error fetching intervention summary:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load intervention summary');
      setInterventionSummary(null);
    } finally {
      setInterventionLoading(false);
    }
  }, []);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiCall<AnalyticsReportType>('/api/v1/admin/analytics');
      if (response && 'id' in response) {
        setReport(normalizeReport(response));
      } else {
        setReport(null);
      }
    } catch (error) {
      console.error('Error fetching analytics report:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load analytics report');
    } finally {
      setLoading(false);
    }
  }, []);

  const runAgent = useCallback(async () => {
    try {
      setRunning(true);
      const result = await apiCall<{ message: string; report: AnalyticsReportType }>('/api/v1/admin/analytics/run', {
        method: 'POST',
      });
      toast.success(result.message ?? 'Analytics report generated');
      setReport(normalizeReport(result.report));
      void fetchTriageMetrics();
      void fetchHotspots();
      void fetchPredictiveSnapshot(true);
      void fetchInterventionSummary();
    } catch (error) {
      console.error('Error running analytics agent:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to run analytics agent');
    } finally {
      setRunning(false);
    }
  }, [fetchHotspots, fetchInterventionSummary, fetchPredictiveSnapshot, fetchTriageMetrics]);
  const fetchHistory = useCallback(async () => {
    try {
      const response = await apiCall<{ items: ReportHistoryItem[] }>(`/api/v1/admin/analytics/history?limit=6`);
      setHistory(response?.items ?? []);
    } catch (error) {
      console.error('Error fetching analytics history:', error);
    }
  }, []);

  const fetchComparisons = useCallback(async (reportId: number) => {
    try {
      const response = await apiCall<ComparisonResponse>(`/api/v1/admin/analytics/${reportId}/comparisons`);
      setComparison(response);
    } catch (error) {
      console.error('Error fetching comparison slices:', error);
    }
  }, []);

  const fetchTopicExcerpts = useCallback(async (reportId: number) => {
    try {
      const response = await apiCall<TopicExcerptsResponse>(`/api/v1/admin/analytics/${reportId}/excerpts?limit=3`);
      setTopicExcerpts(response);
    } catch (error) {
      console.error('Error fetching topic excerpts:', error);
      setTopicExcerpts(null);
    }
  }, []);

  const handleExport = useCallback(async (format: 'csv' | 'pdf') => {
    if (!report?.id) {
      toast.error('Generate a report before exporting.');
      return;
    }
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      toast.error('NEXT_PUBLIC_API_URL is not configured.');
      return;
    }
    try {
      setExportingFormat(format);
      const response = await authenticatedFetch(`${baseUrl}/api/v1/admin/analytics/${report.id}/export.${format}`);
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Export failed');
      }
      const blob = await response.blob();
      const disposition = response.headers.get('content-disposition') ?? '';
      let filename = `analytics-report-${report.id}.${format}`;
      const match = disposition.match(/filename="?([^";]+)"?/i);
      if (match?.[1]) {
        filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success(`Exported ${format.toUpperCase()} successfully`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to export report';
      toast.error(message);
    } finally {
      setExportingFormat(null);
    }
  }, [report?.id]);

  useEffect(() => {
    void fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);
  useEffect(() => {
    void fetchTriageMetrics();
  }, [fetchTriageMetrics]);

  useEffect(() => {
    void fetchHotspots();
  }, [fetchHotspots]);

  useEffect(() => {
    void fetchPredictiveSnapshot();
  }, [fetchPredictiveSnapshot]);

  useEffect(() => {
    void fetchInterventionSummary();
  }, [fetchInterventionSummary]);

  useEffect(() => {
    if (report?.id) {
      void fetchComparisons(report.id);
      void fetchTopicExcerpts(report.id);
    } else {
      setComparison(null);
      setTopicExcerpts(null);
    }
  }, [report?.id, fetchComparisons, fetchTopicExcerpts]);

  const handleCohortDimensionChange = useCallback((value: CohortDimension) => {
    setCohortDimension(value);
  }, []);

  const handlePredictiveRefresh = useCallback(() => {
    void fetchPredictiveSnapshot(true);
  }, [fetchPredictiveSnapshot]);

  const insightCounts = useMemo(() => {
    if (!report) return { total: 0, high: 0 };
    const total = report.insights.length;
    const high = report.insights.filter((insight) => (insight.severity || '').toLowerCase() === 'high').length;
    return { total, high };
  }, [report]);

  const topTopics = useMemo(() => {
    if (!report) return [] as TopicBreakdown[];
    return [...report.topic_breakdown].sort((a, b) => b.total_mentions - a.total_mentions).slice(0, 4);
  }, [report]);

  const predictiveSignals = useMemo<PredictiveSignal[]>(() => {
    const snapshotSignals = predictiveSnapshot?.signals ?? [];
    if (snapshotSignals.length) {
      return snapshotSignals;
    }
    const fallback = report?.predictive_signals ?? [];
    return Array.isArray(fallback) ? (fallback as PredictiveSignal[]) : [];
  }, [predictiveSnapshot, report]);

  const thresholdAlerts = useMemo<ThresholdAlert[]>(() => {
    const source = report?.threshold_alerts ?? [];
    return Array.isArray(source) ? (source as ThresholdAlert[]) : [];
  }, [report]);

  const heatmapAlerts = useMemo<HeatmapCell[]>(() => {
    const data = report?.distress_heatmap ?? [];
    return Array.isArray(data)
      ? [...data].filter((cell) => cell.count > 0).sort((a, b) => b.count - a.count).slice(0, 3)
      : [];
  }, [report]);

  const severityDelta = triageMetrics?.severity_delta;
  const slaMetrics = triageMetrics?.sla_metrics ?? null;
  const cohortItems = cohortHotspots?.items ?? [];
  const cohortWindowLabel = cohortHotspots ? `${cohortHotspots.window_start} - ${cohortHotspots.window_end}` : null;
  const predictiveMeta = useMemo(() => {
    if (!predictiveSnapshot) {
      return undefined;
    }
    return {
      generatedAt: predictiveSnapshot.generated_at,
      source: predictiveSnapshot.source,
      warning: predictiveSnapshot.warning ?? null,
    };
  }, [predictiveSnapshot]);
  const predictiveGeneratedLabel = predictiveMeta?.generatedAt ? new Date(predictiveMeta.generatedAt).toLocaleString() : null;
  const interventionTotals = interventionSummary?.totals ?? null;
  const topCampaignSummaries = interventionSummary?.top_campaigns ?? [];

  const topTrendsTopics = topTopics.length
    ? topTopics.map((topic) => topic.topic)
    : (report?.theme_trends ?? []).slice(0, 3).map((trend) => trend.topic);

  const generatedAtLabel = report?.generated_at
    ? new Date(report.generated_at).toLocaleString()
    : undefined;

  const resourceItems = useMemo<ResourceEngagementItem[]>(() => {
    const items = report?.resource_engagement?.items ?? [];
    return Array.isArray(items) ? (items as ResourceEngagementItem[]) : [];
  }, [report]);
  const interventionItems = useMemo<InterventionOutcomeItem[]>(() => {
    const items = report?.intervention_outcomes?.items ?? [];
    return Array.isArray(items) ? (items as InterventionOutcomeItem[]) : [];
  }, [report]);
  const predictiveSignalCount = predictiveSignals.length;
  const thresholdAlertCount = thresholdAlerts.length;
  const comparisonSlices = useMemo(() => comparison?.comparisons ?? {}, [comparison]);
  const excerptGroups = useMemo<TopicExcerptGroup[]>(() => {
    if (topicExcerpts) {
      if ('topics' in topicExcerpts) {
        return topicExcerpts.topics;
      }
      return [{ topic: topicExcerpts.topic, samples: topicExcerpts.samples }];
    }
    return report?.topic_excerpts ?? [];
  }, [topicExcerpts, report]);

  const topStats = useMemo(() => {
    if (!report) return [];
    return [
      {
        title: 'Tracked topics',
        value: report.topic_breakdown.length,
        description: 'Distinct wellbeing themes identified in this period.',
        icon: <FiActivity className="h-5 w-5" />,
        accentClass: 'bg-sky-500/20 text-sky-200 border border-sky-400/30',
      },
      {
        title: 'Insights generated',
        value: insightCounts.total,
        description: `${insightCounts.high} high-severity alerts flagged by the agent.`,
        icon: <FiBarChart2 className="h-5 w-5" />,
        accentClass: 'bg-slate-500/20 text-slate-200 border border-slate-400/30',
      },
      {
        title: 'Predictive signals',
        value: predictiveSignalCount,
        description: 'Themes with noticeable momentum over the selected window.',
        icon: <FiTrendingUp className="h-5 w-5" />,
        accentClass: 'bg-fuchsia-500/20 text-fuchsia-200 border border-fuchsia-400/30',
      },
      {
        title: 'Active alerts',
        value: thresholdAlertCount,
        description: 'Threshold breaches needing review by the admin team.',
        icon: <FiAlertTriangle className="h-5 w-5" />,
        accentClass: 'bg-amber-500/20 text-amber-200 border border-amber-400/30',
      },
      {
        title: 'Recommendations',
        value: report.recommendations.length,
        description: 'Actionable steps for wellbeing and operations teams.',
        icon: <FiCheckCircle className="h-5 w-5" />,
        accentClass: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/30',
      },
      {
        title: 'Report window',
        value: report.report_period,
        description: 'Timeframe analysed in this snapshot.',
        icon: <FiClock className="h-5 w-5" />,
        accentClass: 'bg-indigo-500/20 text-indigo-200 border border-indigo-400/30',
      },
    ];
  }, [report, insightCounts, predictiveSignalCount, thresholdAlertCount]);
  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="animate-pulse space-y-5">
          <div className="h-8 w-2/5 rounded bg-white/10" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-28 rounded-2xl border border-white/10 bg-white/5" />
            ))}
          </div>
          <div className="h-64 rounded-2xl border border-white/10 bg-white/5" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl space-y-6 px-4 py-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="flex items-center text-3xl font-bold text-white">
            <FiBarChart2 className="mr-3 text-[#FFCA40]" />
            Analytics Panel
          </h1>
          <p className="mt-1 text-sm text-white/70">
            Monitor wellbeing trends, agent performance, and recommended actions surfaced by the analytics agent.
          </p>
          {generatedAtLabel && (
            <p className="mt-1 text-xs text-white/50">Last generated {generatedAtLabel}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={runAgent}
            disabled={running}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#FFCA40] px-4 py-2 text-sm font-semibold text-black transition hover:bg-[#ffd964] disabled:cursor-not-allowed disabled:opacity-70"
          >
            <FiPlayCircle className={running ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {running ? 'Generating report...' : 'Run analytics agent'}
          </button>
          <button
            onClick={() => handleExport('csv')}
            disabled={!!exportingFormat || !report?.id}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiDownload className={exportingFormat === 'csv' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {exportingFormat === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={!!exportingFormat || !report?.id}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiFileText className={exportingFormat === 'pdf' ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />
            {exportingFormat === 'pdf' ? 'Exporting PDF...' : 'Export PDF'}
          </button>
        </div>

      </div>

      {report ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {topStats.map((stat) => (
              <StatCard key={stat.title} {...stat} />
            ))}
          </div>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex items-center justify-between text-sm">
                <h2 className="text-lg font-semibold text-white">Triage risk trend</h2>
                {triageMetrics ? (
                  <span className="text-xs text-white/50">
                    {triageMetrics.window_start} - {triageMetrics.window_end}
                  </span>
                ) : null}
              </div>
              <div className="mt-3">
                <RiskTrendChart data={triageMetrics?.risk_trend ?? []} loading={triageMetricsLoading} />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-white">Severity delta</h3>
                <p className="mt-1 text-xs text-white/60">Change compared with the prior window.</p>
                <div className="mt-3">
                  <SeverityDeltaList delta={severityDelta} loading={triageMetricsLoading} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Triage SLA</h3>
                <p className="mt-1 text-xs text-white/60">Processing performance for automated assessments.</p>
                <div className="mt-3">
                  <SlaMetricsCard metrics={slaMetrics} loading={triageMetricsLoading} />
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-white">
                <FiUsers className="text-amber-200" /> Cohort hotspots
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {COHORT_DIMENSIONS.map((option) => {
                  const active = option.value === cohortDimension;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleCohortDimensionChange(option.value)}
                      className={
                        active
                          ? 'rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-semibold text-white'
                          : 'rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60 transition hover:border-white/30 hover:text-white'
                      }
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <CohortHotspotTable
              items={cohortItems}
              loading={cohortHotspotsLoading}
              dimension={cohortDimension}
              windowLabel={cohortWindowLabel}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="flex flex-col gap-1 text-sm text-white/70 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">Predictive signals</h2>
                  <span className="text-xs text-white/50">Momentum forecasts for emerging wellbeing themes.</span>
                </div>
                <div className="flex items-center gap-2">
                  {predictiveGeneratedLabel && (
                    <span className="text-xs text-white/50">Updated {predictiveGeneratedLabel}</span>
                  )}
                  <button
                    onClick={handlePredictiveRefresh}
                    disabled={predictiveLoading}
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <FiRefreshCw className={predictiveLoading ? 'h-3 w-3 animate-spin' : 'h-3 w-3'} />
                    Refresh
                  </button>
                </div>
              </div>
              <div className="mt-3">
                <PredictiveSignalList signals={predictiveSignals} meta={predictiveMeta} loading={predictiveLoading} />
              </div>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Threshold alerts</h2>
              <p className="mt-1 text-xs text-white/60">Automated alerts when sentiment or interventions exceed configured limits.</p>
              <div className="mt-3">
                <ThresholdAlertList alerts={thresholdAlerts} />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-lg font-semibold text-white">
                <FiUsers className="text-amber-200" /> Cohort hotspots
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {COHORT_DIMENSIONS.map((option) => {
                  const active = option.value === cohortDimension;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleCohortDimensionChange(option.value)}
                      className={
                        active
                          ? 'rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-semibold text-white'
                          : 'rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white/60 transition hover:border-white/30 hover:text-white'
                      }
                      type="button"
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <CohortHotspotTable
              items={cohortItems}
              loading={cohortHotspotsLoading}
              dimension={cohortDimension}
              windowLabel={cohortWindowLabel}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <div className="mb-3 flex items-center justify-between text-sm">
                <h2 className="text-lg font-semibold text-white">
                  Trend drill-down ({report.report_period})
                </h2>
                <span className="flex items-center gap-2 text-xs text-white/50">
                  <FiTrendingUp className="h-3.5 w-3.5" /> Daily counts with rolling averages
                </span>
              </div>
              <ThemeTrendChart themeTrends={report.theme_trends} selectedTopics={topTrendsTopics} />
            </div>
            <div>
              <h2 className="mb-3 text-lg font-semibold text-white">Insight severity mix</h2>
              <div className="space-y-3">
                {severityOrder.map((severity) => {
                  const count = report.insights.filter((insight) => insight.severity === severity).length;
                  if (!count) return null;
                  const total = report.insights.length || 1;
                  const share = Math.round((count / total) * 100);
                  return (
                    <div
                      key={severity}
                      className={`rounded-2xl border border-white/10 bg-white/5 p-4 ${severityAccent[severity] ?? ''}`}
                    >
                      <p className={`text-xs uppercase tracking-wide ${severityText[severity] ?? 'text-white/60'}`}>
                        {severity}
                      </p>
                      <p className="mt-2 text-2xl font-semibold text-white">{share}%</p>
                      <p className="text-xs text-white/70">{count} insight{count === 1 ? '' : 's'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-white">
                <FiActivity className="text-sky-300" /> Topic breakdown
              </div>
              <p className="mt-1 text-xs text-white/60">
                Mentions and sentiment mix for key wellbeing themes.
              </p>
              <div className="mt-4">
                <TopicBreakdownList topics={report.topic_breakdown} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-white">
                <FiPieChart className="text-fuchsia-300" /> Distress heatmap
              </div>
              <p className="mt-1 text-xs text-white/60">
                When students express elevated distress throughout the week.
              </p>
              <div className="mt-4">
                <DistressHeatmap data={report.distress_heatmap} />
              </div>
              <div className="mt-4">
                <HeatmapHotspotList hotspots={heatmapAlerts} />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-white">
                <FiUsers className="text-amber-200" /> Segments contributing to negative trends
              </div>
              <p className="mt-1 text-xs text-white/60">
                Cohorts whose messages most frequently contain negative sentiment.
              </p>
              <div className="mt-4">
                <SegmentAlertList segments={report.segment_alerts} />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-white">
                <FiAlertTriangle className="text-rose-300" /> High-risk students for follow-up
              </div>
              <p className="mt-1 text-xs text-white/60">
                Individuals with repeated high triage scores who may need outreach.
              </p>
              <div className="mt-4">
                <HighRiskList users={report.high_risk_users} />
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-white">
                <FiTrendingUp className="text-sky-300" /> Resource engagement
              </div>
              <p className="mt-1 text-xs text-white/60">
                Usage across journaling, surveys, and appointments within the selected window.
              </p>
              {resourceItems.length ? (
                <div className="mt-4 space-y-3">
                  {resourceItems.map((item) => (
                    <div
                      key={`${item.category}-${item.label}`}
                      className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner"
                    >
                      <div className="flex items-center justify-between text-sm text-white">
                        <div>
                          <p className="text-xs uppercase tracking-wide text-white/50">{item.category}</p>
                          <p className="text-lg font-semibold text-white">{item.label}</p>
                        </div>
                        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/70">
                          {item.timeframe}
                        </span>
                      </div>
                      <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-white/70">
                        <div>
                          <p className="text-white/50">Total</p>
                          <p className="font-semibold text-white">{item.total.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-white/50">Unique users</p>
                          <p className="font-semibold text-white">
                            {item.unique_users != null ? item.unique_users.toLocaleString() : '--'}
                          </p>
                        </div>
                        <div>
                          <p className="text-white/50">Avg / user</p>
                          <p className="font-semibold text-white">
                            {item.avg_per_user != null ? item.avg_per_user.toFixed(2) : '--'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                  Engagement summaries will populate once the analytics agent runs for this window.
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 text-lg font-semibold text-white">
                <FiCheckCircle className="text-emerald-300" /> Intervention summary
              </div>
              <p className="mt-1 text-xs text-white/60">
                Delivery status and campaign performance across the recent window.
                {interventionSummary ? (
                  <span className="ml-1 text-white/40">
                    {interventionSummary.window_start} - {interventionSummary.window_end}
                  </span>
                ) : null}
              </p>
              <div className="mt-4">
                <InterventionSummaryPanel
                  summary={interventionSummary}
                  totals={interventionTotals}
                  topCampaigns={topCampaignSummaries}
                  fallbackItems={interventionItems}
                  loading={interventionLoading}
                />
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <FiTrendingUp className="text-indigo-300" /> Comparison slices
            </div>
            {Object.keys(comparisonSlices).length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {Object.entries(comparisonSlices).map(([key, slice]) => {
                  const metrics = slice.metrics ?? {};
                  const refSummary = slice.reference_summary;
                  const formatNumber = (value: number) =>
                    Math.abs(value) >= 1 ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value.toFixed(2);
                  const formatMetric = (metricKey: string) => {
                    const candidate = metrics[metricKey];
                    if (!candidate || typeof candidate !== 'object' || !('current' in candidate)) {
                      return null;
                    }
                    const metric = candidate as ComparisonMetric;
                    const deltaClass =
                      metric.delta > 0
                        ? 'text-emerald-300'
                        : metric.delta < 0
                        ? 'text-rose-300'
                        : 'text-white/60';
                    const deltaLabel =
                      metric.delta === 0
                        ? '0'
                        : `${metric.delta > 0 ? '+' : ''}${formatNumber(metric.delta)}`;
                    const deltaPct =
                      metric.delta_pct != null
                        ? `${metric.delta_pct > 0 ? '+' : ''}${metric.delta_pct.toFixed(1)}%`
                        : '--';
                    return (
                      <div key={metricKey} className="flex items-center justify-between text-xs text-white/70">
                        <span className="uppercase tracking-wide text-white/50">
                          {metricKey.replace(/_/g, ' ')}
                        </span>
                        <div className="text-right">
                          <p className="text-white">{formatNumber(metric.current)}</p>
                          <p className={deltaClass}>
                            {deltaLabel}
                            <span className="ml-1 text-white/50">({deltaPct})</span>
                          </p>
                        </div>
                      </div>
                    );
                  };

                  return (
                    <div
                      key={key}
                      className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner"
                    >
                      <div className="flex items-center justify-between text-sm text-white/70">
                        <p className="text-white font-semibold capitalize">{slice.label || key}</p>
                        {refSummary?.generated_at && (
                          <span className="text-xs text-white/50">
                            vs {new Date(refSummary.generated_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        {['conversation_count', 'journal_count', 'unique_users'].map((metricKey) => formatMetric(metricKey))}
                      </div>
                      {slice.topics?.length ? (
                        <div className="mt-4 space-y-1 text-xs text-white/70">
                          <p className="text-white/50">Topic shifts</p>
                          {slice.topics.slice(0, 3).map((topic) => (
                            <div key={topic.topic} className="flex items-center justify-between">
                              <span className="text-white">{topic.topic}</span>
                              <span className="text-white/60">
                                {topic.delta > 0 ? '+' : ''}
                                {formatNumber(topic.delta)}
                                {topic.delta_pct != null ? ` (${topic.delta_pct.toFixed(1)}%)` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                Comparison data will appear once a prior report exists for this timeframe.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <FiPieChart className="text-[#38BDF8]" /> AI-generated insights
            </div>
            {report.insights.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {report.insights.map((insight) => {
                  const severity = insight.severity || 'Low';
                  const severityClass = severityText[severity] ?? 'text-white';
                  return (
                    <motion.div
                      key={insight.title}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner"
                    >
                      <p className={`text-xs uppercase tracking-wide ${severityClass}`}>{severity}</p>
                      <h3 className="mt-2 text-lg font-semibold text-white">{insight.title}</h3>
                      <p className="mt-2 text-sm text-white/70">{insight.description}</p>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                No insights available for this report.
              </div>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <FiCheckCircle className="text-emerald-300" /> Recommended actions
            </div>
            {report.recommendations.length ? (
              <ol className="space-y-3 text-sm text-white/80">
                {report.recommendations.map((recommendation, index) => (
                  <li
                    key={`${recommendation}-${index}`}
                    className="rounded-2xl border border-white/10 bg-white/5 p-4"
                  >
                    <span className="mr-3 inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FFCA40]/20 text-xs font-semibold text-[#FFCA40]">
                      {index + 1}
                    </span>
                    {recommendation}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                No recommendations were generated in this run.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <FiPlayCircle className="text-purple-300" /> Topic excerpts
            </div>
            {excerptGroups.length ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {excerptGroups.map((group) => (
                  <div
                    key={group.topic}
                    className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner"
                  >
                    <div className="flex items-center justify-between text-sm text-white/70">
                      <p className="text-white font-semibold">{group.topic}</p>
                      <span className="text-xs text-white/50">{group.samples.length} excerpts</span>
                    </div>
                    <div className="mt-3 space-y-3">
                      {group.samples.slice(0, 3).map((sample, index) => (
                        <blockquote
                          key={`${group.topic}-${index}`}
                          className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white/80"
                        >
                          <p className="italic">&apos;{sample.excerpt}&apos;</p>
                          <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                            <span>{sample.source ?? 'anonymous'}</span>
                            {sample.date && <span>{new Date(sample.date).toLocaleDateString()}</span>}
                          </div>
                        </blockquote>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                Topic excerpts will appear once anonymised samples are captured for this report.
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold text-white">
              <FiClock className="text-indigo-300" /> Report history
            </div>
            {history.length ? (
              <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5">
                <table className="min-w-full divide-y divide-white/10 text-xs text-white/70">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-white/50">
                      <th className="px-4 py-3 text-left">Generated at</th>
                      <th className="px-4 py-3 text-left">Insights</th>
                      <th className="px-4 py-3 text-left">Top topics</th>
                      <th className="px-4 py-3 text-left">Comparisons</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 text-white/80">
                    {history.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-white">
                            {new Date(item.generated_at).toLocaleString()}
                          </div>
                          <p className="text-xs text-white/50">{item.report_period}</p>
                        </td>
                        <td className="px-4 py-3">{item.insight_count}</td>
                        <td className="px-4 py-3">
                          {item.top_topics.length ? item.top_topics.join(', ') : '--'}
                        </td>
                        <td className="px-4 py-3">
                          {item.comparison_keys.length ? item.comparison_keys.join(', ') : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
                History will populate once multiple analytics snapshots have been generated.
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#FFCA40]/15">
            <FiBarChart2 className="h-6 w-6 text-[#FFCA40]" />
          </div>
          <h2 className="text-2xl font-semibold text-white">No analytics report available yet</h2>
          <p className="mt-2 text-sm text-white/70">
            Run the analytics agent to generate your first snapshot of wellbeing trends and operational insights.
          </p>
          <p className="mt-4 text-xs text-white/60">
            The dashboard will populate with behaviour patterns, AI-authored insights, and prioritized actions once a
            report is generated.
          </p>
        </div>
      )}
    </div>
  );
}