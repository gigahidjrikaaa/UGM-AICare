'use client';

import { motion } from 'framer-motion';
import { ClockIcon, CalendarIcon, SparklesIcon, BellAlertIcon } from '@heroicons/react/24/outline';
import type { InsightsPanel } from '@/types/admin/dashboard';

interface InsightsPanelProps {
  insights: InsightsPanel;
  onGenerateReport?: () => void;
  onGenerateCampaign?: () => void;
}

export function InsightsPanelCard({ insights, onGenerateReport, onGenerateCampaign }: InsightsPanelProps) {
  const hasInsights = insights.ia_summary && insights.ia_summary.trim().length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="rounded-xl border border-white/10 bg-white/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-blue-500/10 to-purple-500/10">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">AI Insights</h3>
            {insights.report_generated_at && (
              <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                <ClockIcon className="w-4 h-4" />
                <span>
                  Updated {new Date(insights.report_generated_at).toLocaleDateString()}
                </span>
              </div>
            )}
            {insights.report_period && (
              <div className="flex items-center gap-2 text-xs text-white/60 mt-1">
                <CalendarIcon className="w-4 h-4" />
                <span>Period: {insights.report_period}</span>
              </div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {/* Generate Report Button */}
            {onGenerateReport && (
              <button
                onClick={onGenerateReport}
                className="px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 
                  hover:to-purple-600 text-white text-xs font-medium rounded-lg shadow-lg 
                  shadow-blue-500/30 transition-all duration-200 flex items-center gap-2"
                title="Manually generate new IA report"
              >
                <SparklesIcon className="w-4 h-4" />
                Generate
              </button>
            )}
            
            {/* Generate Campaign Button */}
            {onGenerateCampaign && hasInsights && (
              <button
                onClick={onGenerateCampaign}
                className="px-3 py-2 bg-gradient-to-r from-pink-500 to-orange-500 hover:from-pink-600 
                  hover:to-orange-600 text-white text-xs font-medium rounded-lg shadow-lg 
                  shadow-pink-500/30 transition-all duration-200 flex items-center gap-2"
                title="Create campaign based on these insights"
              >
                <BellAlertIcon className="w-4 h-4" />
                Create Campaign
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* IA Summary */}
        <div>
          <h4 className="text-sm font-medium text-white/80 mb-2">Summary</h4>
          <p className="text-sm text-white/70 leading-relaxed">
            {insights.ia_summary || 'No insights available yet. Check back later.'}
          </p>
        </div>

        {/* Trending Topics */}
        {insights.trending_topics && insights.trending_topics.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-white/80 mb-3">Trending Topics</h4>
            <div className="space-y-2">
              {insights.trending_topics.map((topic, index) => {
                const maxCount = Math.max(...insights.trending_topics.map(t => t.count));
                const percentage = (topic.count / maxCount) * 100;
                
                return (
                  <div key={topic.topic} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white/70 font-medium">
                        {index + 1}. {topic.topic}
                      </span>
                      <span className="text-white/50">{topic.count} mentions</span>
                    </div>
                    <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
