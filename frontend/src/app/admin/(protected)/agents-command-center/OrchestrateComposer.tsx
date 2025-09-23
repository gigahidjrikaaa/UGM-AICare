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
    <div className="flex flex-col gap-4" aria-label="Natural language orchestrator input section">
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
        <div className="text-sm text-[#FFCA40] font-medium flex items-center gap-2">
          🤖 <span>Orchestrate Mode</span>
        </div>
        <div className="text-xs text-gray-400">Enter to submit • Shift+Enter for newline</div>
      </div>
      
      <div className="flex gap-4 items-start">
        <div className="flex-1 relative">
          <textarea
            ref={taRef}
            className={`w-full resize-none leading-relaxed bg-white/5 backdrop-blur-md border ${
              draft.error ? 'border-red-400' : 'border-white/10'
            } rounded-xl px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent min-h-[80px] max-h-[200px] transition-all duration-200`}
            placeholder="💬 Ask a question... e.g., How many high risk triage assessments last week?"
            value={draft.question}
            onChange={e=> setQuestion(e.target.value.slice(0,500))}
            onKeyDown={e=> {
              if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); handleSubmit(); }
            }}
            aria-label="Orchestrator natural language question input"
          />
          {draft.error && (
            <div className="absolute -bottom-6 left-0 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
              {draft.error}
            </div>
          )}
        </div>
        
        <div className="w-48 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4" aria-label="Agent override selector">
          <label className="text-xs font-medium text-gray-300 mb-2 block">🎯 Route Control</label>
          <select
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent mb-3"
            value={draft.agentOverride}
            onChange={e=> onChange({ ...draft, agentOverride: e.target.value as OrchestrateDraft['agentOverride'] })}
            aria-label="Agent override"
          >
            <option value="auto">🤖 Auto-Route</option>
            <option value="triage">🏥 Triage</option>
            <option value="analytics">📊 Analytics</option>
            <option value="intervention" disabled>🎯 Intervention (soon)</option>
          </select>
          
          <button
            onClick={handleSubmit}
            disabled={disabled || draft.loading}
            className="w-full px-4 py-3 rounded-lg bg-[#FFCA40] text-[#001D58] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFCA40]/90 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] transition-all duration-200 shadow-lg"
          >
            {draft.loading ? '🔄 Processing...' : '🚀 Ask Orchestrator'}
          </button>
        </div>
      </div>
      
      <div className="text-sm text-gray-400 p-3 bg-white/5 rounded-lg border border-white/10">
        💡 The orchestrator intelligently routes questions to the most suitable agent or uses your manual selection.
      </div>
    </div>
  );
};

export default OrchestrateComposer;
