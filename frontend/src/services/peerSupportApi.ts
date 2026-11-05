/**
 * Peer Support API — pairings, threads, and circles.
 *
 * Mirrors formalScreeningApi: shared axios client with the auth interceptor
 * (base URL already includes /api/v1). Messages are persisted redacted
 * server-side; SSE (`peer_message` on /api/v1/sse/events) delivers them live.
 */
import apiClient from './api';

export interface PeerSupporter {
  profile_id: number;
  name: string;
  peer_bio: string | null;
}

export interface PeerPairing {
  id: number;
  status: 'active' | 'closed' | string;
  created_at: string;
  supporter: PeerSupporter | null;
  student_hashed?: string | null;
  case_id?: string | null;
  close_reason?: string | null;
}

export interface PeerCircleInfo {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  is_member: boolean;
  member_count: number;
}

export interface PeerMessage {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  crisis_flagged?: boolean;
}

export const requestPeerSupport = async (caseId?: string): Promise<{ pairing: PeerPairing }> => {
  const response = await apiClient.post('/peer/requests', caseId ? { case_id: caseId } : {});
  return response.data;
};

export const getMyPairing = async (): Promise<{ pairing: PeerPairing } | null> => {
  const response = await apiClient.get('/peer/me');
  return response.data;
};

export const getPeerConsent = async (): Promise<{ consent_peer_support: boolean }> => {
  const response = await apiClient.get('/peer/consent');
  return response.data;
};

export const setPeerConsent = async (granted: boolean): Promise<{ consent_peer_support: boolean }> => {
  const response = await apiClient.put(`/peer/consent?granted=${granted}`);
  return response.data;
};

export const getPairingMessages = async (pairingId: number): Promise<PeerMessage[]> => {
  const response = await apiClient.get(`/peer/threads/pairing/${pairingId}/messages`);
  return response.data;
};

export const sendPairingMessage = async (
  pairingId: number,
  content: string,
): Promise<PeerMessage> => {
  const response = await apiClient.post(`/peer/threads/pairing/${pairingId}/messages`, {
    content,
  });
  return response.data;
};

export const closePairing = async (pairingId: number): Promise<{ pairing: PeerPairing }> => {
  const response = await apiClient.post(`/peer/threads/pairing/${pairingId}/close`);
  return response.data;
};

export const listPeerCircles = async (): Promise<PeerCircleInfo[]> => {
  const response = await apiClient.get('/peer/circles');
  return response.data;
};

export const joinPeerCircle = async (circleId: number): Promise<PeerCircleInfo> => {
  const response = await apiClient.post(`/peer/circles/${circleId}/join`);
  return response.data;
};

export const leavePeerCircle = async (circleId: number): Promise<PeerCircleInfo> => {
  const response = await apiClient.post(`/peer/circles/${circleId}/leave`);
  return response.data;
};

export const getCircleMessages = async (circleId: number): Promise<PeerMessage[]> => {
  const response = await apiClient.get(`/peer/circles/${circleId}/messages`);
  return response.data;
};

export const sendCircleMessage = async (
  circleId: number,
  content: string,
): Promise<PeerMessage> => {
  const response = await apiClient.post(`/peer/circles/${circleId}/messages`, { content });
  return response.data;
};

// Supporter / supervisor endpoints (counselor portal)
export const listMyAssignments = async (): Promise<PeerPairing[]> => {
  const response = await apiClient.get('/peer/assignments');
  return response.data;
};

export const listSupervisedPairings = async (): Promise<PeerPairing[]> => {
  const response = await apiClient.get('/peer/supervision');
  return response.data;
};

export const escalatePairing = async (pairingId: number): Promise<{ pairing: PeerPairing }> => {
  const response = await apiClient.post(`/peer/threads/pairing/${pairingId}/escalate`);
  return response.data;
};

// ---------------------------------------------------------------------------
// Counselor ↔ student messaging
// ---------------------------------------------------------------------------

export interface CounselorThread {
  id: number;
  counselor_id: number;
  counselor_name: string | null;
  status: string;
  subject: string | null;
  created_at: string;
  last_message_at: string | null;
  unread_for_me: number;
}

export interface UnreadCounts {
  pairing: number;
  counseling: number;
}

export const createCounselorThread = async (
  body: { counselor_id?: number; case_id?: string; subject?: string } = {},
): Promise<CounselorThread> => {
  const response = await apiClient.post('/peer/counselor-threads', body);
  return response.data;
};

export const listMyCounselorThreads = async (): Promise<{ threads: CounselorThread[] }> => {
  const response = await apiClient.get('/peer/counselor-threads');
  return response.data;
};

export const getMyUnreadCounts = async (): Promise<UnreadCounts> => {
  const response = await apiClient.get('/peer/unread');
  return response.data;
};

export const getCounselingMessages = async (threadId: number): Promise<PeerMessage[]> => {
  const response = await apiClient.get(`/peer/threads/counseling/${threadId}/messages`);
  return response.data;
};

export const sendCounselingMessage = async (
  threadId: number,
  content: string,
): Promise<PeerMessage> => {
  const response = await apiClient.post(`/peer/threads/counseling/${threadId}/messages`, {
    content,
  });
  return response.data;
};

export const closeCounselingThread = async (threadId: number): Promise<void> => {
  await apiClient.post(`/peer/threads/counseling/${threadId}/close`);
};

// Counselor portal inbox
export const listCounselorInboxThreads = async (): Promise<{ threads: CounselorThread[] }> => {
  const response = await apiClient.get('/peer/counselor-threads/inbox');
  return response.data;
};

export const getCounselorInboxUnread = async (): Promise<UnreadCounts> => {
  const response = await apiClient.get('/peer/counselor-inbox/unread');
  return response.data;
};
