'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import AccessGuard from '@/components/admin/AccessGuard';
import { FiCommand, FiActivity, FiWifiOff, FiGitMerge } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import CommandComposer from './CommandComposer';
import { AgentsWSClient, AgentStreamEvent } from '@/lib/agents/wsClient';
import { AgentCommandDispatcher } from '@/lib/agents/dispatcher';

interface StreamEvent extends AgentStreamEvent { content?: string; error?: string; token?: string; correlationId?: string; }
interface CommandDraft { agent: string; action: string; data?: Record<string, unknown>; raw?: string; error?: string | null; }
interface Run { id: string; agent: string; action: string; status: string; created_at: string; started_at?: string | null; completed_at?: string | null; }
interface RunMessage { id: string; role: string; type: string; content: string | null; metadata?: Record<string, unknown> | null; createdAt?: string | null; }

const backendHttpBase = (process.env.NEXT_PUBLIC_BACKEND_BASE || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const backendWsBase = (process.env.NEXT_PUBLIC_BACKEND_WS_BASE || backendHttpBase.replace(/^http/, 'ws') || '').replace(/\/$/, '');
const API_BASE = backendHttpBase ? backendHttpBase + '/api/v1/agents' : '';
const WS_URL = backendWsBase ? backendWsBase + '/api/v1/agents/ws' : '';

const AgentsCommandCenterClient: React.FC = () => {
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [draft, setDraft] = useState<CommandDraft>({ agent: 'triage', action: 'classify', raw: '/triage classify' });
  const [runs, setRuns] = useState<Run[]>([]);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [selectedRunMessages, setSelectedRunMessages] = useState<RunMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  type AggregatedTokens = { [cid: string]: string };
  const [aggregatedTokens, setAggregatedTokens] = useState<AggregatedTokens>({});
  const wsClientRef = useRef<AgentsWSClient | null>(null);
  const dispatcherRef = useRef<AgentCommandDispatcher | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const refreshRuns = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/runs?limit=25`, { credentials: 'include' });
      if(res.ok){
        const data = await res.json();
        setRuns(data);
      }
    } catch {/* ignore */}
  }, []);

  const loadMessages = useCallback(async (runId: number) => {
    setLoadingMessages(true);
    try {
      const res = await fetch(`${API_BASE}/runs/${runId}/messages`, { credentials: 'include' });
      if(res.ok){
        const data = await res.json();
        setSelectedRunMessages(data);
      }
    } catch {/* ignore */}
    finally { setLoadingMessages(false); }
  }, []);

  useEffect(() => {
    if (!WS_URL) return;
    const client = new AgentsWSClient({
      url: WS_URL,
      onEvent: (e: AgentStreamEvent) => {
        setEvents(prev => [...prev, e]);
        if(e.type === 'run_started' || e.type === 'run_completed' || e.type === 'run_cancelled') {
          void refreshRuns();
        }
        if(e.type === 'token' && typeof e.correlationId === 'string' && typeof e.token === 'string') {
          const key = e.correlationId as string;
          const tokenChunk = e.token;
          setAggregatedTokens(prev => ({ ...prev, [key]: (prev[key] || '') + tokenChunk }));
        }
        if(e.type === 'run_completed' && typeof e.runId === 'number' && e.runId === selectedRunId){
          void loadMessages(e.runId as number);
        }
      },
      onStatusChange: setConnectionState,
    });
    wsClientRef.current = client;
    client.connect();
    dispatcherRef.current = new AgentCommandDispatcher(API_BASE);
    void refreshRuns();
    return () => client.close();
  }, [refreshRuns, loadMessages, selectedRunId]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [events]);

  const grouped = useMemo<Record<string, StreamEvent[]>>(() => {
    const by: Record<string, StreamEvent[]> = Object.create(null);
    for(const e of events){
      const key = typeof e.correlationId === 'string' ? e.correlationId : 'uncorrelated';
      if(!by[key]) by[key] = [];
      by[key].push(e);
    }
    return by;
  }, [events]);

  useEffect(() => {
    if (runs.length > 0) {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('agents:lastRunId') : null;
      if (!selectedRunId) {
        if (stored) {
          const parsed = Number(stored);
          const exists = runs.find(r => Number(r.id) === parsed);
          if (exists) {
            setSelectedRunId(parsed);
            void loadMessages(parsed);
            return;
          }
        }
        const latest = Number(runs[0].id);
        setSelectedRunId(latest);
        void loadMessages(latest);
        localStorage.setItem('agents:lastRunId', String(latest));
      }
    }
  }, [runs, selectedRunId, loadMessages]);

  useEffect(() => {
    if (selectedRunId) {
      localStorage.setItem('agents:lastRunId', String(selectedRunId));
    }
  }, [selectedRunId]);

  const cancelRun = useCallback(async (runId: number) => {
    try { await fetch(`${API_BASE}/runs/${runId}/cancel`, { method: 'POST', credentials: 'include' }); } catch {/* ignore */}
  }, []);

  const sendCommand = useCallback(async () => {
    const dispatcher = dispatcherRef.current;
    if(!dispatcher) return;
    try {
      const optimistic = dispatcher.buildOptimisticEvent({ agent: draft.agent, action: draft.action, data: draft.data });
      setEvents(prev => [...prev, { ...optimistic, content: `Dispatching ${draft.agent}.${draft.action}` }]);
      const result = await dispatcher.send({ agent: draft.agent, action: draft.action, data: draft.data });
      setEvents(prev => [...prev, { type: 'client_ack', correlationId: result.correlationId, runId: result.runId, status: result.status, ts: new Date().toISOString() }]);
      setDraft(d => ({ ...d, raw: '', data: undefined }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setEvents(prev => [...prev, { type: 'error', error: message, ts: new Date().toISOString() }]);
    }
  }, [draft]);

  const retryRun = useCallback(async (runId: number) => {
    const meta = runs.find(r => Number(r.id) === runId);
    if(!meta) return;
    setDraft({ agent: meta.agent, action: meta.action });
    await sendCommand();
  }, [runs, sendCommand]);

  const [agentMetrics, setAgentMetrics] = useState<Record<string, { total: number; running: number; succeeded: number; cancelled: number; failed: number; lastCompleted?: string | null }>>({});
  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/metrics`, { credentials: 'include' });
      if(res.ok){
        const data = await res.json();
        if(data && data.perAgent) setAgentMetrics(data.perAgent);
      }
    } catch {/* ignore */}
  }, []);
  useEffect(() => {
    void fetchMetrics();
    const id = setInterval(() => { void fetchMetrics(); }, 5000);
    return () => clearInterval(id);
  }, [fetchMetrics]);

  const LangGraphViewer = useMemo(() => dynamic(() => import('@/components/admin/langgraph/LangGraphViewer'), { ssr: false }), []);

  return (
    <AccessGuard requiredRoles={["admin","therapist"]}>
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
          <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33]">
            <div className="text-sm text-gray-300 mb-1">Agent Filter</div>
            <select
              aria-label="Agent filter"
              className="w-full bg-[#0F1013] border border-[#2A2C33] rounded px-2 py-1 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]"
              value={agentFilter}
              onChange={e=> setAgentFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="triage">Triage</option>
              <option value="intervention">Intervention</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>
          {['triage','intervention','analytics'].map(agentName => {
            const m = agentMetrics[agentName] || { total:0, running:0, succeeded:0, cancelled:0, failed:0 };
            const statusLabel = m.running>0 ? 'Running' : m.failed>0 ? 'Attention' : 'Idle';
            const statusColor = m.running>0 ? 'text-blue-400' : m.failed>0 ? 'text-red-400' : 'text-green-400';
            return (
              <div key={agentName} className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33]">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm text-gray-300 capitalize">{agentName} Agent</div>
                  <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
                </div>
                <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                  <div>
                    <div className="text-[10px] text-gray-500">Total</div>
                    <div className="text-sm text-white font-semibold">{m.total}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Run</div>
                    <div className="text-sm text-blue-300 font-semibold">{m.running}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">OK</div>
                    <div className="text-sm text-green-300 font-semibold">{m.succeeded}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-500">Fail</div>
                    <div className="text-sm text-red-300 font-semibold">{m.failed}</div>
                  </div>
                </div>
                {m.lastCompleted && (
                  <div className="mt-1 text-[10px] text-gray-500 text-right">Last: {new Date(m.lastCompleted).toLocaleTimeString()}</div>
                )}
                <div className="mt-2 flex gap-2">
                  <button onClick={()=> setDraft(d=> ({ ...d, agent: agentName }))} className="flex-1 py-1 text-[11px] rounded bg-[#2A2C33] hover:bg-[#34363F] text-gray-300">Select</button>
                  <button disabled={m.running>0} onClick={()=> { setDraft({ agent: agentName, action: 'classify' }); void sendCommand(); }} className="flex-1 py-1 text-[11px] rounded bg-[#FFCA40] text-black font-medium disabled:opacity-40">Quick Run</button>
                </div>
              </div>
            );
          })}
        </section>

  <section className="grid md:grid-cols-3 gap-6" aria-label="Agents command and streaming section">
          <div className="md:col-span-2 flex flex-col h-[600px]">
            <CommandComposer
              connectionState={connectionState}
              draft={draft}
              onChange={setDraft}
              onSubmit={sendCommand}
            />
            <div ref={listRef} className="flex-1 overflow-auto rounded border border-[#2A2C33] bg-[#0F1013] p-3 space-y-4 text-sm" aria-label="Agent event stream grouped by correlation">
              {Object.entries(grouped).map(([cid, evs]) => (
                <div key={cid} className="border border-[#2A2C33] rounded p-2 bg-[#14161B]">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs text-gray-400 font-mono">Correlation: {cid}</div>
                    <div className="flex gap-2">
                      {(() => {
                        const runStart = evs.find(e=> e.type==='run_started');
                        if(runStart && typeof runStart.runId === 'number'){
                          const runMeta = runs.find(r=> Number(r.id) === runStart.runId);
                          if(runMeta && runMeta.status === 'running'){
                            return <button onClick={()=> cancelRun(runStart.runId as number)} className="px-2 py-0.5 text-[10px] rounded bg-red-600 text-white hover:bg-red-500">Cancel</button>;
                          }
                        }
                        return null;
                      })()}
                    </div>
                  </div>
                  {evs.map((e,i) => {
                    const firstTokenIndex = evs.findIndex(ev => ev.type==='token');
                    const showAggregated = e.type==='token' && i===firstTokenIndex && typeof e.correlationId==='string';
                    return (
                      <div key={i} className="flex gap-2 items-start py-0.5">
                        <span className="text-[10px] text-gray-500 mt-0.5">{typeof e.ts==='string'? e.ts: ''}</span>
                        {showAggregated ? (
                          <pre className="flex-1 whitespace-pre-wrap break-words font-mono text-[11px] text-purple-300">{e.correlationId ? aggregatedTokens[String(e.correlationId)] || '' : ''}</pre>
                        ) : e.type==='token' ? null : (
                          <pre className={`flex-1 whitespace-pre-wrap break-words font-mono text-[11px] ${e.type === 'error' ? 'text-red-400' : e.type === 'run_started' ? 'text-green-400' : e.type === 'run_completed' ? 'text-blue-300' : e.type === 'run_cancelled' ? 'text-yellow-400' : 'text-gray-200'}`}>{JSON.stringify(e, null, 2)}</pre>
                        )}
                        {e.type==='run_completed' && evs.some(ev=> ev.type==='run_started' && typeof ev.runId==='number' && runs.find(r=> Number(r.id)===ev.runId && r.status==='failed')) && (
                          <button onClick={()=> {
                            const rs = evs.find(ev=> ev.type==='run_started');
                            if(rs && typeof rs.runId==='number') retryRun(rs.runId);
                          }} className="ml-2 px-1.5 py-0.5 text-[10px] rounded bg-yellow-600 text-white hover:bg-yellow-500">Retry</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {events.length===0 && <div className="text-gray-500 text-sm">No events yet. Dispatch a command to begin.</div>}
            </div>
          </div>
          <aside className="space-y-4 w-full">
            <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33]">
              <h2 className="text-sm font-semibold text-white mb-2">Instructions</h2>
              <ul className="text-xs text-gray-400 space-y-1 list-disc pl-4">
                <li>Select an agent and action.</li>
                <li>Optional: provide JSON payload.</li>
                <li>Click Dispatch to create a run.</li>
                <li>Events will stream in real time.</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33] flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Recent Runs</h2>
                <button onClick={()=> refreshRuns()} className="text-xs text-gray-400 hover:text-white">↻</button>
              </div>
              <ul className="space-y-1 max-h-56 overflow-auto text-[11px] font-mono">
                {runs.filter(r => agentFilter==='all' || r.agent === agentFilter).map(r => {
                  const badgeColor = r.status==='succeeded' ? 'bg-green-600/30 text-green-300 border-green-600/40' : r.status==='running' ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 animate-pulse' : r.status==='cancelled' ? 'bg-yellow-700/20 text-yellow-400 border-yellow-600/40' : 'bg-gray-600/20 text-gray-300 border-gray-600/40';
                  const active = selectedRunId === Number(r.id);
                  return (
                    <li key={r.id}>
                      <button onClick={()=> { setSelectedRunId(Number(r.id)); void loadMessages(Number(r.id)); }} className={`w-full text-left flex justify-between items-center gap-2 px-2 py-1 rounded border ${active ? 'border-[#FFCA40] bg-[#2A2C33]' : 'border-transparent hover:bg-[#2A2C33]/60'}`}>
                        <span className="truncate">{r.agent}.{r.action}</span>
                        <span className={`px-1.5 py-0.5 rounded border text-[10px] uppercase tracking-wide ${badgeColor}`}>{r.status}</span>
                      </button>
                    </li>
                  );
                })}
                {runs.length===0 && <li className="text-gray-500">No history</li>}
              </ul>
              {selectedRunId && (
                <div className="mt-2 border-t border-[#2A2C33] pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-semibold text-gray-300">Run Messages</h3>
                    {loadingMessages && <span className="text-[10px] text-gray-500">loading…</span>}
                  </div>
                  <div className="max-h-40 overflow-auto space-y-1 text-[11px] font-mono">
                    {selectedRunMessages.map(m => (
                      <div key={m.id} className="flex gap-1">
                        <span className="text-gray-500">{m.type}</span>
                        <span className="truncate flex-1">{m.content}</span>
                      </div>
                    ))}
                    {selectedRunMessages.length===0 && !loadingMessages && <div className="text-gray-500">No messages</div>}
                  </div>
                </div>
              )}
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

        <section className="mt-4" aria-label="Agents configuration visualization">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center">
                <FiGitMerge className="mr-3 text-[#FFCA40]" />
                Agents Configuration
              </h2>
              <p className="text-gray-400 mt-1 text-sm">Visualize and inspect LangGraph agent flows.</p>
            </div>
          </div>
          <div className="rounded-lg border border-[#2A2C33] bg-[#0F1013] p-4">
            <LangGraphViewer />
          </div>
        </section>
      </div>
    </AccessGuard>
  );
};

export default AgentsCommandCenterClient;
