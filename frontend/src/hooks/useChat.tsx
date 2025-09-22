// src/hooks/useChat.ts
import { useState, useCallback, useEffect, useRef } from 'react';
import { useGreeting } from './useGreeting';
import { useChatSession } from './useChatSession';
import { useChatMessages } from './useChatMessages';
import { useChatApi } from './useChatApi';
import type { Message, ChatMode, AvailableModule, ApiMessage, ChatEventPayload } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

const UPDATED_AVAILABLE_MODULES: AvailableModule[] = [
  {
    id: 'help_me_start',
    name: 'Mulai dari Mana?',
    description: 'Bantu aku memilih latihan yang cocok untukku saat ini.',
  },
  {
    id: 'cbt_cognitive_restructuring',
    name: 'Menantang Pikiran Negatif',
    description: 'Latihan untuk mengidentifikasi, menantang, dan mengubah pola pikir yang tidak membantu.',
  },
  {
    id: 'cbt_problem_solving',
    name: 'Latihan Memecahkan Masalah',
    description: 'Mengatasi rasa kewalahan dengan memecah masalah menjadi langkah-langkah yang lebih mudah dikelola.',
  },
  {
    id: 'cbt_express_feelings',
    name: 'Belajar Mengekspresikan Perasaan dan Pikiran',
    description: 'Latihan interaktif untuk membantumu mengenali dan mengungkapkan perasaan serta pikiran secara sehat.',
  },
  {
    id: 'cbt_deal_with_guilt',
    name: 'Belajar Mengatasi Rasa Bersalah',
    description: 'Modul untuk membantumu memahami dan mengelola perasaan bersalah secara konstruktif.',
  },
];

export function useChat({ model }: { model: string }) {
  const [inputValue, setInputValue] = useState('');
  const [currentMode, setCurrentMode] = useState<ChatMode>('standard');
  const [pendingMessages, setPendingMessages] = useState<string[]>([]); // queued messages awaiting send
  const mergeBufferRef = useRef<{ text: string; ts: number }[]>([]); // for time-bucket merging
  const [mergeWindowMs, setMergeWindowMs] = useState<number>(() => {
    try { const v = localStorage.getItem('aika_merge_window_ms'); if (v) return Math.min(Math.max(parseInt(v,10)||1200,200),8000); } catch {} return 1200; });
  useEffect(() => { try { localStorage.setItem('aika_merge_window_ms', String(mergeWindowMs)); } catch {}; }, [mergeWindowMs]);
  const lastConversationIdRef = useRef<string | null>(null);
  const DRAFT_KEY = 'aika_chat_draft_v1';
  const MAX_QUEUE = 5;

  const { messages, setMessages, chatContainerRef, addAssistantChunksSequentially } = useChatMessages();
  const { initialGreeting, isGreetingLoading } = useGreeting(messages);
  const { currentSessionId } = useChatSession();
  const { isLoading, error, processApiCall, cancelCurrent } = useChatApi(currentSessionId, currentMode, addAssistantChunksSequentially, setMessages);

  // useEffect that sets the initial message for Aika
  useEffect(() => {
    if (messages.length === 0 && !isGreetingLoading && initialGreeting) {
      const newConversationId = uuidv4();
      setMessages([
        {
          id: uuidv4(),
          role: 'assistant',
          content: initialGreeting,
          timestamp: new Date(),
          session_id: currentSessionId,
          conversation_id: newConversationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    }
  }, [isGreetingLoading, initialGreeting, messages.length, currentSessionId, setMessages]);

  const handleSendMessage = useCallback(async (message?: string) => {
    const userMessageContent = (typeof message === 'string' ? message : inputValue).trim();
    if (!userMessageContent) return;

    const activeConversationId = messages.find(m => m.conversation_id)?.conversation_id || lastConversationIdRef.current || uuidv4();
    lastConversationIdRef.current = activeConversationId;

    const newUserMessage: Message = {
      id: uuidv4(),
      role: 'user',
      content: userMessageContent,
      timestamp: new Date(),
      session_id: currentSessionId,
      conversation_id: activeConversationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, newUserMessage]);
    setInputValue('');
    try { localStorage.removeItem(DRAFT_KEY); } catch {}

    if (isLoading) {
      const now = Date.now();
      mergeBufferRef.current.push({ text: userMessageContent, ts: now });
      const earliest = mergeBufferRef.current[0]?.ts ?? now;
      if (now - earliest >= mergeWindowMs) {
        const mergedText = mergeBufferRef.current.map(m => m.text).join('\n');
        mergeBufferRef.current = [];
        setPendingMessages(prev => {
          const combined = [...prev];
          if (combined.length >= MAX_QUEUE) combined[combined.length - 1] = mergedText; else combined.push(mergedText);
          return combined;
        });
      } else {
        setPendingMessages(prev => {
          const combined = [...prev];
          if (combined.length >= MAX_QUEUE) combined[combined.length - 1] = userMessageContent; else combined.push(userMessageContent);
          return combined;
        });
      }
      return;
    }

    const historyForApi: ApiMessage[] = [...messages, newUserMessage]
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    await processApiCall({
      messageContent: userMessageContent,
      history: historyForApi,
      conversation_id: activeConversationId,
      model,
    });
  }, [inputValue, isLoading, messages, currentSessionId, processApiCall, model, setMessages, mergeWindowMs]);

  // Drain queue & flush merge buffer when not loading
  useEffect(() => {
    if (!isLoading) {
      if (mergeBufferRef.current.length) {
        const merged = mergeBufferRef.current.map(m => m.text).join('\n');
        mergeBufferRef.current = [];
        if (merged.trim()) setPendingMessages(prev => [merged, ...prev]);
      }
      if (pendingMessages.length > 0) {
        const [next, ...rest] = pendingMessages;
        setPendingMessages(rest);
        Promise.resolve().then(() => handleSendMessage(next));
      }
    }
  }, [isLoading, pendingMessages, handleSendMessage]);

  // Timer flush: ensure merge buffer empties even if stream is long-running
  useEffect(() => {
    if (!isLoading || mergeBufferRef.current.length === 0) return;
    const timeout = setTimeout(() => {
      if (mergeBufferRef.current.length) {
        const merged = mergeBufferRef.current.map(m => m.text).join('\n');
        mergeBufferRef.current = [];
        setPendingMessages(prev => {
          const combined = [...prev];
            if (combined.length >= MAX_QUEUE) combined[combined.length - 1] = merged; else combined.push(merged);
            return combined;
        });
      }
    }, mergeWindowMs);
    return () => clearTimeout(timeout);
  }, [isLoading, pendingMessages, mergeWindowMs]);

  // Interrupt and replace current streaming response
  const interruptWithMessage = useCallback((content: string) => {
    if (!content.trim()) return;
    cancelCurrent();
    mergeBufferRef.current = [];
    setPendingMessages([]);
    setTimeout(() => handleSendMessage(content), 0);
  }, [cancelCurrent, handleSendMessage]);

  const removePendingAt = useCallback((index: number) => {
    setPendingMessages(prev => prev.filter((_, i) => i !== index));
  }, []);

  const movePending = useCallback((from: number, to: number) => {
    setPendingMessages(prev => {
      if (from < 0 || to < 0 || from >= prev.length || to >= prev.length || from === to) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  }, []);

  const handleStartModule = useCallback(async (moduleId: string) => {
    if (isLoading) return;

    const activeConversationId = messages.find(m => m.conversation_id)?.conversation_id || uuidv4();

    const systemMessageContent = `Memulai modul: ${UPDATED_AVAILABLE_MODULES.find(m => m.id === moduleId)?.name || moduleId}...`;
    const systemMessage: Message = {
      id: uuidv4(),
      role: 'system' as const,
      content: systemMessageContent,
      timestamp: new Date(),
      session_id: currentSessionId,
      conversation_id: activeConversationId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const messagesWithSystem = [...messages, systemMessage];
    setMessages(messagesWithSystem);
    setCurrentMode(`module:${moduleId}`);

    const historyForApi: ApiMessage[] = messagesWithSystem
      .filter(msg => msg.role === 'user' || msg.role === 'assistant')
      .slice(-10)
      .map((msg) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));

    const eventPayload: ChatEventPayload = { type: 'start_module', module_id: moduleId };

    await processApiCall({
      event: eventPayload,
      history: historyForApi.length > 0 ? historyForApi : undefined,
      conversation_id: activeConversationId,
      model: model,
    });
  }, [isLoading, messages, currentSessionId, processApiCall, setMessages, model]);

  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
    try { localStorage.setItem(DRAFT_KEY, value); } catch {}
  }, []);

  // Load draft once
  useEffect(() => {
    try {
      const stored = localStorage.getItem(DRAFT_KEY);
      if (stored) setInputValue(stored);
    } catch {}
  }, []);

  const setLiveTranscript = useCallback((transcript: string) => {
    setInputValue(transcript);
  }, []);

  return {
    messages,
    inputValue,
    isLoading,
    error,
    currentMode,
    availableModules: UPDATED_AVAILABLE_MODULES,
    chatContainerRef,
    handleInputChange,
    handleSendMessage,
    handleStartModule,
    setLiveTranscript,
    pendingMessages,
    cancelCurrent,
    interruptWithMessage,
    removePendingAt,
    movePending,
    mergeWindowMs,
    setMergeWindowMs,
  };
}
// ...existing code...
