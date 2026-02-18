"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiCpu,
  FiRefreshCw,
  FiSave,
  FiShield,
} from "react-icons/fi";

import {
  getAutopilotPolicy,
  updateAutopilotPolicy,
  type AdminAutopilotPolicy,
} from "@/services/adminAutopilotApi";

interface PolicyFormState {
  autopilot_enabled: boolean;
  onchain_placeholder: boolean;
  worker_interval_seconds: number;
  require_approval_high_risk: boolean;
  require_approval_critical_risk: boolean;
}

const ToggleRow = ({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) => {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-white">{label}</p>
          <p className="mt-1 text-xs text-white/60">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            checked ? "bg-emerald-500/70" : "bg-white/20"
          }`}
        >
          <span
            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default function AdminAutopilotPolicyPage() {
  const [policy, setPolicy] = useState<AdminAutopilotPolicy | null>(null);
  const [form, setForm] = useState<PolicyFormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPolicy = async () => {
    try {
      setLoading(true);
      const next = await getAutopilotPolicy();
      setPolicy(next);
      setForm({ ...next });
    } catch (error) {
      console.error(error);
      toast.error("Failed to load autopilot policy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy().catch(() => undefined);
  }, []);

  const hasChanges = useMemo(() => {
    if (!policy || !form) return false;
    return (
      policy.autopilot_enabled !== form.autopilot_enabled ||
      policy.onchain_placeholder !== form.onchain_placeholder ||
      policy.worker_interval_seconds !== form.worker_interval_seconds ||
      policy.require_approval_high_risk !== form.require_approval_high_risk ||
      policy.require_approval_critical_risk !== form.require_approval_critical_risk
    );
  }, [policy, form]);

  const updateForm = <K extends keyof PolicyFormState>(key: K, value: PolicyFormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const onSave = async () => {
    if (!form || !policy) return;
    try {
      setSaving(true);
      const updated = await updateAutopilotPolicy({
        autopilot_enabled: form.autopilot_enabled,
        onchain_placeholder: form.onchain_placeholder,
        worker_interval_seconds: form.worker_interval_seconds,
        require_approval_high_risk: form.require_approval_high_risk,
        require_approval_critical_risk: form.require_approval_critical_risk,
      });
      setPolicy(updated);
      setForm({ ...updated });
      toast.success("Autopilot policy updated");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update autopilot policy");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="rounded-xl border border-white/10 bg-white/5 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-white">
              <FiShield className="text-[#FFCA40]" />
              Autopilot Policy Control
            </h1>
            <p className="mt-1 text-sm text-white/70">
              Configure runtime policy for review gates and execution behavior.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadPolicy()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 px-3 py-2 text-sm text-white hover:border-[#FFCA40] hover:text-[#FFCA40]"
          >
            <FiRefreshCw /> Refresh
          </button>
        </div>
      </header>

      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-medium text-white">Flow and Decision Policy</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-white/70">
          <li>Agent proposes an action with risk metadata.</li>
          <li>Policy evaluates action type + risk to allow, require approval, or deny.</li>
          <li>Queue executes approved actions; review-required actions wait for human decision.</li>
          <li>If on-chain placeholder is off, execution attempts real blockchain transactions.</li>
        </ol>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-medium text-white">Policy Settings</h2>

        {loading || !form ? (
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
            Loading policy...
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            <ToggleRow
              label="Autopilot Enabled"
              description="Turns autopilot worker processing on or off."
              checked={form.autopilot_enabled}
              onChange={(value) => updateForm("autopilot_enabled", value)}
            />

            <ToggleRow
              label="On-chain Placeholder Mode"
              description="When enabled, on-chain actions are simulated using synthetic transaction hashes."
              checked={form.onchain_placeholder}
              onChange={(value) => updateForm("onchain_placeholder", value)}
            />

            <ToggleRow
              label="Require Approval: High Risk Check-ins"
              description="If enabled, high-risk check-in actions are blocked until manually approved."
              checked={form.require_approval_high_risk}
              onChange={(value) => updateForm("require_approval_high_risk", value)}
            />

            <ToggleRow
              label="Require Approval: Critical Risk Check-ins"
              description="If enabled, critical-risk check-in actions are blocked until manually approved."
              checked={form.require_approval_critical_risk}
              onChange={(value) => updateForm("require_approval_critical_risk", value)}
            />

            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <label htmlFor="worker-interval" className="block text-sm font-medium text-white">
                Worker Interval (seconds)
              </label>
              <p className="mt-1 text-xs text-white/60">Polling interval used by autopilot queue processor.</p>
              <input
                id="worker-interval"
                type="number"
                min={1}
                max={3600}
                value={form.worker_interval_seconds}
                onChange={(event) =>
                  updateForm(
                    "worker_interval_seconds",
                    Math.max(1, Number.parseInt(event.target.value || "1", 10) || 1),
                  )
                }
                className="mt-3 w-full rounded-lg border border-white/20 bg-[#001D58] px-3 py-2 text-sm text-white md:w-56"
              />
            </div>

            <div className="rounded-lg border border-amber-300/30 bg-amber-500/10 p-4 text-sm text-amber-100">
              <p className="flex items-start gap-2">
                <FiAlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                Runtime updates are applied to the active backend process. For persistent config, also update backend .env. Worker startup controls (enabled and interval) may require backend restart to fully take effect.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onSave()}
                disabled={!hasChanges || saving}
                className="inline-flex items-center gap-2 rounded-lg bg-[#FFCA40] px-4 py-2 text-sm font-medium text-[#001D58] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? <FiRefreshCw className="animate-spin" /> : <FiSave />}
                Save Policy
              </button>
              {!hasChanges && (
                <span className="inline-flex items-center gap-1 text-xs text-emerald-300">
                  <FiCheckCircle className="h-3.5 w-3.5" /> No pending changes
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="flex items-center gap-2 text-lg font-medium text-white">
          <FiCpu className="text-[#FFCA40]" /> Why Execution Mode shows Placeholder
        </h2>
        <p className="mt-2 text-sm text-white/70">
          The Autopilot Queue badge reads the backend field onchain_placeholder. If it is true, the UI shows Placeholder mode and the worker simulates transaction hashes.
        </p>
      </section>
    </div>
  );
}
