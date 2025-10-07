/**
 * Intervention Plan Analytics API Service
 * 
 * Handles all API calls for intervention plan analytics and insights
 */

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface InterventionOverviewMetrics {
  total_plans: number;
  active_plans: number;
  completed_plans: number;
  not_started_plans: number;
  avg_completion_percentage: number;
  avg_days_to_complete: number;
  completion_rate_percentage: number;
  time_period_days: number;
  last_updated: string;
}

export interface PlanTypeAnalytics {
  plan_type: string;
  total_count: number;
  completed_count: number;
  completion_rate_percentage: number;
  avg_completion_percentage: number;
  avg_steps: number;
  avg_days_to_complete: number;
  effectiveness_score: number;
}

export interface ProgressDistribution {
  not_started: number;
  early_progress: number;
  mid_progress: number;
  good_progress: number;
  near_complete: number;
  completed: number;
}

export interface StepCompletionAnalytics {
  total_steps_completed: number;
  avg_step_completion_percentage: number;
  time_period_days: number;
}

export interface RecentCompletion {
  id: number;
  plan_type: string;
  title: string;
  user_email: string;
  started_at: string;
  completed_at: string;
  days_to_complete: number;
}

export interface ComprehensiveInterventionAnalytics {
  overview: InterventionOverviewMetrics;
  by_plan_type: PlanTypeAnalytics[];
  progress_distribution: ProgressDistribution;
  step_analytics: StepCompletionAnalytics;
  recent_completions: RecentCompletion[];
  time_period_days: number;
  generated_at: string;
}

export async function getComprehensiveInterventionAnalytics(
  timePeriodDays: number = 30
): Promise<ComprehensiveInterventionAnalytics> {
  const response = await axios.get<ComprehensiveInterventionAnalytics>(
    `${API_BASE_URL}/api/v1/admin/analytics/intervention-plans/comprehensive`,
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

export async function getInterventionOverview(
  timePeriodDays: number = 30
): Promise<InterventionOverviewMetrics> {
  const response = await axios.get<InterventionOverviewMetrics>(
    `${API_BASE_URL}/api/v1/admin/analytics/intervention-plans/overview`,
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

export async function getInterventionByType(
  timePeriodDays: number = 30
): Promise<PlanTypeAnalytics[]> {
  const response = await axios.get<PlanTypeAnalytics[]>(
    `${API_BASE_URL}/api/v1/admin/analytics/intervention-plans/by-type`,
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

export async function getProgressDistribution(
  timePeriodDays: number = 30
): Promise<ProgressDistribution> {
  const response = await axios.get<ProgressDistribution>(
    `${API_BASE_URL}/api/v1/admin/analytics/intervention-plans/progress-distribution`,
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

export async function getRecentCompletions(
  limit: number = 10
): Promise<RecentCompletion[]> {
  const response = await axios.get<RecentCompletion[]>(
    `${API_BASE_URL}/api/v1/admin/analytics/intervention-plans/recent-completions`,
    {
      params: { limit },
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    }
  );
  return response.data;
}
