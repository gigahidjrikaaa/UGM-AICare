import apiClient from './api';

export interface AdminAutopilotAction {
  id: number;
  action_type: string;
  risk_level: string;
  policy_decision: string;
  status: string;
  idempotency_key: string;
  payload_hash: string;
  payload_json: Record<string, unknown>;
  requires_human_review: boolean;
  approved_by?: number | null;
  approval_notes?: string | null;
  tx_hash?: string | null;
  explorer_tx_url?: string | null;
  chain_id?: number | null;
  error_message?: string | null;
  retry_count: number;
  next_retry_at?: string | null;
  executed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminAutopilotListResponse {
  items: AdminAutopilotAction[];
  total: number;
}

export const listAutopilotActions = async (params: {
  status?: string;
  action_type?: string;
  risk_level?: string;
  skip?: number;
  limit?: number;
} = {}): Promise<AdminAutopilotListResponse> => {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.action_type) query.set('action_type', params.action_type);
  if (params.risk_level) query.set('risk_level', params.risk_level);
  if (params.skip !== undefined) query.set('skip', String(params.skip));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  const response = await apiClient.get<AdminAutopilotListResponse>(`/admin/autopilot/actions?${query.toString()}`);
  return response.data;
};

export const approveAutopilotAction = async (actionId: number, note?: string): Promise<void> => {
  await apiClient.post(`/admin/autopilot/actions/${actionId}/approve`, { note });
};

export const rejectAutopilotAction = async (actionId: number, note: string): Promise<void> => {
  await apiClient.post(`/admin/autopilot/actions/${actionId}/reject`, { note });
};
