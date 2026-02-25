import apiClient from './api';

export interface AdminAutopilotAction {
  id: number;
  action_type: string;
  risk_level: string;
  status: string;
  idempotency_key: string;
  payload_hash: string;
  payload_json: Record<string, unknown>;
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

export interface AdminAutopilotStatus {
  enabled: boolean;
  onchain_placeholder: boolean;
  worker_interval_seconds: number;
}

export interface AdminAutopilotPolicy {
  autopilot_enabled: boolean;
  onchain_placeholder: boolean;
  worker_interval_seconds: number;
}

export interface UpdateAdminAutopilotPolicyPayload {
  autopilot_enabled?: boolean;
  onchain_placeholder?: boolean;
  worker_interval_seconds?: number;
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

export const getAutopilotStatus = async (): Promise<AdminAutopilotStatus> => {
  const response = await apiClient.get<AdminAutopilotStatus>(`/admin/autopilot/status`);
  return response.data;
};

export const getAutopilotPolicy = async (): Promise<AdminAutopilotPolicy> => {
  const response = await apiClient.get<AdminAutopilotPolicy>(`/admin/autopilot/policy`);
  return response.data;
};

export const updateAutopilotPolicy = async (
  payload: UpdateAdminAutopilotPolicyPayload,
): Promise<AdminAutopilotPolicy> => {
  const response = await apiClient.patch<AdminAutopilotPolicy>(`/admin/autopilot/policy`, payload);
  return response.data;
};
