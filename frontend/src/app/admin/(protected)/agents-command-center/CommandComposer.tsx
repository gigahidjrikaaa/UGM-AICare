'use client';
import React, { useCallback, useEffect, useRef } from 'react';

interface CommandDraft { agent: string; action: string; data?: Record<string, unknown>; raw?: string; error?: string | null; }

interface Props {
  connectionState: 'connecting' | 'open' | 'closed' | 'error';
  draft: CommandDraft;
  onChange: (d: CommandDraft) => void;
  onSubmit: () => Promise<void> | void;
}

// Slash command syntax:
// /agent action {optional JSON}
// Examples:
// /triage classify {"text":"Hello"}
// /analytics summarize {"days":7}
// action-only (keep existing agent): / classify {"text":"Hi"}

const AGENTS = ['triage','intervention','analytics'];

function parseSlash(raw: string, current: CommandDraft): CommandDraft {
  const trimmed = raw.trim();
  if(!trimmed.startsWith('/')) return { ...current, raw, error: null };
  // split by space while preserving JSON block
  const match = trimmed.match(/^\/([^\s]+)?(?:\s+([^\s{]+))?(?:\s+(\{[\s\S]*\}))?$/);
  if(!match) return { ...current, raw, error: 'Invalid slash format' };
  const agent = match[1] || current.agent;
  const action = match[2] || current.action;
  let data: Record<string, unknown> | undefined = current.data;
  let error: string | null = null;
  if(agent && !AGENTS.includes(agent)) {
    error = `Unknown agent: ${agent}`;
  }
  if(match[3]) {
    try { data = JSON.parse(match[3]); }
    catch { error = 'Invalid JSON payload'; }
  }
  return { ...current, raw, agent, action, data, error };
}

const CommandComposer: React.FC<Props> = ({ connectionState, draft, onChange, onSubmit }) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const parsed = parseSlash(value, draft);
    onChange(parsed);
  }, [draft, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if((e.key === 'Enter' && (e.metaKey || e.ctrlKey))) {
      e.preventDefault();
      if(!draft.error) void onSubmit();
    }
  }, [draft.error, onSubmit]);

  useEffect(() => {
    if(textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [draft.raw]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
        <div className="text-sm text-gray-300 font-medium flex items-center gap-4">
          <span className="flex items-center gap-2">
            ⚙️ <span className="text-white font-semibold">{draft.agent}</span>
          </span>
          <span className="text-gray-500">•</span>
          <span className="flex items-center gap-2">
            🎯 <span className="text-white font-semibold">{draft.action}</span>
          </span>
        </div>
        <div className="text-xs text-gray-400">⌘ + Enter to dispatch</div>
      </div>
      
      <div className="relative">
        <textarea
          ref={textareaRef}
          className={`w-full resize-none leading-relaxed bg-white/5 backdrop-blur-md border ${
            draft.error ? 'border-red-400' : 'border-white/10'
          } rounded-xl px-4 py-3 text-white font-mono placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent min-h-[80px] max-h-[200px] transition-all duration-200`}
          placeholder={`⚡ Slash Command Format:\n/triage classify {"text":"Hello"}\n/analytics summarize {"days":7}\n\nType / to start...`}
          value={draft.raw || ''}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          aria-label="Command composer multiline input"
        />
        {draft.error && (
          <div className="absolute -bottom-6 left-0 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded border border-red-500/20">
            ❌ {draft.error}
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <button
            onClick={() => { if(!draft.error) void onSubmit(); }}
            disabled={connectionState !== 'open' || !!draft.error || !(draft.raw && draft.raw.trim())}
            className="px-6 py-3 rounded-lg bg-[#FFCA40] text-[#001D58] text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#FFCA40]/90 focus:outline-none focus:ring-2 focus:ring-[#FFCA40] transition-all duration-200 shadow-lg flex items-center gap-2"
          >
            🚀 Dispatch Command
          </button>
          <button
            onClick={() => onChange({ agent: draft.agent, action: draft.action, data: undefined, raw: '', error: null })}
            className="px-4 py-3 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 hover:text-white border border-white/10 transition-all duration-200 flex items-center gap-2"
          >
            🗑️ Clear
          </button>
        </div>
        
        <div className="text-xs text-gray-400 p-2 bg-white/5 rounded border border-white/10">
          💡 Format: <code className="text-[#FFCA40]">/agent action &#123;json&#125;</code>
        </div>
      </div>
    </div>
  );
};

export default CommandComposer;
