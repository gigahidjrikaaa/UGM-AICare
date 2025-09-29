export interface SeverityBreakdown {
  severity: string;
  count: number;
}

export interface ProcessingMetrics {
  average_ms: number | null;
  max_ms: number | null;
}

export interface TriageCasePreview {
  id: number;
  user_id: number | null;
  user_name: string | null;
  email: string | null;
  risk_score: number;
  severity_level: string;
  recommended_action: string | null;
  created_at: string;
}

export interface TriageOverview {
  timeframe_days: number;
  total_assessments: number;
  severity_breakdown: SeverityBreakdown[];
  average_risk_score: number | null;
  high_severity_count: number;
  last_assessment_at: string | null;
  processing: ProcessingMetrics | null;
  recent_high_risk: TriageCasePreview[];
}

export interface TriageAssessmentItem {
  id: number;
  user_id: number | null;
  user_name: string | null;
  email: string | null;
  severity_level: string;
  risk_score: number;
  confidence_score: number;
  recommended_action: string | null;
  risk_factors: string[] | null;
  created_at: string;
  processing_time_ms: number | null;
  conversation_id: number | null;
  message_excerpt: string | null;
}

export interface TriageAssessmentListResponse {
  items: TriageAssessmentItem[];
  total: number;
}

export type RecommendedResource = Record<string, unknown>;

export interface TriageTestResponse {
  classification: string;
  recommended_resources: RecommendedResource[];
}
