'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function ArchitectureGuide() {
    const [activeTab, setActiveTab] = useState<'agents' | 'bdi' | 'flows' | 'theory'>('agents');

    const agents = [
        {
            id: 'sta',
            name: 'Safety Triage Agent (STA)',
            role: 'First Responder (Chapter 3.2)',
            description: 'Real-time crisis detection and risk assessment using a 3-tier strategy (Rules → Gemini → Cache). Ensures immediate intervention for high-risk inputs.',
            bdi: {
                belief: 'User input contains potential safety risks (e.g., self-harm keywords).',
                desire: 'Prevent harm and ensure user safety.',
                intention: 'Classify risk severity (0-3) and route to appropriate support (SCA or SDA).'
            },
            icon: '🛡️'
        },
        {
            id: 'tca',
            name: 'Therapeutic Coach Agent (TCA)',
            role: 'Support Provider (Chapter 3.3)',
            description: 'Delivers evidence-based, CBT-informed coaching for low-to-moderate risk users. Focuses on skill-building and emotional regulation.',
            bdi: {
                belief: 'User is experiencing distress but is not in immediate danger.',
                desire: 'Alleviate distress through cognitive restructuring.',
                intention: 'Generate a personalized intervention plan with actionable steps.'
            },
            icon: '🧠'
        },
        {
            id: 'cma',
            name: 'Case Management Agent (CMA)',
            role: 'Resource Coordinator (Chapter 3.4)',
            description: 'Operational command center for high-risk cases. Manages clinical escalation, SLA tracking, and counselor auto-assignment.',
            bdi: {
                belief: 'Situation exceeds automated support capabilities (High/Critical Risk).',
                desire: 'Connect user with human professional immediately.',
                intention: 'Create a formal case, assign a counselor, and monitor SLA compliance.'
            },
            icon: '📋'
        },
        {
            id: 'ia',
            name: 'Insights Agent (IA)',
            role: 'Strategic Analyst (Chapter 3.5)',
            description: 'Privacy-preserving analytics engine. Uses k-anonymity (k≥5) and differential privacy to generate population-level insights.',
            bdi: {
                belief: 'Historical interaction data holds valuable trends.',
                desire: 'Provide actionable insights without compromising individual privacy.',
                intention: 'Execute aggregate queries and generate anonymized reports.'
            },
            icon: '📊'
        },
        {
            id: 'aika',
            name: 'AIKA Meta-Agent',
            role: 'Unified Orchestrator (Chapter 3.1)',
            description: 'The central consciousness that coordinates all agents. Uses Gemini 2.5 for intent classification and smart routing.',
            bdi: {
                belief: 'User intent requires specific specialized handling.',
                desire: 'Provide a seamless, empathetic, and effective user experience.',
                intention: 'Route the conversation to the most appropriate agent (STA, SCA, CMA, or IA).'
            },
            icon: '🤖'
        }
    ];

    return (
        <div className="bg-[#00153a]/20 backdrop-blur-sm border border-white/5 rounded-3xl shadow-xl overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-gradient-to-r from-white/5 to-transparent">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <span className="text-2xl">📚</span> Thesis Architecture Alignment
                </h2>
                <div className="flex bg-black/20 p-1 rounded-xl border border-white/5">
                    {[
                        { id: 'agents', label: 'Agent Roles' },
                        { id: 'bdi', label: 'BDI Model' },
                        { id: 'flows', label: 'Workflows' },
                        { id: 'theory', label: 'LangGraph' }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === tab.id
                                ? 'bg-[#FFCA40] text-[#00153a] shadow-lg scale-105'
                                : 'text-white/40 hover:text-white'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="p-8">
                <AnimatePresence mode="wait">
                    {activeTab === 'agents' && (
                        <motion.div
                            key="agents"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                        >
                            {agents.map((agent) => (
                                <div key={agent.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:bg-white/10 transition-all duration-300 group hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10">
                                    <div className="flex items-center gap-4 mb-4">
                                        <span className="text-3xl bg-white/5 p-3 rounded-xl group-hover:scale-110 transition-transform">{agent.icon}</span>
                                        <div>
                                            <h3 className="text-lg font-bold text-white group-hover:text-[#FFCA40] transition-colors">{agent.name}</h3>
                                            <span className="text-xs font-bold text-white/30 uppercase tracking-widest">{agent.role}</span>
                                        </div>
                                    </div>
                                    <p className="text-white/60 text-sm leading-relaxed mb-6">
                                        {agent.description}
                                    </p>
                                    <div className="bg-black/20 rounded-xl p-4 border border-white/5">
                                        <div className="text-[10px] font-bold text-emerald-400 mb-1 uppercase tracking-wider">Core Intention</div>
                                        <div className="text-sm text-white/80 italic">"{agent.bdi.intention}"</div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    )}

                    {activeTab === 'bdi' && (
                        <motion.div
                            key="bdi"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-8"
                        >
                            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-white/5 rounded-2xl p-8 text-center">
                                <h3 className="text-2xl font-bold text-white mb-4">Belief-Desire-Intention (BDI) Architecture (Chapter 2.3)</h3>
                                <p className="text-white/60 max-w-3xl mx-auto text-lg leading-relaxed">
                                    The BDI model characterizes an agent using its mental state. In UGM-AICare, this is implemented via LangGraph State (Beliefs), Conditional Edges (Desires), and Node Functions (Intentions).
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-8 relative overflow-hidden group hover:bg-white/10 transition-colors">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 text-8xl group-hover:opacity-10 transition-opacity">🧠</div>
                                    <h4 className="text-xl font-bold text-blue-400 mb-4">Beliefs (Information)</h4>
                                    <p className="text-white/50 text-sm mb-6">The agent's knowledge about the world and current state.</p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-3 text-sm text-white/70"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>User Profile & History</li>
                                        <li className="flex items-center gap-3 text-sm text-white/70"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>Current Conversation Context</li>
                                        <li className="flex items-center gap-3 text-sm text-white/70"><span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>Clinical Guidelines (JUKNIS)</li>
                                    </ul>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-8 relative overflow-hidden group hover:bg-white/10 transition-colors">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 text-8xl group-hover:opacity-10 transition-opacity">❤️</div>
                                    <h4 className="text-xl font-bold text-pink-400 mb-4">Desires (Objectives)</h4>
                                    <p className="text-white/50 text-sm mb-6">The goals the agent wants to accomplish based on its beliefs.</p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-3 text-sm text-white/70"><span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>Ensure User Safety (Priority #1)</li>
                                        <li className="flex items-center gap-3 text-sm text-white/70"><span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>Provide Empathetic Support</li>
                                        <li className="flex items-center gap-3 text-sm text-white/70"><span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>Maintain Data Privacy</li>
                                    </ul>
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-8 relative overflow-hidden group hover:bg-white/10 transition-colors">
                                    <div className="absolute top-0 right-0 p-6 opacity-5 text-8xl group-hover:opacity-10 transition-opacity">⚡</div>
                                    <h4 className="text-xl font-bold text-yellow-400 mb-4">Intentions (Actions)</h4>
                                    <p className="text-white/50 text-sm mb-6">The specific actions the agent has committed to executing.</p>
                                    <ul className="space-y-3">
                                        <li className="flex items-center gap-3 text-sm text-white/70"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>Execute Risk Assessment (STA)</li>
                                        <li className="flex items-center gap-3 text-sm text-white/70"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>Generate CBT Plan (TCA)</li>
                                        <li className="flex items-center gap-3 text-sm text-white/70"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>Escalate to Counselor (CMA)</li>
                                    </ul>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'flows' && (
                        <motion.div
                            key="flows"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
                        >
                            <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-xl">🎓</span> Student Flow
                                </h4>
                                <div className="space-y-4 relative">
                                    <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-white/10"></div>
                                    <div className="relative pl-8">
                                        <span className="absolute left-0 top-1 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
                                        <p className="text-sm text-white/80">User sends message</p>
                                        <p className="text-xs text-white/40 mt-1">"I'm feeling overwhelmed"</p>
                                    </div>
                                    <div className="relative pl-8">
                                        <span className="absolute left-0 top-1 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">2</span>
                                        <p className="text-sm text-white/80">Aika invokes STA</p>
                                        <p className="text-xs text-white/40 mt-1">Risk Assessment: Moderate</p>
                                    </div>
                                    <div className="relative pl-8">
                                        <span className="absolute left-0 top-1 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                                        <p className="text-sm text-white/80">Aika routes to TCA</p>
                                        <p className="text-xs text-white/40 mt-1">Generates Coping Plan</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-xl">👨‍💼</span> Admin Flow
                                </h4>
                                <div className="space-y-4 relative">
                                    <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-white/10"></div>
                                    <div className="relative pl-8">
                                        <span className="absolute left-0 top-1 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
                                        <p className="text-sm text-white/80">Admin queries trends</p>
                                        <p className="text-xs text-white/40 mt-1">"Trending topics this week?"</p>
                                    </div>
                                    <div className="relative pl-8">
                                        <span className="absolute left-0 top-1 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">2</span>
                                        <p className="text-sm text-white/80">Aika invokes IA</p>
                                        <p className="text-xs text-white/40 mt-1">Checks Privacy Budget</p>
                                    </div>
                                    <div className="relative pl-8">
                                        <span className="absolute left-0 top-1 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                                        <p className="text-sm text-white/80">IA executes Query</p>
                                        <p className="text-xs text-white/40 mt-1">Applies k-anonymity (k=5)</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/5 rounded-2xl p-6">
                                <h4 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                    <span className="text-xl">👨‍⚕️</span> Counselor Flow
                                </h4>
                                <div className="space-y-4 relative">
                                    <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-white/10"></div>
                                    <div className="relative pl-8">
                                        <span className="absolute left-0 top-1 w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
                                        <p className="text-sm text-white/80">Counselor checks cases</p>
                                        <p className="text-xs text-white/40 mt-1">"Show high-risk cases"</p>
                                    </div>
                                    <div className="relative pl-8">
                                        <span className="absolute left-0 top-1 w-6 h-6 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-xs font-bold">2</span>
                                        <p className="text-sm text-white/80">Aika invokes CMA</p>
                                        <p className="text-xs text-white/40 mt-1">Retrieves Case Data</p>
                                    </div>
                                    <div className="relative pl-8">
                                        <span className="absolute left-0 top-1 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">3</span>
                                        <p className="text-sm text-white/80">CMA displays Dashboard</p>
                                        <p className="text-xs text-white/40 mt-1">Prioritized by SLA</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'theory' && (
                        <motion.div
                            key="theory"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="grid grid-cols-1 lg:grid-cols-2 gap-8"
                        >
                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-2xl font-bold text-white mb-4">LangGraph Implementation (Chapter 4.2)</h3>
                                    <p className="text-white/60 leading-relaxed">
                                        LangGraph provides the structural framework to implement the BDI architecture. Each node in the graph represents a distinct cognitive step or agent action.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex items-start gap-5 bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="bg-blue-500/20 p-3 rounded-xl text-blue-400 font-mono text-sm">StateGraph</div>
                                        <div>
                                            <h4 className="font-bold text-white mb-1">The Environment</h4>
                                            <p className="text-sm text-white/50">Holds the shared state (Beliefs) accessible to all agents.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-5 bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="bg-purple-500/20 p-3 rounded-xl text-purple-400 font-mono text-sm">Nodes</div>
                                        <div>
                                            <h4 className="font-bold text-white mb-1">The Agents</h4>
                                            <p className="text-sm text-white/50">Functions that process state and determine actions (Intentions).</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-5 bg-white/5 p-6 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className="bg-yellow-500/20 p-3 rounded-xl text-yellow-400 font-mono text-sm">Edges</div>
                                        <div>
                                            <h4 className="font-bold text-white mb-1">Control Flow</h4>
                                            <p className="text-sm text-white/50">Conditional logic that directs the conversation based on outcomes (Desires).</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-black/30 rounded-2xl p-8 border border-white/5 font-mono text-sm text-white/70 overflow-hidden relative">
                                <div className="absolute top-4 right-4 text-xs text-white/20 font-bold uppercase tracking-widest">Python Code</div>
                                <pre className="whitespace-pre-wrap relative z-10">
                                    {`class AgentState(TypedDict):
    messages: Annotated[List[BaseMessage], add_messages]
    risk_level: str
    next_step: str

workflow = StateGraph(AgentState)

# Nodes (Agents)
workflow.add_node("sta", safety_triage_agent)
workflow.add_node("tca", therapeutic_coach_agent)
workflow.add_node("cma", case_manager_agent)

# Edges (Logic)
workflow.add_conditional_edges(
    "sta",
    route_based_on_risk,
    {
        "low": "tca",
        "high": "cma"
    }
)

app = workflow.compile()`}
                                </pre>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
