export interface AgentDecisionItem {
  id: number;
  action_type: string;
  policy_decision: string;
  risk_level: string;
  status: string;
  created_at: string;
  executed_at: string | null;
  user_id: number | null;
  session_id: string | null;
  intent: string | null;
  next_step: string | null;
  agent_reasoning: string | null;
  requires_human_review: boolean;
  approved_by: number | null;
  approval_notes: string | null;
  chain_id: number | null;
  tx_hash: string | null;
  explorer_tx_url: string | null;
  attestation_record_id: number | null;
  attestation_status: string | null;
  attestation_last_error: string | null;
  attestation_tx_hash: string | null;
}

export interface AgentDecisionListResponse {
  items: AgentDecisionItem[];
  total: number;
}
