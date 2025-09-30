"use client";

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { FiArrowRight, FiMail, FiPlus, FiUsers } from '@/icons';
import { QueueItem } from '@/types/admin/interventions';

interface Props {
  items: QueueItem[];
  loading?: boolean;
  onSelect: (item: QueueItem) => void;
}

const ManualCandidateRow = ({ item, onSelect }: { item: QueueItem; onSelect: (item: QueueItem) => void }) => {
  const name = item.user_name || item.user_email || 'Unassigned user';
  const severity = item.severity_level ?? 'n/a';
  const riskPercent = item.risk_score != null ? `${Math.round(item.risk_score * 100)}%` : '--';
  const recommended = item.recommended_action ?? 'Schedule safety coaching';
  const scheduledLabel = formatDistanceToNow(new Date(item.scheduled_at), { addSuffix: true });

  return (
    <tr className="text-xs text-white/80">
      <td className="py-3 pr-4">
        <div className="font-semibold text-white">{name}</div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-white/50">
          <span>Severity: {severity}</span>
          <span>Risk: {riskPercent}</span>
        </div>
      </td>
      <td className="py-3 pr-4 text-white/70">{recommended}</td>
      <td className="py-3 pr-4 text-white/60">{scheduledLabel}</td>
      <td className="py-3 pr-4">
        <div className="flex flex-wrap items-center gap-2">
          {item.user_email && (
            <a
              href={`mailto:${item.user_email}`}
              className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
            >
              <FiMail className="h-3.5 w-3.5" />
              Email
            </a>
          )}
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
          >
            <FiPlus className="h-3.5 w-3.5" />
            Schedule coaching
          </button>
        </div>
      </td>
    </tr>
  );
};

export function ManualInterventionCandidates({ items, loading = false, onSelect }: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FiUsers className="h-5 w-5 text-amber-200" />
          <div>
            <h2 className="text-lg font-semibold text-white">Safety coaching candidates</h2>
            <p className="text-xs text-white/60">Students better served by guided human outreach than automated campaigns.</p>
          </div>
        </div>
        <Link
          href="/admin/insights"
          className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/70 transition hover:border-white/30 hover:text-white"
        >
          View supporting insights
          <FiArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {loading ? (
        <div className="h-32 animate-pulse rounded-2xl border border-white/10 bg-white/5" />
      ) : items.length ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-white/50">
                <th className="py-3 pr-4">Student</th>
                <th className="py-3 pr-4">Recommended action</th>
                <th className="py-3 pr-4">Flagged</th>
                <th className="py-3 pr-4">Next steps</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {items.map((item) => (
                <ManualCandidateRow key={`${item.user_id ?? item.user_email ?? item.scheduled_at}`} item={item} onSelect={onSelect} />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/60">
          No manual safety coaching sessions are recommended right now. Continue monitoring triage alerts for new escalations.
        </div>
      )}
    </section>
  );
}
