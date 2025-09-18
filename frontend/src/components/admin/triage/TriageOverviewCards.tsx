"use client";

import { FiActivity, FiClock, FiRefreshCcw } from "react-icons/fi";
import { formatDistanceToNow } from "date-fns";
import { TriageOverview } from "@/types/admin/triage";

type Props = {
  overview?: TriageOverview;
  loading: boolean;
  onRefresh: () => void;
};

const severityPalette: Record<string, string> = {
  low: "text-emerald-300",
  medium: "text-amber-300",
  high: "text-rose-300",
  critical: "text-rose-400",
};

export function TriageOverviewCards({ overview, loading, onRefresh }: Props) {
  const severityCards = (overview?.severity_breakdown ?? []).map((entry) => {
    const color = severityPalette[entry.severity.toLowerCase()] ?? "text-white";
    return (
      <div key={entry.severity} className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner">
        <p className="text-xs uppercase tracking-wide text-white/60">{entry.severity}</p>
        <p className={`mt-2 text-2xl font-semibold ${color}`}>{entry.count}</p>
      </div>
    );
  });

  const lastUpdatedLabel = overview?.last_assessment_at
    ? formatDistanceToNow(new Date(overview.last_assessment_at), { addSuffix: true })
    : "No data";

  const averageRiskLabel = overview?.average_risk_score !== null && overview?.average_risk_score !== undefined
    ? `${Math.round(overview.average_risk_score * 100)}%`
    : "N/A";

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FiActivity className="h-5 w-5 text-[#38BDF8]" />
          <h2 className="text-lg font-semibold text-white">Triage Activity</h2>
        </div>
        <button
          onClick={onRefresh}
          className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
          type="button"
        >
          <FiRefreshCcw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner">
          <p className="text-xs uppercase tracking-wide text-white/60">Assessments (last {overview?.timeframe_days ?? 7}d)</p>
          <p className="mt-2 text-3xl font-semibold text-white">{overview?.total_assessments ?? 0}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner">
          <p className="text-xs uppercase tracking-wide text-white/60">High Severity cases</p>
          <p className="mt-2 text-3xl font-semibold text-rose-300">{overview?.high_severity_count ?? 0}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner">
          <p className="text-xs uppercase tracking-wide text-white/60">Average Risk Score</p>
          <p className="mt-2 text-3xl font-semibold text-amber-200">{averageRiskLabel}</p>
          <p className="mt-2 text-[11px] text-white/50">
            {overview?.processing?.average_ms ? `Avg processing: ${Math.round(overview.processing.average_ms)} ms` : "Processing data unavailable"}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner">
          <p className="text-xs uppercase tracking-wide text-white/60 flex items-center gap-2">
            <FiClock className="h-4 w-4" />
            Last Assessment
          </p>
          <p className="mt-2 text-base font-medium text-white">{lastUpdatedLabel}</p>
          {overview?.processing?.max_ms && (
            <p className="mt-2 text-[11px] text-white/50">Max processing: {overview.processing.max_ms} ms</p>
          )}
        </div>
      </div>

      {severityCards.length > 0 && (
        <div className="mt-5">
          <p className="mb-3 text-xs uppercase tracking-wide text-white/50">Severity distribution</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{severityCards}</div>
        </div>
      )}
    </section>
  );
}
