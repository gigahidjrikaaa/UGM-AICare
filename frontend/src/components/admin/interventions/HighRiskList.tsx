"use client";

import { FiAlertTriangle, FiPlus } from "react-icons/fi";
import { QueueItem } from "@/types/admin/interventions";

interface HighRiskListProps {
  items: QueueItem[];
  onCreateIntervention: (item: QueueItem) => void;
}

export function HighRiskList({ items, onCreateIntervention }: HighRiskListProps) {
  if (!items.length) {
    return null;
  }

  return (
    <section className="mb-8 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FiAlertTriangle className="h-5 w-5 text-[#FF8A4C]" />
          <h2 className="text-lg font-semibold text-white">High-Risk Alerts</h2>
        </div>
        <p className="text-xs text-white/60">Latest signal crossings from triage assessments</p>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={`risk-${item.execution_id ?? item.user_id ?? item.scheduled_at}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm"
          >
            <div>
              <div className="font-medium text-white">
                {item.user_name || item.user_email || "Unassigned user"}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                {item.risk_score != null && (
                  <span>Risk score: {(item.risk_score * 100).toFixed(0)}%</span>
                )}
                {item.severity_level && <span>Severity: {item.severity_level}</span>}
                {item.recommended_action && <span>Suggested: {item.recommended_action}</span>}
                <span>{new Date(item.scheduled_at).toLocaleString()}</span>
              </div>
            </div>
            <button
              onClick={() => onCreateIntervention(item)}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-white/40 hover:bg-white/20"
            >
              <FiPlus className="h-4 w-4" />
              Create safety plan
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
