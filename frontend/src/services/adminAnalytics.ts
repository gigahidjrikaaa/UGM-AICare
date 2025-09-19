import { CohortHotspotsResponse, InterventionSummary, PredictiveSignalsResponse, TriageMetricsInsight } from '@/types/admin/analytics';
import { apiCall } from '@/utils/adminApi';

export type CohortDimension = 'major' | 'year_of_study' | 'gender' | 'city';

export async function getTriageMetrics(params: {
  timeframeDays?: number;
  referenceDate?: string;
  targetMs?: number;
} = {}): Promise<TriageMetricsInsight> {
  const search = new URLSearchParams();
  if (params.timeframeDays) {
    search.set('timeframe_days', String(params.timeframeDays));
  }
  if (params.referenceDate) {
    search.set('reference_date', params.referenceDate);
  }
  if (params.targetMs) {
    search.set('target_ms', String(params.targetMs));
  }
  const query = search.toString();
  return apiCall<TriageMetricsInsight>(`/api/v1/admin/analytics/triage-metrics${query ? `?${query}` : ''}`);
}

export async function getCohortHotspots(params: {
  dimension?: CohortDimension;
  timeframeDays?: number;
  referenceDate?: string;
  limit?: number;
} = {}): Promise<CohortHotspotsResponse> {
  const search = new URLSearchParams();
  if (params.dimension) {
    search.set('dimension', params.dimension);
  }
  if (params.timeframeDays) {
    search.set('timeframe_days', String(params.timeframeDays));
  }
  if (params.referenceDate) {
    search.set('reference_date', params.referenceDate);
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }
  const query = search.toString();
  return apiCall<CohortHotspotsResponse>(`/api/v1/admin/analytics/cohort-hotspots${query ? `?${query}` : ''}`);
}

export async function getPredictiveSignals(params: {
  timeframeDays?: number;
  forceRefresh?: boolean;
} = {}): Promise<PredictiveSignalsResponse> {
  const search = new URLSearchParams();
  if (params.timeframeDays) {
    search.set('timeframe_days', String(params.timeframeDays));
  }
  if (params.forceRefresh) {
    search.set('force_refresh', 'true');
  }
  const query = search.toString();
  return apiCall<PredictiveSignalsResponse>(`/api/v1/admin/analytics/predictive-scores${query ? `?${query}` : ''}`);
}

export async function getInterventionSummary(params: {
  timeframeDays?: number;
  referenceDate?: string;
  campaignType?: string;
  limit?: number;
} = {}): Promise<InterventionSummary> {
  const search = new URLSearchParams();
  if (params.timeframeDays) {
    search.set('timeframe_days', String(params.timeframeDays));
  }
  if (params.referenceDate) {
    search.set('reference_date', params.referenceDate);
  }
  if (params.campaignType) {
    search.set('campaign_type', params.campaignType);
  }
  if (params.limit) {
    search.set('limit', String(params.limit));
  }
  const query = search.toString();
  return apiCall<InterventionSummary>(`/api/v1/admin/analytics/intervention-summary${query ? `?${query}` : ''}`);
}
