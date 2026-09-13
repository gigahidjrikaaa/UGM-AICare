/**
 * Proactive messages API — Aika-initiated chat messages
 * (closed-loop intervention plan follow-ups).
 *
 * Mirrors the interventionPlanApi pattern: shared axios client with the
 * auth interceptor from services/api.ts.
 */
import apiClient from './api';

export interface ProactiveMessage {
  id: string;
  source: 'plan_followup' | string;
  source_entity_id: number | null;
  /** The Aika thread id the chat page must adopt so the conversation continues. */
  session_id: string;
  content: string;
  status: 'pending' | 'read' | 'dismissed' | 'expired' | string;
  created_at: string | null;
  delivered_at: string | null;
}

export interface ProactiveMessageListResponse {
  messages: ProactiveMessage[];
  unread_count: number;
}

/**
 * Fetch the current user's pending (unread) proactive messages.
 */
export const fetchPendingProactiveMessages =
  async (): Promise<ProactiveMessageListResponse> => {
    const response = await apiClient.get<ProactiveMessageListResponse>(
      '/proactive-messages'
    );
    return response.data;
  };

/**
 * Mark a proactive message as read (called when it is rendered in chat).
 */
export const markProactiveMessageRead = async (
  messageId: string
): Promise<{ success: boolean; id: string; status: string }> => {
  const response = await apiClient.post(
    `/proactive-messages/${messageId}/read`
  );
  return response.data;
};

/**
 * Dismiss a proactive message without opening it in chat.
 */
export const dismissProactiveMessage = async (
  messageId: string
): Promise<{ success: boolean; id: string; status: string }> => {
  const response = await apiClient.post(
    `/proactive-messages/${messageId}/dismiss`
  );
  return response.data;
};

// ============================================================================
// Welcome-back greeting — Aika's personalized first chat message
// ("continue where you left off"). Reactive (chat opened by the user), so it
// does not require proactive-chat consent.
// ============================================================================

export interface WelcomeGreeting {
  text: string;
  source: 'personalized' | 'template' | 'default' | 'crisis_gentle' | string;
  based_on: {
    risk_level: string | null;
    top_concern: string | null;
  };
}

/**
 * Fetch the personalized greeting for the current user.
 * Falls back to the default greeting server-side on any failure.
 */
export const fetchWelcomeGreeting = async (): Promise<WelcomeGreeting> => {
  const response = await apiClient.get<WelcomeGreeting>('/greeting');
  return response.data;
};
