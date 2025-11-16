/**
 * Custom hooks for TCA admin data fetching
 */

import { useState, useEffect } from 'react';
import apiClient from '@/services/api';

// ============================================================================
// TYPES
// ============================================================================

export interface SCAAnalytics {
  total_plans: number;
  active_plans: number;
  completed_plans: number;
  archived_plans: number;
  avg_completion_percentage: number;
  avg_days_to_completion: number | null;
  plans_viewed_in_24h: number;
  plans_not_viewed_in_7d: number;
  risk_level_distribution: Record<string, number>;
  completion_rate: number;
  abandonment_rate: number;
  timeframe_days: number;
  generated_at: string;
}

export interface InterventionPlanSummary {
  id: number;
  user_hash: string;
  plan_title: string;
  risk_level: number | null;
  status: string;
  is_active: boolean;
  total_steps: number;
  completed_steps: number;
  completion_percentage: number;
  created_at: string;
  last_viewed_at: string | null;
  days_since_created: number;
  days_since_last_viewed: number | null;
}

export interface InterventionPlansListResponse {
  plans: InterventionPlanSummary[];
  total: number;
  page: number;
  page_size: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface InterventionPlanDetail {
  id: number;
  user_hash: string;
  session_id: string | null;
  plan_title: string;
  risk_level: number | null;
  plan_data: {
    plan_steps: Array<{ title: string; description: string; completed: boolean }>;
    resource_cards: Array<{ title: string; url: string; description: string }>;
    next_check_in: { timeframe: string; method: string };
  };
  completion_tracking: {
    completed_steps: number[];
    completion_percentage: number;
    last_updated: string | null;
  };
  total_steps: number;
  completed_steps: number;
  status: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_viewed_at: string | null;
  archived_at: string | null;
}

export interface UserProgress {
  user_hash: string;
  total_plans: number;
  active_plans: number;
  completed_plans: number;
  avg_completion_percentage: number;
  last_plan_created: string;
  engagement_score: number;
}

export interface CBTModuleUsage {
  module_name: string;
  usage_count: number;
  avg_completion_rate: number;
  total_steps: number;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to fetch TCA analytics
 */
function useAnalytics(days: number = 30) {
  const [analytics, setAnalytics] = useState<SCAAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<SCAAnalytics>(`/admin/tca/analytics?days=${days}`);
        setAnalytics(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [days]);

  return { analytics, loading, error };
}

/**
 * Hook to fetch intervention plans list
 */
function useInterventionPlans(params: {
  page?: number;
  page_size?: number;
  status?: string;
  risk_level?: number;
  sort_by?: string;
  sort_order?: string;
  search?: string;
} = {}) {
  const [data, setData] = useState<InterventionPlansListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    page = 1,
    page_size = 20,
    status,
    risk_level,
    sort_by = 'created_at',
    sort_order = 'desc',
    search,
  } = params;

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams({
          page: page.toString(),
          page_size: page_size.toString(),
          sort_by,
          sort_order,
        });

        if (status) queryParams.append('status', status);
        if (risk_level !== undefined) queryParams.append('risk_level', risk_level.toString());
        if (search) queryParams.append('search', search);

        const response = await apiClient.get<InterventionPlansListResponse>(
          `/admin/tca/interventions?${queryParams.toString()}`
        );
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plans');
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [page, page_size, status, risk_level, sort_by, sort_order, search]);

  return { data, loading, error };
}

/**
 * Hook to fetch plan details
 */
function usePlanDetail(planId: number | null) {
  const [plan, setPlan] = useState<InterventionPlanDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) {
      setPlan(null);
      return;
    }

    const fetchPlanDetail = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<InterventionPlanDetail>(
          `/admin/tca/interventions/${planId}`
        );
        setPlan(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plan details');
      } finally {
        setLoading(false);
      }
    };

    fetchPlanDetail();
  }, [planId]);

  return { plan, loading, error };
}

/**
 * Hook to fetch user progress
 */
function useUserProgress(params: { limit?: number; min_plans?: number } = {}) {
  const [users, setUsers] = useState<UserProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { limit = 50, min_plans = 1 } = params;

  useEffect(() => {
    const fetchUserProgress = async () => {
      try {
        setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams({
          limit: limit.toString(),
          min_plans: min_plans.toString(),
        });

        const response = await apiClient.get<UserProgress[]>(
          `/admin/tca/users/progress?${queryParams.toString()}`
        );
        setUsers(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load user progress');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProgress();
  }, [limit, min_plans]);

  return { users, loading, error };
}

/**
 * Hook to fetch CBT module usage
 */
function useCBTModuleUsage(days: number = 30) {
  const [modules, setModules] = useState<CBTModuleUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModuleUsage = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get<CBTModuleUsage[]>(
          `/admin/tca/cbt-modules/usage?days=${days}`
        );
        setModules(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load module usage');
      } finally {
        setLoading(false);
      }
    };

    fetchModuleUsage();
  }, [days]);

  return { modules, loading, error };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const useSCAData = {
  useAnalytics,
  useInterventionPlans,
  usePlanDetail,
  useUserProgress,
  useCBTModuleUsage,
};
