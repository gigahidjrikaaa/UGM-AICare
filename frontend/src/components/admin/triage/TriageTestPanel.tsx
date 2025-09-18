"use client";

import { FormEvent, useState } from "react";
import { FiCpu, FiSend } from "react-icons/fi";
import { TriageTestResponse } from "@/types/admin/triage";

type Props = {
  loading: boolean;
  result: TriageTestResponse | null;
  onSubmit: (message: string) => Promise<void>;
};

export function TriageTestPanel({ loading, result, onSubmit }: Props) {
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }
    await onSubmit(message.trim());
  };

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <FiCpu className="h-5 w-5 text-[#38BDF8]" />
        <div>
          <h3 className="text-lg font-semibold text-white">Manual triage test</h3>
          <p className="text-xs text-white/60">Send a sample message to validate classifications</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Paste a user message to evaluate triage behaviour..."
          className="h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/40 focus:border-[#38BDF8] focus:outline-none focus:ring-2 focus:ring-[#38BDF8]/40"
        />
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-white/50">
            The triage agent runs the same pipeline used in production chats.
          </p>
          <button
            type="submit"
            disabled={loading || !message.trim()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <FiSend className={loading ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
            {loading ? "Classifying..." : "Run triage"}
          </button>
        </div>
      </form>

      {result && (
        <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/60 p-4 text-sm">
          <p className="text-xs uppercase tracking-wide text-white/60">Classification</p>
          <p className="mt-1 text-lg font-semibold text-white">{result.classification || "No label"}</p>

          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-white/60">Recommended resources</p>
            {result.recommended_resources.length ? (
              <ul className="mt-2 space-y-2">
                {result.recommended_resources.map((resource, index) => (
                  <li key={index} className="rounded-lg border border-white/10 bg-white/5 p-3 text-xs text-white/80">
                    <pre className="whitespace-pre-wrap break-words">
                      {JSON.stringify(resource, null, 2)}
                    </pre>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-white/50">No specific resources suggested.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
