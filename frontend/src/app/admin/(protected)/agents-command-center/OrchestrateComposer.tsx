"use client";
import React, { useCallback, useRef, useEffect } from 'react';

export interface OrchestrateDraft {
  question: string;
  agentOverride: 'auto' | 'triage' | 'analytics' | 'intervention';
  loading?: boolean;
  error?: string | null;
}

interface Props {
  disabled?: boolean;
  draft: OrchestrateDraft;
  onChange: (d: OrchestrateDraft) => void;
  onSubmit: (d: OrchestrateDraft) => Promise<void> | void;
}

const OrchestrateComposer: React.FC<Props> = ({ disabled, draft, onChange, onSubmit }) => {
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const setQuestion = useCallback((q: string) => onChange({ ...draft, question: q, error: q.trim() ? null : draft.error }), [draft, onChange]);

  const handleSubmit = useCallback(() => {
    if(draft.loading) return;
    if(!draft.question.trim()) {
      onChange({ ...draft, error: 'Question is required' });
      return;
    }
    void onSubmit(draft);
  }, [draft, onChange, onSubmit]);

  useEffect(() => {
    if(taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = taRef.current.scrollHeight + 'px';
    }
  }, [draft.question]);

  return (
    <div className="flex flex-col gap-2 mb-3" aria-label="Natural language orchestrator input section">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400 font-mono">Mode: <span className="text-white">Orchestrate</span></div>
        <div className="text-[10px] text-gray-500">Enter to submit • Shift+Enter newline</div>
      </div>
      <div className="flex gap-2 items-start">
        <div className="flex-1 relative">
          <textarea
            ref={taRef}
            className={`w-full resize-none leading-relaxed bg-[#1E1F25] border ${draft.error ? 'border-red-500' : 'border-[#2A2C33]'} rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40] min-h-[70px] max-h-[200px]`}
            placeholder="Ask a question... e.g. How many high risk triage assessments last week?"
            value={draft.question}
            onChange={e=> setQuestion(e.target.value.slice(0,500))}
            onKeyDown={e=> {
              if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSubmit(); }
            }}
            aria-label="Orchestrator natural language question input"
          />
          {draft.error && <div className="absolute -bottom-5 left-0 text-[10px] text-red-400">{draft.error}</div>}
        </div>
        <div className="w-40 flex flex-col gap-1" aria-label="Agent override selector">
          <label className="text-[10px] uppercase tracking-wide text-gray-500">Route</label>
          <select
            className="bg-[#1E1F25] border border-[#2A2C33] rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]"
            value={draft.agentOverride}
            onChange={e=> onChange({ ...draft, agentOverride: e.target.value as OrchestrateDraft['agentOverride'] })}
            aria-label="Agent override"
          >
            <option value="auto">Auto</option>
            <option value="triage">Triage</option>
            <option value="analytics">Analytics</option>
            <option value="intervention" disabled>Intervention (soon)</option>
          </select>
          <button
            onClick={handleSubmit}
            disabled={disabled || draft.loading}
            className="mt-2 px-3 py-2 rounded bg-[#FFCA40] text-black text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFCA40]"
          >
            {draft.loading ? 'Asking…' : 'Ask Orchestrator'}
          </button>
        </div>
      </div>
      <div className="text-[10px] text-gray-500">The orchestrator will auto-route or use your selected agent.</div>
    </div>
  );
};

export default OrchestrateComposer;
