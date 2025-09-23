'use client';

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import AccessGuard from '@/components/admin/AccessGuard';
import { 
  FiCommand, 
  FiActivity, 
  FiWifiOff, 
  FiGitMerge
} from 'react-icons/fi';
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="flex flex-col gap-6 p-6">
          <header className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 rounded-2xl blur-xl"></div>
            <div className="relative bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent flex items-center">
                <FiCommand className="mr-4 text-yellow-400 text-5xl drop-shadow-lg" />
                Agents Command Center
              </h1>
              <p className="text-gray-300 mt-2 text-lg">Dispatch commands, ask natural language questions, and monitor real-time agent events.</p>
            </div>
          </header>

  <section className="grid md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-300">
            <div className="flex items-center justify-between">
              <div className="text-gray-200 font-medium">Connection Status</div>
              <div className="flex items-center gap-3">
                {connectionState === 'open' ? 
                  <FiActivity className="text-green-400 text-xl animate-pulse" /> : 
                  <FiWifiOff className="text-red-400 text-xl" />
                }
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${connectionState === 'open' ? 'text-green-400 bg-green-400/20' : 'text-red-400 bg-red-400/20'}`}>
                  {connectionState}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-300">
            <div className="text-gray-200 font-medium mb-3">Agent Filter</div>
            <select
              aria-label="Agent filter"
              className="w-full bg-black/30 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent backdrop-blur-sm"
              value={agentFilter}
              onChange={e=> setAgentFilter(e.target.value)}
            >
              <option value="all">All Agents</option>
              <option value="orchestrator">Orchestrator</option>
              <option value="triage">Triage</option>
              <option value="intervention">Intervention</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>
          {['triage','intervention','analytics'].map(agentName => {
            const m = agentMetrics[agentName] || { total:0, running:0, succeeded:0, cancelled:0, failed:0 };
            const statusLabel = m.running>0 ? 'Running' : m.failed>0 ? 'Attention' : 'Idle';
            const statusColor = m.running>0 ? 'text-blue-400 bg-blue-400/20' : m.failed>0 ? 'text-red-400 bg-red-400/20' : 'text-green-400 bg-green-400/20';
            const agentGradient = agentName === 'triage' ? 'from-amber-500/20 to-orange-500/20' :
                                  agentName === 'intervention' ? 'from-teal-500/20 to-cyan-500/20' :
                                  'from-violet-500/20 to-purple-500/20';
            
            return (
              <div key={agentName} className={`bg-gradient-to-br ${agentGradient} backdrop-blur-md border border-white/20 rounded-xl p-6 hover:bg-white/15 transition-all duration-300 group`}>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-white font-semibold text-lg capitalize">{agentName} Agent</div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor}`}>{statusLabel}</span>
                </div>
                
                <div className="grid grid-cols-4 gap-4 mb-4">
                  {[
                    { label: 'Total', value: m.total, color: 'text-gray-300' },
                    { label: 'Active', value: m.running, color: 'text-blue-400' },
                    { label: 'Success', value: m.succeeded, color: 'text-green-400' },
                    { label: 'Failed', value: m.failed, color: 'text-red-400' }
                  ].map(stat => (
                    <div key={stat.label} className="text-center">
                      <div className="text-xs text-gray-400 mb-1">{stat.label}</div>
                      <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                    </div>
                  ))}
                </div>
                
                {m.lastCompleted && (
                  <div className="text-xs text-gray-400 mb-4 text-center">
                    Last: {new Date(m.lastCompleted).toLocaleTimeString()}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button 
                    onClick={()=> setDraft(d=> ({ ...d, agent: agentName }))} 
                    className="flex-1 py-2 text-sm rounded-lg bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white border border-white/20 transition-all duration-200"
                  >
                    Select
                  </button>
                  <button 
                    disabled={m.running>0} 
                    onClick={()=> { setDraft({ agent: agentName, action: 'classify' }); void sendCommand(); }} 
                    className="flex-1 py-2 text-sm rounded-lg bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:from-yellow-400 hover:to-amber-400 transition-all duration-200 shadow-lg"
                  >
                    Quick Run
                  </button>
                </div>
              </div>
            );
          })}
        </section>

  <section className="grid lg:grid-cols-3 gap-8" aria-label="Main control panel">
    <div className="lg:col-span-2 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-4 mb-6" aria-label="Interaction mode selector">
              {['manual','orchestrate'].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={()=> setMode(m as typeof mode)}
                  className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                    mode===m ? 
                    'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105' : 
                    'bg-white/10 text-gray-300 border border-white/20 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {m === 'manual' ? 'Manual Commands' : 'Orchestrate Q&A'}
                </button>
              ))}
            </div>
            
            <div className="text-sm text-gray-400 mb-6 p-4 bg-black/20 rounded-lg border border-white/10">
              💡 <strong>Manual:</strong> Low-level agent commands • <strong>Orchestrate:</strong> Natural language questions with smart routing
            </div>
            {mode === 'manual' ? (
              <CommandComposer
                connectionState={connectionState}
                draft={draft}
                onChange={setDraft}
                onSubmit={sendCommand}
              />
            ) : (
              <div className="flex flex-col gap-6">
                <div className="text-gray-300 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl border border-white/20">
                  🤖 Ask questions naturally. The orchestrator intelligently routes to the best agent or respects your override selection.
                </div>
                <OrchestrateChat messages={chatMessages} isLoading={!!orchestrateDraft.loading} />
                <div className="space-y-4">
                  <OrchestrateComposer
                    disabled={connectionState !== 'open'}
                    draft={orchestrateDraft}
                    onChange={setOrchestrateDraft}
                    onSubmit={askOrchestrator}
                  />
                  <div className="space-y-3">
                    <div className="text-sm font-medium text-gray-300">💡 Suggested Questions</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Suggested questions">
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
                          className="p-3 rounded-lg bg-white/5 border border-white/20 text-sm text-gray-300 hover:bg-white/10 hover:text-white hover:border-purple-400/50 transition-all duration-200 text-left"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {mode === 'manual' && (
            <div ref={listRef} className="flex-1 overflow-auto rounded-xl border border-white/20 bg-black/20 backdrop-blur-sm p-4 space-y-4 text-sm min-h-[400px]" aria-label="Agent event stream grouped by correlation">
              {Object.entries(grouped).map(([cid, evs]) => (
                <div key={cid} className="border border-white/20 rounded-xl p-4 bg-white/5 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-gray-400 font-mono bg-black/30 px-3 py-1 rounded-full">Correlation: {cid}</div>
                    <div className="flex gap-2">{(() => {
                        const runStart = evs.find(e=> e.type==='run_started');
                        if(runStart && typeof runStart.runId === 'number'){
                          const runMeta = runs.find(r=> Number(r.id) === runStart.runId);
                          if(runMeta && runMeta.status === 'running'){
                            return <button onClick={()=> cancelRun(runStart.runId as number)} className="px-3 py-1 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">Cancel</button>;
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
                    const colorMap: Record<string,string> = { 
                      triage: 'text-amber-300 bg-amber-400/20 border-amber-400/40', 
                      analytics: 'text-violet-300 bg-violet-400/20 border-violet-400/40', 
                      intervention: 'text-teal-300 bg-teal-400/20 border-teal-400/40' 
                    };
                    return (
                      <div className="mb-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-white/20 p-4 backdrop-blur-sm" role="region" aria-label="Orchestrator answer summary">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm text-purple-300 font-semibold flex items-center">
                            🤖 Orchestrator Response
                          </span>
                          {resolved ? (
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${(resolved in colorMap ? colorMap[resolved] : 'text-gray-300 bg-gray-500/20 border-gray-500/40')} capitalize`}>
                              {resolved}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-gray-200 whitespace-pre-wrap mb-3 p-3 bg-black/20 rounded-lg">{answer}</p>
                        {metrics && typeof metrics === 'object' && (
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            {Object.entries(metrics).filter((entry) => ['string','number','boolean'].includes(typeof entry[1])).map(([k,v]) => (
                              <div key={k} className="flex justify-between p-2 bg-black/20 rounded">
                                <span className="text-gray-400 truncate font-medium" title={k}>{k}</span>
                                <span className="text-purple-300 truncate font-mono" title={String(v)}>{String(v)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {evs.map((e,i) => {
                    const firstTokenIndex = evs.findIndex(ev => ev.type==='token');
                    const showAggregated = e.type==='token' && i===firstTokenIndex && typeof e.correlationId==='string';
                    return (
                      <div key={i} className="flex gap-3 items-start py-2 border-b border-white/10 last:border-b-0">
                        <span className="text-xs text-gray-500 mt-1 font-mono bg-black/30 px-2 py-1 rounded">{typeof e.ts==='string'? new Date(e.ts).toLocaleTimeString(): ''}</span>
                        {showAggregated ? (
                          <pre className="flex-1 whitespace-pre-wrap break-words font-mono text-xs text-purple-300 bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">{e.correlationId ? aggregatedTokens[String(e.correlationId)] || '' : ''}</pre>
                        ) : e.type==='token' ? null : (
                          <pre className={`flex-1 whitespace-pre-wrap break-words font-mono text-xs p-3 rounded-lg border ${
                            e.type === 'error' ? 'text-red-300 bg-red-500/10 border-red-500/20' : 
                            e.type === 'run_started' ? 'text-green-300 bg-green-500/10 border-green-500/20' : 
                            e.type === 'run_completed' ? 'text-blue-300 bg-blue-500/10 border-blue-500/20' : 
                            e.type === 'run_cancelled' ? 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20' : 
                            'text-gray-300 bg-white/5 border-white/10'
                          }`}>{JSON.stringify(e, null, 2)}</pre>
                        )}
                        {e.type==='run_completed' && evs.some(ev=> ev.type==='run_started' && typeof ev.runId==='number' && runs.find(r=> Number(r.id)===ev.runId && r.status==='failed')) && (
                          <button onClick={()=> {
                            const rs = evs.find(ev=> ev.type==='run_started');
                            if(rs && typeof rs.runId==='number') retryRun(rs.runId);
                          }} className="ml-3 px-3 py-1 text-xs rounded-lg bg-yellow-500 text-black hover:bg-yellow-400 transition-colors font-medium">Retry</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
              {events.length===0 && (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🚀</div>
                  <div className="text-gray-400 text-lg">No events yet</div>
                  <div className="text-gray-500 text-sm mt-2">Dispatch a command to begin monitoring agent activity</div>
                </div>
              )}
            </div>
            )}
          </div>
          
          <aside className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                📋 Quick Instructions
              </h2>
              <ul className="text-sm text-gray-300 space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                  Select an agent and action from the dropdown menus
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                  Optionally provide JSON payload for complex operations
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                  Click Dispatch to create and monitor the run
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-2 h-2 bg-purple-400 rounded-full mt-2 flex-shrink-0"></span>
                  Real-time events will stream automatically
                </li>
              </ul>
            </div>
            {/* Orchestrate primer */}
            <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                🤖 About Orchestrate Mode
              </h2>
              <p className="text-sm text-gray-300 mb-4">
                Ask questions in natural language, like chatting with a data analyst. The orchestrator intelligently selects the right agent based on your request.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <div className="w-3 h-3 bg-amber-400 rounded-full flex-shrink-0"></div>
                  <div>
                    <span className="text-amber-300 font-medium">Triage</span>
                    <span className="text-gray-400 ml-2">Risk classification & assessment statistics</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-violet-500/10 rounded-lg border border-violet-500/20">
                  <div className="w-3 h-3 bg-violet-400 rounded-full flex-shrink-0"></div>
                  <div>
                    <span className="text-violet-300 font-medium">Analytics</span>
                    <span className="text-gray-400 ml-2">Data aggregations, trends & summaries</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-teal-500/10 rounded-lg border border-teal-500/20">
                  <div className="w-3 h-3 bg-teal-400 rounded-full flex-shrink-0"></div>
                  <div>
                    <span className="text-teal-300 font-medium">Intervention</span>
                    <span className="text-gray-400 ml-2">Follow-ups & recommended actions</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  🔄 Recent Runs
                </h2>
                <button onClick={()=> refreshRuns()} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
                  ↻
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-auto">
                {runs.filter(r => agentFilter==='all' || r.agent === agentFilter).map(r => {
                  const badgeStyles = {
                    succeeded: 'bg-green-500/20 text-green-300 border-green-500/40',
                    running: 'bg-blue-500/20 text-blue-300 border-blue-500/40 animate-pulse',
                    cancelled: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
                    failed: 'bg-red-500/20 text-red-300 border-red-500/40'
                  };
                  const badgeColor = badgeStyles[r.status as keyof typeof badgeStyles] || 'bg-gray-500/20 text-gray-300 border-gray-500/40';
                  const active = selectedRunId === Number(r.id);
                  return (
                    <button 
                      key={r.id}
                      onClick={()=> { setSelectedRunId(Number(r.id)); void loadMessages(Number(r.id)); }} 
                      className={`w-full text-left flex justify-between items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                        active ? 
                        'border-purple-400/60 bg-purple-500/10 shadow-lg' : 
                        'border-white/10 hover:bg-white/10 hover:border-white/20'
                      }`}
                    >
                      <span className="text-gray-300 font-mono text-sm truncate">{r.agent}.{r.action}</span>
                      <span className={`px-2 py-1 rounded-full border text-xs font-semibold tracking-wide ${badgeColor}`}>
                        {r.status}
                      </span>
                    </button>
                  );
                })}
                {runs.length===0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-2xl mb-2">📝</div>
                    <div className="text-sm">No run history</div>
                  </div>
                )}
              </div>
              {selectedRunId && (
                <div className="mt-4 border-t border-white/20 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-300">📨 Run Messages</h3>
                    {loadingMessages && <span className="text-xs text-gray-500 animate-pulse">Loading...</span>}
                  </div>
                  <div className="max-h-40 overflow-auto space-y-2">
                    {selectedRunMessages.map(m => (
                      <div key={m.id} className="flex gap-3 p-2 bg-black/20 rounded-lg border border-white/10">
                        <span className="text-xs text-purple-400 font-medium bg-purple-500/20 px-2 py-1 rounded">{m.type}</span>
                        <span className="text-xs text-gray-300 flex-1 break-words font-mono">{m.content}</span>
                      </div>
                    ))}
                    {selectedRunMessages.length===0 && !loadingMessages && (
                      <div className="text-center py-4 text-gray-500">
                        <div className="text-xl mb-1">💬</div>
                        <div className="text-xs">No messages</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            {/* Orchestrator Q&A History */}
            <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                💬 Q&A History
              </h2>
              <div className="space-y-3 max-h-64 overflow-auto">
                {orchestratorHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-2xl mb-2">🤖</div>
                    <div className="text-sm">No conversations yet</div>
                    <div className="text-xs mt-1">Start asking questions to see history</div>
                  </div>
                )}
                {orchestratorHistory.map((h,i) => (
                  <div key={(h.runId || i) + String(h.correlationId)} className="border border-white/20 rounded-lg p-4 bg-white/5 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-400 font-mono bg-black/30 px-2 py-1 rounded">
                        {new Date(h.createdAt).toLocaleTimeString()}
                      </span>
                      {h.resolvedAgent && (
                        <span className="text-xs font-semibold text-purple-300 bg-purple-500/20 px-2 py-1 rounded-full">
                          {h.resolvedAgent}
                        </span>
                      )}
                    </div>
                    {h.question && (
                      <div className="mb-3">
                        <div className="text-xs text-gray-400 mb-1">Question:</div>
                        <p className="text-sm text-gray-300 bg-black/20 p-2 rounded border border-white/10">{h.question}</p>
                      </div>
                    )}
                    {h.answer && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Answer:</div>
                        <p className="text-sm text-gray-200 bg-gradient-to-r from-blue-500/10 to-purple-500/10 p-2 rounded border border-white/10">{h.answer}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            {/* Correlation Mapping */}
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                🔗 Correlation Mapping
              </h2>
              <div className="max-h-48 overflow-auto">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-gray-400 border-b border-white/20">
                      <tr>
                        <th className="py-2 pr-4 font-medium text-left">Run ID</th>
                        <th className="py-2 pr-4 font-medium text-left">Correlation</th>
                        <th className="py-2 pr-4 font-medium text-left">Agent</th>
                        <th className="py-2 pr-4 font-medium text-left">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {correlationRows.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-500">
                            <div className="text-2xl mb-2">🔄</div>
                            <div className="text-sm">No correlations yet</div>
                          </td>
                        </tr>
                      )}
                      {correlationRows.map((r,i) => (
                        <tr key={(r.runId || i) + (r.correlationId || '')} className="border-b border-white/10 hover:bg-white/5">
                          <td className="py-2 pr-4 text-gray-300 font-mono">{r.runId ?? '-'}</td>
                          <td className="py-2 pr-4 text-gray-400 font-mono truncate max-w-[120px]" title={r.correlationId}>
                            {r.correlationId ? (
                              <span className="bg-black/30 px-2 py-1 rounded text-xs">{r.correlationId.slice(0, 8)}...</span>
                            ) : '-'}
                          </td>
                          <td className="py-2 pr-4 text-gray-300">
                            {r.resolvedAgent ? (
                              <span className="bg-purple-500/20 text-purple-300 px-2 py-1 rounded text-xs font-medium">
                                {r.resolvedAgent}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-2 pr-4 text-gray-300">{r.status || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-lg border border-white/10 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                🚀 Roadmap
              </h2>
              <div className="space-y-3">
                {[
                  { icon: '⚡', text: 'Enhanced token streaming performance' },
                  { icon: '📊', text: 'Advanced agent status dashboards' },
                  { icon: '💾', text: 'Persistent run history & analytics' },
                  { icon: '🔄', text: 'Improved cancellation & retry logic' }
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-black/20 rounded-lg border border-white/10">
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-sm text-gray-300">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>

        <section className="mt-8 bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-8" aria-label="Agents configuration visualization">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
            <div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent flex items-center">
                <FiGitMerge className="mr-4 text-green-400 text-4xl" />
                Agents Configuration
              </h2>
              <p className="text-gray-300 mt-2 text-lg">Visualize and inspect LangGraph agent flows and dependencies.</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/20 bg-black/20 backdrop-blur-sm p-6">
            <LangGraphViewer />
          </div>
        </section>
        </div>
      </div>
    </AccessGuard>
  );
};

export default AgentsCommandCenterClient;
