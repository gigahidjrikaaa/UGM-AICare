'use client';

import { useEffect, useState } from 'react';
import { apiCall } from '@/utils/adminApi';
import Link from 'next/link';

type KPI = {
  active_critical_cases: number;
  overall_sentiment?: number | null;
  sentiment_delta?: number | null;
  appointments_this_week: number;
};

type TrendingTopic = { topic: string; count: number };
type AlertItem = { case_id: string; severity: string; created_at: string; session_id?: string | null; user_hash: string; summary?: string | null };

type Overview = {
  kpis: KPI;
  insights: { trending_topics: TrendingTopic[]; ia_summary: string };
  alerts: AlertItem[];
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiCall<Overview>('/api/v1/admin/dashboard/overview');
        setData(res);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to load dashboard';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div className="p-6 text-white/70">Loading dashboard…</div>;
  if (error) return <div className="p-6 text-red-300">{error}</div>;
  if (!data) return <div className="p-6 text-white/70">No data</div>;

  const { kpis, insights, alerts } = data;

  return (
    <div className="p-6 space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-white/60 text-xs">Active Critical Cases</div>
          <div className="text-2xl text-white font-semibold">{kpis.active_critical_cases}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-white/60 text-xs flex items-center justify-between">
            <span>Overall Sentiment</span>
            {typeof kpis.sentiment_delta === 'number' && (
              <span className={kpis.sentiment_delta >= 0 ? 'text-green-300' : 'text-red-300'}>
                {kpis.sentiment_delta >= 0 ? '↑' : '↓'} {Math.abs(kpis.sentiment_delta).toFixed(2)}
              </span>
            )}
          </div>
          <div className="text-2xl text-white font-semibold">{typeof kpis.overall_sentiment === 'number' ? `${kpis.overall_sentiment.toFixed(2)}%` : '—'}</div>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-white/60 text-xs">Appointments This Week</div>
          <div className="text-2xl text-white font-semibold">{kpis.appointments_this_week}</div>
        </div>
      </div>

      {/* Insights panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-white/80 font-medium mb-3">Trending Topics (7 days)</div>
          {insights.trending_topics.length === 0 ? (
            <div className="text-white/60 text-sm">No trending topics</div>
          ) : (
            <div className="space-y-2">
              {insights.trending_topics.map((t) => (
                <div key={t.topic} className="flex items-center justify-between text-white/80 text-sm">
                  <span>{t.topic}</span>
                  <span className="text-white/60">{t.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <div className="text-white/80 font-medium mb-2">IA Summary</div>
          <p className="text-white/70 text-sm leading-relaxed">{insights.ia_summary}</p>
        </div>
      </div>

      {/* Alerts feed */}
      <div className="bg-white/5 border border-white/10 rounded-lg">
        <div className="p-4 border-b border-white/10 text-white/80 font-medium">Recent Critical Alerts</div>
        {alerts.length === 0 ? (
          <div className="p-4 text-white/60 text-sm">No active critical alerts</div>
        ) : (
          <div className="divide-y divide-white/10">
            {alerts.map((a) => (
              <div key={a.case_id} className="p-4 flex items-center justify-between">
                <div className="min-w-0">
                  <div className="text-white/90 text-sm font-medium">{a.severity.toUpperCase()} • {new Date(a.created_at).toLocaleString()}</div>
                  <div className="text-white/70 text-xs truncate">{a.summary || a.session_id || a.user_hash}</div>
                </div>
                <Link href={`/admin/cases?case=${a.case_id}`} className="text-[#FFCA40] text-sm hover:underline">View</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

