/**
 * Agent Performance Analytics API Service
 * 
 * Handles all API calls for Safety Agent Suite performance metrics
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface STAMetrics {
  total_triages: number;
  accuracy_percentage: number;
  avg_confidence: number;
  false_positive_rate: number;
  avg_response_time_seconds: number;
  risk_distribution: Record<string, number>;
  time_period_days: number;
  last_updated: string;
}

export interface SCAMetrics {
  plans_generated: number;
  completed_plans: number;
  active_plans: number;
  completion_rate_percentage: number;
  avg_steps_per_plan: number;
  plan_type_distribution: Record<string, number>;
  user_satisfaction_score: number;
  time_period_days: number;
  last_updated: string;
}

export interface SDAMetrics {
  total_cases: number;
  active_cases: number;
  resolved_cases: number;
  sla_compliance_percentage: number;
  avg_resolution_time_hours: number;
  escalation_rate_percentage: number;
  time_period_days: number;
  last_updated: string;
}

export interface IAMetrics {
  queries_processed: number;
  privacy_budget_used_percentage: number;
  avg_query_time_seconds: number;
  cache_hit_rate_percentage: number;
  data_quality_score: number;
  differential_privacy_epsilon: number;
  k_anonymity_threshold: number;
  time_period_days: number;
  last_updated: string;
}

export interface OrchestratorMetrics {
  total_routing_decisions: number;
  handoff_success_rate_percentage: number;
  avg_routing_time_ms: number;
  agent_distribution: Record<string, number>;
  time_period_days: number;
  last_updated: string;
}

export interface AllAgentMetrics {
  sta: STAMetrics;
  sca: SCAMetrics;
  sda: SDAMetrics;
  ia: IAMetrics;
  orchestrator: OrchestratorMetrics;
  time_period_days: number;
  generated_at: string;
}

export async function getAllAgentPerformance(
  timePeriodDays: number = 30
): Promise<AllAgentMetrics> {
  const response = await axios.get<AllAgentMetrics>(
    `${API_BASE_URL}/api/v1/admin/analytics/agent-performance/all`,
    {
      params: { time_period_days: timePeriodDays },
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
  return response.data;
}

export async function getSTAPerformance(
  timePeriodDays: number = 30
): Promise<STAMetrics> {
  const response = await axios.get<STAMetrics>(
    `${API_BASE_URL}/api/v1/admin/analytics/agent-performance/sta`,
    {
      params: { time_period_days: timePeriodDays },
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
  return response.data;
}

export async function getSCAPerformance(
  timePeriodDays: number = 30
): Promise<SCAMetrics> {
  const response = await axios.get<SCAMetrics>(
    `${API_BASE_URL}/api/v1/admin/analytics/agent-performance/sca`,
    {
      params: { time_period_days: timePeriodDays },
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
  return response.data;
}

export async function getSDAPerformance(
  timePeriodDays: number = 30
): Promise<SDAMetrics> {
  const response = await axios.get<SDAMetrics>(
    `${API_BASE_URL}/api/v1/admin/analytics/agent-performance/sda`,
    {
      params: { time_period_days: timePeriodDays },
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
  return response.data;
}

export async function getIAPerformance(
  timePeriodDays: number = 30
): Promise<IAMetrics> {
  const response = await axios.get<IAMetrics>(
    `${API_BASE_URL}/api/v1/admin/analytics/agent-performance/ia`,
    {
      params: { time_period_days: timePeriodDays },
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
  return response.data;
}

export async function getOrchestratorPerformance(
  timePeriodDays: number = 30
): Promise<OrchestratorMetrics> {
  const response = await axios.get<OrchestratorMetrics>(
    `${API_BASE_URL}/api/v1/admin/analytics/agent-performance/orchestrator`,
    {
      params: { time_period_days: timePeriodDays },
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
  return response.data;
}
