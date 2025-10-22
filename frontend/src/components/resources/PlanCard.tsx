/**
 * Component to display an individual intervention plan
 * Enhanced with UGM design system colors and improved UX
 */

'use client';

import React, { useState } from 'react';
import { CheckCircle2, Circle, Archive, ChevronDown, ChevronUp, Calendar, Sparkles, BookOpen, Clock } from 'lucide-react';
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
    if (!confirm('Apakah kamu yakin ingin mengarsipkan rencana ini?')) return;
    
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

  // map completionPercentage to nearest 10% class to avoid inline styles
  const roundedProgress = Math.max(0, Math.min(100, Math.round(completionPercentage / 10) * 10));
  const progressClass = styles[`progress${roundedProgress}`] || styles.progress0;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-lg border-2 border-ugm-blue/20 p-6 hover:shadow-xl hover:border-ugm-blue/40 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex-1 flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-ugm-blue to-ugm-blue-light flex items-center justify-center shadow-md flex-shrink-0">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-ugm-blue-dark mb-2">
              {plan.plan_title || 'Rencana Intervensi'}
            </h3>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {formatDate(plan.created_at)}
              </span>
              <span className="px-2.5 py-1 bg-gradient-to-r from-ugm-gold/20 to-ugm-gold-light/20 text-ugm-blue-dark rounded-full text-xs font-bold border border-ugm-gold/30">
                {plan.status}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={handleArchive}
          disabled={isArchiving}
          className="text-gray-400 hover:text-red-500 transition-colors p-2.5 rounded-xl hover:bg-red-50 disabled:opacity-50 group"
          title="Arsipkan rencana"
        >
          <Archive className="w-5 h-5 group-hover:scale-110 transition-transform" />
        </button>
      </div>

      {/* Enhanced Progress Bar */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-ugm-blue-dark">
            Progress: {completedSteps}/{totalSteps} langkah
          </span>
          <span className="text-base font-bold text-ugm-gold">
            {completionPercentage}%
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
          <div
            className={`bg-gradient-to-r from-ugm-gold via-ugm-gold-light to-ugm-gold h-3 rounded-full ${styles.progressBar} ${progressClass} relative overflow-hidden`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
          </div>
        </div>
      </div>

      {/* Expandable Steps */}
      <div className="border-t-2 border-ugm-blue/10 pt-5">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-left mb-4 hover:bg-ugm-blue/5 -mx-2 px-2 py-2 rounded-xl transition-colors group"
        >
          <span className="text-sm font-bold text-ugm-blue flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-ugm-blue/10 flex items-center justify-center group-hover:bg-ugm-blue/20 transition-colors">
              <Sparkles className="w-4 h-4 text-ugm-blue" />
            </div>
            {isExpanded ? 'Sembunyikan' : 'Tampilkan'} Langkah-Langkah
          </span>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-ugm-blue" /> : <ChevronDown className="w-5 h-5 text-ugm-blue" />}
        </button>

        {isExpanded && (
          <div className="space-y-3">
            {plan.plan_data?.plan_steps?.map((step, index) => {
              const isCompleted = plan.completion_tracking?.completed_steps?.includes(index) || false;
              
              return (
                <div
                  key={index}
                  className={`flex items-start gap-4 p-4 rounded-xl transition-all group ${
                    isCompleted 
                      ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300/60 shadow-sm' 
                      : 'bg-white border-2 border-gray-200 hover:border-ugm-blue/50 hover:shadow-md'
                  }`}
                >
                  <button
                    onClick={() => handleStepToggle(index, isCompleted)}
                    disabled={isCompletingStep}
                    className="flex-shrink-0 mt-0.5 disabled:opacity-50 transition-transform group-hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ugm-gold rounded-full"
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-7 h-7 text-green-600 drop-shadow-sm" />
                    ) : (
                      <Circle className="w-7 h-7 text-gray-400 group-hover:text-ugm-blue transition-colors" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold leading-relaxed ${
                        isCompleted ? 'text-gray-500 line-through' : 'text-ugm-blue-dark'
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
              <div className="mt-5 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200/60 shadow-sm">
                <h4 className="text-sm font-bold text-ugm-blue-dark mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Check-in Berikutnya
                </h4>
                <p className="text-sm text-ugm-blue mb-1 font-semibold">
                  {plan.plan_data.next_check_in.timeframe}
                </p>
                <p className="text-xs text-gray-700">
                  {plan.plan_data.next_check_in.method}
                </p>
              </div>
            )}

            {/* Resources */}
            {plan.plan_data?.resource_cards && plan.plan_data.resource_cards.length > 0 && (
              <div className="mt-5">
                <h4 className="text-sm font-bold text-ugm-blue-dark mb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-ugm-blue/10 flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-ugm-gold" />
                  </div>
                  Sumber yang Direkomendasikan
                </h4>
                <div className="space-y-3">
                  {plan.plan_data.resource_cards.map((resource, idx) => (
                    <div key={idx} className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200/60 shadow-sm hover:shadow-md transition-shadow">
                      <p className="text-sm font-bold text-purple-900 mb-2">
                        {resource.title}
                      </p>
                      <p className="text-xs text-purple-700 leading-relaxed">
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
