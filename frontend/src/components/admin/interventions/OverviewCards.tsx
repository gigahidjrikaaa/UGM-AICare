"use client";

import { type ReactNode } from "react";
import { FiActivity, FiAlertTriangle, FiRefreshCw, FiUsers } from "react-icons/fi";
import { InterventionOverview } from "@/types/admin/interventions";
import clsx from "clsx";

interface OverviewCardsProps {\n  overview: InterventionOverview | null;\n  onRefresh: () => void;\n  onCreateManual?: () => void;\n}

const summaryCard = (
  title: string,
  value: string | number,
  icon: ReactNode,
  accent?: "primary" | "warning" | "success" | "neutral",
) => (
  <div
    key={title}
    className={clsx(
      "relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-5 shadow-sm backdrop-blur",
      accent === "primary" && "border-[#4C8BF5]/40 bg-[#4C8BF5]/10",
      accent === "warning" && "border-[#FF8A4C]/40 bg-[#FF8A4C]/10",
      accent === "success" && "border-[#4CF5AC]/40 bg-[#4CF5AC]/10",
    )}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm uppercase tracking-wide text-white/60">{title}</p>
        <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white/80">
        {icon}
      </div>
    </div>
  </div>
);

export function OverviewCards({ overview, onRefresh, onCreateManual }: OverviewCardsProps) {
  const campaignSummary = overview?.campaign_summary;
  const executionSummary = overview?.execution_summary;

  return (
    <section className="mb-8">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-white">Intervention Panel</h1>
          <p className="mt-1 text-sm text-white/60">
            Coordinate human-in-the-loop outreach and tune the intervention agent.
          </p>
        </div>
        <div className="flex items-center gap-3">\n          {onCreateManual && (\n            <button\n              type="button"\n              onClick={onCreateManual}\n              className="inline-flex items-center gap-2 rounded-lg border border-[#4CF5AC]/50 bg-[#4CF5AC]/20 px-4 py-2 text-sm font-semibold text-[#4CF5AC] transition hover:border-[#4CF5AC]/70"
            >
              Create manual intervention
            </button>
          )}
          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/20"
          >
            <FiRefreshCw className="h-4 w-4" /> Refresh
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCard(
          "Active Campaigns",
          campaignSummary ? campaignSummary.active : "-",
          <FiActivity className="h-5 w-5" />,
          "primary",
        )}
        {summaryCard(
          "Pending Reviews",
          executionSummary ? executionSummary.pending_review : "-",
          <FiAlertTriangle className="h-5 w-5" />,
          "warning",
        )}
        {summaryCard(
          "Daily Outreach Limit",
          overview ? overview.daily_send_limit : "-",
          <FiUsers className="h-5 w-5" />,
          "success",
        )}
        {summaryCard(
          "Automation",
          overview ? (overview.automation_enabled ? "Enabled" : "Manual") : "-",
          <FiActivity className="h-5 w-5" />,
        )}
      </div>

      {overview && (
        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-white/60">
          <span>
            Human review required: {overview.human_review_required ? "Yes" : "No"}
          </span>
          <span>
            Risk threshold: {Math.round(overview.risk_score_threshold * 100)}%
          </span>
          <span>
            Channels: {overview.channels_enabled.length ? overview.channels_enabled.join(", ") : "-"}
          </span>
          <span>
            Last updated {new Date(overview.last_updated).toLocaleString()}
          </span>
        </div>
      )}
    </section>
  );
}

