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
      <div className="min-h-screen bg-gradient-to-b from-[#001D58] to-[#00308F]">
        <div className="container mx-auto px-4 py-6 max-w-7xl space-y-6">
          <header className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center">
                  <FiCommand className="mr-3 text-[#FFCA40]" />
                  Agents Command Center
                </h1>
                <p className="text-gray-300 mt-2">Dispatch commands, ask natural language questions, and monitor real-time agent events.</p>
              </div>
              
              {/* Compact connection status in header */}
              <div className="flex items-center gap-2 text-sm">
                {connectionState === 'open' ? 
                  <FiActivity className="text-[#FFCA40]" /> : 
                  <FiWifiOff className="text-red-400" />
                }
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${connectionState === 'open' ? 'text-[#FFCA40] bg-[#FFCA40]/20' : 'text-red-400 bg-red-400/20'}`}>
                  {connectionState}
                </span>
              </div>
            </div>
          </header>

          {/* Compact agent status - only show in manual mode */}
          {mode === 'manual' && (
            <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="text-gray-300 font-medium text-sm">Agent Status:</div>
                  {['triage','intervention','analytics'].map(agentName => {
                    const m = agentMetrics[agentName] || { total:0, running:0, succeeded:0, cancelled:0, failed:0 };
                    const hasIssues = m.failed > 0;
                    const isRunning = m.running > 0;
                    const statusColor = isRunning ? 'text-[#FFCA40]' : hasIssues ? 'text-red-400' : 'text-green-400';
                    const statusIcon = isRunning ? '🔄' : hasIssues ? '⚠️' : '✅';
                    
                    return (
                      <div key={agentName} className="flex items-center gap-2 text-sm">
                        <span>{statusIcon}</span>
                        <span className="text-white capitalize">{agentName}</span>
                        <span className={statusColor}>
                          {isRunning ? `${m.running} running` : hasIssues ? `${m.failed} failed` : 'ready'}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-gray-400 text-sm">Filter:</div>
                  <select
                    aria-label="Agent filter"
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#FFCA40] focus:border-transparent backdrop-blur-sm"
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
              </div>
            </section>
          )}

          {/* Conditional layout based on mode */}
          {mode === 'orchestrate' ? (
            /* Full-width layout for orchestrate mode */
            <section className="space-y-6" aria-label="Orchestrate conversation panel">
              <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6" aria-label="Interaction mode selector">
                  {['manual','orchestrate'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={()=> setMode(m as typeof mode)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        mode===m ? 
                        'bg-[#FFCA40] text-[#001D58] font-semibold' : 
                        'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {m === 'manual' ? 'Manual Commands' : 'Orchestrate Q&A'}
                    </button>
                  ))}
                </div>
                
                <div className="text-sm text-gray-400 mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  🤖 <strong>Orchestrate:</strong> Chat naturally with our AI agents - they&apos;ll intelligently route your questions to the right specialist
                </div>
                
                <div className="flex flex-col gap-6">
                  <div className="text-gray-300 p-4 bg-white/5 rounded-xl border border-white/10">
                    💬 Ask questions like you would with a data analyst. Get insights about patient assessments, trends, and interventions.
                  </div>
                  <OrchestrateChat messages={chatMessages} isLoading={!!orchestrateDraft.loading} />
                  <div className="space-y-4">
                    <OrchestrateComposer
                      disabled={connectionState !== 'open'}
                      draft={orchestrateDraft}
                      onChange={setOrchestrateDraft}
                      onSubmit={askOrchestrator}
                    />
                    <div className="space-y-4">
                      <div className="text-sm font-medium text-gray-300">💡 Try these questions</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {[
                          "Show me high-risk assessments from the last week",
                          "What are the most common mental health concerns?", 
                          "Generate a summary of intervention outcomes",
                          "Which patients need immediate follow-up?"
                        ].map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => {
                              setOrchestrateDraft(prev => ({ ...prev, question: suggestion }));
                            }}
                            className="text-left text-sm p-3 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 hover:border-white/20 transition-all duration-200 text-gray-300 hover:text-white"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          ) : (
            /* 3-column layout for manual mode */
            <section className="grid lg:grid-cols-3 gap-6" aria-label="Main control panel">
              <div className="lg:col-span-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                <div className="flex items-center gap-4 mb-6" aria-label="Interaction mode selector">
                  {['manual','orchestrate'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={()=> setMode(m as typeof mode)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        mode===m ? 
                        'bg-[#FFCA40] text-[#001D58] font-semibold' : 
                        'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {m === 'manual' ? 'Manual Commands' : 'Orchestrate Q&A'}
                    </button>
                  ))}
                </div>
                
                <div className="text-sm text-gray-400 mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                  💡 <strong>Manual:</strong> Low-level agent commands • <strong>Orchestrate:</strong> Natural language questions with smart routing
                </div>
                
                <CommandComposer
                  connectionState={connectionState}
                  draft={draft}
                  onChange={setDraft}
                  onSubmit={sendCommand}
                />

                {/* Agent status indicators */}
                <div className="mt-6 text-sm text-gray-300">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${connectionState === 'open' ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span>WebSocket: {connectionState}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-400"></div>
                      <span>Agents: {Array.from(new Set(runs.map(r => r.agent))).length} active</span>
                    </div>
                  </div>
                </div>

                {/* Real-time events display */}
                <div className="mt-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                    📡 Real-time Events
                  </h3>
                  <div className="bg-black/20 rounded-lg border border-white/10 max-h-96 overflow-auto" ref={listRef}>
                    {Object.entries(grouped).map(([correlationId, evs], i) => (
                      <div key={correlationId + i} className="border-b border-white/10 last:border-b-0">
                        <div className="p-4">
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
                              triage: 'text-[#FFCA40] bg-[#FFCA40]/20 border-[#FFCA40]/40', 
                              analytics: 'text-blue-300 bg-blue-400/20 border-blue-400/40', 
                              intervention: 'text-green-300 bg-green-400/20 border-green-400/40' 
                            };
                            return (
                              <div className="mb-4 rounded-xl bg-white/5 border border-white/10 p-4 backdrop-blur-md" role="region" aria-label="Orchestrator answer summary">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-sm text-[#FFCA40] font-semibold flex items-center">
                                    🤖 Orchestrator Response
                                  </span>
                                  {resolved ? (
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${(resolved in colorMap ? colorMap[resolved] : 'text-gray-300 bg-gray-500/20 border-gray-500/40')} capitalize`}>
                                      {resolved}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-sm text-gray-200 whitespace-pre-wrap mb-3 p-3 bg-white/10 rounded-lg">{answer}</p>
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
                          {evs.map((e,j) => {
                            const firstTokenIndex = evs.findIndex(ev => ev.type==='token');
                            const showAggregated = e.type==='token' && j===firstTokenIndex && typeof e.correlationId==='string';
                            return (
                              <div key={j} className="flex gap-3 items-start py-2 border-b border-white/10 last:border-b-0">
                                <span className="text-xs text-gray-500 mt-1 font-mono bg-black/30 px-2 py-1 rounded">
                                  {typeof e.ts==='string'? new Date(e.ts).toLocaleTimeString(): ''}
                                </span>
                                {showAggregated ? (
                                  <pre className="flex-1 whitespace-pre-wrap break-words font-mono text-xs text-purple-300 bg-purple-500/10 p-3 rounded-lg border border-purple-500/20">
                                    {e.correlationId ? aggregatedTokens[String(e.correlationId)] || '' : ''}
                                  </pre>
                                ) : e.type==='token' ? null : (
                                  <pre className={`flex-1 whitespace-pre-wrap break-words font-mono text-xs p-3 rounded-lg border ${
                                    e.type === 'error' ? 'text-red-300 bg-red-500/10 border-red-500/20' : 
                                    e.type === 'run_started' ? 'text-green-300 bg-green-500/10 border-green-500/20' : 
                                    e.type === 'run_completed' ? 'text-blue-300 bg-blue-500/10 border-blue-500/20' : 
                                    e.type === 'run_cancelled' ? 'text-yellow-300 bg-yellow-500/10 border-yellow-500/20' : 
                                    'text-gray-300 bg-white/5 border-white/10'
                                  }`}>
                                    {JSON.stringify(e, null, 2)}
                                  </pre>
                                )}
                                {e.type==='run_completed' && evs.some(ev=> ev.type==='run_started' && typeof ev.runId==='number' && runs.find(r=> Number(r.id)===ev.runId && r.status==='failed')) && (
                                  <button onClick={()=> {
                                    const rs = evs.find(ev=> ev.type==='run_started');
                                    if(rs && typeof rs.runId==='number') retryRun(rs.runId);
                                  }} className="ml-3 px-3 py-1 text-xs rounded-lg bg-yellow-500 text-black hover:bg-yellow-400 transition-colors font-medium">
                                    Retry
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
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
                </div>
              </div>

              <aside className="space-y-6">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4 flex items-center">
                    📋 Quick Instructions
                  </h2>
                  <ul className="text-sm text-gray-300 space-y-3">
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-[#FFCA40] rounded-full mt-2 flex-shrink-0"></span>
                      Select an agent and action from the dropdown menus
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-[#FFCA40] rounded-full mt-2 flex-shrink-0"></span>
                      Optionally provide JSON payload for complex operations
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-[#FFCA40] rounded-full mt-2 flex-shrink-0"></span>
                      Click Dispatch to create and monitor the run
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="w-2 h-2 bg-[#FFCA40] rounded-full mt-2 flex-shrink-0"></span>
                      Real-time events will stream automatically
                    </li>
                  </ul>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-white flex items-center">
                      🔄 Recent Runs
                    </h2>
                    <button onClick={()=> refreshRuns()} className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-white/10 rounded-lg">
                      ↻
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {runs.filter(r => agentFilter==='all' || r.agent === agentFilter).slice(0,10).map(r => {
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
                            'border-[#FFCA40]/60 bg-[#FFCA40]/10 shadow-lg' : 
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
              </aside>
            </section>
          )}

          <section className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl p-6" aria-label="Agents configuration visualization">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white flex items-center">
                  <FiGitMerge className="mr-3 text-[#FFCA40]" />
                  Agents Configuration
                </h2>
                <p className="text-gray-300 mt-1">Visualize and inspect LangGraph agent flows and dependencies.</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6">
              <LangGraphViewer />
            </div>
          </section>
        </div>
      </div>
    </AccessGuard>
  );
};

export default AgentsCommandCenterClient;