"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { FiCheckCircle, FiExternalLink, FiRefreshCw, FiXCircle, FiCpu } from "react-icons/fi";

import {
  approveAutopilotAction,
  listAutopilotActions,
  rejectAutopilotAction,
  type AdminAutopilotAction,
} from "@/services/adminAutopilotApi";

const REVIEWABLE = new Set(["awaiting_approval"]);

export default function AdminAutopilotPage() {
  const [items, setItems] = useState<AdminAutopilotAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("awaiting_approval");
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listAutopilotActions({ status: statusFilter || undefined, limit: 100 });
      setItems(response.items);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load autopilot actions");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load().catch(() => {
      // handled above
    });
  }, [load]);

  const reviewableCount = useMemo(
    () => items.filter((item) => REVIEWABLE.has(item.status)).length,
    [items],
  );

  const onApprove = async (action: AdminAutopilotAction) => {
    const note = window.prompt("Optional approval note") || undefined;
    try {
      setActingId(action.id);
      await approveAutopilotAction(action.id, note);
      toast.success(`Approved action #${action.id}`);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to approve action");
    } finally {
      setActingId(null);
    }
  };

  const onReject = async (action: AdminAutopilotAction) => {
    const note = window.prompt("Rejection note (required)");
    if (!note || !note.trim()) {
      return;
    }
    try {
      setActingId(action.id);
      await rejectAutopilotAction(action.id, note.trim());
      toast.success(`Rejected action #${action.id}`);
      await load();
    } catch (error) {
      console.error(error);
      toast.error("Failed to reject action");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
              <FiCpu className="text-[#FFCA40]" />
              Autopilot Queue
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Review and control policy-gated actions before execution.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-white/20 bg-[#001D58] px-3 py-2 text-sm text-white"
            >
              <option value="awaiting_approval">Awaiting approval</option>
              <option value="approved">Approved</option>
              <option value="running">Running</option>
              <option value="confirmed">Confirmed</option>
              <option value="failed">Failed</option>
              <option value="">All</option>
            </select>
            <button
              onClick={() => load()}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:border-[#FFCA40] hover:text-[#FFCA40]"
            >
              <FiRefreshCw /> Refresh
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-white/70">
          Actions in view: <span className="font-semibold text-white">{items.length}</span>
          {" · "}
          Awaiting approval: <span className="font-semibold text-[#FFCA40]">{reviewableCount}</span>
        </div>
      </div>

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">Loading...</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-white/70">
          No actions found for selected filter.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((action) => {
            const isReviewable = REVIEWABLE.has(action.status);
            const isActing = actingId === action.id;

            return (
              <div key={action.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-white/70">#{action.id}</p>
                    <p className="text-lg font-semibold text-white">{action.action_type}</p>
                    <p className="text-sm text-white/70">
                      Risk: <span className="text-white">{action.risk_level}</span>
                      {" · "}
                      Policy: <span className="text-white">{action.policy_decision}</span>
                      {" · "}
                      Status: <span className="text-[#FFCA40]">{action.status}</span>
                    </p>
                    {action.error_message && <p className="text-sm text-red-300">{action.error_message}</p>}
                    {action.approval_notes && <p className="text-sm text-white/70">Note: {action.approval_notes}</p>}
                    {action.explorer_tx_url && (
                      <Link
                        href={action.explorer_tx_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-emerald-300 hover:text-emerald-200"
                      >
                        <FiExternalLink className="h-4 w-4" />
                        Explorer tx
                      </Link>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onApprove(action)}
                      disabled={!isReviewable || isActing}
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-500/20 px-3 py-2 text-sm text-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FiCheckCircle /> Approve
                    </button>
                    <button
                      onClick={() => onReject(action)}
                      disabled={!isReviewable || isActing}
                      className="inline-flex items-center gap-2 rounded-lg bg-red-500/20 px-3 py-2 text-sm text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FiXCircle /> Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
