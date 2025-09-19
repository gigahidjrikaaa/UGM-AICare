"use client";

import Link from 'next/link';
import { FiAlertTriangle, FiMail, FiPlus, FiArrowRight } from '@/icons';
import { formatDistanceToNow } from 'date-fns';
import { TriageCasePreview } from '@/types/admin/triage';

type Props = {
  items: TriageCasePreview[];
  onEscalate?: (item: TriageCasePreview) => void;
};

export function TriageHighRiskList({ items, onEscalate }: Props) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur" id="triage-high-risk">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FiAlertTriangle className="h-5 w-5 text-[#FF8A4C]" />
          <div>
            <h3 className="text-lg font-semibold text-white">Recent high-risk assessments</h3>
            <p className="text-xs text-white/60">Signals that may require manual follow-up</p>
          </div>
        </div>
        <Link
          href="#triage-assessments"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
        >
          See all assessments
          <FiArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-white/10 bg-white/10 p-4 text-sm shadow-inner"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">
                  {item.user_name || item.email || 'Unassigned user'}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-white/60">
                  <span className="font-medium text-rose-300">Severity: {item.severity_level}</span>
                  <span>Risk score: {(item.risk_score * 100).toFixed(0)}%</span>
                  {item.recommended_action && <span>Action: {item.recommended_action}</span>}
                </div>
              </div>
              <div className="text-xs text-white/50">
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-white/60">
              {item.email && (
                <a
                  href={`mailto:${item.email}`}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
                >
                  <FiMail className="h-3.5 w-3.5" />
                  Email student
                </a>
              )}
              <Link
                href="#triage-assessments"
                className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1 font-semibold text-white/70 transition hover:border-white/35 hover:text-white"
              >
                View full history
              </Link>
              {onEscalate && (
                <button
                  type="button"
                  onClick={() => onEscalate(item)}
                  className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-semibold text-white transition hover:border-white/40 hover:bg-white/15"
                >
                  <FiPlus className="h-3.5 w-3.5" />
                  Queue intervention
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
