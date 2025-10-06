// src/hooks/useChatSession.ts
import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

const SESSION_STORAGE_KEY = 'aika_current_session_id';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

interface SessionData {
  sessionId: string;
  createdAt: number;
}

export function useChatSession() {
  const [currentSessionId] = useState<string>(() => {
    // Try to get existing session from localStorage
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const sessionData: SessionData = JSON.parse(stored);
        const now = Date.now();
        
        // Check if session is still valid (within 24 hours)
        if (now - sessionData.createdAt < SESSION_DURATION_MS) {
          return sessionData.sessionId;
        }
      }
    } catch (error) {
      console.warn('Failed to parse stored session data:', error);
    }
    
    // Create new session if none exists or expired
    const newSessionId = uuidv4();
    const sessionData: SessionData = {
      sessionId: newSessionId,
      createdAt: Date.now()
    };
    
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.warn('Failed to store session data:', error);
    }
    
    return newSessionId;
  });
  
  const sessionIdRef = useRef<string>(currentSessionId);

  useEffect(() => {
    sessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionIdRef.current) {
        const payload = JSON.stringify({ session_id: sessionIdRef.current });
        navigator.sendBeacon('/api/v1/chat/end-session', payload);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Function to manually end current session and start a new one
  const startNewSession = () => {
    // End current session
    if (sessionIdRef.current) {
      try {
        navigator.sendBeacon('/api/v1/chat/end-session', 
          JSON.stringify({ session_id: sessionIdRef.current })
        );
      } catch (error) {
        console.warn('Failed to end session:', error);
      }
    }
    
    // Clear stored session to force new one on next load
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear stored session:', error);
    }
  };

  return { currentSessionId, sessionIdRef, startNewSession };
}
