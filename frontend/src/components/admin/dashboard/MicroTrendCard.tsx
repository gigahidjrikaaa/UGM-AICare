'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import { EASE } from './primitives';

interface MicroTrendPoint {
  date: string;
  value: number;
}

interface MicroTrendCardProps {
  title: string;
  value: string;
  subtitle: string;
  data: MicroTrendPoint[];
  color: 'blue' | 'green' | 'purple' | 'cyan' | 'amber';
  /** Optional icon displayed in the header, used when there is no sparkline (e.g. point-in-time stats) */
  icon?: ReactNode;
}

const colorMap = {
  blue: '#5B8DEF',
  green: '#34D399',
  purple: '#A78BFA',
  cyan: '#22D3EE',
  amber: '#FFCA40',
} as const;

function getTrendDirection(values: number[]): 'up' | 'down' | 'flat' {
  if (values.length < 2) return 'flat';
  const previous = values[values.length - 2];
  const current = values[values.length - 1];
  if (current > previous) return 'up';
  if (current < previous) return 'down';
  return 'flat';
}

function calculateDeltaPercent(values: number[]): number {
  if (values.length < 2 || values[values.length - 2] === 0) return 0;
  const previous = values[values.length - 2];
  const current = values[values.length - 1];
  return ((current - previous) / previous) * 100;
}

function MiniTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-full bg-white/[0.08] px-2.5 py-1 text-xs tabular-nums text-white ring-1 ring-white/15 backdrop-blur-sm">
      {payload[0].value.toFixed(1)}
    </div>
  );
}

export function MicroTrendCard({ title, value, subtitle, data, color, icon }: MicroTrendCardProps) {
  const values = data.map((point) => point.value);
  const direction = getTrendDirection(values);
  const delta = Math.abs(calculateDeltaPercent(values));
  const hasSparkline = data.length > 1;
  const accent = colorMap[color];

  return (
    <motion.article
      initial={{ opacity: 0, y: 20, filter: 'blur(6px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, ease: EASE }}
      className="group rounded-[1.5rem] bg-white/[0.04] p-1 ring-1 ring-white/10 transition-colors duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:ring-white/20"
      aria-label={`${title} metric`}
    >
      <div className="relative h-full overflow-hidden rounded-[calc(1.5rem-0.375rem)] bg-[#020b22]/80 p-4 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
        {/* Corner glow — opacity only */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-[50px] transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-60"
          style={{ backgroundColor: accent }}
        />

        <div className={`relative ${!hasSparkline ? '' : 'mb-3'} flex items-start justify-between gap-3`}>
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{title}</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums text-white">{value}</p>
            <p className="text-xs text-white/45">{subtitle}</p>
          </div>

          {/* Trend badge when sparkline data exists, icon chip otherwise */}
          {hasSparkline ? (
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${
                direction === 'up'
                  ? 'bg-emerald-400/10 text-emerald-300'
                  : direction === 'down'
                    ? 'bg-red-500/10 text-red-300'
                    : 'bg-white/[0.06] text-white/55'
              }`}
            >
              <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                {direction === 'flat' ? (
                  <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                ) : (
                  <path
                    d={direction === 'up' ? 'M6 10V2M6 2L2.5 5.5M6 2l3.5 3.5' : 'M6 2v8M6 10l3.5-3.5M6 10L2.5 6.5'}
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
              {direction === 'flat' ? 'Stable' : `${delta.toFixed(1)}%`}
            </span>
          ) : (
            icon && (
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-white/70 ring-1 ring-white/10">
                {icon}
              </div>
            )
          )}
        </div>

        {hasSparkline && (
          <div className="relative h-16 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`spark-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={accent} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={accent} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip content={<MiniTooltip />} cursor={false} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={accent}
                  strokeWidth={1.5}
                  fill={`url(#spark-${title.replace(/\s+/g, '-')})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </motion.article>
  );
}
