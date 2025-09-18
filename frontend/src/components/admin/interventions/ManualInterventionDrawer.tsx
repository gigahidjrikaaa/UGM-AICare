"use client";

import { useEffect, useState } from "react";
import { FiSend, FiX } from "react-icons/fi";
import { InterventionCampaign, ManualInterventionPayload, QueueItem } from "@/types/admin/interventions";
import clsx from "clsx";

const nowLocal = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

interface ManualInterventionDrawerProps {
  open: boolean;
  onClose: () => void;
  campaigns: InterventionCampaign[];
  onSubmit: (payload: ManualInterventionPayload) => Promise<void>;
  initialUser?: QueueItem | null;
}

const DELIVERY_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone call" },
];

export function ManualInterventionDrawer({ open, onClose, campaigns, onSubmit, initialUser }: ManualInterventionDrawerProps) {
  const [formState, setFormState] = useState<ManualInterventionPayload>({
    user_id: initialUser?.user_id ?? 0,
    campaign_id: initialUser?.campaign_id ?? undefined,
    title: initialUser?.recommended_action ?? "",
    message: "",
    delivery_method: initialUser?.delivery_method ?? "email",
    scheduled_at: nowLocal(),
    notes: initialUser?.notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFormState((prev) => ({
        user_id: initialUser?.user_id ?? prev.user_id ?? 0,
        campaign_id: initialUser?.campaign_id ?? undefined,
        title: initialUser?.recommended_action ?? prev.title ?? "",
        message: prev.message ?? "",
        delivery_method: initialUser?.delivery_method ?? prev.delivery_method ?? "email",
        scheduled_at: nowLocal(),
        notes: initialUser?.notes ?? prev.notes ?? "",
      }));
    }  }, [open, initialUser]);

  const canSubmit = formState.user_id > 0 && (formState.campaign_id || formState.title);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({
        ...formState,
        scheduled_at: formState.scheduled_at ? new Date(formState.scheduled_at).toISOString() : undefined,
        ...(initialUser
          ? {
              risk_score: initialUser.risk_score,
              severity_level: initialUser.severity_level,
              recommended_action: initialUser.recommended_action,
              source_status: initialUser.status,
            }
          : {}),
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className={clsx(
        "fixed inset-0 z-40 flex items-center justify-end bg-black/40 backdrop-blur transition-opacity",
        open ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
      )}
    >
      <div
        className={clsx(
          "h-full w-full max-w-lg transform border-l border-white/10 bg-[#00122F] p-6 text-white shadow-xl transition-transform duration-200",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Manual intervention</h2>
          <button onClick={onClose} className="rounded-full border border-white/10 p-2 text-white/60 hover:border-white/40 hover:text-white" title="Close drawer" aria-label="Close manual intervention drawer">
            <FiX className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-5 text-sm text-white/60">
          Trigger a targeted outreach with human context. Use an existing campaign template or provide a custom message.
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="user-id" className="block text-xs uppercase tracking-wide text-white/50">User ID</label>
            <input
              id="user-id"
              type="number"
              min={1}
              value={formState.user_id}
              onChange={(event) => setFormState((prev) => ({ ...prev, user_id: Number(event.target.value) }))}
              className="mt-2 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
              placeholder="Enter user id"
              required
              aria-label="User ID"
            />
          </div>

          <div>
            <label htmlFor="campaign-select" className="block text-xs uppercase tracking-wide text-white/50">Use existing campaign</label>
            <select
              id="campaign-select"
              value={formState.campaign_id ?? ""}
              onChange={(event) =>
                setFormState((prev) => ({
                  ...prev,
                  campaign_id: event.target.value ? Number(event.target.value) : undefined,
                }))
              }
              className="mt-2 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
              aria-label="Use existing campaign"
            >
              <option value="" className="bg-[#00122F]">
                -- Create ad-hoc intervention --
              </option>
              {campaigns.map((campaign) => (
                <option key={campaign.id} value={campaign.id} className="bg-[#00122F]">
                  {campaign.title} ({campaign.status})
                </option>
              ))}
            </select>
          </div>

          {!formState.campaign_id && (
            <>
              <div>
                <label htmlFor="subject-title" className="block text-xs uppercase tracking-wide text-white/50">Subject / call-to-action</label>
                <input
                  id="subject-title"
                  type="text"
                  value={formState.title ?? ""}
                  onChange={(event) => setFormState((prev) => ({ ...prev, title: event.target.value }))}
                  className="mt-2 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
                  placeholder="Invitation to counseling session"
                  aria-label="Subject / call-to-action"
                />
              </div>
              <div>
                <label htmlFor="intervention-message" className="block text-xs uppercase tracking-wide text-white/50">Message</label>
                <textarea
                  id="intervention-message"
                  value={formState.message ?? ""}
                  onChange={(event) => setFormState((prev) => ({ ...prev, message: event.target.value }))}
                  rows={4}
                  className="mt-2 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
                  placeholder="Hi {{first_name}}, we noticed ..."
                  aria-label="Message"
                />
              </div>
            </>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label htmlFor="delivery-method" className="block text-xs uppercase tracking-wide text-white/50">Delivery method</label>
              <select
                id="delivery-method"
                value={formState.delivery_method ?? "email"}
                onChange={(event) => setFormState((prev) => ({ ...prev, delivery_method: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
                aria-label="Delivery method"
              >
                {DELIVERY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value} className="bg-[#00122F]">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="schedule-for" className="block text-xs uppercase tracking-wide text-white/50">Schedule for</label>
              <input
                id="schedule-for"
                type="datetime-local"
                value={formState.scheduled_at}
                onChange={(event) => setFormState((prev) => ({ ...prev, scheduled_at: event.target.value }))}
                className="mt-2 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
                aria-label="Schedule for"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reviewer-notes" className="block text-xs uppercase tracking-wide text-white/50">Reviewer notes</label>
            <textarea
              id="reviewer-notes"
              value={formState.notes ?? ""}
              onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
              rows={3}
              className="mt-2 w-full rounded-lg border border-white/20 bg-transparent px-3 py-2 text-sm text-white focus:border-[#4C8BF5] focus:outline-none"
              placeholder="Additional context for outreach owner"
              aria-label="Reviewer notes"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm text-white/70 hover:border-white/40"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className={clsx(
                "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition",
                canSubmit
                  ? "border-[#4CF5AC]/60 bg-[#4CF5AC]/20 text-[#4CF5AC] hover:border-[#4CF5AC]/80"
                  : "border-white/10 bg-white/5 text-white/40",
              )}
            >
              <FiSend className="h-4 w-4" />
              Launch intervention
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}













