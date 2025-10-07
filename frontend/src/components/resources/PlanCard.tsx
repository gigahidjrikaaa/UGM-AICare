/**
 * Component to display an individual intervention plan
 */

'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, Archive, ChevronDown, ChevronUp, Calendar } from 'lucide-react';
import { useCompleteStep, useArchivePlan } from '@/hooks/useInterventionPlans';
import type { InterventionPlanRecord } from '@/services/interventionPlanApi';
import styles from './PlanCard.module.css';

interface PlanCardProps {
  plan: InterventionPlanRecord;
  onUpdate?: () => void;
}

export const PlanCard: React.FC<PlanCardProps> = ({ plan, onUpdate }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { completeStep, isLoading: isCompletingStep } = useCompleteStep();
  const { archivePlan, isLoading: isArchiving } = useArchivePlan();

  const handleStepToggle = async (stepIndex: number, currentlyCompleted: boolean) => {
    try {
      await completeStep(plan.id, stepIndex, !currentlyCompleted, undefined, () => {
        if (onUpdate) onUpdate();
      });
    } catch (error) {
      console.error('Failed to toggle step:', error);
    }
  };

  const handleArchive = async () => {
    if (!confirm('Are you sure you want to archive this plan?')) return;
    
    try {
      await archivePlan(plan.id, () => {
        if (onUpdate) onUpdate();
      });
    } catch (error) {
      console.error('Failed to archive plan:', error);
    }
  };

  const completedSteps = plan.completion_tracking?.completed_steps?.length || 0;
  const totalSteps = plan.plan_data?.plan_steps?.length || 0;
  const completionPercentage = plan.completion_tracking?.completion_percentage || 0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {plan.plan_title || 'Intervention Plan'}
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar size={14} />
              {formatDate(plan.created_at)}
            </span>
            <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-xs font-medium">
              {plan.status}
            </span>
          </div>
        </div>
        <button
          onClick={handleArchive}
          disabled={isArchiving}
          className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          title="Archive plan"
        >
          <Archive size={20} />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">
            Progress: {completedSteps}/{totalSteps} steps
          </span>
          <span className="text-sm font-semibold text-teal-600">
            {completionPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2.5">
          <div
            className={`bg-teal-500 h-2.5 rounded-full ${styles.progressBar}`}
            style={{ '--progress-width': `${completionPercentage}%` } as React.CSSProperties}
          />
        </div>
      </div>

      {/* Expandable Steps */}
      <div className="border-t pt-4">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left mb-3 hover:text-teal-600 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700">
            {isExpanded ? 'Hide' : 'Show'} Steps
          </span>
          {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {isExpanded && (
          <div className="space-y-3">
            {plan.plan_data?.plan_steps?.map((step, index) => {
              const isCompleted = plan.completion_tracking?.completed_steps?.includes(index) || false;
              
              return (
                <div
                  key={index}
                  className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
                    isCompleted ? 'bg-teal-50' : 'bg-gray-50'
                  }`}
                >
                  <button
                    onClick={() => handleStepToggle(index, isCompleted)}
                    disabled={isCompletingStep}
                    className="flex-shrink-0 mt-0.5 disabled:opacity-50 transition-transform hover:scale-110"
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={20} className="text-teal-600" />
                    ) : (
                      <Circle size={20} className="text-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm ${
                        isCompleted ? 'text-gray-600 line-through' : 'text-gray-800'
                      }`}
                    >
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Next Check-in */}
            {plan.plan_data?.next_check_in && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-100">
                <h4 className="text-sm font-semibold text-blue-900 mb-2">
                  📅 Next Check-in
                </h4>
                <p className="text-sm text-blue-800 mb-1">
                  {plan.plan_data.next_check_in.timeframe}
                </p>
                <p className="text-xs text-blue-700">
                  {plan.plan_data.next_check_in.method}
                </p>
              </div>
            )}

            {/* Resources */}
            {plan.plan_data?.resource_cards && plan.plan_data.resource_cards.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-2">
                  📚 Recommended Resources
                </h4>
                <div className="space-y-2">
                  {plan.plan_data.resource_cards.map((resource, idx) => (
                    <div key={idx} className="p-3 bg-purple-50 rounded-lg border border-purple-100">
                      <p className="text-sm font-medium text-purple-900 mb-1">
                        {resource.title}
                      </p>
                      <p className="text-xs text-purple-700">
                        {resource.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
