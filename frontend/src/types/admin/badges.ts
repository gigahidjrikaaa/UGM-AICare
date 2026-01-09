export type BadgeTemplateStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface BadgeTemplate {
  id: number;
  contract_address: string;
  token_id: number;
  name: string;
  description: string | null;
  image_uri: string | null;
  metadata_uri: string | null;
  status: BadgeTemplateStatus;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export interface BadgeTemplateListResponse {
  templates: BadgeTemplate[];
}

export interface BadgeTemplateCreatePayload {
  token_id: number;
  name: string;
  description?: string;
}

export interface BadgeTemplateUpdatePayload {
  name?: string;
  description?: string | null;
}

export interface BadgePublishResponse {
  template: BadgeTemplate;
  metadata_cid: string;
  metadata_uri: string;
  set_token_uri_tx_hash?: string | null;
}

export type BadgeIssuanceStatus = 'PENDING' | 'SENT' | 'CONFIRMED' | 'FAILED';

export interface BadgeIssuance {
  id: number;
  template_id: number;
  user_id: number;
  wallet_address: string;
  amount: number;
  tx_hash: string | null;
  status: BadgeIssuanceStatus;
  error_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface BadgeIssuanceListResponse {
  issuances: BadgeIssuance[];
}

export interface BadgeMintRequest {
  user_id: number;
  amount: number;
}
