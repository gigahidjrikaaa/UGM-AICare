// src/hooks/useChatSession.ts
import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';

export function useChatSession() {
  const [currentSessionId] = useState<string>(() => uuidv4());
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

  return { currentSessionId, sessionIdRef };
}
