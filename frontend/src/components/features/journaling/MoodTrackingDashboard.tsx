"use client";

import React, { useState, useEffect } from 'react';
import { FiMeh, FiFrown, FiSmile, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { getJournalAnalytics } from '@/services/api';
import type { JournalAnalyticsResponse } from '@/types/api';

interface MoodTrackingDashboardProps {
  days?: number;
  className?: string;
}

const MOOD_EMOJIS = {
  1: { emoji: '😢', label: 'Very Negative', icon: FiFrown, color: '#EF4444' },
  2: { emoji: '😕', label: 'Negative', icon: FiFrown, color: '#F97316' },
  3: { emoji: '😐', label: 'Neutral', icon: FiMeh, color: '#EAB308' },
  4: { emoji: '😊', label: 'Positive', icon: FiSmile, color: '#22C55E' },
  5: { emoji: '😄', label: 'Very Positive', icon: FiSmile, color: '#10B981' },
};

const PIE_COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#10B981'];

export default function MoodTrackingDashboard({ days = 30, className = '' }: MoodTrackingDashboardProps) {
  const [analytics, setAnalytics] = useState<JournalAnalyticsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, [days]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getJournalAnalytics(days);
      setAnalytics(data);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError('Failed to load analytics data.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={`bg-white/3 backdrop-blur-xl rounded-2xl border border-white/10 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FFCA40]"></div>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className={`bg-white/3 backdrop-blur-xl rounded-2xl border border-white/10 p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <p className="text-red-400">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  const avgMood = Object.entries(analytics.mood_distribution).reduce((acc, [mood, count]) => {
    return acc + (parseInt(mood) * count);
  }, 0) / (Object.values(analytics.mood_distribution).reduce((acc, count) => acc + count, 0) || 1);

  const moodTrendData = analytics.mood_trend.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    mood: item.mood,
  }));

  const pieData = Object.entries(analytics.mood_distribution)
    .map(([mood, count]) => ({
      name: MOOD_EMOJIS[parseInt(mood) as keyof typeof MOOD_EMOJIS]?.label || 'Unknown',
      value: count,
      emoji: MOOD_EMOJIS[parseInt(mood) as keyof typeof MOOD_EMOJIS]?.emoji || '❓',
    }))
    .filter((item) => item.value > 0);

  const writingFrequencyData = analytics.writing_frequency.map((item) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    entries: item.count,
  }));

  const TrendIcon = avgMood >= 3 ? FiTrendingUp : FiTrendingDown;
  const trendColor = avgMood >= 3 ? 'text-green-400' : 'text-red-400';

  return (
    <div className={`bg-white/3 backdrop-blur-xl rounded-2xl border border-white/10 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <span className="text-[#FFCA40]">Mood</span> Analytics
        </h2>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white/50">Last {days} days</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500/15 to-cyan-500/15 rounded-xl p-5 border border-blue-500/25">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-300 text-sm font-medium mb-1">Average Mood</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-white">{avgMood.toFixed(1)}</span>
                <span className="text-2xl">{MOOD_EMOJIS[Math.round(avgMood) as keyof typeof MOOD_EMOJIS]?.emoji}</span>
              </div>
              <p className={`text-xs mt-2 ${trendColor} flex items-center gap-1`}>
                <TrendIcon size={14} />
                {avgMood >= 3 ? 'Positive trend' : 'Room for improvement'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-white">{analytics.total_entries}</p>
              <p className="text-blue-300 text-sm">entries</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500/15 to-emerald-500/15 rounded-xl p-5 border border-green-500/25">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-300 text-sm font-medium mb-1">Total Words</p>
              <p className="text-3xl font-bold text-white">{analytics.total_word_count.toLocaleString()}</p>
              <p className="text-xs text-green-300 mt-2">
                ~{Math.round(analytics.avg_word_count)} words/entry
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500/15 to-amber-500/15 rounded-xl p-5 border border-orange-500/25">
          <p className="text-orange-300 text-sm font-medium mb-3">Top Tags</p>
          <div className="space-y-2">
            {analytics.most_used_tags.slice(0, 3).map((tag, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <span className="text-white text-sm bg-white/10 px-2 py-1 rounded-md">
                  #{tag.tag}
                </span>
                <span className="text-orange-300 text-sm font-semibold">{tag.count}x</span>
              </div>
            ))}
            {analytics.most_used_tags.length === 0 && (
              <p className="text-white/50 text-sm">No tags yet</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <FiTrendingUp className="text-[#FFCA40]" />
            Mood Trend
          </h3>
          {moodTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={moodTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="date" 
                  stroke="rgba(255, 255, 255, 0.3)"
                  fontSize={12}
                />
                <YAxis 
                  domain={[1, 5]}
                  stroke="rgba(255, 255, 255, 0.3)"
                  fontSize={12}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#001D58', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px'
                  }}
                  itemStyle={{ color: '#ffffff' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="mood" 
                  stroke="#FFCA40" 
                  strokeWidth={2}
                  dot={{ fill: '#FFCA40', r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-white/50 text-center py-8">No mood data available</p>
          )}
        </div>

        <div className="bg-white/5 rounded-xl p-5 border border-white/10">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            Mood Distribution
          </h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent, emoji }) => `${emoji} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={70}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#001D58', 
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-white/50 text-center py-8">No mood data available</p>
          )}
        </div>
      </div>

      <div className="mt-4 bg-white/5 rounded-xl p-5 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          Writing Frequency
        </h3>
        {writingFrequencyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={150}>
            <BarChart data={writingFrequencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255, 255, 255, 0.3)"
                fontSize={12}
              />
              <YAxis 
                stroke="rgba(255, 255, 255, 0.3)"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#001D58', 
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px'
                }}
              />
              <Bar 
                dataKey="entries" 
                fill="#FFCA40"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-white/50 text-center py-8">No writing frequency data</p>
        )}
      </div>
    </div>
  );
}
