"use client";

import { useMemo } from "react";
import { FiEdit2 } from "react-icons/fi";
import { InterventionCampaign } from "@/types/admin/interventions";
import clsx from "clsx";

interface CampaignTableProps {
  campaigns: InterventionCampaign[];
  onStatusChange: (campaignId: number, status: string) => void;
  loading?: boolean;
}

const STATUS_OPTIONS = ["draft", "active", "paused", "completed", "cancelled"];

export function CampaignTable({ campaigns, onStatusChange, loading }: CampaignTableProps) {
  const rows = useMemo(() => campaigns, [campaigns]);

  if (!loading && rows.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-sm text-white/60">
        No intervention campaigns found yet.
      </div>
    );
  }

  return (
    <section className="mb-8">
      <div className="mb-4 flex items-center gap-2">
        <FiEdit2 className="h-5 w-5 text-[#4C8BF5]" />
        <h2 className="text-lg font-semibold text-white">Campaigns</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-wider text-white/60">
            <tr>
              <th className="px-4 py-3">Title</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Audience</th>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Pending</th>
              <th className="px-4 py-3">Completed</th>
              <th className="px-4 py-3">Failed</th>
              <th className="px-4 py-3">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-white/80">
            {rows.map((campaign) => (
              <tr key={campaign.id} className="hover:bg-white/5">
                <td className="px-4 py-3">
                  <div className="font-medium text-white">{campaign.title}</div>
                  <div className="text-xs text-white/50 line-clamp-1">
                    {campaign.description || "No description"}
                  </div>
                </td>
                <td className="px-4 py-3 capitalize text-white/70">{campaign.campaign_type}</td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      campaign.priority === "high" && "bg-[#FF8A4C]/20 text-[#FF8A4C]",
                      campaign.priority === "medium" && "bg-[#4C8BF5]/20 text-[#4C8BF5]",
                      campaign.priority === "low" && "bg-white/10 text-white/60",
                    )}
                  >
                    {campaign.priority}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={campaign.status}
                    onChange={(event) => onStatusChange(campaign.id, event.target.value)}
                    className="rounded-md border border-white/20 bg-transparent px-2 py-1 text-xs text-white focus:border-[#4C8BF5] focus:outline-none"
                  >
                    {STATUS_OPTIONS.map((option) => (
                      <option key={option} value={option} className="bg-[#001D58] text-white">
                        {option}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-white/70">{campaign.target_audience_size}</td>
                <td className="px-4 py-3 text-white/70">{campaign.metrics.scheduled}</td>
                <td className="px-4 py-3 text-white/70">{campaign.metrics.pending_review}</td>
                <td className="px-4 py-3 text-white/70">{campaign.metrics.completed}</td>
                <td className="px-4 py-3 text-white/70">{campaign.metrics.failed}</td>
                <td className="px-4 py-3 text-xs text-white/50">
                  {new Date(campaign.updated_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {loading && (
        <div className="mt-3 text-xs text-white/60">Loading campaigns…</div>
      )}
    </section>
  );
}
