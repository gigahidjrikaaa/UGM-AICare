/**
 * Intervention Plan Detail Modal
 * Shows full plan details with steps and resources
 */

'use client';

import { useSCAData } from '../hooks/useSCAData';

interface Props {
  planId: number;
  onClose: () => void;
}

export function InterventionPlanDetailModal({ planId, onClose }: Props) {
  const { plan, loading } = useSCAData.usePlanDetail(planId);

  if (loading || !plan) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-[#001d58] border border-white/20 rounded-xl p-8 max-w-2xl w-full mx-4">
          <div className="text-white text-center">Loading plan details...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-[#001d58] border border-white/20 rounded-xl p-8 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{plan.plan_title}</h2>
            <p className="text-white/60 text-sm">User: {plan.user_hash}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Plan Steps */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Plan Steps ({plan.completed_steps}/{plan.total_steps})</h3>
          <div className="space-y-3">
            {plan.plan_data.plan_steps.map((step, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${
                  step.completed
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                    step.completed ? 'bg-green-500/30 text-green-300' : 'bg-white/10 text-white/60'
                  }`}>
                    {step.completed ? '✓' : index + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-white font-medium mb-1">{step.title}</div>
                    <div className="text-white/60 text-sm">{step.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resource Cards */}
        {plan.plan_data.resource_cards.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {plan.plan_data.resource_cards.map((resource, index) => (
                <a
                  key={index}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="text-white font-medium mb-1">{resource.title}</div>
                  <div className="text-white/60 text-sm mb-2">{resource.description}</div>
                  <div className="text-[#FFCA40] text-xs">→ Open resource</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="bg-white/5 rounded-lg p-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-white/60">Status</div>
            <div className="text-white font-medium">{plan.status}</div>
          </div>
          <div>
            <div className="text-white/60">Created</div>
            <div className="text-white font-medium">{new Date(plan.created_at).toLocaleDateString()}</div>
          </div>
          <div>
            <div className="text-white/60">Last Viewed</div>
            <div className="text-white font-medium">
              {plan.last_viewed_at ? new Date(plan.last_viewed_at).toLocaleDateString() : 'Never'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
