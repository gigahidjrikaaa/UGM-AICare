"use client";
import React, { useEffect, useRef } from "react";

export interface OrchestrateChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  ts: string;
  correlationId?: string;
  runId?: number;
  resolvedAgent?: string;
  metrics?: Record<string, unknown>;
  pending?: boolean;
}

interface Props {
  messages: OrchestrateChatMessage[];
  isLoading?: boolean;
}

const pillColor: Record<string, string> = {
  triage: "bg-amber-500/15 text-amber-300 border border-amber-400/30",
  analytics: "bg-violet-500/15 text-violet-300 border border-violet-400/30",
  intervention: "bg-teal-500/15 text-teal-300 border border-teal-400/30",
};

const OrchestrateChat: React.FC<Props> = ({ messages, isLoading }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[540px] rounded border border-[#2A2C33] bg-[#0F1013]">
      <div
        ref={scrollerRef}
        className="flex-1 overflow-auto p-3 space-y-3"
        aria-label="Orchestrator chat transcript"
      >
        {messages.length === 0 && (
          <div className="text-gray-500 text-sm">
            Ask a question to get started.
          </div>
        )}
        {messages.map((m) => {
          const isUser = m.role === "user";
          const isAssistant = m.role === "assistant";
          const resolved = typeof m.resolvedAgent === "string" ? m.resolvedAgent : undefined;
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-lg px-3 py-2 ${isUser ? "bg-[#1E1F25] text-white" : "bg-[#14161B] text-gray-100"}`}>
                <div className="text-[10px] text-gray-500 mb-0.5">
                  {new Date(m.ts).toLocaleTimeString()}
                </div>
                <div className="whitespace-pre-wrap break-words text-sm">
                  {m.content}
                </div>
                {isAssistant && (
                  <div className="mt-2 flex items-center gap-2">
                    {resolved && (
                      <span className={`text-[10px] px-2 py-0.5 rounded ${pillColor[resolved] || "bg-gray-700/40 text-gray-300 border border-gray-600/40"}`}
                        title="Agent selected by orchestrator"
                      >
                        Resolved: {resolved}
                      </span>
                    )}
                    {m.pending && (
                      <span className="text-[10px] text-gray-400">thinking…</span>
                    )}
                  </div>
                )}
                {isAssistant && m.metrics && typeof m.metrics === "object" && (
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-gray-300">
                    {Object.entries(m.metrics)
                      .filter(([, v]) => ["string", "number", "boolean"].includes(typeof v))
                      .map(([k, v]) => (
                        <React.Fragment key={k}>
                          <div className="text-gray-500 truncate" title={k}>
                            {k}
                          </div>
                          <div className="truncate" title={String(v)}>
                            {String(v)}
                          </div>
                        </React.Fragment>
                      ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {isLoading && (
        <div className="p-2 border-t border-[#2A2C33] bg-black/30 text-xs text-gray-400 flex items-center gap-2">
          <div className="h-4 w-4 border-2 border-[#FFCA40] border-t-transparent rounded-full animate-spin" />
          Routing & analyzing…
        </div>
      )}
    </div>
  );
};

export default OrchestrateChat;

