import { useCallback } from 'react';
import { useChatSession } from './useChatSession';

interface SessionEventResponse {
  message: string;
  user_id?: string;
  total_summaries?: number;
  summarization_scheduled?: boolean;
}

/**
 * Hook for managing chat session lifecycle events
 * Provides functions to explicitly end sessions and start new ones
 */
export function useSessionManager() {
  const { currentSessionId, startNewSession: resetSession } = useChatSession();

  const endCurrentSession = useCallback(async (): Promise<boolean> => {
    if (!currentSessionId) {
      console.warn('No active session to end');
      return false;
    }

    try {
      const response = await fetch('/api/v1/chat/end-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          session_id: currentSessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to end session: ${response.status}`);
      }

      const result: SessionEventResponse = await response.json();
      console.log('Session ended successfully:', result.message);
      return true;
    } catch (error) {
      console.error('Error ending session:', error);
      return false;
    }
  }, [currentSessionId]);

  const startNewSession = useCallback(async (forceSummarizeCurrent: boolean = true): Promise<SessionEventResponse | null> => {
    try {
      const response = await fetch('/api/v1/chat/new-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          force_summarize_current: forceSummarizeCurrent,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to start new session: ${response.status}`);
      }

      const result: SessionEventResponse = await response.json();
      console.log('New session started:', result);
      
      // Reset the frontend session ID to trigger a new session
      resetSession();
      
      return result;
    } catch (error) {
      console.error('Error starting new session:', error);
      return null;
    }
  }, [resetSession]);

  const endAndStartNew = useCallback(async (): Promise<SessionEventResponse | null> => {
    console.log('Ending current session and starting new one...');
    
    // End current session first (will trigger summarization)
    const endResult = await endCurrentSession();
    
    if (endResult) {
      // Start new session without forcing summarization since we just did it
      return await startNewSession(false);
    } else {
      // If ending failed, still try to start new session with summarization
      return await startNewSession(true);
    }
  }, [endCurrentSession, startNewSession]);

  return {
    sessionId: currentSessionId,
    endCurrentSession,
    startNewSession,
    endAndStartNew,
  };
}