'use client';

import { motion } from 'framer-motion';
import {
  ClockIcon,
  CalendarIcon,
  SparklesIcon,
  BellAlertIcon,
  LightBulbIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MinusIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import type { InsightsPanel, PatternInsight, RecommendationItem } from '@/types/admin/dashboard';
import { EASE } from './primitives';

interface InsightsPanelProps {
  insights: InsightsPanel;
  onGenerateReport?: () => void;
  onGenerateCampaign?: () => void;
}

// Helper to get trend icon
function TrendIcon({ trend }: { trend: PatternInsight['trend'] }) {
  switch (trend) {
    case 'increasing':
      return <ArrowTrendingUpIcon className="w-4 h-4 text-red-400" />;
    case 'decreasing':
      return <ArrowTrendingDownIcon className="w-4 h-4 text-green-400" />;
    default:
      return <MinusIcon className="w-4 h-4 text-yellow-400" />;
  }
}

// Helper to get severity badge color
function getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high':
      return 'bg-red-500/10 text-red-300 ring-red-500/20';
    case 'medium':
      return 'bg-amber-400/10 text-amber-300 ring-amber-400/20';
    default:
      return 'bg-emerald-400/10 text-emerald-300 ring-emerald-400/20';
  }
}

// Helper to get priority icon
function PriorityIcon({ priority }: { priority: RecommendationItem['priority'] }) {
  switch (priority) {
    case 'high':
      return <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />;
    case 'medium':
      return <InformationCircleIcon className="w-4 h-4 text-yellow-400" />;
    default:
      return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
  }
}

// Helper to get category badge color
function getCategoryColor(category: RecommendationItem['category']): string {
  switch (category) {
    case 'intervention':
      return 'bg-red-500/10 text-red-300';
    case 'resource':
      return 'bg-blue-500/10 text-blue-300';
    case 'communication':
      return 'bg-purple-500/10 text-purple-300';
    case 'monitoring':
      return 'bg-cyan-500/10 text-cyan-300';
    default:
      return 'bg-slate-500/10 text-slate-300';
  }
}

export function InsightsPanelCard({ insights, onGenerateReport, onGenerateCampaign }: InsightsPanelProps) {
  const hasInsights = insights.ia_summary && insights.ia_summary.trim().length > 0;
  const hasPatterns = insights.patterns && insights.patterns.length > 0;
  const hasRecommendations = insights.recommendations && insights.recommendations.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      transition={{ duration: 0.8, ease: EASE, delay: 0.1 }}
      className="h-full overflow-hidden rounded-[2rem] bg-white/[0.04] p-1.5 ring-1 ring-white/10"
    >
      <div className="flex h-full flex-col rounded-[calc(2rem-0.375rem)] bg-[#020b22]/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]">
        {/* Header */}
        <div className="border-b border-white/[0.06] px-6 pb-4 pt-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold tracking-tight text-white">AI Insights</h3>
                {insights.llm_powered && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-blue-500/15 to-purple-500/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-blue-300 ring-1 ring-blue-500/25">
                    <SparklesIcon className="h-3 w-3" />
                    Gemini
                  </span>
                )}
              </div>
              {insights.report_generated_at && (
                <div className="mt-1.5 flex items-center gap-1.5 text-xs tabular-nums text-white/40">
                  <ClockIcon className="h-3.5 w-3.5" />
                  <span>Updated {new Date(insights.report_generated_at).toLocaleDateString()}</span>
                </div>
              )}
              {insights.report_period && (
                <div className="mt-1 flex items-center gap-1.5 text-xs text-white/40">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>Period: {insights.report_period}</span>
                </div>
              )}
            </div>

            {/* Action buttons — pill architecture */}
            <div className="flex shrink-0 items-center gap-2">
              {onGenerateReport && (
                <button
                  onClick={onGenerateReport}
                  className="rounded-full bg-[#FFCA40] px-4 py-2 text-xs font-semibold text-[#00153a] transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-[0_6px_28px_-6px_rgba(255,202,64,0.5)] active:scale-[0.97]"
                  title="Generate new AI-powered IA report"
                >
                  Generate
                </button>
              )}

              {onGenerateCampaign && hasInsights && (
                <button
                  onClick={onGenerateCampaign}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-xs font-semibold text-white/80 ring-1 ring-white/15 transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-white/[0.1] hover:text-white active:scale-[0.97]"
                  title="Create campaign based on these insights"
                >
                  <BellAlertIcon className="h-3.5 w-3.5" />
                  Campaign
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {/* IA Summary */}
          <div>
            <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">Summary</h4>
            <p className="text-sm leading-relaxed text-white/70">
              {insights.ia_summary || 'No insights available yet. Generate a report to see AI-powered analysis.'}
            </p>
          </div>

          {/* LLM-Powered Patterns Section */}
          {hasPatterns && (
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                <LightBulbIcon className="h-3.5 w-3.5 text-amber-300" />
                Identified Patterns
              </h4>
              <div className="space-y-2.5">
                {insights.patterns!.map((pattern, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.08 * index }}
                    className="rounded-2xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.06]"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <TrendIcon trend={pattern.trend} />
                        <span className="text-sm font-medium text-white">{pattern.title}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ${getSeverityColor(pattern.severity)}`}>
                        {pattern.severity}
                      </span>
                    </div>
                    <p className="pl-6 text-xs leading-relaxed text-white/55">
                      {pattern.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* LLM-Powered Recommendations Section */}
          {hasRecommendations && (
            <div>
              <h4 className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-300" />
                Actionable Recommendations
              </h4>
              <div className="space-y-2.5">
                {insights.recommendations!.map((rec, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: EASE, delay: 0.08 * index }}
                    className="rounded-2xl bg-white/[0.03] p-3.5 ring-1 ring-white/[0.06]"
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <PriorityIcon priority={rec.priority} />
                        <span className="text-sm font-medium text-white">{rec.title}</span>
                      </div>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getCategoryColor(rec.category)}`}>
                        {rec.category}
                      </span>
                    </div>
                    <p className="pl-6 text-xs leading-relaxed text-white/55">
                      {rec.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Topics */}
          {insights.trending_topics && insights.trending_topics.length > 0 && (
            <div>
              <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Trending Topics
              </h4>
              <div className="space-y-2.5">
                {insights.trending_topics.map((topic, index) => {
                  const maxCount = Math.max(...insights.trending_topics.map(t => t.count));
                  const percentage = (topic.count / maxCount) * 100;

                  return (
                    <div key={topic.topic} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-white/70">
                          {topic.topic}
                        </span>
                        <span className="tabular-nums text-white/40">{topic.count} mentions</span>
                      </div>
                      {/* scaleX — transform-only, no layout thrash */}
                      <div className="relative h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <motion.div
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: percentage / 100 }}
                          style={{ transformOrigin: 'left' }}
                          transition={{ duration: 0.9, ease: EASE, delay: 0.2 + index * 0.08 }}
                          className="absolute inset-0 rounded-full bg-gradient-to-r from-[#FFCA40]/80 to-[#5B8DEF]/80"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Severity Distribution */}
          {insights.severity_distribution && (
            <div>
              <h4 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
                Severity Distribution
              </h4>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(insights.severity_distribution).map(([level, count]) => (
                  <div
                    key={level}
                    className={`rounded-2xl p-2.5 text-center ring-1 ${
                      level === 'critical' ? 'bg-red-500/[0.08] ring-red-500/20' :
                      level === 'high' ? 'bg-orange-500/[0.08] ring-orange-500/20' :
                      level === 'medium' ? 'bg-amber-400/[0.08] ring-amber-400/20' :
                      'bg-emerald-400/[0.08] ring-emerald-400/20'
                    }`}
                  >
                    <div className={`text-lg font-bold tabular-nums ${
                      level === 'critical' ? 'text-red-300' :
                      level === 'high' ? 'text-orange-300' :
                      level === 'medium' ? 'text-amber-300' :
                      'text-emerald-300'
                    }`}>
                      {count}
                    </div>
                    <div className="text-[10px] uppercase tracking-wide text-white/45">{level}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
