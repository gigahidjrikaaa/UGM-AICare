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
  triage: "bg-amber-500/20 text-amber-300 border border-amber-400/40 backdrop-blur-sm",
  analytics: "bg-violet-500/20 text-violet-300 border border-violet-400/40 backdrop-blur-sm",
  intervention: "bg-teal-500/20 text-teal-300 border border-teal-400/40 backdrop-blur-sm",
};

const OrchestrateChat: React.FC<Props> = ({ messages, isLoading }) => {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-[540px] rounded-xl border border-white/20 bg-black/20 backdrop-blur-sm shadow-2xl">
      <div
        ref={scrollerRef}
        className="flex-1 overflow-auto p-6 space-y-4"
        aria-label="Orchestrator chat transcript"
      >
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">💬</div>
            <div className="text-gray-400 text-lg">Ready to chat!</div>
            <div className="text-gray-500 text-sm mt-2">Ask a question to get started with the AI orchestrator</div>
          </div>
        )}
        {messages.map((m) => {
          const isUser = m.role === "user";
          const isAssistant = m.role === "assistant";
          const resolved = typeof m.resolvedAgent === "string" ? m.resolvedAgent : undefined;
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-lg ${
                isUser ? 
                "bg-gradient-to-r from-purple-500 to-pink-500 text-white" : 
                "bg-white/10 backdrop-blur-md border border-white/20 text-gray-100"
              }`}>
                <div className="text-xs text-gray-300 mb-2 flex items-center gap-2">
                  <span>{isUser ? "👤 You" : "🤖 Assistant"}</span>
                  <span>•</span>
                  <span>{new Date(m.ts).toLocaleTimeString()}</span>
                </div>
                <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {m.content}
                </div>
                {isAssistant && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    {resolved && (
                      <span className={`text-xs px-3 py-1 rounded-full ${pillColor[resolved] || "bg-gray-500/20 text-gray-300 border border-gray-600/40"} font-medium`}
                        title="Agent selected by orchestrator"
                      >
                        🎯 {resolved}
                      </span>
                    )}
                    {m.pending && (
                      <span className="text-xs text-purple-300 flex items-center gap-2 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                        <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                        Processing...
                      </span>
                    )}
                  </div>
                )}
                {isAssistant && m.metrics && typeof m.metrics === "object" && (
                  <div className="mt-3 grid grid-cols-2 gap-2 p-3 bg-black/20 rounded-lg border border-white/10">
                    {Object.entries(m.metrics)
                      .filter(([, v]) => ["string", "number", "boolean"].includes(typeof v))
                      .map(([k, v]) => (
                        <div key={k} className="flex justify-between text-xs">
                          <span className="text-gray-400 truncate font-medium" title={k}>
                            {k}
                          </span>
                          <span className="text-purple-300 truncate font-mono" title={String(v)}>
                            {String(v)}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {isLoading && (
        <div className="p-4 border-t border-white/20 bg-gradient-to-r from-purple-500/10 to-blue-500/10 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-75"></div>
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
            </div>
            <span className="text-sm text-purple-300 font-medium">AI is thinking and routing your question...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrchestrateChat;

