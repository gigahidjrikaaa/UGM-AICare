/**
 * useAikaWebSocket Hook
 * 
 * WebSocket-enabled chat hook for real-time messaging with activity logging support.
 * This extends the REST-based useAikaChat with WebSocket streaming capabilities.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';
import type { Message } from '@/types/chat';
import type { ActivityLog } from '@/types/activity';
import { useActivityLog } from './useActivityLog';

interface UseAikaWebSocketOptions {
  sessionId: string;
  enableActivityLog?: boolean;
  onMessage?: (message: Message) => void;
  onError?: (error: string) => void;
}

export function useAikaWebSocket(options: UseAikaWebSocketOptions) {
  const {
    sessionId,
    enableActivityLog = true,
    onMessage,
    onError,
  } = options;

  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Activity logging
  const activityLogRef = useRef<{
    addActivity: (activity: ActivityLog) => void;
  } | null>(null);

  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [latestActivity, setLatestActivity] = useState<ActivityLog | null>(null);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const [isReceiving, setIsReceiving] = useState(false);
  const activeAgentsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add activity helper
  const addActivity = useCallback((activity: ActivityLog) => {
    setActivities((prev) => [...prev, activity].slice(-100)); // Keep last 100
    setLatestActivity(activity);
    setIsReceiving(true);

    // Track active agents
    if (activity.activity_type === 'agent_start') {
      setActiveAgents((prev) => {
        if (!prev.includes(activity.agent)) {
          return [...prev, activity.agent];
        }
        return prev;
      });
    } else if (
      activity.activity_type === 'agent_complete' ||
      activity.activity_type === 'agent_error'
    ) {
      setActiveAgents((prev) => prev.filter((a) => a !== activity.agent));
    }

    // Clear isReceiving flag
    if (activeAgentsTimeoutRef.current) {
      clearTimeout(activeAgentsTimeoutRef.current);
    }
    activeAgentsTimeoutRef.current = setTimeout(() => {
      setIsReceiving(false);
    }, 500);

    console.log('[Activity]', activity.agent, ':', activity.message);
  }, []);

  const clearActivitiesFunc = useCallback(() => {
    setActivities([]);
    setLatestActivity(null);
    setActiveAgents([]);
    setIsReceiving(false);
  }, []);

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (!session?.accessToken) {
      console.warn('[WebSocket] No access token available');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return;
    }

    try {
      // Construct WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/mental-health/chat/ws?token=${session.accessToken}`;

      console.log('[WebSocket] Connecting to:', wsUrl.replace(session.accessToken, '***'));

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Clear reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Message received:', data.type);

          // Handle activity logs
          if (data.type === 'activity_log') {
            const activity: ActivityLog = data.data;
            addActivity(activity);
            return;
          }

          // Handle chat completion
          if (data.type === 'completed') {
            setIsLoading(false);

            // Add assistant message
            const assistantMessage: Message = {
              id: uuidv4(),
              role: 'assistant',
              content: data.response,
              timestamp: new Date(),
              session_id: sessionId,
              conversation_id: data.conversationId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            if (onMessage) {
              onMessage(assistantMessage);
            }

            return;
          }

          // Handle tokens (streaming - currently not used by Aika)
          if (data.type === 'token') {
            // Token streaming not implemented yet
            console.log('[WebSocket] Token received:', data.token);
            return;
          }

          // Handle errors
          if (data.type === 'error') {
            setIsLoading(false);
            const errorMsg = data.detail?.message || data.detail?.error || data.detail || 'Unknown error';
            console.error('[WebSocket] Error:', errorMsg);
            toast.error(errorMsg);

            if (onError) {
              onError(errorMsg);
            }
            return;
          }
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error: Event) => {
        console.error('[WebSocket] Error occurred:', error);
        setIsConnected(false);
      };

      ws.onclose = (event: CloseEvent) => {
        console.log('[WebSocket] Connection closed:', event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, delay);
        } else {
          console.error('[WebSocket] Max reconnection attempts reached');
          toast.error('Connection lost. Please refresh the page.');
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      setIsConnected(false);
    }
  }, [session, sessionId, onMessage, onError]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
  }, []);

  /**
   * Send message via WebSocket
   */
  const sendMessage = useCallback(
    async (message?: string) => {
      const userMessageContent = (typeof message === 'string' ? message : inputValue).trim();
      if (!userMessageContent) return;
      if (isLoading) return;
      if (!isConnected || !wsRef.current) {
        toast.error('Not connected. Reconnecting...');
        connect();
        return;
      }

      const conversationId = messages.find((m) => m.conversation_id)?.conversation_id || uuidv4();

      // Add user message to UI
      const newUserMessage: Message = {
        id: uuidv4(),
        role: 'user',
        content: userMessageContent,
        timestamp: new Date(),
        session_id: sessionId,
        conversation_id: conversationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, newUserMessage]);
      setInputValue('');
      setIsLoading(true);
      clearActivitiesFunc(); // Clear previous activities

      // Send via WebSocket
      try {
        const payload = {
          message: userMessageContent,
          session_id: sessionId,
          conversation_id: conversationId,
          system_prompt: null,
          event: null,
        };

        wsRef.current.send(JSON.stringify(payload));
        console.log('[WebSocket] Message sent');
      } catch (error) {
        console.error('[WebSocket] Failed to send message:', error);
        setIsLoading(false);
        toast.error('Failed to send message. Please try again.');
      }
    },
    [inputValue, isLoading, isConnected, messages, sessionId, clearActivitiesFunc, connect]
  );

  /**
   * Handle input change
   */
  const handleInputChange = useCallback((value: string) => {
    setInputValue(value);
  }, []);

  // Connect on mount
  useEffect(() => {
    if (session?.accessToken) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [session, connect, disconnect]);

  // Initialize with greeting message
  useEffect(() => {
    if (messages.length === 0) {
      const greetingId = uuidv4();
      const conversationId = uuidv4();

      setMessages([
        {
          id: greetingId,
          role: 'assistant',
          content: 'Halo! Aku Aika, asisten AI untuk kesehatan mentalmu. Bagaimana kabarmu hari ini? 💙',
          timestamp: new Date(),
          session_id: sessionId,
          conversation_id: conversationId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);
    }
  }, [sessionId, messages.length]);

  return {
    // Messages
    messages,
    inputValue,
    isLoading,
    
    // WebSocket state
    isConnected,
    
    // Activity logging
    activities,
    latestActivity,
    activeAgents,
    isReceiving,
    clearActivities: clearActivitiesFunc,
    
    // Actions
    sendMessage,
    handleInputChange,
    connect,
    disconnect,
  };
}
