'use client';

import { motion } from 'framer-motion';
import { ExclamationTriangleIcon, FireIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import type { AlertItem } from '@/types/admin/dashboard';
import { EASE } from './primitives';

interface AlertsFeedProps {
  alerts: AlertItem[];
  maxItems?: number;
}

const severityConfig = {
  critical: {
    icon: FireIcon,
    chip: 'bg-red-500/10 text-red-300 ring-red-500/20',
    label: 'Critical',
    dot: 'bg-red-400',
  },
  high: {
    icon: ExclamationTriangleIcon,
    chip: 'bg-orange-500/10 text-orange-300 ring-orange-500/20',
    label: 'High',
    dot: 'bg-orange-400',
  },
  medium: {
    icon: ExclamationTriangleIcon,
    chip: 'bg-amber-400/10 text-amber-300 ring-amber-400/20',
    label: 'Medium',
    dot: 'bg-amber-400',
  },
};

export function AlertsFeed({ alerts, maxItems = 10 }: AlertsFeedProps) {
  const displayAlerts = alerts.slice(0, maxItems);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pb-4 pt-5">
        <div className="flex items-center gap-2.5">
          <h3 className="text-sm font-semibold tracking-tight text-white">Critical Alerts</h3>
          {alerts.length > 0 && (
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-red-400" />
            </span>
          )}
        </div>
        <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/55 ring-1 ring-white/10">
          {alerts.length} active
        </span>
      </div>

      {/* Alerts List */}
      <div className="flex-1 divide-y divide-white/[0.06]">
        {displayAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-white/60">No active critical alerts</p>
            <p className="text-xs text-white/35">All systems running smoothly</p>
          </div>
        ) : (
          displayAlerts.map((alert, index) => {
            const config = severityConfig[alert.severity as keyof typeof severityConfig] || severityConfig.medium;
            const Icon = config.icon;
            const timeAgo = getTimeAgo(new Date(alert.created_at));

            return (
              <motion.div
                key={alert.case_id}
                initial={{ opacity: 0, x: -16, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                transition={{ duration: 0.7, ease: EASE, delay: 0.15 + index * 0.06 }}
              >
                <Link
                  href={`/admin/cases?case_id=${alert.case_id}`}
                  className="group flex items-start gap-4 px-6 py-4 transition-colors duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.04]"
                >
                  {/* Icon chip */}
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ring-1 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105 ${config.chip}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-start justify-between gap-4">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
                          <span className={`text-[10px] font-semibold uppercase tracking-[0.15em] ${config.chip.split(' ')[1]}`}>
                            {config.label}
                          </span>
                          <span className="text-xs tabular-nums text-white/35">{timeAgo}</span>
                        </div>
                        {alert.summary && (
                          <p className="line-clamp-2 text-sm leading-snug text-white/70">
                            {alert.summary}
                          </p>
                        )}
                      </div>

                      <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-[#FFCA40]/80 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:text-[#FFCA40]">
                        View
                        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                          <path d="M3 9L9 3M9 3H4.5M9 3v4.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-2.5 text-xs tabular-nums text-white/35">
                      <span>Case #{alert.case_id.slice(0, 8)}</span>
                      {alert.session_id && (
                        <>
                          <span className="h-0.5 w-0.5 rounded-full bg-white/25" />
                          <span>Session {alert.session_id.slice(0, 8)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>

      {/* View All Link */}
      {alerts.length > maxItems && (
        <div className="border-t border-white/[0.06] px-6 py-3">
          <Link
            href="/admin/cases?filter=critical"
            className="group inline-flex items-center gap-1.5 text-xs font-medium text-white/55 transition-colors duration-500 hover:text-[#FFCA40]"
          >
            View all {alerts.length} alerts
            <svg viewBox="0 0 12 12" className="h-3 w-3 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5" fill="none" aria-hidden>
              <path d="M3 6h6M6.5 3.5L9 6l-2.5 2.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      )}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}
