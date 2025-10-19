/**
 * useSSE Hook - Server-Sent Events (SSE) connection management
 * 
 * Features:
 * - Auto-connect on mount
 * - Auto-reconnect with exponential backoff
 * - Event type filtering
 * - Connection status tracking
 * - Cleanup on unmount
 * 
 * @example
 * ```tsx
 * const { isConnected, events, error } = useSSE({
 *   url: '/api/v1/admin/sse/events',
 *   onEvent: (event) => {
 *     if (event.type === 'alert_created') {
 *       toast({ title: event.data.title });
 *     }
 *   },
 *   eventTypes: ['alert_created', 'case_updated']
 * });
 * ```
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface SSEEvent {
  id?: string;
  type: string;
  data: unknown;
  timestamp?: string;
}

export interface UseSSEOptions {
  /** SSE endpoint URL */
  url: string;
  /** Callback when event is received */
  onEvent?: (event: SSEEvent) => void;
  /** Filter specific event types (if empty, receive all) */
  eventTypes?: string[];
  /** Enable auto-reconnect on disconnect (default: true) */
  autoReconnect?: boolean;
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number;
  /** Enable debug logging (default: false) */
  debug?: boolean;
}

export interface UseSSEReturn {
  /** Connection status */
  isConnected: boolean;
  /** Recent events buffer (last 50) */
  events: SSEEvent[];
  /** Connection error if any */
  error: string | null;
  /** Manual reconnect */
  reconnect: () => void;
  /** Manual disconnect */
  disconnect: () => void;
  /** Clear events buffer */
  clearEvents: () => void;
}

export function useSSE(options: UseSSEOptions): UseSSEReturn {
  const {
    url,
    onEvent,
    eventTypes = [],
    autoReconnect = true,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    debug = false,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [events, setEvents] = useState<SSEEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  const log = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (message: string, ...args: any[]) => {
      if (debug) {
        console.log(`[useSSE] ${message}`, ...args);
      }
    },
    [debug]
  );

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const addEvent = useCallback((event: SSEEvent) => {
    setEvents((prev) => {
      const newEvents = [event, ...prev].slice(0, 50); // Keep last 50 events
      return newEvents;
    });
  }, []);

  const calculateReconnectDelay = useCallback(() => {
    // Exponential backoff: delay * 2^attempts, capped at maxReconnectDelay
    const delay = Math.min(
      reconnectDelay * Math.pow(2, reconnectAttemptsRef.current),
      maxReconnectDelay
    );
    return delay;
  }, [reconnectDelay, maxReconnectDelay]);

  const connect = useCallback(() => {
    if (!isMountedRef.current) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    log('Connecting to SSE endpoint:', url);

    try {
      const eventSource = new EventSource(url, {
        withCredentials: true, // Include cookies for authentication
      });

      eventSourceRef.current = eventSource;

      // Connection opened
      eventSource.onopen = () => {
        if (!isMountedRef.current) return;
        
        log('SSE connection established');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0; // Reset reconnect attempts on success
      };

      // Connection error
      eventSource.onerror = (event) => {
        if (!isMountedRef.current) return;

        log('SSE connection error:', event);
        setIsConnected(false);

        if (eventSource.readyState === EventSource.CLOSED) {
          setError('Connection closed by server');
          
          // Auto-reconnect if enabled
          if (autoReconnect) {
            const delay = calculateReconnectDelay();
            reconnectAttemptsRef.current++;
            
            log(`Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})...`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              if (isMountedRef.current && autoReconnect) {
                connect();
              }
            }, delay);
          }
        } else {
          setError('Connection error occurred');
        }
      };

      // Generic message handler (fallback)
      eventSource.onmessage = (event) => {
        if (!isMountedRef.current) return;

        try {
          const data = JSON.parse(event.data);
          const sseEvent: SSEEvent = {
            id: event.lastEventId,
            type: 'message',
            data,
            timestamp: new Date().toISOString(),
          };

          log('Received message event:', sseEvent);
          
          if (eventTypes.length === 0 || eventTypes.includes('message')) {
            addEvent(sseEvent);
            onEvent?.(sseEvent);
          }
        } catch (err) {
          log('Failed to parse SSE message:', err);
        }
      };

      // Register listeners for specific event types
      const typesToListen = eventTypes.length > 0 
        ? eventTypes 
        : ['connected', 'alert_created', 'case_updated', 'sla_breach', 'ia_report_generated', 'ping'];

      typesToListen.forEach((eventType) => {
        eventSource.addEventListener(eventType, (event: Event) => {
          if (!isMountedRef.current) return;

          const messageEvent = event as MessageEvent;
          
          try {
            const data = JSON.parse(messageEvent.data);
            const sseEvent: SSEEvent = {
              id: messageEvent.lastEventId,
              type: eventType,
              data,
              timestamp: new Date().toISOString(),
            };

            log(`Received ${eventType} event:`, sseEvent);

            // Add to events buffer (except ping)
            if (eventType !== 'ping') {
              addEvent(sseEvent);
            }

            // Call event handler
            onEvent?.(sseEvent);
          } catch (err) {
            log(`Failed to parse ${eventType} event:`, err);
          }
        });
      });

    } catch (err) {
      log('Failed to create EventSource:', err);
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsConnected(false);
    }
  }, [url, eventTypes, autoReconnect, onEvent, addEvent, calculateReconnectDelay, log]);

  const disconnect = useCallback(() => {
    log('Disconnecting SSE...');
    
    // Clear reconnect timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
  }, [log]);

  const reconnect = useCallback(() => {
    log('Manual reconnect triggered');
    reconnectAttemptsRef.current = 0; // Reset attempts for manual reconnect
    disconnect();
    connect();
  }, [connect, disconnect, log]);

  // Auto-connect on mount
  useEffect(() => {
    isMountedRef.current = true;
    connect();

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    events,
    error,
    reconnect,
    disconnect,
    clearEvents,
  };
}
