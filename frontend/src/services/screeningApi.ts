/**
 * Screening API — longitudinal samples, weekly self-report, and the
 * user's own intervention insights ("what works for you").
 *
 * Mirrors the proactiveApi pattern: shared axios client with the auth
 * interceptor from services/api.ts (base URL already includes /api/v1).
 */
import apiClient from './api';

export interface InsightItem {
  intervention_key: string;
  label: string;
  n: number;
  improved: number;
  improvement_rate: number;
}

export interface InsightsResponse {
  interventions: InsightItem[];
  self_report_consent: boolean;
  personalization_consent: boolean;
}

export interface DimensionSample {
  dimension: string;
  current_score: number;
  protective_score: number;
  net_score: number;
  instrument: string | null;
  normalized_score: number;
  source: string;
  created_at: string;
}

export interface SelfReportResult {
  recorded: boolean;
  result: {
    phq2?: { raw: number; max: number; normalized: number; positive: boolean };
    gad2?: { raw: number; max: number; normalized: number; positive: boolean };
    positive_screen?: boolean;
    recommendation?: string;
  };
}

export const fetchInsights = async (): Promise<InsightsResponse> => {
  const response = await apiClient.get<InsightsResponse>('/screening/insights');
  return response.data;
};

export const fetchScreeningSamples = async (
  dimension?: string,
  days = 90
): Promise<DimensionSample[]> => {
  const response = await apiClient.get<DimensionSample[]>('/screening/samples', {
    params: { dimension, days },
  });
  return response.data;
};

export const submitSelfReport = async (payload: {
  phq2?: number[];
  gad2?: number[];
}): Promise<SelfReportResult> => {
  const response = await apiClient.post<SelfReportResult>('/screening/self-report', payload);
  return response.data;
};

export const setSelfReportConsent = async (
  granted: boolean
): Promise<{ consent_self_report: boolean }> => {
  const response = await apiClient.put<{ consent_self_report: boolean }>(
    '/screening/self-report/consent',
    { granted }
  );
  return response.data;
};

export const setPersonalizationConsent = async (
  granted: boolean
): Promise<{ consent_personalization: boolean }> => {
  const response = await apiClient.put<{ consent_personalization: boolean }>(
    '/screening/personalization/consent',
    { granted }
  );
  return response.data;
};
