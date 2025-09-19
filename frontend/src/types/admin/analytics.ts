export type Insight = {
  title: string;
  description: string;
  severity: string;
  data: Record<string, unknown>;
};

export type Pattern = {
  name: string;
  description: string;
  count: number;
};

export type TopicBreakdown = {
  topic: string;
  total_mentions: number;
  sentiment_scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
};

export type ThemeTrendPoint = {
  date: string;
  count: number;
  rolling_average: number;
};

export type ThemeTrend = {
  topic: string;
  data: ThemeTrendPoint[];
};

export type HeatmapCell = {
  day: string;
  block: string;
  count: number;
};

export type SegmentImpact = {
  segment: string;
  group: string;
  metric: number;
  percentage: number;
};

export type HighRiskUser = {
  user_id: number;
  name: string | null;
  email: string | null;
  recent_assessments: number;
  last_severity: string;
  last_assessed_at: string;
  triage_link: string;
};

export type TopicExcerptSample = {
  excerpt: string;
  source?: string;
  date?: string;
};

export type TopicExcerptGroup = {
  topic: string;
  samples: TopicExcerptSample[];
};

export type ResourceEngagementItem = {
  category: string;
  label: string;
  total: number;
  unique_users?: number;
  avg_per_user?: number | null;
  timeframe: string;
};

export type ResourceEngagement = {
  timeframe?: string;
  items: ResourceEngagementItem[];
};

export type InterventionOutcomeItem = {
  status: string;
  count: number;
  percentage?: number;
  timeframe: string;
};

export type InterventionOutcomes = {
  timeframe?: string;
  items: InterventionOutcomeItem[];
};

export type ComparisonMetric = {
  current: number;
  reference: number;
  delta: number;
  delta_pct: number | null;
};

export type ComparisonSlice = {
  label: string;
  reference_report_id: number;
  generated_at: string | null;
  window: {
    start: string | null;
    end: string | null;
    report_period: string;
  };
  metrics: Record<string, ComparisonMetric | Record<string, ComparisonMetric>>;
  topics: Array<{ topic: string } & ComparisonMetric>;
  resource_engagement: Array<{
    label: string;
    category?: string;
    totals: ComparisonMetric;
    unique_users?: ComparisonMetric;
    avg_per_user?: ComparisonMetric;
  }>;
  interventions: Array<{
    status: string;
    counts: ComparisonMetric;
    percentage?: ComparisonMetric;
  }>;
  reference_summary?: ReportHistoryItem;
};

export type ComparisonSnapshot = Record<string, ComparisonSlice>;

export type ReportHistoryItem = {
  id: number;
  generated_at: string;
  report_period: string;
  window_start: string | null;
  window_end: string | null;
  insight_count: number;
  topic_count: number;
  top_topics: string[];
  comparison_keys: string[];
};

export type ComparisonResponse = {
  report_id: number;
  generated_at: string | null;
  comparisons: ComparisonSnapshot;
};

export type TopicExcerptsListResponse = {
  topics: TopicExcerptGroup[];
  limit: number;
};

export type TopicExcerptSingleResponse = {
  topic: string;
  samples: TopicExcerptSample[];
};

export type TopicExcerptsResponse = TopicExcerptsListResponse | TopicExcerptSingleResponse;

export type AnalyticsReport = {
  id?: number;
  generated_at?: string;
  report_period: string;
  window_start?: string | null;
  window_end?: string | null;
  insights: Insight[];
  patterns: Pattern[];
  recommendations: string[];
  metrics?: Record<string, unknown>;
  topic_breakdown: TopicBreakdown[];
  theme_trends: ThemeTrend[];
  distress_heatmap: HeatmapCell[];
  segment_alerts: SegmentImpact[];
  high_risk_users: HighRiskUser[];
  resource_engagement?: ResourceEngagement;
  intervention_outcomes?: InterventionOutcomes;
  comparison_snapshot?: ComparisonSnapshot;
  topic_excerpts?: TopicExcerptGroup[];
};
