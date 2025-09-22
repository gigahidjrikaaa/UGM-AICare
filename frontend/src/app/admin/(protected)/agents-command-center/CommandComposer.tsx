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
    <div className="flex flex-col gap-2 mb-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400 font-mono">
          Agent: <span className="text-white">{draft.agent}</span> • Action: <span className="text-white">{draft.action}</span>
        </div>
        <div className="text-[10px] text-gray-500">Ctrl/⌘ + Enter to dispatch</div>
      </div>
      <div className="relative">
        <textarea
          ref={textareaRef}
          className={`w-full resize-none leading-relaxed bg-[#1E1F25] border ${draft.error ? 'border-red-500' : 'border-[#2A2C33]'} rounded px-3 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-[#FFCA40] min-h-[70px] max-h-[180px]`}
          placeholder={'/triage classify {"text":"Hello"}\nType / to start a slash command...'}
          value={draft.raw || ''}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          aria-label="Command composer multiline input"
        />
        {draft.error && <div className="absolute -bottom-5 left-0 text-[10px] text-red-400">{draft.error}</div>}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => { if(!draft.error) void onSubmit(); }}
          disabled={connectionState !== 'open' || !!draft.error || !(draft.raw && draft.raw.trim())}
          className="px-4 py-2 rounded bg-[#FFCA40] text-black text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFCA40]"
        >
          Dispatch
        </button>
        <button
          onClick={() => onChange({ agent: draft.agent, action: draft.action, data: undefined, raw: '', error: null })}
          className="px-3 py-2 rounded bg-[#2A2C33] text-xs text-gray-300 hover:bg-[#34363F]"
        >
          Clear
        </button>
        <div className="text-[10px] text-gray-500">Format: /agent action {`{json}`}</div>
      </div>
    </div>
  );
};

export default CommandComposer;
