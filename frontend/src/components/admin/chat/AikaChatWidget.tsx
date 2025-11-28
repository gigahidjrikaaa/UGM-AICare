'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiMessageSquare, FiX, FiSend, FiMinimize2, FiMaximize2 } from 'react-icons/fi';
import { decodeJwt } from 'jose';
import CounselorCard from '@/components/features/chat/CounselorCard';
import TimeSlotCard from '@/components/features/chat/TimeSlotCard';

interface OrchestrateChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    ts: string;
    correlationId?: string;
    resolvedAgent?: string;
    metrics?: Record<string, unknown>;
    pending?: boolean;
}

const pillColor: Record<string, string> = {
    triage: "bg-[#FFCA40]/20 text-[#FFCA40] border border-[#FFCA40]/40",
    analytics: "bg-blue-500/20 text-blue-300 border border-blue-400/40",
    intervention: "bg-green-500/20 text-green-300 border border-green-400/40",
};

export default function AikaChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<OrchestrateChatMessage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [config, setConfig] = useState<{ apiBase: string } | null>(null);
    const [userId, setUserId] = useState<number | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isOpen]);

    useEffect(() => {
        const backendHttpBase = (process.env.NEXT_PUBLIC_BACKEND_BASE || process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
        const apiBase = backendHttpBase ? backendHttpBase + '/api/v1' : ''; // Use API root base
        setConfig({ apiBase });

        // Get and decode token
        const getCookie = (name: string) => {
            if (typeof document === 'undefined') return undefined;
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
        };

        const token = getCookie('access_token');
        if (token) {
            try {
                const claims = decodeJwt(token);
                if (claims.sub) {
                    setUserId(parseInt(claims.sub, 10));
                }
            } catch (e) {
                console.error("Failed to decode token:", e);
            }
        }
    }, []);

    // Helper to handle card selection
    const handleCardSelection = (text: string) => {
        if (isLoading) return;

        // Optimistic update for user selection
        const correlationId = `orc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        setMessages(prev => [
            ...prev,
            { id: `u-${correlationId}`, role: 'user', content: text, ts: new Date().toISOString(), correlationId },
            { id: `a-${correlationId}`, role: 'assistant', content: '', ts: new Date().toISOString(), correlationId, pending: true }
        ]);

        submitMessage(text, correlationId);
    };

    const submitMessage = async (text: string, correlationId: string) => {
        setIsLoading(true);
        try {
            const getCookie = (name: string) => {
                if (typeof document === 'undefined') return undefined;
                const value = `; ${document.cookie}`;
                const parts = value.split(`; ${name}=`);
                if (parts.length === 2) return parts.pop()?.split(';').shift();
            };
            const token = getCookie('access_token');

            const payload = {
                message: text,
                user_id: userId,
                role: "admin",
                conversation_history: messages.map(m => ({
                    role: m.role,
                    content: m.content
                })),
                session_id: `sess_${userId}_admin`
            };

            const res = await fetch(`${config?.apiBase}/aika`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Request failed: ${res.status} ${errText}`);
            }

            const data = await res.json();

            setMessages(prev => prev.map(m => (m.correlationId === correlationId && m.role === 'assistant')
                ? ({
                    ...m,
                    content: data.response,
                    pending: false,
                    resolvedAgent: data.metadata?.response_source || 'aika',
                    metrics: data.metadata
                })
                : m));

        } catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            setMessages(prev => prev.map(m => (m.correlationId === correlationId && m.role === 'assistant')
                ? ({ ...m, content: `Error: ${msg}`, pending: false })
                : m));
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading || !config?.apiBase || !userId) return;

        const question = input.trim();
        setInput('');

        const correlationId = `orc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

        // Optimistic update
        setMessages(prev => [
            ...prev,
            { id: `u-${correlationId}`, role: 'user', content: question, ts: new Date().toISOString(), correlationId },
            { id: `a-${correlationId}`, role: 'assistant', content: '', ts: new Date().toISOString(), correlationId, pending: true }
        ]);

        await submitMessage(question, correlationId);
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="fixed bottom-6 right-6 p-4 bg-[#FFCA40] hover:bg-[#ffc107] text-[#001D58] rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 group"
                aria-label="Open Aika Chat"
            >
                <div className="relative">
                    <FiMessageSquare className="w-6 h-6" />
                </div>
                <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#001D58] text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Chat with Aika
                </span>
            </button>
        );
    }

    return (
        <div className={`fixed bottom-6 right-6 bg-[#00153a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 transition-all duration-300 flex flex-col ${isMinimized ? 'w-72 h-14' : 'w-[400px] h-[600px]'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10 bg-white/5 rounded-t-2xl cursor-pointer" onClick={() => !isMinimized && setIsMinimized(true)}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#FFCA40] to-[#FFAB00] flex items-center justify-center text-[#001D58] font-bold">
                        A
                    </div>
                    <div>
                        <h3 className="text-white font-semibold text-sm">Aika Assistant</h3>
                        <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                            <span className="text-[10px] text-white/60 uppercase tracking-wider">Online</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }}
                        className="p-1.5 hover:bg-white/10 rounded-lg text-white/60 hover:text-white transition-colors"
                    >
                        {isMinimized ? <FiMaximize2 className="w-4 h-4" /> : <FiMinimize2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); setIsOpen(false); }}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/60 hover:text-red-400 transition-colors"
                    >
                        <FiX className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            {!isMinimized && (
                <>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {messages.length === 0 && (
                            <div className="text-center py-8 text-white/40">
                                <div className="text-4xl mb-3">👋</div>
                                <p className="text-sm">Hi! I'm Aika. How can I help you manage the system today?</p>
                            </div>
                        )}

                        {messages.map((m) => (
                            <div key={m.id} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === 'user'
                                    ? 'bg-[#FFCA40] text-[#001D58] rounded-tr-none'
                                    : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'
                                    }`}>
                                    <p className="whitespace-pre-wrap break-words">{m.content}</p>

                                    {m.role === 'assistant' && (
                                        <div className="mt-2 flex flex-col gap-2">
                                            <div className="flex flex-wrap gap-2">
                                                {m.resolvedAgent && (
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${pillColor[m.resolvedAgent] || 'bg-gray-500/20 text-gray-300 border-gray-500/40'}`}>
                                                        {m.resolvedAgent}
                                                    </span>
                                                )}
                                                {m.pending && (
                                                    <span className="text-[10px] text-[#FFCA40] flex items-center gap-1">
                                                        <span className="w-1 h-1 bg-[#FFCA40] rounded-full animate-bounce"></span>
                                                        Thinking...
                                                    </span>
                                                )}
                                            </div>

                                            {/* Display Tool Calls if present */}
                                            {m.metrics?.tool_calls && Array.isArray(m.metrics.tool_calls) && m.metrics.tool_calls.length > 0 && (
                                                <div className="text-[10px] bg-white/5 rounded p-2 border border-white/5 space-y-1">
                                                    <div className="text-white/40 font-medium flex items-center gap-1">
                                                        <span className="w-1 h-1 rounded-full bg-blue-400"></span>
                                                        Tools Used:
                                                    </div>
                                                    {m.metrics.tool_calls.map((tool: any, idx: number) => (
                                                        <div key={idx} className="text-white/60 pl-2 border-l border-white/10">
                                                            <span className="text-blue-300">{tool.tool_name}</span>
                                                            <span className="text-white/30 ml-1">
                                                                ({Object.keys(tool.arguments || {}).join(', ')})
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Render Interactive Cards based on Tool Calls */}
                                {m.role === 'assistant' && m.metrics?.tool_calls && Array.isArray(m.metrics.tool_calls) && (
                                    <div className="mt-2 w-full overflow-x-auto pb-2 custom-scrollbar">
                                        <div className="flex gap-3 px-1">
                                            {m.metrics.tool_calls.map((tool: any, idx: number) => {
                                                // Check for get_available_counselors result
                                                if (tool.tool_name === 'get_available_counselors' && tool.result?.counselors) {
                                                    return tool.result.counselors.map((counselor: any) => (
                                                        <CounselorCard
                                                            key={counselor.id}
                                                            counselor={counselor}
                                                            onSelect={(c) => handleCardSelection(`Saya pilih ${c.name} (ID: ${c.id})`)}
                                                        />
                                                    ));
                                                }
                                                // Check for suggest_appointment_times result
                                                if (tool.tool_name === 'suggest_appointment_times' && tool.result?.suggestions) {
                                                    return tool.result.suggestions.map((slot: any, sIdx: number) => (
                                                        <TimeSlotCard
                                                            key={sIdx}
                                                            slot={slot}
                                                            onSelect={(s) => handleCardSelection(`Saya pilih waktu ${s.time_label} (${s.datetime})`)}
                                                        />
                                                    ));
                                                }
                                                return null;
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input Area */}
                    <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 bg-white/5 rounded-b-2xl">
                        <div className="relative flex items-center gap-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask Aika..."
                                className="flex-1 bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#FFCA40]/50 focus:ring-1 focus:ring-[#FFCA40]/50 transition-all"
                                disabled={isLoading}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isLoading}
                                className="p-2.5 bg-[#FFCA40] hover:bg-[#ffc107] disabled:opacity-50 disabled:cursor-not-allowed text-[#001D58] rounded-xl transition-colors"
                            >
                                <FiSend className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}
