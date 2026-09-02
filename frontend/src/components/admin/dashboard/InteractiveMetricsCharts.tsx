'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
  CartesianGrid,
  Legend,
  LineChart,
  Line,
} from 'recharts';
import type { DashboardOverview, TrendsResponse } from '@/types/admin/dashboard';
import { EASE } from './primitives';

const PIE_COLORS = ['#34D399', '#FFCA40', '#FB923C', '#F87171'];
const LINE_MUTED = 'rgba(255,255,255,0.22)';

function NumberTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-white/[0.08] px-3.5 py-2.5 text-xs text-white ring-1 ring-white/15 backdrop-blur-md">
      {label && <p className="mb-1 text-white/55">{label}</p>}
      {payload.map((item, index) => (
        <p key={`${item.name ?? 'metric'}-${index}`} className="tabular-nums">
          <span className="text-white/60">{item.name ?? 'Value'}</span> · {item.value.toFixed(1)}
        </p>
      ))}
    </div>
  );
}

interface InteractiveMetricsChartsProps {
  overview: DashboardOverview;
  trends: TrendsResponse | null;
}

export function InteractiveMetricsCharts({ overview, trends }: InteractiveMetricsChartsProps) {
  const [activeSeverity, setActiveSeverity] = useState<number>(0);
  const [caseMode, setCaseMode] = useState<'opened' | 'closed'>('opened');

  const severityData = useMemo(() => {
    const source = overview.insights.severity_distribution;
    if (!source) {
      return [];
    }

    return [
      { name: 'Low', value: source.low },
      { name: 'Medium', value: source.medium },
      { name: 'High', value: source.high },
      { name: 'Critical', value: source.critical },
    ].filter((item) => item.value > 0);
  }, [overview.insights.severity_distribution]);

  const topicData = useMemo(
    () => [...(overview.insights.trending_topics ?? [])].sort((a, b) => b.count - a.count).slice(0, 6),
    [overview.insights.trending_topics],
  );

  const lifecycleData = useMemo(() => {
    if (!trends) return [];

    const opened = trends.cases_opened_trend;
    const closed = trends.cases_closed_trend;

    return opened.map((point, index) => ({
      date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      opened: point.value ?? 0,
      closed: closed[index]?.value ?? 0,
    }));
  }, [trends]);

  const selectedCaseSeries = caseMode === 'opened' ? 'opened' : 'closed';

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-3" aria-label="Interactive dashboard charts">
      {/* Case Lifecycle */}
      <article className="rounded-[2rem] bg-white/[0.04] p-1.5 ring-1 ring-white/10 xl:col-span-2">
        <div className="rounded-[calc(2rem-0.375rem)] bg-[#020b22]/80 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] md:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold tracking-tight text-white">Case Lifecycle Trend</h3>
            {/* Fluid island toggle */}
            <div className="flex items-center rounded-full bg-white/[0.05] p-1 ring-1 ring-white/10">
              {(['opened', 'closed'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCaseMode(mode)}
                  className={`relative rounded-full px-4 py-1.5 text-xs font-medium capitalize transition-colors duration-500 ${
                    caseMode === mode ? 'text-[#00153a]' : 'text-white/55 hover:text-white'
                  }`}
                >
                  {caseMode === mode && (
                    <motion.span
                      layoutId="case-mode-pill"
                      transition={{ duration: 0.6, ease: EASE }}
                      className="absolute inset-0 rounded-full bg-[#FFCA40]"
                    />
                  )}
                  <span className="relative">{mode}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={lifecycleData}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 6" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={32} />
                <Tooltip content={<NumberTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.15)' }} />
                <Legend wrapperStyle={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }} iconType="plainline" />
                <Line type="monotone" dataKey="opened" stroke={LINE_MUTED} strokeWidth={1.5} dot={false} name="Opened" />
                <Line type="monotone" dataKey="closed" stroke={LINE_MUTED} strokeWidth={1.5} dot={false} name="Closed" />
                <Line
                  type="monotone"
                  dataKey={selectedCaseSeries}
                  stroke="#FFCA40"
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 4, fill: '#FFCA40', stroke: '#020b22', strokeWidth: 2 }}
                  name={caseMode === 'opened' ? 'Selected Opened' : 'Selected Closed'}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </article>

      {/* Risk Severity Mix */}
      <article className="rounded-[2rem] bg-white/[0.04] p-1.5 ring-1 ring-white/10">
        <div className="h-full rounded-[calc(2rem-0.375rem)] bg-[#020b22]/80 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] md:p-6">
          <h3 className="mb-4 text-sm font-semibold tracking-tight text-white">Risk Severity Mix</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={76}
                  activeIndex={activeSeverity}
                  onMouseEnter={(_, index) => setActiveSeverity(index)}
                  paddingAngle={3}
                  stroke="none"
                  cornerRadius={6}
                >
                  {severityData.map((entry, index) => (
                    <Cell key={`${entry.name}-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<NumberTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-3 space-y-1.5 text-xs">
            {severityData.length > 0 ? (
              severityData.map((item, index) => (
                <li key={item.name} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-white/65">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
                    {item.name}
                  </span>
                  <span className="tabular-nums text-white/45">{item.value}</span>
                </li>
              ))
            ) : (
              <li className="text-white/40">No severity data available</li>
            )}
          </ul>
        </div>
      </article>

      {/* Top Stressor Topics */}
      <article className="rounded-[2rem] bg-white/[0.04] p-1.5 ring-1 ring-white/10 xl:col-span-3">
        <div className="rounded-[calc(2rem-0.375rem)] bg-[#020b22]/80 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] md:p-6">
          <h3 className="mb-4 text-sm font-semibold tracking-tight text-white">Top Stressor Topics</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topicData} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 6" horizontal={false} />
                <XAxis type="number" stroke="rgba(255,255,255,0.35)" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                <YAxis
                  dataKey="topic"
                  type="category"
                  stroke="rgba(255,255,255,0.55)"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={130}
                />
                <Tooltip content={<NumberTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} name="Mentions">
                  {topicData.map((_, index) => (
                    <Cell
                      key={index}
                      fill={index === 0 ? '#FFCA40' : 'rgba(91,141,239,0.55)'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </article>
    </section>
  );
}
