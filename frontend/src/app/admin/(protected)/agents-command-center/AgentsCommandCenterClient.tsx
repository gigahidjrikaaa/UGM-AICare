'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import AccessGuard from '@/components/admin/AccessGuard';
import { FiCommand, FiActivity, FiWifiOff, FiGitMerge } from 'react-icons/fi';
import dynamic from 'next/dynamic';
import CommandComposer from './CommandComposer';
import OrchestrateComposer, { OrchestrateDraft } from './OrchestrateComposer';
import OrchestrateChat, { OrchestrateChatMessage } from './OrchestrateChat';

interface OrchestratorAnswerEvent extends AgentStreamEvent {
  type: 'orchestrate_answer';
  answer: string;
  metrics?: Record<string, unknown>;
  resolvedAgent?: string;
}
interface ClientRequestEvent extends AgentStreamEvent {
  type: 'client_request';
  question: string;
  agent: string; // 'orchestrator'
}
type ExtendedEvent = StreamEvent | OrchestratorAnswerEvent | ClientRequestEvent;
import { AgentsWSClient, AgentStreamEvent } from '@/lib/agents/wsClient';
import { AgentCommandDispatcher } from '@/lib/agents/dispatcher';

interface StreamEvent extends AgentStreamEvent { content?: string; error?: string; token?: string; correlationId?: string; }
interface CommandDraft { agent: string; action: string; data?: Record<string, unknown>; raw?: string; error?: string | null; }
interface Run { id: string; agent: string; action: string; status: string; created_at: string; started_at?: string | null; completed_at?: string | null; }
interface RunMessage { id: string; role: string; type: string; content: string | null; metadata?: Record<string, unknown> | null; createdAt?: string | null; }

const backendHttpBase = (process.env.NEXT_PUBLIC_BACKEND_BASE || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const backendWsBase = (process.env.NEXT_PUBLIC_BACKEND_WS_BASE || backendHttpBase.replace(/^http/, 'ws') || '').replace(/\/$/, '');
const API_BASE = backendHttpBase ? backendHttpBase + '/api/v1/admin/agents' : '';
const WS_URL = backendWsBase ? backendWsBase + '/api/v1/admin/agents/ws' : '';

const AgentsCommandCenterClient: React.FC = () => {
  const [connectionState, setConnectionState] = useState<'connecting' | 'open' | 'closed' | 'error'>('connecting');
  const [events, setEvents] = useState<ExtendedEvent[]>([]);
  const [draft, setDraft] = useState<CommandDraft>({ agent: 'triage', action: 'classify', raw: '/triage classify' });
  const [orchestrateDraft, setOrchestrateDraft] = useState<OrchestrateDraft>({ question: '', agentOverride: 'auto' });
  const [mode, setMode] = useState<'manual' | 'orchestrate'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('agents:mode');
      if (saved === 'manual' || saved === 'orchestrate') return saved;
    }
    return 'orchestrate';
  });

  // restore last orchestrator question
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const q = localStorage.getItem('agents:lastOrchestrateQuestion');
      if (q) setOrchestrateDraft(d => ({ ...d, question: q }));
    }
  }, []);
  // persist mode & question
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('agents:mode', mode); }, [mode]);
  useEffect(() => { if (typeof window !== 'undefined') localStorage.setItem('agents:lastOrchestrateQuestion', orchestrateDraft.question); }, [orchestrateDraft.question]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [chatMessages, setChatMessages] = useState<OrchestrateChatMessage[]>([]);
  const [agentFilter, setAgentFilter] = useState<string>('all');
  const [selectedRunId, setSelectedRunId] = useState<number | null>(null);
  const [selectedRunMessages, setSelectedRunMessages] = useState<RunMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  type AggregatedTokens = { [cid: string]: string };
  const [aggregatedTokens, setAggregatedTokens] = useState<AggregatedTokens>({});
  interface OrchestratorHistoryItem { runId?: number; correlationId?: string; question: string; answer?: string; resolvedAgent?: string; createdAt: string; metrics?: Record<string, unknown>; }
  const [orchestratorHistory, setOrchestratorHistory] = useState<OrchestratorHistoryItem[]>([]);
  interface CorrelationRow { runId?: number; correlationId?: string; agent?: string; resolvedAgent?: string; status?: string; }
  const [correlationRows, setCorrelationRows] = useState<CorrelationRow[]>([]);
  const wsClientRef = useRef<AgentsWSClient | null>(null);
  const dispatcherRef = useRef<AgentCommandDispatcher | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const pendingOrchestrator = useRef<Record<number,string>>({}); // runId -> syntheticCorrelation
  const selectedRunIdRef = useRef<number | null>(null);
  useEffect(() => { selectedRunIdRef.current = selectedRunId; }, [selectedRunId]);

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
        if(e.type === 'client_request' && e.agent === 'orchestrator') {
          const ce = e as ClientRequestEvent;
          const corr = typeof ce.correlationId === 'string' ? ce.correlationId : undefined;
          setOrchestratorHistory(prev => [{ question: ce.question || '', correlationId: corr, createdAt: new Date().toISOString() }, ...prev].slice(0,50));
          // Mirror to chat (avoid duplicates if already optimistically added)
          if (corr && !chatMessages.some(m => m.correlationId === corr && m.role === 'user')) {
            setChatMessages(prev => ([
              ...prev,
              { id: `u-${corr}`, role: 'user', content: ce.question, ts: new Date().toISOString(), correlationId: corr },
              { id: `a-${corr}`, role: 'assistant', content: '', ts: new Date().toISOString(), correlationId: corr, pending: true }
            ]));
          }
        }
        if(e.type === 'orchestrate_answer') {
          const ae = e as OrchestratorAnswerEvent;
          const corr = typeof ae.correlationId === 'string' ? ae.correlationId : undefined;
          setOrchestratorHistory(prev => {
            const idx = prev.findIndex(h => h.correlationId === corr);
            if(idx >=0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], answer: ae.answer, resolvedAgent: ae.resolvedAgent, metrics: ae.metrics } as OrchestratorHistoryItem;
              return updated;
            }
            return [{ question: '', correlationId: corr, answer: ae.answer, resolvedAgent: ae.resolvedAgent, metrics: ae.metrics, createdAt: new Date().toISOString() }, ...prev].slice(0,50);
          });
          if (corr) {
            setChatMessages(prev => prev.map(m => (m.correlationId === corr && m.role === 'assistant')
              ? ({ ...m, content: ae.answer, pending: false, resolvedAgent: ae.resolvedAgent, metrics: ae.metrics })
              : m));
          }
        }
        if(e.type === 'run_completed' && e.agent === 'orchestrator') {
          const rc = e as AgentStreamEvent & { result?: { answer?: string; metrics?: Record<string, unknown>; agent?: string } };
          setOrchestratorHistory(prev => {
            const finalAnswer = rc.result?.answer;
            const finalMetrics = rc.result?.metrics;
            const resolvedAgent = rc.result?.agent;
            const corr = typeof rc.correlationId === 'string' ? rc.correlationId : undefined;
            const idx = prev.findIndex(h => (corr && h.correlationId === corr) || (rc.runId && h.runId === rc.runId));
            if(idx >=0) {
              const updated = [...prev];
              updated[idx] = { ...updated[idx], runId: rc.runId as number, answer: finalAnswer || updated[idx].answer, resolvedAgent: resolvedAgent || updated[idx].resolvedAgent, metrics: finalMetrics || updated[idx].metrics } as OrchestratorHistoryItem;
              return updated;
            }
            return [{ question: '', correlationId: corr, runId: rc.runId as number, answer: finalAnswer, resolvedAgent, metrics: finalMetrics, createdAt: new Date().toISOString() }, ...prev].slice(0,50);
          });
          const corr2 = typeof rc.correlationId === 'string' ? rc.correlationId : undefined;
          if (corr2 && typeof rc.result?.answer === 'string') {
            const ans = rc.result.answer;
            const ag = rc.result.agent;
            const mx = rc.result.metrics;
            setChatMessages(prev => prev.map(m => (m.correlationId === corr2 && m.role === 'assistant') ? ({ ...m, content: ans, pending: false, resolvedAgent: ag || m.resolvedAgent, metrics: mx || m.metrics }) : m));
          }
        }
        // Reconcile orchestrator synthetic correlation
        if((e.type === 'run_started' || e.type==='run_completed') && e.agent === 'orchestrator' && typeof e.runId === 'number') {
          const synthetic = pendingOrchestrator.current[e.runId];
          const real = typeof e.correlationId === 'string' ? e.correlationId : undefined;
            if(synthetic && real && synthetic !== real) {
              setEvents(prev => prev.map(pe => pe.correlationId === synthetic ? { ...pe, correlationId: real } : pe));
              pendingOrchestrator.current[e.runId] = real;
            }
        }
        if(e.type === 'token' && typeof e.correlationId === 'string' && typeof e.token === 'string') {
          const key = e.correlationId as string;
          const tokenChunk = e.token;
          setAggregatedTokens(prev => ({ ...prev, [key]: (prev[key] || '') + tokenChunk }));
          setChatMessages(prev => prev.map(m => (m.correlationId === key && m.role === 'assistant') ? ({ ...m, content: (m.content || '') + String(tokenChunk) }) : m));
        }
        if(e.type === 'run_completed' && typeof e.runId === 'number' && e.runId === selectedRunIdRef.current){
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshRuns, loadMessages]);

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

  // Derive correlation rows
  useEffect(() => {
    const map: Record<string, CorrelationRow> = {};
    orchestratorHistory.forEach(h => {
      const key = h.correlationId || `run-${h.runId}`;
      if(!map[key]) map[key] = { correlationId: h.correlationId, runId: h.runId, resolvedAgent: h.resolvedAgent, agent: 'orchestrator' };
      map[key].resolvedAgent = h.resolvedAgent || map[key].resolvedAgent;
    });
    runs.filter(r => r.agent === 'orchestrator').forEach(r => {
      const key = Object.keys(map).find(k => map[k].runId === Number(r.id)) || `run-${r.id}`;
      if(!map[key]) map[key] = { runId: Number(r.id), agent: 'orchestrator' };
      map[key].status = r.status;
    });
    setCorrelationRows(Object.values(map).slice(0,100));
  }, [orchestratorHistory, runs]);

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

  const askOrchestrator = useCallback(async (d: OrchestrateDraft) => {
    if(!API_BASE) return;
    setOrchestrateDraft(prev => ({ ...prev, loading: true, error: null }));
    const correlationId = `orc-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
    // Optimistic client event + chat entries
    setEvents(prev => [...prev, { type: 'client_request', correlationId, ts: new Date().toISOString(), question: d.question, agent: 'orchestrator' }]);
    setChatMessages(prev => ([
      ...prev,
      { id: `u-${correlationId}`, role: 'user', content: d.question, ts: new Date().toISOString(), correlationId },
      { id: `a-${correlationId}`, role: 'assistant', content: '', ts: new Date().toISOString(), correlationId, pending: true }
    ]));
    try {
      const res = await fetch(`${API_BASE}/orchestrate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: d.question, agent: d.agentOverride !== 'auto' ? d.agentOverride : undefined })
      });
      if(!res.ok) {
        const detail = await res.json().catch(()=>({ detail: 'Request failed'}));
        throw new Error(detail.detail || 'Request failed');
      }
      const data = await res.json();
      if(typeof data.runId === 'number') pendingOrchestrator.current[data.runId] = correlationId;
      // In case websocket events are delayed, synthesize completion summary
      setEvents(prev => [...prev, { type: 'orchestrate_answer', correlationId, runId: data.runId, ts: new Date().toISOString(), agent: 'orchestrator', resolvedAgent: data.agent, answer: data.answer, metrics: data.metrics }]);
      setChatMessages(prev => prev.map(m => (m.correlationId === correlationId && m.role === 'assistant')
        ? ({ ...m, content: data.answer, pending: false, resolvedAgent: data.agent, metrics: data.metrics })
        : m));
      setOrchestrateDraft({ question: '', agentOverride: d.agentOverride });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      setEvents(prev => [...prev, { type: 'error', correlationId, ts: new Date().toISOString(), error: msg }]);
      setChatMessages(prev => prev.map(m => (m.correlationId === correlationId && m.role === 'assistant')
        ? ({ ...m, content: `Error: ${msg}`, pending: false })
        : m));
      setOrchestrateDraft(prev => ({ ...prev, error: msg }));
    } finally {
      setOrchestrateDraft(prev => ({ ...prev, loading: false }));
    }
  }, []);

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
          <p className="text-gray-400 mt-1">Dispatch commands, ask natural language questions, and monitor real-time agent events.</p>
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
              <option value="orchestrator">Orchestrator</option>
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

  <section className="flex flex-col gap-6" aria-label="Agents command and streaming section">
    <div className="w-full flex flex-col h-[600px]">
            <div className="flex items-center gap-2 mb-1" aria-label="Interaction mode selector">
              {['manual','orchestrate'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={()=> setMode(m as typeof mode)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold border ${mode===m ? 'bg-[#FFCA40] text-black border-[#FFCA40]' : 'bg-[#1E1F25] text-gray-300 border-[#2A2C33] hover:bg-[#2A2C33]'}`}
                >{m === 'manual' ? 'Manual Commands' : 'Orchestrate Q&A'}</button>
              ))}
            </div>
            <div className="text-[11px] text-gray-500 mb-2">Manual = low-level commands. Orchestrate = natural-language questions routed to agents.</div>
            {mode === 'manual' ? (
              <CommandComposer
                connectionState={connectionState}
                draft={draft}
                onChange={setDraft}
                onSubmit={sendCommand}
              />
            ) : (
              <div className="flex flex-col gap-3">
                <div className="text-xs text-gray-400">
                  Ask questions naturally. The orchestrator auto-routes to the best agent (or respects your override).
                </div>
                <OrchestrateChat messages={chatMessages} isLoading={!!orchestrateDraft.loading} />
                <div className="relative">
                  <OrchestrateComposer
                    disabled={connectionState !== 'open'}
                    draft={orchestrateDraft}
                    onChange={setOrchestrateDraft}
                    onSubmit={askOrchestrator}
                  />
                  <div className="flex flex-wrap gap-2 -mt-2 mb-2" aria-label="Suggested questions">
                    {[
                      'How many high risk triage assessments last 7 days?',
                      'Which user has most concerning assessments last month?',
                      'High risk percentage past 30 days?',
                      'Show triage high risk count last week'
                    ].map(s => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setOrchestrateDraft(d => ({ ...d, question: s }))}
                        className="px-2 py-1 rounded bg-[#1E1F25] border border-[#2A2C33] text-[11px] text-gray-300 hover:bg-[#2A2C33] focus:outline-none focus:ring-1 focus:ring-[#FFCA40]"
                      >{s}</button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {mode === 'manual' && (
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
                  {/* Orchestrator summary (if applicable) */}
                  {evs.some(e => (e as ExtendedEvent).agent === 'orchestrator') && (() => {
                    const final = evs.find(e => e.type==='run_completed' || e.type==='orchestrate_answer');
                    if(!final) return null;
                    // Support both synthesized orchestrate_answer and backend run_completed with result
                    const fe = final as ExtendedEvent & { result?: { answer?: string; metrics?: Record<string, unknown>; agent?: string } };
                    const resolved: string | undefined = (fe as OrchestratorAnswerEvent).resolvedAgent || (typeof fe.result?.agent === 'string' ? fe.result?.agent : undefined) || (typeof fe.agent === 'string' ? fe.agent : undefined);
                    const answer = (fe as OrchestratorAnswerEvent).answer || fe.result?.answer;
                    const metrics = (fe as OrchestratorAnswerEvent).metrics || fe.result?.metrics;
                    if(!answer) return null;
                    const colorMap: Record<string,string> = { triage: 'text-amber-300 border-amber-400/40', analytics: 'text-violet-300 border-violet-400/40', intervention: 'text-teal-300 border-teal-400/40' };
                    return (
                      <div className="mb-2 rounded bg-[#1A2028] border border-[#2A2C33] p-3" role="region" aria-label="Orchestrator answer summary">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-400 font-semibold">Orchestrator Answer</span>
                          {resolved ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] border ${(resolved in colorMap ? colorMap[resolved] : 'text-gray-300 border-gray-500/40')} capitalize`}>Resolved: {resolved}</span>
                          ) : null}
                        </div>
                        <p className="text-sm text-gray-200 whitespace-pre-wrap mb-2">{answer}</p>
                        {metrics && typeof metrics === 'object' && (
                          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                            {Object.entries(metrics).filter((entry) => ['string','number','boolean'].includes(typeof entry[1])).map(([k,v]) => (
                              <React.Fragment key={k}>
                                <dt className="text-gray-500 truncate" title={k}>{k}</dt>
                                <dd className="text-gray-300 truncate" title={String(v)}>{String(v)}</dd>
                              </React.Fragment>
                            ))}
                          </dl>
                        )}
                      </div>
                    );
                  })()}
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
            )}
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
            {/* Orchestrate primer */}
            <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33]">
              <h2 className="text-sm font-semibold text-white mb-2">Orchestrate — What is this?</h2>
              <p className="text-xs text-gray-400">
                Ask questions in natural language, like you would with a data analyst. The orchestrator auto-selects the right agent based on your request (or use Route to force an agent).
              </p>
              <ul className="mt-2 text-xs text-gray-400 space-y-1 list-disc pl-4">
                <li><span className="text-gray-300">Triage</span> — risk classification and assessment stats.</li>
                <li><span className="text-gray-300">Analytics</span> — aggregations, trends, and summaries.</li>
                <li><span className="text-gray-300">Intervention</span> — follow-ups and suggested actions.</li>
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
            {/* Orchestrator Q&A History */}
            <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33]">
              <h2 className="text-sm font-semibold text-white mb-2">Orchestrator Q&A History</h2>
              <ul className="space-y-2 max-h-64 overflow-auto text-[11px]">
                {orchestratorHistory.length === 0 && <li className="text-gray-500">No Q&A yet</li>}
                {orchestratorHistory.map((h,i) => (
                  <li key={(h.runId || i) + String(h.correlationId)} className="border border-[#2A2C33] rounded p-2 bg-[#14161B]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] text-gray-500">{new Date(h.createdAt).toLocaleTimeString()}</span>
                      {h.resolvedAgent && <span className="text-[10px] uppercase text-gray-400">{h.resolvedAgent}</span>}
                    </div>
                    {h.question && <p className="text-[11px] text-gray-300 mb-1 line-clamp-3 break-words">Q: {h.question}</p>}
                    {h.answer && <p className="text-[11px] text-gray-200 line-clamp-4 break-words">A: {h.answer}</p>}
                  </li>
                ))}
              </ul>
            </div>
            {/* Correlation Mapping */}
            <div className="p-4 rounded-lg bg-[#1E1F25] border border-[#2A2C33]">
              <h2 className="text-sm font-semibold text-white mb-2">Correlation Mapping</h2>
              <div className="max-h-48 overflow-auto">
                <table className="w-full text-[10px] text-left">
                  <thead className="text-gray-500">
                    <tr>
                      <th className="py-1 pr-2 font-medium">RunId</th>
                      <th className="py-1 pr-2 font-medium">Correlation</th>
                      <th className="py-1 pr-2 font-medium">Resolved</th>
                      <th className="py-1 pr-2 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {correlationRows.length === 0 && (
                      <tr><td colSpan={4} className="py-2 text-gray-500">No mappings</td></tr>
                    )}
                    {correlationRows.map((r,i) => (
                      <tr key={(r.runId || i) + (r.correlationId || '')} className="border-t border-[#2A2C33]">
                        <td className="py-1 pr-2 text-gray-300">{r.runId ?? '-'}</td>
                        <td className="py-1 pr-2 text-gray-400 font-mono truncate max-w-[90px]" title={r.correlationId}>{r.correlationId || '-'}</td>
                        <td className="py-1 pr-2 text-gray-300">{r.resolvedAgent || '-'}</td>
                        <td className="py-1 pr-2 text-gray-300">{r.status || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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
