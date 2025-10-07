/**
 * Safety Agent Performance Dashboard
 * 
 * Displays comprehensive performance metrics for all Safety Agents:
 * - STA (Safety Triage Agent)
 * - SCA (Support Coach Agent)
 * - SDA (Service Desk Agent)
 * - IA (Intelligence Analytics)
 * - LangGraph Orchestrator
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FiActivity,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiMessageSquare,
  FiShield,
  FiTrendingUp,
  FiUsers,
  FiZap,
  FiRefreshCw
} from 'react-icons/fi';

import { StatCard } from './StatCard';
import { 
  getAllAgentPerformance, 
  type AllAgentMetrics 
} from '@/services/agentPerformanceApi';

interface SafetyAgentPerformanceProps {
  className?: string;
}

export function SafetyAgentPerformance({ className = '' }: SafetyAgentPerformanceProps) {
  const [metrics, setMetrics] = useState<AllAgentMetrics | null>(null);
  const [timePeriod, setTimePeriod] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadMetrics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllAgentPerformance(timePeriod);
      setMetrics(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading agent performance:', err);
      setError('Failed to load agent performance metrics');
    } finally {
      setLoading(false);
    }
  }, [timePeriod]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  if (loading && !metrics) {
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

  if (error && !metrics) {
    return (
      <div className={`${className}`}>
        <div className="bg-red-500/10 backdrop-blur-md border border-red-400/50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="bg-red-500/20 rounded-full p-2">
              <FiAlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-red-300 font-semibold">Error Loading Agent Metrics</h3>
              <p className="text-red-400/80 text-sm mt-1">{error}</p>
            </div>
            <motion.button
              onClick={loadMetrics}
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

  if (!metrics) return null;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with time period selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center space-x-2">
            <FiZap className="h-6 w-6 text-[#FFCA40]" />
            <span>Safety Agent Performance</span>
          </h2>
          <p className="text-white/60 text-sm mt-1">
            Real-time metrics from all Safety Agents and Orchestrator
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
            onClick={loadMetrics}
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            disabled={loading}
            className="p-2 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white/80 hover:text-white transition-all duration-300 backdrop-blur-md disabled:opacity-50"
            title="Refresh metrics"
          >
            <FiRefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </motion.button>
        </div>
      </div>

      {/* STA Metrics */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
          <div className="bg-red-500/20 rounded-full p-2">
            <FiAlertTriangle className="h-5 w-5 text-red-400" />
          </div>
          <span>Safety Triage Agent (STA)</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Triages"
            value={metrics.sta.total_triages.toString()}
            change={`${metrics.sta.time_period_days} days`}
            trend="neutral"
            icon={<FiActivity className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            title="Accuracy"
            value={`${metrics.sta.accuracy_percentage.toFixed(1)}%`}
            change={`${metrics.sta.avg_confidence.toFixed(2)} avg confidence`}
            trend={metrics.sta.accuracy_percentage >= 90 ? "up" : "down"}
            icon={<FiCheckCircle className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            title="False Positive Rate"
            value={`${metrics.sta.false_positive_rate.toFixed(1)}%`}
            change="Lower is better"
            trend={metrics.sta.false_positive_rate < 15 ? "up" : "down"}
            icon={<FiAlertTriangle className="h-5 w-5" />}
            color="yellow"
          />
          <StatCard
            title="Response Time"
            value={`${metrics.sta.avg_response_time_seconds.toFixed(1)}s`}
            change="Average processing time"
            trend="neutral"
            icon={<FiClock className="h-5 w-5" />}
            color="purple"
          />
        </div>
      </div>

      {/* SCA Metrics */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
          <div className="bg-green-500/20 rounded-full p-2">
            <FiMessageSquare className="h-5 w-5 text-green-400" />
          </div>
          <span>Support Coach Agent (SCA)</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Plans Generated"
            value={metrics.sca.plans_generated.toString()}
            change={`${metrics.sca.active_plans} active`}
            trend="up"
            icon={<FiActivity className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            title="Completion Rate"
            value={`${metrics.sca.completion_rate_percentage.toFixed(1)}%`}
            change={`${metrics.sca.completed_plans} completed`}
            trend={metrics.sca.completion_rate_percentage >= 60 ? "up" : "down"}
            icon={<FiCheckCircle className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            title="Avg Steps Per Plan"
            value={metrics.sca.avg_steps_per_plan.toFixed(1)}
            change="Plan complexity"
            trend="neutral"
            icon={<FiTrendingUp className="h-5 w-5" />}
            color="purple"
          />
          <StatCard
            title="User Satisfaction"
            value={`${metrics.sca.user_satisfaction_score.toFixed(1)}/5`}
            change="Based on feedback"
            trend={metrics.sca.user_satisfaction_score >= 4 ? "up" : "down"}
            icon={<FiCheckCircle className="h-5 w-5" />}
            color="yellow"
          />
        </div>
      </div>

      {/* SDA Metrics */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
          <div className="bg-blue-500/20 rounded-full p-2">
            <FiUsers className="h-5 w-5 text-blue-400" />
          </div>
          <span>Service Desk Agent (SDA)</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Cases"
            value={metrics.sda.active_cases.toString()}
            change={`${metrics.sda.total_cases} total`}
            trend="neutral"
            icon={<FiActivity className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            title="SLA Compliance"
            value={`${metrics.sda.sla_compliance_percentage.toFixed(1)}%`}
            change={`${metrics.sda.resolved_cases} resolved`}
            trend={metrics.sda.sla_compliance_percentage >= 85 ? "up" : "down"}
            icon={<FiCheckCircle className="h-5 w-5" />}
            color="green"
          />
          <StatCard
            title="Avg Resolution Time"
            value={`${metrics.sda.avg_resolution_time_hours.toFixed(1)}h`}
            change="Time to resolve"
            trend="neutral"
            icon={<FiClock className="h-5 w-5" />}
            color="purple"
          />
          <StatCard
            title="Escalation Rate"
            value={`${metrics.sda.escalation_rate_percentage.toFixed(1)}%`}
            change="Critical cases"
            trend={metrics.sda.escalation_rate_percentage < 20 ? "up" : "down"}
            icon={<FiAlertTriangle className="h-5 w-5" />}
            color="yellow"
          />
        </div>
      </div>

      {/* IA & Orchestrator Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* IA Metrics */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
            <div className="bg-purple-500/20 rounded-full p-2">
              <FiShield className="h-5 w-5 text-purple-400" />
            </div>
            <span>Intelligence Analytics (IA)</span>
          </h3>
          
          <div className="space-y-4">
            <StatCard
              title="Queries Processed"
              value={metrics.ia.queries_processed.toString()}
              change={`${metrics.ia.cache_hit_rate_percentage.toFixed(1)}% cache hit rate`}
              trend="up"
              icon={<FiActivity className="h-5 w-5" />}
              color="purple"
            />
            <StatCard
              title="Privacy Budget Used"
              value={`${metrics.ia.privacy_budget_used_percentage.toFixed(1)}%`}
              change={`ε=${metrics.ia.differential_privacy_epsilon}, k=${metrics.ia.k_anonymity_threshold}`}
              trend={metrics.ia.privacy_budget_used_percentage < 80 ? "up" : "down"}
              icon={<FiShield className="h-5 w-5" />}
              color="indigo"
            />
          </div>
        </div>

        {/* Orchestrator Metrics */}
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6">
          <h3 className="text-lg font-semibold text-white flex items-center space-x-2 mb-4">
            <div className="bg-yellow-500/20 rounded-full p-2">
              <FiZap className="h-5 w-5 text-yellow-400" />
            </div>
            <span>LangGraph Orchestrator</span>
          </h3>
          
          <div className="space-y-4">
            <StatCard
              title="Routing Decisions"
              value={metrics.orchestrator.total_routing_decisions.toString()}
              change={`${metrics.orchestrator.handoff_success_rate_percentage.toFixed(1)}% success rate`}
              trend="up"
              icon={<FiZap className="h-5 w-5" />}
              color="yellow"
            />
            <StatCard
              title="Avg Routing Time"
              value={`${metrics.orchestrator.avg_routing_time_ms}ms`}
              change="Agent selection speed"
              trend="neutral"
              icon={<FiClock className="h-5 w-5" />}
              color="orange"
            />
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="text-center text-white/50 text-sm">
        Last updated: {lastRefresh.toLocaleString()} • 
        Data period: Last {metrics.time_period_days} days
      </div>
    </div>
  );
}
