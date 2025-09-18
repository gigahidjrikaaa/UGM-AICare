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

export type AnalyticsReport = {
  id?: number;
  generated_at?: string;
  report_period: string;
  insights: Insight[];
  patterns: Pattern[];
  recommendations: string[];
  metrics?: Record<string, unknown>;
  topic_breakdown: TopicBreakdown[];
  theme_trends: ThemeTrend[];
  distress_heatmap: HeatmapCell[];
  segment_alerts: SegmentImpact[];
  high_risk_users: HighRiskUser[];
};
