/**
 * Clinical Analytics Service - Privacy-Preserving Mental Health Intelligence
 * 
 * This service provides frontend access to the new clinical analytics system,
 * replacing surveillance-based analytics with evidence-based clinical intelligence.
 */

import { apiCall } from '@/utils/api';

// Type definitions for clinical analytics
export interface TreatmentOutcome {
  intervention_type: string;
  instrument_type: string;
  sample_size: number;
  statistical_results: {
    mean_improvement: number;
    confidence_interval: [number, number];
    p_value: number;
    effect_size: number;
    statistically_significant: boolean;
  };
  clinical_significance: {
    rating: 'high' | 'moderate' | 'low' | 'none';
    mcid_threshold_met: boolean;
    percentage_achieving_mcid: number;
    recovery_rate: number;
    reliable_improvement_rate: number;
  };
  evidence_quality: 'strong' | 'moderate' | 'weak';
  clinical_recommendations: string[];
}

export interface ServiceUtilizationMetric {
  service_type: string;
  utilization_rate: number;
  efficiency_score: number;
  total_sessions: number;
  unique_users: number;
  average_session_duration: number;
  no_show_rate: number;
  peak_utilization: number;
  available_capacity: number;
  average_wait_time: number;
  user_satisfaction_score: number;
  optimization_recommendations: string[];
  privacy_metadata: {
    epsilon_used: number;
    privacy_level: string;
    noise_added: number;
    utility_score: number;
    privacy_risk_score: number;
  };
  data_quality: {
    original_sample_size: number;
    effective_sample_size: number;
    accuracy_estimate: number;
  };
}

export interface ClinicalIntelligenceReport {
  report_id: string;
  generated_at: string;
  analysis_period: {
    start_date: string;
    end_date: string;
    duration_days: number;
  };
  privacy_level: string;
  treatment_outcomes_summary: {
    total_analyses: number;
    high_effectiveness_count: number;
    moderate_effectiveness_count: number;
    interventions_analyzed: string[];
  };
  service_optimization: {
    recommendations: string[];
    priority_level: 'high' | 'medium' | 'low';
  };
  quality_assurance: {
    data_quality_score: number;
    consent_compliance_rate: number;
    assessment_validity: Record<string, number>;
    evidence_quality_summary: Record<string, string>;
  };
  privacy_audit: {
    budget_status: Record<string, unknown>;
    compliance_indicators: {
      consent_rate_acceptable: boolean;
      data_quality_acceptable: boolean;
      privacy_budget_healthy: boolean;
    };
  };
}

export interface InterventionEffectiveness {
  program_type: string;
  sample_size: number;
  effectiveness_rating: 'high' | 'moderate' | 'low' | 'none';
  statistical_results: {
    effect_size: number;
    p_value: number;
    confidence_interval: [number, number];
    statistically_significant: boolean;
  };
  clinical_outcomes: {
    reliable_improvement_rate: number;
    reliable_deterioration_rate: number;
    no_change_rate: number;
    recovery_rate: number;
  };
  evidence_quality: 'strong' | 'moderate' | 'weak';
  recommendations: string[];
}

export interface PrivacyAuditStatus {
  budget_status: {
    total_budget: number;
    used_budget: number;
    remaining_budget: number;
    budget_used_percentage: number;
    budget_status: 'healthy' | 'warning' | 'critical';
    recommendations: string[];
    analysis_count: number;
    recent_analyses: string[];
  };
  compliance_indicators: {
    budget_healthy: boolean;
    analysis_count_reasonable: boolean;
    recent_activity: boolean;
  };
  recommendations: string[];
}

// API Response types
export interface ClinicalAnalyticsResponse<T> {
  success: boolean;
  data: T;
  metadata: {
    analysis_period_days?: number;
    privacy_level?: string;
    total_analyses?: number;
    generated_at: string;
    [key: string]: unknown;
  };
}

/**
 * Get comprehensive treatment outcome analysis with privacy protection
 */
export async function getTreatmentOutcomes(params?: {
  interventionTypes?: string[];
  assessmentInstruments?: string[];
  timePeriodDays?: number;
  privacyLevel?: 'low' | 'medium' | 'high';
}): Promise<ClinicalAnalyticsResponse<Record<string, TreatmentOutcome>>> {
  const queryParams = new URLSearchParams();
  
  if (params?.interventionTypes?.length) {
    params.interventionTypes.forEach(type => queryParams.append('intervention_types', type));
  }
  
  if (params?.assessmentInstruments?.length) {
    params.assessmentInstruments.forEach(instrument => queryParams.append('assessment_instruments', instrument));
  }
  
  if (params?.timePeriodDays) {
    queryParams.append('time_period_days', params.timePeriodDays.toString());
  }
  
  if (params?.privacyLevel) {
    queryParams.append('privacy_level', params.privacyLevel);
  }

  return await apiCall(`/admin/clinical-analytics/treatment-outcomes?${queryParams.toString()}`);
}

/**
 * Get privacy-protected service utilization metrics
 */
export async function getServiceUtilizationMetrics(params?: {
  timePeriodDays?: number;
  privacyLevel?: 'low' | 'medium' | 'high';
}): Promise<ClinicalAnalyticsResponse<Record<string, ServiceUtilizationMetric>>> {
  const queryParams = new URLSearchParams();
  
  if (params?.timePeriodDays) {
    queryParams.append('time_period_days', params.timePeriodDays.toString());
  }
  
  if (params?.privacyLevel) {
    queryParams.append('privacy_level', params.privacyLevel);
  }

  return await apiCall(`/admin/clinical-analytics/service-utilization?${queryParams.toString()}`);
}

/**
 * Generate comprehensive clinical intelligence report
 */
export async function getClinicalIntelligenceReport(params?: {
  analysisPeriodDays?: number;
  includeForecasting?: boolean;
  privacyLevel?: 'low' | 'medium' | 'high';
}): Promise<ClinicalAnalyticsResponse<ClinicalIntelligenceReport>> {
  const queryParams = new URLSearchParams();
  
  if (params?.analysisPeriodDays) {
    queryParams.append('analysis_period_days', params.analysisPeriodDays.toString());
  }
  
  if (params?.includeForecasting !== undefined) {
    queryParams.append('include_forecasting', params.includeForecasting.toString());
  }
  
  if (params?.privacyLevel) {
    queryParams.append('privacy_level', params.privacyLevel);
  }

  return await apiCall(`/admin/clinical-analytics/clinical-intelligence-report?${queryParams.toString()}`);
}

/**
 * Analyze effectiveness of different intervention programs
 */
export async function getInterventionEffectiveness(params?: {
  timePeriodDays?: number;
  privacyLevel?: 'low' | 'medium' | 'high';
}): Promise<ClinicalAnalyticsResponse<Record<string, InterventionEffectiveness>>> {
  const queryParams = new URLSearchParams();
  
  if (params?.timePeriodDays) {
    queryParams.append('time_period_days', params.timePeriodDays.toString());
  }
  
  if (params?.privacyLevel) {
    queryParams.append('privacy_level', params.privacyLevel);
  }

  return await apiCall(`/admin/clinical-analytics/intervention-effectiveness?${queryParams.toString()}`);
}

/**
 * Get privacy audit status and compliance information
 */
export async function getPrivacyAuditStatus(): Promise<ClinicalAnalyticsResponse<PrivacyAuditStatus>> {
  return await apiCall('/admin/clinical-analytics/privacy-audit');
}

/**
 * Validate a clinical insight (for clinical professionals)
 */
export async function validateClinicalInsight(
  insightId: number,
  validationData: {
    status: 'approved' | 'rejected' | 'needs_revision';
    notes?: string;
    clinicalRecommendations?: string[];
  }
): Promise<ClinicalAnalyticsResponse<{ insight_id: number; validated_by: number; validation_timestamp: string; validation_status: string; clinical_notes: string }>> {
  return await apiCall('/admin/clinical-analytics/validate-clinical-insight', {
    method: 'POST',
    body: JSON.stringify({
      insight_id: insightId,
      validation_data: validationData,
    }),
  });
}

// Helper functions for data formatting and display
export function formatEffectSize(effectSize: number): string {
  const abs = Math.abs(effectSize);
  if (abs < 0.2) return 'Negligible';
  if (abs < 0.5) return 'Small';
  if (abs < 0.8) return 'Medium';
  return 'Large';
}

export function formatPValue(pValue: number): string {
  if (pValue < 0.001) return 'p < 0.001';
  if (pValue < 0.01) return `p < 0.01`;
  if (pValue < 0.05) return `p < 0.05`;
  return `p = ${pValue.toFixed(3)}`;
}

export function formatConfidenceInterval(ci: [number, number], decimals: number = 2): string {
  return `95% CI [${ci[0].toFixed(decimals)}, ${ci[1].toFixed(decimals)}]`;
}

export function getClinicalSignificanceColor(rating: string): string {
  switch (rating) {
    case 'high': return 'text-green-600 bg-green-50';
    case 'moderate': return 'text-blue-600 bg-blue-50';
    case 'low': return 'text-yellow-600 bg-yellow-50';
    case 'none': return 'text-gray-600 bg-gray-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}

export function getEvidenceQualityColor(quality: string): string {
  switch (quality) {
    case 'strong': return 'text-green-700 bg-green-100';
    case 'moderate': return 'text-blue-700 bg-blue-100';
    case 'weak': return 'text-orange-700 bg-orange-100';
    default: return 'text-gray-700 bg-gray-100';
  }
}

export function getPrivacyLevelColor(level: string): string {
  switch (level.toLowerCase()) {
    case 'high': return 'text-green-700 bg-green-100';
    case 'medium': return 'text-blue-700 bg-blue-100';
    case 'low': return 'text-orange-700 bg-orange-100';
    default: return 'text-gray-700 bg-gray-100';
  }
}

export function formatPercentage(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = Math.round(minutes % 60);
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function getEfficiencyColor(score: number): string {
  if (score >= 0.8) return 'bg-green-100 border-green-200 text-green-800';
  if (score >= 0.6) return 'bg-yellow-100 border-yellow-200 text-yellow-800';
  return 'bg-red-100 border-red-200 text-red-800';
}

// Dashboard summary functions
export function summarizeTreatmentOutcomes(outcomes: Record<string, TreatmentOutcome>) {
  const total = Object.keys(outcomes).length;
  const highEffectiveness = Object.values(outcomes).filter(o => o.clinical_significance.rating === 'high').length;
  const moderateEffectiveness = Object.values(outcomes).filter(o => o.clinical_significance.rating === 'moderate').length;
  const significantOutcomes = Object.values(outcomes).filter(o => o.statistical_results.statistically_significant).length;
  
  const avgEffectSize = Object.values(outcomes).reduce((sum, o) => sum + Math.abs(o.statistical_results.effect_size), 0) / total;
  const avgRecoveryRate = Object.values(outcomes).reduce((sum, o) => sum + o.clinical_significance.recovery_rate, 0) / total;
  
  return {
    total,
    highEffectiveness,
    moderateEffectiveness,
    significantOutcomes,
    avgEffectSize,
    avgRecoveryRate,
    effectivenessRate: ((highEffectiveness + moderateEffectiveness) / total) * 100
  };
}

export function summarizeServiceUtilization(metrics: Record<string, ServiceUtilizationMetric>) {
  const avgUtilityScore = Object.values(metrics).reduce((sum, m) => sum + m.privacy_metadata.utility_score, 0) / Object.keys(metrics).length;
  const avgPrivacyRisk = Object.values(metrics).reduce((sum, m) => sum + m.privacy_metadata.privacy_risk_score, 0) / Object.keys(metrics).length;
  const totalSampleSize = Object.values(metrics).reduce((sum, m) => sum + m.data_quality.original_sample_size, 0);
  const avgAccuracy = Object.values(metrics).reduce((sum, m) => sum + m.data_quality.accuracy_estimate, 0) / Object.keys(metrics).length;
  
  return {
    totalMetrics: Object.keys(metrics).length,
    avgUtilityScore,
    avgPrivacyRisk,
    totalSampleSize,
    avgAccuracy,
    privacyPreserved: avgPrivacyRisk < 0.5,
    highUtility: avgUtilityScore > 0.8
  };
}

