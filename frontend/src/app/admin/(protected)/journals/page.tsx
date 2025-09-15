'use client';

import { useState, useEffect, useCallback } from 'react';
import { FiFilter, FiRefreshCw, FiTrendingUp, FiSmile, FiBarChart2, FiActivity } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { apiCall } from '@/utils/adminApi';

// Types for API response
interface JournalStats {
  total_entries: number;
  avg_mood_rating: number;
  entries_today: number;
  entries_this_week: number;
}

interface MoodTrendDataPoint {
  date: string;
  average_mood: number;
}

interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
}

interface CommonKeyword {
  word: string;
  frequency: number;
}

interface JournalInsightsResponse {
  stats: JournalStats;
  mood_trend: MoodTrendDataPoint[];
  sentiment_distribution: SentimentDistribution;
  common_keywords: CommonKeyword[];
}

interface DashboardAnalyticsResponse {
    journal_insights: JournalInsightsResponse;
}

// A simple SVG-based chart component
const SimpleLineChart = ({ data, color }: { data: {x: string, y: number}[], color: string }) => {
    if (!data || data.length === 0) return <div className="text-center text-gray-400">No data available</div>;

    const width = 500;
    const height = 200;
    const padding = 40;

    const maxX = data.length - 1;
    const maxY = 10; // Mood rating is out of 10

    const points = data.map((point, i) => {
        const x = (i / maxX) * (width - padding * 2) + padding;
        const y = height - (point.y / maxY) * (height - padding * 2) - padding;
        return `${x},${y}`;
    }).join(' ');

    return (
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {/* Y-axis labels */}
            {[0, 2, 4, 6, 8, 10].map(y => (
                <g key={y}>
                    <text x={padding - 10} y={height - (y / maxY) * (height - padding * 2) - padding} className="text-xs fill-current text-gray-400" textAnchor="end">{y}</text>
                    <line x1={padding} x2={width - padding} y1={height - (y / maxY) * (height - padding * 2) - padding} y2={height - (y / maxY) * (height - padding * 2) - padding} className="stroke-current text-white/10" />
                </g>
            ))}
            {/* X-axis labels */}
            {data.map((point, i) => (
                 <text key={i} x={(i / maxX) * (width - padding * 2) + padding} y={height - padding + 20} className="text-xs fill-current text-gray-400" textAnchor="middle">{new Date(point.x).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</text>
            ))}
            <polyline points={points} fill="none" stroke={color} strokeWidth="2" />
        </svg>
    );
};

export default function JournalsAdminPage() {
  const [insights, setInsights] = useState<JournalInsightsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchInsights = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) {
        params.append('start_date', startDate);
      }
      if (endDate) {
        params.append('end_date', endDate);
      }
      const data = await apiCall<DashboardAnalyticsResponse>(`/api/v1/admin/analytics/dashboard?${params.toString()}`);
      if (data.journal_insights) {
        setInsights(data.journal_insights);
      } else {
        toast.error('Journal insights not found in API response.');
      }
    } catch (error) {
      console.error('Error fetching journal insights:', error);
      toast.error('Failed to load journal insights.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleFilter = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInsights();
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center">
            <FiBarChart2 className="mr-3 text-[#FFCA40]" />
            Journal Insights
          </h1>
          <p className="text-gray-400 mt-1">Aggregated and anonymized insights from user journals.</p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 bg-[#FFCA40] hover:bg-[#ffda63] text-black rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
        >
          <FiRefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
        <form onSubmit={handleFilter} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              aria-label="Start Date"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              aria-label="End Date"
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:ring-2 focus:ring-[#FFCA40] focus:border-[#FFCA40] transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <FiFilter className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
            <button
              type="button"
              onClick={clearFilters}
              className="w-full inline-flex items-center justify-center px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Insights Body */}
      {loading ? (
        <div className="text-center py-10 text-gray-400">Loading insights...</div>
      ) : !insights ? (
        <div className="text-center py-10 text-gray-400">No insights available for the selected period.</div>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={<FiActivity />} title="Total Entries" value={insights.stats.total_entries} />
            <StatCard icon={<FiSmile />} title="Avg. Mood" value={insights.stats.avg_mood_rating.toFixed(2)} />
            <StatCard icon={<FiTrendingUp />} title="Entries Today" value={insights.stats.entries_today} />
            <StatCard icon={<FiTrendingUp />} title="Entries This Week" value={insights.stats.entries_this_week} />
          </div>

          {/* Charts and Keywords */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Overall Mood Trend</h3>
              <SimpleLineChart data={insights.mood_trend.map(d => ({ x: d.date, y: d.average_mood }))} color="#FFCA40" />
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Common Themes</h3>
              <div className="space-y-2">
                {insights.common_keywords.map(kw => (
                  <div key={kw.word} className="flex justify-between items-center bg-white/5 p-2 rounded-lg">
                    <span className="text-gray-300">{kw.word}</span>
                    <span className="font-bold text-white">{kw.frequency}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

const StatCard = ({ icon, title, value }: { icon: React.ReactNode, title: string, value: string | number }) => (
  <div className="bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
      <div className="p-3 bg-[#FFCA40]/20 rounded-lg text-[#FFCA40]">
        {icon}
      </div>
    </div>
  </div>
);