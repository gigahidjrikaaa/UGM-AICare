// src/components/features/chat/InterventionPlan.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { InterventionPlan as InterventionPlanType } from '@/types/chat';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

interface InterventionPlanProps {
  plan: InterventionPlanType;
}

export function InterventionPlan({ plan }: InterventionPlanProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const toggleStep = (stepId: string) => {
    setCompletedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const totalSteps = plan.plan_steps.length;
  const completedCount = completedSteps.size;
  const progressPercent = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="mt-4 bg-gradient-to-br from-ugm-blue/5 to-ugm-gold/5 border border-ugm-blue/20 rounded-xl overflow-hidden shadow-sm"
    >
      {/* Header */}
      <div
        className="p-4 bg-white/50 backdrop-blur-sm border-b border-ugm-blue/10 cursor-pointer hover:bg-white/70 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-gradient-to-br from-ugm-blue to-ugm-blue-dark rounded-lg shadow-sm">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-ugm-blue-dark flex items-center gap-2">
                Rencana Dukungan untuk Kamu
                <span className="text-[10px] font-normal text-ugm-blue/60 bg-ugm-gold/10 px-2 py-0.5 rounded-full">
                  {completedCount}/{totalSteps} selesai
                </span>
              </h4>
              <p className="text-xs text-gray-600 mt-0.5">
                Aku telah menyiapkan beberapa langkah yang bisa membantu. Yuk coba satu per satu!
              </p>
            </div>
          </div>
          <button
            className="p-1 hover:bg-ugm-blue/10 rounded-full transition-colors"
            aria-label={isExpanded ? 'Tutup rencana' : 'Buka rencana'}
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-ugm-blue" />
            ) : (
              <ChevronDown className="w-5 h-5 text-ugm-blue" />
            )}
          </button>
        </div>

        {/* Progress Bar */}
        {totalSteps > 0 && (
          <div className="mt-3">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-ugm-blue to-ugm-gold"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Plan Steps */}
            {plan.plan_steps.length > 0 && (
              <div className="p-4 space-y-3">
                {plan.plan_steps.map((step, index) => {
                  const isCompleted = completedSteps.has(step.id);
                  return (
                    <motion.div
                      key={step.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        'flex items-start gap-3 p-3 rounded-lg border-2 transition-all cursor-pointer',
                        isCompleted
                          ? 'bg-ugm-gold/10 border-ugm-gold/30'
                          : 'bg-white border-gray-200 hover:border-ugm-blue/30 hover:shadow-sm'
                      )}
                      onClick={() => toggleStep(step.id)}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {isCompleted ? (
                          <CheckCircle2 className="w-6 h-6 text-ugm-gold" />
                        ) : (
                          <div className="w-6 h-6 rounded-full border-2 border-gray-300 flex items-center justify-center text-xs font-semibold text-gray-400">
                            {index + 1}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            isCompleted
                              ? 'text-gray-500 line-through'
                              : 'text-ugm-blue-dark'
                          )}
                        >
                          {step.label}
                        </p>
                        {step.duration_min && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{step.duration_min} menit</span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Resource Cards */}
            {plan.resource_cards.length > 0 && (
              <div className="p-4 pt-0 space-y-2">
                <h5 className="text-xs font-semibold text-ugm-blue-dark mb-2 flex items-center gap-1">
                  <ExternalLink className="w-3 h-3" />
                  Sumber Bantuan Tambahan
                </h5>
                {plan.resource_cards.map((card, index) => (
                  <motion.a
                    key={card.resource_id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (plan.plan_steps.length + index) * 0.1 }}
                    href={card.url || '#'}
                    target={card.url ? '_blank' : undefined}
                    rel={card.url ? 'noopener noreferrer' : undefined}
                    className={cn(
                      'block p-3 rounded-lg border border-gray-200 transition-all',
                      card.url
                        ? 'hover:border-ugm-blue/50 hover:bg-white hover:shadow-sm cursor-pointer'
                        : 'cursor-default'
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ugm-blue-dark">
                          {card.title}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {card.summary}
                        </p>
                      </div>
                      {card.url && (
                        <ExternalLink className="w-4 h-4 text-ugm-blue flex-shrink-0 mt-0.5" />
                      )}
                    </div>
                  </motion.a>
                ))}
              </div>
            )}

            {/* Next Check-in */}
            {plan.next_check_in && (
              <div className="px-4 pb-4">
                <div className="p-3 bg-ugm-blue/5 border border-ugm-blue/10 rounded-lg">
                  <p className="text-xs text-ugm-blue-dark">
                    <span className="font-semibold">Check-in berikutnya:</span>{' '}
                    {new Date(plan.next_check_in).toLocaleString('id-ID', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Aku akan tanya kabar kamu lagi di waktu itu ya! 💙
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
