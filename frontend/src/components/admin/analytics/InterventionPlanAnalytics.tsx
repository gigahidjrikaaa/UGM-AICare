/**
 * Intervention Plan Analytics Dashboard
 * 
 * Displays comprehensive analytics for intervention plans:
 * - Overview metrics (total, active, completed, completion rates)
 * - Progress distribution (6 buckets: 0%, 1-25%, 26-50%, 51-75%, 76-99%, 100%)
 * - Analytics by plan type with effectiveness scoring
 * - Recent completions timeline
 * - Step completion tracking
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiActivity,
  FiAward,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiTrendingUp,
  FiAlertTriangle,
  FiTarget,
  FiBarChart2
} from 'react-icons/fi';

import { StatCard } from './StatCard';
import { 
  getComprehensiveInterventionAnalytics, 
  type ComprehensiveInterventionAnalytics 
} from '@/services/interventionAnalyticsApi';

interface InterventionPlanAnalyticsProps {
  className?: string;
}

export function InterventionPlanAnalytics({ className = '' }: InterventionPlanAnalyticsProps) {
  const [analytics, setAnalytics] = useState<ComprehensiveInterventionAnalytics | null>(null);
  const [timePeriod, setTimePeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getComprehensiveInterventionAnalytics(timePeriod);
      setAnalytics(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading intervention analytics:', err);
      setError('Failed to load intervention plan analytics');
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (loading && !analytics) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white/10 rounded-2xl h-32 border border-white/20 backdrop-blur-md"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error && !analytics) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-500/10 backdrop-blur-md border border-red-400/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-red-500/20 rounded-full p-2">
              <FiAlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-red-300 font-semibold">Error Loading Analytics</h3>
              <p className="text-red-400/80 text-sm mt-1">{error}</p>
            </div>
            <motion.button
              onClick={loadAnalytics}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-sm font-medium px-4 py-2 rounded-lg border border-red-400/30 transition-all duration-300"
            >
              <FiRefreshCw className="h-4 w-4" />
              <span>Retry</span>
            </motion.button>
          </div>
        </div>
      </div>
    );
  }

  if (!analytics) return null;

  const getProgressColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-400';
    if (percentage >= 50) return 'text-yellow-400';
    if (percentage >= 25) return 'text-orange-400';
    return 'text-red-400';
  };

  const getEffectivenessColor = (score: number) => {
    if (score >= 80) return 'bg-green-500/20 text-green-400 border-green-400/30';
    if (score >= 60) return 'bg-yellow-500/20 text-yellow-400 border-yellow-400/30';
    if (score >= 40) return 'bg-orange-500/20 text-orange-400 border-orange-400/30';
    return 'bg-red-500/20 text-red-400 border-red-400/30';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with time period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <FiTarget className="h-6 w-6 text-[#FFCA40]" />
            <span>Intervention Plan Analytics</span>
          </h2>
          <p className="text-white/60 text-sm mt-1">
            Comprehensive tracking of intervention plan effectiveness and progress
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timePeriod}
            onChange={(e) => setTimePeriod(Number(e.target.value))}
            aria-label="Time period selection"
            className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white text-sm backdrop-blur-md hover:bg-white/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          
          <motion.button
            onClick={loadAnalytics}
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/80 hover:text-white transition-all duration-300 backdrop-blur-md disabled:opacity-50"
            title="Refresh analytics"
          >
            <FiRefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Plans"
          value={analytics.overview.total_plans.toString()}
          change={`${analytics.overview.time_period_days} days`}
          trend="neutral"
          icon={<FiActivity className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          title="Active Plans"
          value={analytics.overview.active_plans.toString()}
          change={`${analytics.overview.not_started_plans} not started`}
          trend="up"
          icon={<FiTrendingUp className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          title="Completion Rate"
          value={`${analytics.overview.completion_rate_percentage.toFixed(1)}%`}
          change={`${analytics.overview.completed_plans} completed`}
          trend={analytics.overview.completion_rate_percentage >= 60 ? "up" : "down"}
          icon={<FiCheckCircle className="h-5 w-5" />}
          color="purple"
        />
        <StatCard
          title="Avg Completion Time"
          value={`${analytics.overview.avg_days_to_complete.toFixed(1)} days`}
          change={`${analytics.overview.avg_completion_percentage.toFixed(0)}% avg progress`}
          trend="neutral"
          icon={<FiClock className="h-5 w-5" />}
          color="yellow"
        />
      </div>

      {/* Progress Distribution */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2 mb-6">
          <div className="bg-blue-500/20 rounded-full p-2">
            <FiBarChart2 className="h-5 w-5 text-blue-400" />
          </div>
          <span>Progress Distribution</span>
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-red-400">
              {analytics.progress_distribution.not_started}
            </div>
            <div className="text-white/60 text-sm mt-2">Not Started</div>
            <div className="text-white/40 text-xs mt-1">0%</div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-orange-400">
              {analytics.progress_distribution.early_progress}
            </div>
            <div className="text-white/60 text-sm mt-2">Early Progress</div>
            <div className="text-white/40 text-xs mt-1">1-25%</div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-yellow-400">
              {analytics.progress_distribution.mid_progress}
            </div>
            <div className="text-white/60 text-sm mt-2">Mid Progress</div>
            <div className="text-white/40 text-xs mt-1">26-50%</div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-lime-400">
              {analytics.progress_distribution.good_progress}
            </div>
            <div className="text-white/60 text-sm mt-2">Good Progress</div>
            <div className="text-white/40 text-xs mt-1">51-75%</div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-green-400">
              {analytics.progress_distribution.near_complete}
            </div>
            <div className="text-white/60 text-sm mt-2">Near Complete</div>
            <div className="text-white/40 text-xs mt-1">76-99%</div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-emerald-400">
              {analytics.progress_distribution.completed}
            </div>
            <div className="text-white/60 text-sm mt-2">Completed</div>
            <div className="text-white/40 text-xs mt-1">100%</div>
          </div>
        </div>
      </div>

      {/* Analytics by Plan Type */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2 mb-6">
          <div className="bg-purple-500/20 rounded-full p-2">
            <FiAward className="h-5 w-5 text-purple-400" />
          </div>
          <span>Analytics by Plan Type</span>
        </h3>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-white/60 text-sm font-medium py-3 px-4">Plan Type</th>
                <th className="text-center text-white/60 text-sm font-medium py-3 px-4">Total</th>
                <th className="text-center text-white/60 text-sm font-medium py-3 px-4">Completed</th>
                <th className="text-center text-white/60 text-sm font-medium py-3 px-4">Completion Rate</th>
                <th className="text-center text-white/60 text-sm font-medium py-3 px-4">Avg Progress</th>
                <th className="text-center text-white/60 text-sm font-medium py-3 px-4">Avg Steps</th>
                <th className="text-center text-white/60 text-sm font-medium py-3 px-4">Avg Time</th>
                <th className="text-center text-white/60 text-sm font-medium py-3 px-4">Effectiveness</th>
              </tr>
            </thead>
            <tbody>
              {analytics.by_plan_type.map((type: { plan_type: string; total_count: number; completed_count: number; completion_rate_percentage: number; avg_completion_percentage: number; avg_steps: number; avg_days_to_complete: number; effectiveness_score: number }, idx: number) => (
                <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-4 px-4">
                    <div className="font-medium text-white capitalize">
                      {type.plan_type.replace(/_/g, ' ')}
                    </div>
                  </td>
                  <td className="text-center text-white py-4 px-4">
                    {type.total_count}
                  </td>
                  <td className="text-center text-white py-4 px-4">
                    {type.completed_count}
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className={`font-semibold ${getProgressColor(type.completion_rate_percentage)}`}>
                      {type.completion_rate_percentage.toFixed(1)}%
                    </span>
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className={`font-semibold ${getProgressColor(type.avg_completion_percentage)}`}>
                      {type.avg_completion_percentage.toFixed(0)}%
                    </span>
                  </td>
                  <td className="text-center text-white/80 py-4 px-4">
                    {type.avg_steps.toFixed(1)}
                  </td>
                  <td className="text-center text-white/80 py-4 px-4">
                    {type.avg_days_to_complete.toFixed(1)}d
                  </td>
                  <td className="text-center py-4 px-4">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getEffectivenessColor(type.effectiveness_score)}`}>
                      {type.effectiveness_score.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        <div className="mt-4 text-white/50 text-xs">
          Effectiveness Score: Weighted formula (50% completion rate + 30% speed + 20% engagement)
        </div>
      </div>

      {/* Recent Completions */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2 mb-6">
          <div className="bg-green-500/20 rounded-full p-2">
            <FiCheckCircle className="h-5 w-5 text-green-400" />
          </div>
          <span>Recent Completions</span>
        </h3>
        
        {analytics.recent_completions.length > 0 ? (
          <div className="space-y-3">
            {analytics.recent_completions.map((completion, idx) => (
              <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-500/20 rounded-full p-2">
                    <FiCheckCircle className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <div className="text-white font-medium capitalize">
                      {completion.plan_type.replace(/_/g, ' ')}
                    </div>
                    <div className="text-white/60 text-sm mt-1">
                      User: {completion.user_email || 'Unknown'}
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-white/80 text-sm">
                    Completed in <span className="font-semibold text-green-400">{completion.days_to_complete}d</span>
                  </div>
                  <div className="text-white/50 text-xs mt-1">
                    {new Date(completion.completed_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/40">
            No completed plans in the selected time period
          </div>
        )}
      </div>

      {/* Step Completion Analytics */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
          <div className="bg-yellow-500/20 rounded-full p-2">
            <FiActivity className="h-5 w-5 text-yellow-400" />
          </div>
          <span>Step Completion Analytics</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-yellow-400">
              {analytics.step_analytics.total_steps_completed.toLocaleString()}
            </div>
            <div className="text-white/60 text-sm mt-2">Total Steps Completed</div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 text-center">
            <div className="text-4xl font-bold text-green-400">
              {analytics.step_analytics.avg_step_completion_percentage.toFixed(1)}%
            </div>
            <div className="text-white/60 text-sm mt-2">Avg Step Completion Rate</div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-white/50 text-sm">
        Last updated: {lastRefresh.toLocaleString()} • 
        Data period: Last {analytics.time_period_days} days
      </div>
    </div>
  );
}
