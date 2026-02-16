"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FiArrowLeft, FiExternalLink, FiRefreshCw, FiShield } from "@/icons";

import { listProofActions, type ProofActionItem } from "@/services/proofApi";

function statusColor(status: string): string {
  switch (status) {
    case "confirmed":
      return "text-emerald-300";
    case "running":
      return "text-blue-300";
    case "awaiting_approval":
      return "text-yellow-300";
    case "failed":
    case "dead_letter":
      return "text-red-300";
    default:
      return "text-white";
  }
}

export default function ProofPage() {
  const [items, setItems] = useState<ProofActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const response = await listProofActions({ limit: 100 });
      setItems(response.items);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {
      // ignored here; empty state handles fallback
    });
  }, []);

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-5xl space-y-6 px-4 pb-12 pt-24">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-white/60">Verification</p>
            <h1 className="text-3xl font-semibold text-white">Proof Timeline</h1>
            <p className="mt-2 text-sm text-white/60">
              Track the lifecycle of policy-governed autopilot actions.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => load()}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-[#FFCA40] hover:text-[#FFCA40]"
            >
              <FiRefreshCw className="h-4 w-4" />
              Refresh
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/70 transition hover:border-[#FFCA40] hover:text-[#FFCA40]"
            >
              <FiArrowLeft className="h-4 w-4" />
              Back
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          {loading ? (
            <div className="py-8 text-center text-white/70">Loading timeline...</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-white/70">No autopilot actions found yet.</div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="text-xs text-white/60">Action #{item.id}</p>
                      <p className="text-lg font-semibold text-white">{item.action_type}</p>
                      <p className="text-sm text-white/70">
                        Risk: <span className="text-white">{item.risk_level}</span>
                        {" · "}
                        Policy: <span className="text-white">{item.policy_decision}</span>
                        {" · "}
                        Status: <span className={statusColor(item.status)}>{item.status}</span>
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        Created: {new Date(item.created_at).toLocaleString()}
                        {item.executed_at ? ` · Executed: ${new Date(item.executed_at).toLocaleString()}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.explorer_tx_url ? (
                        <a
                          href={item.explorer_tx_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-300"
                        >
                          <FiExternalLink className="h-4 w-4" />
                          Explorer
                        </a>
                      ) : item.tx_hash ? (
                        <span className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-xs text-white/70">
                          <FiShield className="h-4 w-4" />
                          {item.tx_hash.slice(0, 10)}...
                        </span>
                      ) : null}
                    </div>
                  </div>
                  {item.approval_notes && <p className="mt-2 text-sm text-white/70">Review note: {item.approval_notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
