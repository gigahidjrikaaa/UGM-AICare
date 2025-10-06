import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { ChatRequestPayload } from '@/types/chat';
import { AgentsWSClient, AgentStreamEvent } from '@/lib/agents/wsClient';

type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

interface StreamCallbacks {
  onToken: (chunk: string) => void;
  onCompleted: (payload: AgentStreamEvent) => void;
  onError: (message: string) => void;
}

export interface ChatStreamController {
  status: ConnectionState;
  isStreaming: boolean;
  startStreaming: (payload: ChatRequestPayload, callbacks: StreamCallbacks) => Promise<boolean>;
  cancelStreaming: () => void;
}

function buildWsUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_CHAT_WS_URL;
  if (explicit) {
    return explicit.replace(/\/$/, '');
  }
  const base = process.env.NEXT_PUBLIC_BACKEND_WS_BASE || process.env.NEXT_PUBLIC_BACKEND_BASE || process.env.NEXT_PUBLIC_API_URL;
  if (!base) {
    if (typeof window === 'undefined') {
      return null;
    }
    const origin = window.location.origin.replace(/^http/, 'ws');
    return origin.replace(/\/$/, '') + '/api/v1/chat/ws';
  }
  const normalizedBase = base.replace(/\/$/, '');
  const wsBase = normalizedBase.replace(/^http/, 'ws');
  return `${wsBase}/api/v1/chat/ws`;
}

export function useChatStream(): ChatStreamController {
  const { data: session } = useSession();
  const [status, setStatus] = useState<ConnectionState>('idle');
  const [isStreaming, setIsStreaming] = useState(false);

  const clientRef = useRef<AgentsWSClient | null>(null);
  const pendingPayloadRef = useRef<ChatRequestPayload | null>(null);
  const callbacksRef = useRef<StreamCallbacks | null>(null);
  const wsUrl = useMemo(() => buildWsUrl(), []);

  const resetState = useCallback(() => {
    setIsStreaming(false);
    pendingPayloadRef.current = null;
    callbacksRef.current = null;
  }, []);

  const ensureClient = useCallback(() => {
    if (!wsUrl || !session?.accessToken) {
      return null;
    }
    if (clientRef.current) {
      return clientRef.current;
    }
    const client = new AgentsWSClient({
      url: wsUrl,
      token: session.accessToken,
      onEvent: (event) => {
        const callbacks = callbacksRef.current;
        if (!callbacks) {
          return;
        }
        if (event.type === 'token' && typeof event.token === 'string') {
          callbacks.onToken(String(event.token));
          return;
        }
        if (event.type === 'completed') {
          callbacks.onCompleted(event);
          resetState();
          return;
        }
        if (event.type === 'error') {
          const detail = typeof event.detail === 'string' ? event.detail : 'Streaming error';
          callbacks.onError(detail);
          resetState();
        }
      },
      onStatusChange: (s) => {
        setStatus(s);
        if (s === 'open' && pendingPayloadRef.current) {
          client.send(pendingPayloadRef.current);
          pendingPayloadRef.current = null;
          setIsStreaming(true);
        }
        if ((s === 'closed' || s === 'error') && callbacksRef.current && isStreaming) {
          callbacksRef.current.onError('Streaming connection closed.');
          resetState();
        }
      },
    });
    clientRef.current = client;
    return client;
  }, [wsUrl, session?.accessToken, isStreaming, resetState]);

  const startStreaming = useCallback<ChatStreamController['startStreaming']>(
    async (payload, callbacks) => {
      const client = ensureClient();
      if (!client) {
        return false;
      }
      if (isStreaming) {
        return false;
      }
      callbacksRef.current = callbacks;
      if (status === 'open') {
        client.send(payload);
        setIsStreaming(true);
      } else {
        pendingPayloadRef.current = payload;
        if (status === 'idle' || status === 'closed' || status === 'error') {
          setStatus('connecting');
          client.connect();
        }
      }
      return true;
    },
    [ensureClient, isStreaming, status],
  );

  const cancelStreaming = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.close();
      clientRef.current = null;
    }
    resetState();
    setStatus('closed');
  }, [resetState]);

  useEffect(
    () => () => {
      if (clientRef.current) {
        clientRef.current.close();
        clientRef.current = null;
      }
    },
    [],
  );

  return { status, isStreaming, startStreaming, cancelStreaming };
}
