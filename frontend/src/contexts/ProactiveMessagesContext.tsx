'use client';

/**
 * ProactiveMessagesContext — the student-facing proactive channel.
 *
 * Fetches pending Aika-initiated messages on mount and stays live via the
 * user-scoped SSE endpoint (`/api/v1/sse/events`), using the generic
 * useSSE hook (previously unused — it handles auth + reconnect).
 *
 * Consumers:
 * - chat page (`/aika`): renders pending messages as Aika's opening bubbles
 *   and adopts their `session_id` for thread continuity;
 * - dashboard: unread badge on the "Talk with Aika" hero card.
 */
import { useSession } from 'next-auth/react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useSSE } from '@/hooks/useSSE';
import {
  fetchPendingProactiveMessages,
  markProactiveMessageRead,
  ProactiveMessage,
} from '@/services/proactiveApi';

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const SSE_EVENTS_URL = `${apiOrigin}/api/v1/sse/events`;

interface ProactiveMessagesContextValue {
  /** Pending (unread) proactive messages, newest delivery first. */
  messages: ProactiveMessage[];
  unreadCount: number;
  /** Mark one message read (also removes it from the pending list). */
  markRead: (messageId: string) => Promise<void>;
  /** Mark ALL current messages read (used by the chat page on open). */
  markAllRead: () => Promise<void>;
  isConnected: boolean;
}

const ProactiveMessagesContext =
  React.createContext<ProactiveMessagesContextValue | null>(null);

export function ProactiveMessagesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status: sessionStatus } = useSession();
  const [messages, setMessages] = useState<ProactiveMessage[]>([]);
  const messagesRef = useRef<ProactiveMessage[]>([]);
  messagesRef.current = messages;

  const refresh = useCallback(async () => {
    try {
      const data = await fetchPendingProactiveMessages();
      setMessages(data.messages || []);
    } catch {
      // 401 during sign-out, network hiccup, or feature disabled — stay quiet.
      setMessages((prev) => (prev.length ? prev : []));
    }
  }, []);

  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    void refresh();
  }, [sessionStatus, refresh]);

  const handleEvent = useCallback(
    (event: { type: string; data: unknown }) => {
      if (event.type !== 'proactive_message') return;
      const payload = event.data as Partial<ProactiveMessage> | string;
      const incoming: ProactiveMessage =
        typeof payload === 'string'
          ? {
              id: `sse-${Date.now()}`,
              source: 'plan_followup',
              source_entity_id: null,
              session_id: '',
              content: payload,
              status: 'pending',
              created_at: new Date().toISOString(),
              delivered_at: new Date().toISOString(),
            }
          : {
              id: String(payload.id || `sse-${Date.now()}`),
              source: payload.source || 'plan_followup',
              source_entity_id: payload.source_entity_id ?? null,
              session_id: payload.session_id || '',
              content: String(payload.content || ''),
              status: 'pending',
              created_at: new Date().toISOString(),
              delivered_at: new Date().toISOString(),
            };
      setMessages((prev) =>
        prev.some((m) => m.id === incoming.id) ? prev : [incoming, ...prev]
      );
    },
    []
  );

  // Live updates: only connect while authenticated; the hook itself manages
  // reconnect/backoff and reads the auth token from the NextAuth session.
  useSSE({
    url: SSE_EVENTS_URL,
    onEvent: handleEvent,
    eventTypes: ['proactive_message', 'connected'],
    autoReconnect: true,
  });

  const markRead = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    try {
      await markProactiveMessageRead(messageId);
    } catch {
      // Optimistic removal: a stale pending row disappears on next refresh.
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const pending = messagesRef.current;
    setMessages([]);
    await Promise.allSettled(pending.map((m) => markProactiveMessageRead(m.id)));
  }, []);

  const value = useMemo<ProactiveMessagesContextValue>(
    () => ({
      messages,
      unreadCount: messages.length,
      markRead,
      markAllRead,
      isConnected: false,
    }),
    [messages, markRead, markAllRead]
  );

  return (
    <ProactiveMessagesContext.Provider value={value}>
      {children}
    </ProactiveMessagesContext.Provider>
  );
}

export function useProactiveMessages(): ProactiveMessagesContextValue {
  const ctx = React.useContext(ProactiveMessagesContext);
  if (!ctx) {
    // Fail soft: consumers outside the provider see an empty channel.
    return {
      messages: [],
      unreadCount: 0,
      markRead: async () => {},
      markAllRead: async () => {},
      isConnected: false,
    };
  }
  return ctx;
}
