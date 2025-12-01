import { apiCall } from '@/utils/adminApi';
import type { DashboardOverview, TrendsResponse, TimeRange } from '@/types/admin/dashboard';

export interface GenerateReportRequest {
  report_type: 'weekly' | 'monthly' | 'ad_hoc';
  period_start?: string;
  period_end?: string;
  use_llm?: boolean; // Whether to use Gemini LLM for intelligent analysis
}

export interface InsightsReport {
  id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  summary: string | null;
  trending_topics: Record<string, unknown> | null;
  sentiment_data: {
    avg_sentiment?: number;
    avg_risk?: number;
    period_start?: string;
    period_end?: string;
    patterns?: Array<{
      title: string;
      description: string;
      severity: 'low' | 'medium' | 'high';
      trend: 'increasing' | 'stable' | 'decreasing';
    }>;
    recommendations?: Array<{
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      category: 'intervention' | 'resource' | 'communication' | 'monitoring';
    }>;
    severity_distribution?: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    llm_powered?: boolean;
  } | null;
  high_risk_count: number;
  assessment_count: number;
  generated_at: string;
}

/**
 * Fetch dashboard overview with KPIs, insights, and alerts
 */
export async function getDashboardOverview(timeRange: TimeRange = 7): Promise<DashboardOverview> {
  return apiCall<DashboardOverview>(`/api/v1/admin/dashboard/overview?time_range=${timeRange}`);
}

/**
 * Fetch historical trends data for charts
 */
export async function getDashboardTrends(timeRange: TimeRange = 30): Promise<TrendsResponse> {
  return apiCall<TrendsResponse>(`/api/v1/admin/dashboard/trends?time_range=${timeRange}`);
}

/**
 * Manually trigger generation of an IA insights report
 */
export async function generateInsightsReport(request: GenerateReportRequest): Promise<InsightsReport> {
  return apiCall<InsightsReport>('/api/v1/admin/insights/reports/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}
