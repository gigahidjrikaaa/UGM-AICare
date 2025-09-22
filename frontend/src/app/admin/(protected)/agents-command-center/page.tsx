import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Metadata } from 'next';
import { FiCommand, FiActivity, FiWifiOff } from 'react-icons/fi';

export const metadata: Metadata = {
  title: 'Admin: Agents Command Center',
};

import { AgentsWSClient, AgentStreamEvent } from '@/lib/agents/wsClient';
import { AgentCommandDispatcher } from '@/lib/agents/dispatcher';

interface StreamEvent extends AgentStreamEvent { content?: string; error?: string; }

interface CommandDraft {
  agent: string;
  action: string;
  data?: Record<string, unknown>;
}

const WS_URL = process.env.NEXT_PUBLIC_BACKEND_WS_BASE?.replace(/\/$/, '') + '/api/v1/agents/ws';
const API_BASE = process.env.NEXT_PUBLIC_BACKEND_BASE?.replace(/\/$/, '') + '/api/v1/agents';

const AgentsCommandCenterPage: React.FC = () => {
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [draft, setDraft] = useState<CommandDraft>({ agent: 'triage', action: 'classify' });
  const wsClientRef = useRef<AgentsWSClient | null>(null);
  const dispatcherRef = useRef<AgentCommandDispatcher | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!WS_URL) return;
    const client = new AgentsWSClient({
      url: WS_URL,
      onEvent: (e) => setEvents(prev => [...prev, e]),
      onStatusChange: setConnectionState,
    });
    wsClientRef.current = client;
    client.connect();
    dispatcherRef.current = new AgentCommandDispatcher(API_BASE);
    return () => client.close();
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events]);

  const sendCommand = useCallback(async () => {
    const dispatcher = dispatcherRef.current;
    if(!dispatcher) return;
    try {
      const optimistic = dispatcher.buildOptimisticEvent({ agent: draft.agent, action: draft.action, data: draft.data });
      setEvents(prev => [...prev, { ...optimistic, content: `Dispatching ${draft.agent}.${draft.action}` }]);
      const result = await dispatcher.send({ agent: draft.agent, action: draft.action, data: draft.data });
      setEvents(prev => [...prev, { type: 'client_ack', correlationId: result.correlationId, runId: result.runId, status: result.status, ts: new Date().toISOString() }]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setEvents(prev => [...prev, { type: 'error', error: message, ts: new Date().toISOString() }]);
    }
  }, [draft]);

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="text-3xl font-bold text-white flex items-center">
          <FiCommand className="mr-3 text-[#FFCA40]" />
          Agents Command Center
        </h1>
        <p className="text-gray-400 mt-1">Dispatch commands and monitor real-time agent events.</p>
      </header>

      <section className="grid md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33] flex items-center justify-between">
          <div className="text-sm text-gray-300">Connection</div>
          <div className="flex items-center gap-2">
            {connectionState === 'open' ? <FiActivity className="text-green-400" /> : <FiWifiOff className="text-red-400" />}
            <span className={`text-sm ${connectionState === 'open' ? 'text-green-400' : 'text-red-400'}`}>{connectionState}</span>
          </div>
        </div>
        {/* Placeholder stat cards for future per-agent status */}
        <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33]" aria-hidden>
          <div className="text-sm text-gray-300">Triage Agent</div>
          <div className="text-lg font-semibold text-white">Idle</div>
        </div>
        <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33]" aria-hidden>
          <div className="text-sm text-gray-300">Intervention Agent</div>
          <div className="text-lg font-semibold text-white">Idle</div>
        </div>
        <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33]" aria-hidden>
          <div className="text-sm text-gray-300">Analytics Agent</div>
          <div className="text-lg font-semibold text-white">Idle</div>
        </div>
      </section>

      <section className="grid md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col h-[600px]">
          <div className="flex items-end gap-3 mb-3">
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Agent</label>
              <select
                aria-label="Agent selector"
                className="bg-[#1E1F25] border border-[#2A2C33] rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]"
                value={draft.agent}
                onChange={e => setDraft(d => ({ ...d, agent: e.target.value }))}
              >
                <option value="triage">triage</option>
                <option value="intervention">intervention</option>
                <option value="analytics">analytics</option>
              </select>
            </div>
            <div>
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">Action</label>
              <input
                className="bg-[#1E1F25] border border-[#2A2C33] rounded px-3 py-2 text-sm text-white w-40 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]"
                value={draft.action}
                onChange={e => setDraft(d => ({ ...d, action: e.target.value }))}
                placeholder="action"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs uppercase tracking-wide text-gray-400 mb-1">JSON Payload (optional)</label>
              <input
                className="bg-[#1E1F25] border border-[#2A2C33] rounded px-3 py-2 text-sm text-white w-full focus:outline-none focus:ring-2 focus:ring-[#FFCA40] font-mono"
                onChange={e => {
                  try {
                    const parsed = e.target.value ? JSON.parse(e.target.value) : undefined;
                    setDraft(d => ({ ...d, data: parsed }));
                  } catch {
                    /* ignore parse errors for now */
                  }
                }}
                placeholder='{"key":"value"}'
              />
            </div>
            <button
              onClick={sendCommand}
              className="h-10 px-5 rounded bg-[#FFCA40] text-black text-sm font-semibold hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FFCA40] disabled:opacity-50"
              disabled={connectionState !== 'open'}
            >
              Dispatch
            </button>
          </div>
          <div
            ref={listRef}
            className="flex-1 overflow-auto rounded border border-[#2A2C33] bg-[#0F1013] p-3 space-y-2 text-sm"
            aria-label="Agent event stream"
          >
            {events.map((e: StreamEvent, i: number) => {
              const ts = typeof e.ts === 'string' ? e.ts : '';
              return (
                <div key={i} className="flex gap-2 items-start">
                  <span className="text-xs text-gray-500 mt-0.5">{ts}</span>
                  <pre className={`flex-1 whitespace-pre-wrap break-words font-mono text-[11px] ${e.type === 'error' ? 'text-red-400' : e.type === 'run_started' ? 'text-green-400' : 'text-gray-200'}`}>{JSON.stringify(e, null, 2)}</pre>
                </div>
              );
            })}
            {events.length === 0 && (
              <div className="text-gray-500 text-sm">No events yet. Dispatch a command to begin.</div>
            )}
          </div>
        </div>
        <aside className="space-y-4">
          <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33]">
            <h2 className="text-sm font-semibold text-white mb-2">Instructions</h2>
            <ul className="text-xs text-gray-400 space-y-1 list-disc pl-4">
              <li>Select an agent and action.</li>
              <li>Optional: provide JSON payload.</li>
              <li>Click Dispatch to create a run.</li>
              <li>Events will stream in real time.</li>
            </ul>
          </div>
          <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33]">
            <h2 className="text-sm font-semibold text-white mb-2">Next Steps (Planned)</h2>
            <ul className="text-xs text-gray-400 space-y-1 list-disc pl-4">
              <li>Token streaming</li>
              <li>Per-agent status panels</li>
              <li>Run history & persistence</li>
              <li>Cancellation & retries</li>
            </ul>
          </div>
        </aside>
      </section>
    </div>
  );
};

export default AgentsCommandCenterPage;
