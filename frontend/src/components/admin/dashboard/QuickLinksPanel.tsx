'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ExclamationTriangleIcon,
  HeartIcon,
  ChartBarIcon,
  CpuChipIcon,
  Cog6ToothIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { EASE, staggerChild, staggerParent } from './primitives';

interface QuickLinkItem {
  href: string;
  label: string;
  description: string;
  icon: ReactNode;
}

const QUICK_LINKS: QuickLinkItem[] = [
  {
    href: '/admin/cases',
    label: 'Cases',
    description: 'Manage high-priority and active mental health cases',
    icon: <ExclamationTriangleIcon className="h-4 w-4 text-red-300" aria-hidden="true" />,
  },
  {
    href: '/admin/conversations',
    label: 'Conversations',
    description: 'Review user-agent interactions and escalation logs',
    icon: <ChatBubbleLeftRightIcon className="h-4 w-4 text-cyan-300" aria-hidden="true" />,
  },
  {
    href: '/admin/users',
    label: 'Users',
    description: 'Inspect user cohorts and account-level diagnostics',
    icon: <UsersIcon className="h-4 w-4 text-blue-300" aria-hidden="true" />,
  },
  {
    href: '/admin/screening',
    label: 'Screening',
    description: 'Track intake quality, triage rate, and screening outcomes',
    icon: <HeartIcon className="h-4 w-4 text-pink-300" aria-hidden="true" />,
  },
  {
    href: '/admin/insights',
    label: 'Insights',
    description: 'Access generated reports and intervention recommendations',
    icon: <ChartBarIcon className="h-4 w-4 text-amber-300" aria-hidden="true" />,
  },
  {
    href: '/admin/langgraph',
    label: 'LangGraph',
    description: 'Monitor agent health, parse failures, and system alerts',
    icon: <CpuChipIcon className="h-4 w-4 text-violet-300" aria-hidden="true" />,
  },
  {
    href: '/admin/autopilot',
    label: 'Autopilot',
    description: 'Audit queued actions, approvals, and automation outcomes',
    icon: <SparklesIcon className="h-4 w-4 text-emerald-300" aria-hidden="true" />,
  },
  {
    href: '/admin/settings',
    label: 'Settings',
    description: 'Configure platform controls and operational thresholds',
    icon: <Cog6ToothIcon className="h-4 w-4 text-slate-300" aria-hidden="true" />,
  },
];

export function QuickLinksPanel() {
  return (
    <section
      aria-label="Admin quick links"
      className="rounded-[2rem] bg-white/[0.04] p-1.5 ring-1 ring-white/10"
    >
      <div className="rounded-[calc(2rem-0.375rem)] bg-[#020b22]/80 p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)] md:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-tight text-white">Admin Features</h2>
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/35">
            Fast navigation
          </p>
        </div>

        <motion.div
          variants={staggerParent}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          {QUICK_LINKS.map((link) => (
            <motion.div key={link.href} variants={staggerChild}>
              <Link
                href={link.href}
                className="group flex items-center justify-between gap-3 rounded-2xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.06] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.06] hover:ring-white/15 active:scale-[0.99]"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.06] ring-1 ring-white/10 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-105">
                    {link.icon}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white">{link.label}</div>
                    <p className="mt-0.5 truncate text-xs text-white/50 transition-colors duration-500 group-hover:text-white/70">
                      {link.description}
                    </p>
                  </div>
                </div>

                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/40 ring-1 ring-white/[0.08] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-[1px] group-hover:bg-[#FFCA40]/15 group-hover:text-[#FFCA40]">
                  <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
                    <path
                      d="M3 9L9 3M9 3H4.5M9 3v4.5"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
