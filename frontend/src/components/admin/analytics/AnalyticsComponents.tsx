'use client';

import Link from 'next/link';
import { Fragment } from 'react';
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

import { FiUsers } from '@/icons';
import {
  TopicBreakdown,
  ThemeTrend,
  HeatmapCell,
  SegmentImpact,
  RiskTrendPoint,
  SeverityDelta,
  SlaMetrics,
  CohortHotspot,
  HighRiskUser,
  PredictiveSignal,
  ThresholdAlert,
  InterventionSummary,
  InterventionTotals,
  TopCampaignSummary,
  InterventionOutcomeItem,
} from '@/types/admin/analytics';

const TREND_COLORS = ['#38BDF8', '#FFCA40', '#F97316', '#A855F7'];
const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const TIME_BUCKETS = ['00:00-05:59', '06:00-11:59', '12:00-17:59', '18:00-23:59'];



const severityText: Record<string, string> = {
  High: 'text-rose-300',
  Medium: 'text-amber-200',
  Low: 'text-emerald-200',
};

export const TopicBreakdownList = ({ topics }: { topics: TopicBreakdown[] }) => {
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

export const ThemeTrendChart = ({
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
          <Fragment key={trend.topic}>
            <Line
              dataKey={`${trend.topic}-count`}
              name={`${trend.topic} (daily)`}
              stroke={TREND_COLORS[index % TREND_COLORS.length]}
              strokeWidth={2.2}
              dot={false}
              type="monotone"
              activeDot={{ r: 5 }}
            />
            <Line
              dataKey={`${trend.topic}-avg`}
              name={`${trend.topic} (rolling avg)`}
              stroke={TREND_COLORS[index % TREND_COLORS.length]}
              strokeDasharray="5 5"
              strokeWidth={2}
              dot={false}
              type="monotone"
            />
          </Fragment>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export const DistressHeatmap = ({ data }: { data: HeatmapCell[] }) => {
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
          <Fragment key={bucket}>
            <div className="bg-slate-900/70 px-2 py-6 text-white/60">
              {bucket}
            </div>
            {DAYS_ORDER.map((day) => {
              const count = cellMap.get(`${day}-${bucket}`) ?? 0;
              const intensity = count / maxCount;
              const colorClass = intensity === 0 
                ? 'bg-transparent' 
                : intensity <= 0.25 
                ? 'bg-pink-500/25' 
                : intensity <= 0.5 
                ? 'bg-pink-500/50' 
                : intensity <= 0.75 
                ? 'bg-pink-500/75' 
                : 'bg-pink-500/90';
              
              return (
                <div
                  key={`${day}-${bucket}`}
                  className={`flex h-16 items-center justify-center text-sm font-semibold text-white ${colorClass}`}
                >
                  {count || ''}
                </div>
              );
            })}
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export const RiskTrendChart = ({ data, loading = false }: { data: RiskTrendPoint[]; loading?: boolean }) => {
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

export const SeverityDeltaList = ({ delta, loading = false }: { delta?: SeverityDelta; loading?: boolean }) => {
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

export const SlaMetricsCard = ({ metrics, loading = false }: { metrics?: SlaMetrics | null; loading?: boolean }) => {
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
          {metrics.within_target_percent != null ? `${metrics.within_target_percent.toFixed(1)}%` : '–'}
        </p>
      </div>
    </div>
  );
};

export const CohortHotspotTable = ({
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
        {windowLabel && <span>{windowLabel}</span>}
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

export const HighRiskList = ({ users }: { users: HighRiskUser[] }) => {
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

export const PredictiveSignalList = ({ 
  signals, 
  meta, 
  loading = false 
}: { 
  signals: PredictiveSignal[]; 
  meta?: { generatedAt?: string; source?: string; warning?: string | null }; 
  loading?: boolean;
}) => {
  if (loading) {
    return <div className="h-48 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;
  }

  const generatedLabel = meta?.generatedAt ? new Date(meta.generatedAt).toLocaleString() : null;

  return (
    <div className="space-y-3">
      {meta && (generatedLabel || meta.source || meta?.warning) && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs text-white/70">
          <div className="flex flex-col gap-1">
            <span className="text-white">
              Last updated {generatedLabel ?? 'n/a'}{meta.source ? ` • Source: ${meta.source}` : ''}
            </span>
            {meta.warning && <span className="text-amber-200">{meta.warning}</span>}
          </div>
        </div>
      )}

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

export const ThresholdAlertList = ({ alerts }: { alerts: ThresholdAlert[] }) => {
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

export const InterventionSummaryPanel = ({
  summary,
  totals,
  topCampaigns,
  fallbackItems,
  loading = false,
}: {
  summary: InterventionSummary | null;
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

export const SegmentAlertList = ({ segments }: { segments: SegmentImpact[] }) => {
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

export const HeatmapHotspotList = ({ hotspots }: { hotspots: Array<{ day: string; block: string; count: number }> }) => {
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