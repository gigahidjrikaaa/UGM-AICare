"use client";

import { useEffect, useMemo, useState } from "react";
import { FiSettings, FiSave } from "react-icons/fi";
import { InterventionSettings } from "@/types/admin/interventions";
import clsx from "clsx";

interface SettingsCardProps {
  settings: InterventionSettings | null;
  onSave: (payload: Partial<InterventionSettings>) => Promise<void>;
  saving?: boolean;
}

const CHANNEL_OPTIONS = ["email", "sms", "whatsapp", "line", "push"];

export function SettingsCard({ settings, onSave, saving }: SettingsCardProps) {
  const [formState, setFormState] = useState({
    auto_mode_enabled: false,
    human_review_required: true,
    risk_score_threshold: 0.7,
    daily_send_limit: 25,
    channels_enabled: [] as string[],
    escalation_email: "",
    office_hours_start: "09:00",
    office_hours_end: "17:00",
    manual_notes: "",
  });
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setFormState({
        auto_mode_enabled: settings.auto_mode_enabled,
        human_review_required: settings.human_review_required,
        risk_score_threshold: settings.risk_score_threshold,
        daily_send_limit: settings.daily_send_limit,
        channels_enabled: settings.channels_enabled ?? [],
        escalation_email: settings.escalation_email ?? "",
        office_hours_start: settings.office_hours_start ?? "09:00",
        office_hours_end: settings.office_hours_end ?? "17:00",
        manual_notes: settings.manual_notes ?? "",
      });
      setDirty(false);
    }
  }, [settings]);

  const handleToggle = (field: "auto_mode_enabled" | "human_review_required") => {
    setFormState((prev) => {
      setDirty(true);
      return { ...prev, [field]: !prev[field] };
    });
  };

  const handleChannelToggle = (channel: string) => {
    setFormState((prev) => {
      const channels = prev.channels_enabled.includes(channel)
        ? prev.channels_enabled.filter((c) => c !== channel)
        : [...prev.channels_enabled, channel];
      setDirty(true);
      return { ...prev, channels_enabled: channels };
    });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!dirty) return;
    await onSave(formState);
    setDirty(false);
  };

  return (
    <section className="mb-8 rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <FiSettings className="h-5 w-5 text-[#4C8BF5]" />
        <h2 className="text-lg font-semibold text-white">Agent Settings</h2>
      </div>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-[#4C8BF5] focus:ring-[#4C8BF5]"
              checked={formState.auto_mode_enabled}
              onChange={() => handleToggle("auto_mode_enabled")}
            />
            <span>
              <span className="block font-medium text-white">Enable automated interventions</span>
              <span className="text-white/60">
                When enabled, the intervention agent can send pre-approved outreach automatically within configured guardrails.
              </span>
            </span>
          </label>

          <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/80">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent text-[#FF8A4C] focus:ring-[#FF8A4C]"
              checked={formState.human_review_required}
              onChange={() => handleToggle("human_review_required")}
            />
            <span>
              <span className="block font-medium text-white">Require human review before send</span>
              <span className="text-white/60">
                Keep the human-in-the-loop for sensitive interventions. Disable to allow auto-send for low-risk cohorts.
              </span>
            </span>
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs uppercase tracking-wide text-white/50">Risk score threshold</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={formState.risk_score_threshold}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, risk_score_threshold: Number(event.target.value) }));
                setDirty(true);
              }}
              className="mt-2 w-full"
            />
            <div className="mt-1 text-xs text-white/60">
              Trigger manual review when risk score exceeds {(formState.risk_score_threshold * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-wide text-white/50">Daily outreach limit</label>
            <input
              type="number"
              min={1}
              max={500}
              value={formState.daily_send_limit}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, daily_send_limit: Number(event.target.value) }));
                setDirty(true);
              }}
              className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
            />
            <div className="mt-1 text-xs text-white/60">Hard ceiling on automated sends per 24 hours.</div>
          </div>
        </div>

        <div>
          <span className="block text-xs uppercase tracking-wide text-white/50">Delivery channels</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {CHANNEL_OPTIONS.map((channel) => {
              const enabled = formState.channels_enabled.includes(channel);
              return (
                <button
                  type="button"
                  key={channel}
                  onClick={() => handleChannelToggle(channel)}
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-medium transition",
                    enabled
                      ? "bg-[#4C8BF5]/20 text-[#4C8BF5] border border-[#4C8BF5]/50"
                      : "border border-white/20 text-white/60 hover:border-white/40",
                  )}
                >
                  {channel.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-xs uppercase tracking-wide text-white/50">Escalation email</label>
            <input
              type="email"
              value={formState.escalation_email}
              onChange={(event) => {
                setFormState((prev) => ({ ...prev, escalation_email: event.target.value }));
                setDirty(true);
              }}
              placeholder="counseling@ugm.ac.id"
              className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-white/50">Office hours start</label>
              <input
                type="time"
                value={formState.office_hours_start}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, office_hours_start: event.target.value }));
                  setDirty(true);
                }}
                className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-white/50">Office hours end</label>
              <input
                type="time"
                value={formState.office_hours_end}
                onChange={(event) => {
                  setFormState((prev) => ({ ...prev, office_hours_end: event.target.value }));
                  setDirty(true);
                }}
                className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wide text-white/50">Playbook notes</label>
          <textarea
            value={formState.manual_notes}
            onChange={(event) => {
              setFormState((prev) => ({ ...prev, manual_notes: event.target.value }));
              setDirty(true);
            }}
            rows={3}
            className="mt-2 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
            placeholder="Internal guidance for admins reviewing interventions. Visible to human reviewers only."
          />
        </div>

        <div className="flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/50">
          <div>
            Last updated: {settings ? new Date(settings.updated_at).toLocaleString() : "—"}
          </div>
          <button
            type="submit"
            disabled={!dirty || saving}
            className={clsx(
              "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition",
              dirty
                ? "border border-[#4C8BF5]/40 bg-[#4C8BF5]/20 text-[#4C8BF5] hover:border-[#4C8BF5]/60"
                : "border border-white/10 bg-white/5 text-white/50",
            )}
          >
            <FiSave className="h-4 w-4" /> Save settings
          </button>
        </div>
      </form>
    </section>
  );
}
