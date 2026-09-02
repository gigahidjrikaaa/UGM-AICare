'use client';

import { motion } from 'framer-motion';
import { Bezel, EASE } from './primitives';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    direction: 'up' | 'down';
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  severity?: 'critical' | 'warning' | 'success' | 'info';
}

const severityShell = {
  critical: 'ring-red-500/25 bg-red-500/[0.06]',
  warning: 'ring-amber-400/25 bg-amber-400/[0.05]',
  success: 'ring-emerald-400/20 bg-emerald-400/[0.04]',
  info: 'ring-white/10 bg-white/[0.04]',
};

const severityValue = {
  critical: 'text-red-300',
  warning: 'text-amber-300',
  success: 'text-emerald-300',
  info: 'text-[#FFCA40]',
};

const severityChip = {
  critical: 'bg-red-500/10 text-red-300 ring-red-500/20',
  warning: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
  success: 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20',
  info: 'bg-[#FFCA40]/10 text-[#FFCA40] ring-[#FFCA40]/20',
};

export function KPICard({ title, value, subtitle, trend, icon, severity = 'info' }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, ease: EASE }}
      whileHover={{ y: -4 }}
      className="group h-full"
    >
      <Bezel shellClassName={severityShell[severity]} className="h-full">
        <div className="relative flex h-full flex-col justify-between overflow-hidden p-6">
          {/* Corner glow — opacity only, GPU-safe */}
          <div
            aria-hidden
            className={`pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-40 blur-[70px] transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:opacity-70 ${
              severity === 'critical'
                ? 'bg-red-500/25'
                : severity === 'warning'
                  ? 'bg-amber-400/25'
                  : severity === 'success'
                    ? 'bg-emerald-400/20'
                    : 'bg-[#FFCA40]/20'
            }`}
          />

          <div className="relative flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45">
                {title}
              </div>
              <div
                className={`text-4xl font-bold tracking-tight tabular-nums ${severityValue[severity]}`}
              >
                {value}
              </div>
            </div>

            {icon && (
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105 group-hover:-translate-y-[1px] ${severityChip[severity]}`}
              >
                {icon}
              </div>
            )}
          </div>

          {(subtitle || trend) && (
            <div className="relative mt-6 flex items-center justify-between gap-3 text-xs">
              {subtitle && <span className="text-white/45">{subtitle}</span>}

              {trend && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium tabular-nums ${
                    trend.direction === 'up'
                      ? 'bg-emerald-400/10 text-emerald-300'
                      : 'bg-red-500/10 text-red-300'
                  }`}
                >
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                    <path
                      d={trend.direction === 'up' ? 'M6 10V2M6 2L2.5 5.5M6 2l3.5 3.5' : 'M6 2v8M6 10l3.5-3.5M6 10L2.5 6.5'}
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {trend.value.toFixed(1)}
                  {trend.label || '%'}
                </span>
              )}
            </div>
          )}
        </div>
      </Bezel>
    </motion.div>
  );
}
