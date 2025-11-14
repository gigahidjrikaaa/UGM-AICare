// src/hooks/useAikaStream.tsx
import { useState, useCallback, useRef } from 'react';

interface StreamEvent {
  type: 'thinking' | 'status' | 'agent' | 'intervention_plan' | 'appointment' | 'agent_activity' | 'complete' | 'error';
  message?: string;
  node?: string;
  agent?: string;
  name?: string;
  description?: string;
  data?: any;
  response?: string;
  metadata?: any;
  error?: string;
}

interface AgentActivity {
  execution_path: string[];
  agents_invoked: string[];
  intent: string;
  intent_confidence: number;
  needs_agents: boolean;
  agent_reasoning: string;
  response_source: string;
  processing_time_ms: number;
  risk_level?: string;
  risk_score?: number;
}

export interface StreamCallbacks {
  onThinking?: (message: string) => void;
  onStatus?: (node: string, message: string) => void;
  onAgentInvoked?: (agent: string, name: string, description?: string) => void;
  onInterventionPlan?: (plan: any) => void;
  onAppointment?: (appointment: any) => void;
  onAgentActivity?: (activity: AgentActivity) => void;
  onComplete?: (response: string, metadata: any) => void;
  onError?: (error: string) => void;
}

export function useAikaStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<StreamEvent | null>(null);
  const [activeAgents, setActiveAgents] = useState<string[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsStreaming(false);
      setCurrentStatus(null);
      setActiveAgents([]);
    }
  }, []);

  const streamMessage = useCallback(async (
    message: string,
    conversationHistory: Array<{ role: string; content: string }>,
    sessionId: string,
    role: string,
    callbacks: StreamCallbacks,
    preferredModel?: string
  ): Promise<void> => {
    setIsStreaming(true);
    setCurrentStatus({ type: 'thinking', message: 'Menghubungkan...' });
    setActiveAgents([]);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/v1/aika/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          message,
          conversation_history: conversationHistory,
          session_id: sessionId,
          role,
          preferred_model: preferredModel,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Keep the last incomplete line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6).trim();
            if (!jsonStr) continue;

            try {
              const event: StreamEvent = JSON.parse(jsonStr);

              switch (event.type) {
                case 'thinking':
                  setCurrentStatus(event);
                  callbacks.onThinking?.(event.message || 'Memproses...');
                  break;

                case 'status':
                  setCurrentStatus(event);
                  callbacks.onStatus?.(event.node || '', event.message || '');
                  break;

                case 'agent':
                  setActiveAgents(prev => [...prev, event.agent || '']);
                  setCurrentStatus(event);
                  callbacks.onAgentInvoked?.(
                    event.agent || '',
                    event.name || '',
                    event.description
                  );
                  break;

                case 'intervention_plan':
                  callbacks.onInterventionPlan?.(event.data);
                  break;

                case 'appointment':
                  callbacks.onAppointment?.(event.data);
                  break;

                case 'agent_activity':
                  callbacks.onAgentActivity?.(event.data as AgentActivity);
                  break;

                case 'complete':
                  setCurrentStatus({ type: 'complete', message: 'Selesai' });
                  callbacks.onComplete?.(event.response || '', event.metadata || {});
                  break;

                case 'error':
                  callbacks.onError?.(event.message || 'Unknown error');
                  break;
              }
            } catch (e) {
              console.error('Failed to parse SSE event:', jsonStr, e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Stream cancelled by user');
        callbacks.onError?.('Dibatalkan');
      } else {
        console.error('Streaming error:', error);
        callbacks.onError?.(error.message || 'Unknown error');
      }
    } finally {
      setIsStreaming(false);
      setCurrentStatus(null);
      abortControllerRef.current = null;
    }
  }, []);

  return {
    isStreaming,
    currentStatus,
    activeAgents,
    streamMessage,
    cancelStream,
  };
}
