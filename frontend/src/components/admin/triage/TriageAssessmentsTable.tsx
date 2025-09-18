"use client";

import clsx from "clsx";
import { formatDistanceToNow } from "date-fns";
import { TriageAssessmentItem } from "@/types/admin/triage";

type Props = {
  items: TriageAssessmentItem[];
  loading: boolean;
  onLoadMore?: () => void;
  canLoadMore?: boolean;
};

const badgeStyles: Record<string, string> = {
  low: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
  medium: "bg-amber-500/15 text-amber-200 border border-amber-400/30",
  high: "bg-rose-500/20 text-rose-200 border border-rose-400/30",
  critical: "bg-rose-600/20 text-rose-100 border border-rose-400/40",
};

export function TriageAssessmentsTable({ items, loading, onLoadMore, canLoadMore }: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-white">Recent assessments</h3>
          <p className="text-xs text-white/60">Latest triage decisions with confidence scores</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-white/50">
              <th className="py-3 pr-4">User</th>
              <th className="py-3 pr-4">Severity</th>
              <th className="py-3 pr-4">Risk</th>
              <th className="py-3 pr-4">Confidence</th>
              <th className="py-3 pr-4">Recommended action</th>
              <th className="py-3 pr-4">Assessed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {items.map((item) => {
              const severityKey = item.severity_level.toLowerCase();
              const badgeClass = badgeStyles[severityKey] ?? "bg-white/10 text-white";
              const riskPercent = `${Math.round(item.risk_score * 100)}%`;
              const confidencePercent = `${Math.round(item.confidence_score * 100)}%`;
              return (
                <tr key={item.id} className="text-xs text-white/80">
                  <td className="py-3 pr-4">
                    <div className="font-medium text-white">
                      {item.user_name || item.email || "Unknown user"}
                    </div>
                    {item.message_excerpt && (
                      <p className="mt-1 max-w-md truncate text-white/50">{item.message_excerpt}</p>
                    )}
                  </td>
                  <td className="py-3 pr-4">
                    <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-semibold", badgeClass)}>
                      {item.severity_level}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="font-semibold text-white">{riskPercent}</span>
                    {item.processing_time_ms !== null && (
                      <p className="text-[10px] text-white/40">{item.processing_time_ms} ms</p>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-white/80">{confidencePercent}</td>
                  <td className="py-3 pr-4 text-white/70">{item.recommended_action ?? "�"}</td>
                    <td className="py-3 pr-4 text-white/70">{item.recommended_action ?? "N/A"}</td>
                  <td className="py-3 pr-4 text-white/60">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </td>
                </tr>
              );
            })}

            {!items.length && !loading && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-sm text-white/50">
                  No triage assessments found for the selected filters.
                </td>
              </tr>
            )}

            {loading && (
              <tr>
                <td colSpan={6} className="py-10 text-center text-sm text-white/60">
                  Loading assessments...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {onLoadMore && (items.length > 0 || canLoadMore) && (
        <div className="mt-4 flex justify-end">
          <button
            onClick={onLoadMore}
            disabled={loading || !canLoadMore}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
            type="button"
          >
            {loading ? "Loading..." : canLoadMore ? "Load more" : "All caught up"}
          </button>
        </div>
      )}
    </section>
  );
}
