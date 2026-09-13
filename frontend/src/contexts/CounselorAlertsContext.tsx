'use client';

/**
 * CounselorAlertsContext — instant push of counselor alerts via the
 * user-scoped SSE endpoint. The bell in CounselorHeader keeps its 30s poll
 * as a fallback; this context makes delivery immediate and exposes the
 * latest alert so the header can bump the badge and refresh its list.
 */
import { useSession } from 'next-auth/react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useSSE } from '@/hooks/useSSE';

const apiOrigin = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
const SSE_EVENTS_URL = `${apiOrigin}/api/v1/sse/events`;

export interface CounselorAlertEvent {
  alert_id?: string | null;
  alert_type?: string;
  severity?: string;
  title?: string;
  message?: string;
  link?: string | null;
  case_id?: string | null;
  conversation_id?: string | null;
  raw?: string;
}

interface CounselorAlertsContextValue {
  /** Most recent pushed alert (null until one arrives). */
  lastAlert: CounselorAlertEvent | null;
  /** Increments on every pushed alert — watch this to refetch. */
  refetchSignal: number;
  isConnected: boolean;
}

const CounselorAlertsContext = React.createContext<CounselorAlertsContextValue | null>(
  null
);

function normalizeEventPayload(data: unknown): CounselorAlertEvent {
  if (typeof data === 'string') {
    return { message: data, raw: data };
  }
  const payload = (data || {}) as Record<string, unknown>;
  return {
    alert_id: payload.alert_id ? String(payload.alert_id) : null,
    alert_type: payload.alert_type ? String(payload.alert_type) : undefined,
    severity: payload.severity ? String(payload.severity) : undefined,
    title: payload.title ? String(payload.title) : undefined,
    message: payload.message ? String(payload.message) : undefined,
    link: payload.link ? String(payload.link) : null,
    case_id: payload.case_id ? String(payload.case_id) : null,
    conversation_id: payload.conversation_id
      ? String(payload.conversation_id)
      : undefined,
  };
}

export function CounselorAlertsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status: sessionStatus } = useSession();
  const [lastAlert, setLastAlert] = useState<CounselorAlertEvent | null>(null);
  const [refetchSignal, setRefetchSignal] = useState(0);

  const handleEvent = useCallback((event: { type: string; data: unknown }) => {
    if (event.type !== 'counselor_alert') return;
    setLastAlert(normalizeEventPayload(event.data));
    setRefetchSignal((prev) => prev + 1);
  }, []);

  // The hook self-gates on an access token being present.
  useSSE({
    url: SSE_EVENTS_URL,
    onEvent: handleEvent,
    eventTypes: ['counselor_alert', 'connected'],
    autoReconnect: true,
  });

  const value = useMemo<CounselorAlertsContextValue>(
    () => ({
      lastAlert,
      refetchSignal,
      isConnected: false,
    }),
    [lastAlert, refetchSignal]
  );

  return (
    <CounselorAlertsContext.Provider value={value}>
      {children}
    </CounselorAlertsContext.Provider>
  );
}

export function useCounselorAlerts(): CounselorAlertsContextValue {
  const ctx = React.useContext(CounselorAlertsContext);
  if (!ctx) {
    return { lastAlert: null, refetchSignal: 0, isConnected: false };
  }
  return ctx;
}
