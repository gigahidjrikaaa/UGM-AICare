"use client";

import { useState } from "react";
import { FiCheck, FiClock, FiExternalLink, FiThumbsDown } from "react-icons/fi";
import { InterventionExecution } from "@/types/admin/interventions";
import clsx from "clsx";

interface ReviewQueueProps {
  executions: InterventionExecution[];
  loading?: boolean;
  onUpdate: (executionId: number, status: string, notes?: string) => Promise<void>;
  onManual?: (execution: InterventionExecution) => void;
}

const ACTIONS: { label: string; status: string; icon: React.ComponentType<{ className?: string }>; tone: "approve" | "complete" | "fail" }[] = [
  { label: "Approve", status: "approved", icon: FiCheck, tone: "approve" },
  { label: "Mark Complete", status: "completed", icon: FiCheck, tone: "complete" },
  { label: "Needs follow-up", status: "pending_review", icon: FiClock, tone: "approve" },
  { label: "Decline", status: "failed", icon: FiThumbsDown, tone: "fail" },
];

export function ReviewQueue({ executions, loading, onUpdate, onManual }: ReviewQueueProps) {
  const [actionNotes, setActionNotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<Record<number, boolean>>({});

  const handleAction = async (executionId: number, status: string) => {
    setSubmitting((prev) => ({ ...prev, [executionId]: true }));
    try {
      await onUpdate(executionId, status, actionNotes[executionId]);
      setActionNotes((prev) => ({ ...prev, [executionId]: "" }));
    } finally {
      setSubmitting((prev) => ({ ...prev, [executionId]: false }));
    }
  };

  return (
    <section className="mb-10 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
  <FiExternalLink className="h-5 w-5 text-[#FFCA40]" />
  <h2 className="text-lg font-semibold text-white">Safety coaching review queue</h2>
      </div>

      {executions.length === 0 ? (
        <div className="rounded-lg border border-dashed border-white/20 bg-white/5 p-5 text-sm text-white/60">
          {loading ? "Loading queue…" : "No items waiting for review."}
        </div>
      ) : (
        <div className="space-y-4">
          {executions.map((execution) => (
            <div
              key={execution.id}
              className="rounded-lg border border-white/10 bg-[#001840]/60 p-4 text-sm text-white/80 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="font-semibold text-white">{execution.user_name || execution.user_email || `User #${execution.user_id}`}</div>
                <span className="rounded-full border border-[#FFCA40]/40 bg-[#FFCA40]/10 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-[#FFCA40]">
                  {execution.status.replace(/_/g, " ")}
                </span>
                <span className="text-xs text-white/40">
                  Scheduled {new Date(execution.scheduled_at).toLocaleString()}
                </span>
                {execution.delivery_method && (
                  <span className="text-xs text-white/50">Channel: {execution.delivery_method}</span>
                )}
              </div>
              <div className="mt-2 text-xs text-white/60">
                Campaign: {execution.campaign_title || `#${execution.campaign_id}`} ({execution.priority || "medium"})
              </div>
              <textarea
                value={actionNotes[execution.id] ?? execution.notes ?? ""}
                onChange={(event) => setActionNotes((prev) => ({ ...prev, [execution.id]: event.target.value }))}
                placeholder="Reviewer notes or escalation context"
                rows={2}
                className="mt-3 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-xs text-white focus:border-[#4C8BF5] focus:outline-none"
              />
              <div className="mt-3 flex flex-wrap gap-2">
                {onManual && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-1.5 text-xs text-white/70 transition hover:border-[#4CF5AC]/50"
                    onClick={() => onManual(execution)}
                  >
                    Launch safety coaching
                  </button>
                )}
                {ACTIONS.map(({ label, status, icon: Icon, tone }) => (
                  <button
                    key={status}
                    type="button"
                    disabled={submitting[execution.id]}
                    onClick={() => handleAction(execution.id, status)}
                    className={clsx(
                      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      tone === "approve" && "border-[#4C8BF5]/40 bg-[#4C8BF5]/15 text-[#4C8BF5] hover:border-[#4C8BF5]/60",
                      tone === "complete" && "border-[#4CF5AC]/40 bg-[#4CF5AC]/15 text-[#4CF5AC] hover:border-[#4CF5AC]/60",
                      tone === "fail" && "border-[#FF8A4C]/40 bg-[#FF8A4C]/15 text-[#FF8A4C] hover:border-[#FF8A4C]/60",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}


