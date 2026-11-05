/**
 * CaseDetailModal Component
 * Shows full case details with notes, assignments, triage, and conversation preview
 */

'use client';

import { useEffect, useState } from 'react';
import { getCaseDetail, getCaseConversation } from '@/services/adminCaseApi';
import type { CaseDetailResponse, ConversationMessageSummary } from '@/types/admin/cases';
import { formatDistanceToNow, format } from 'date-fns';
import { StatusChip } from '@/components/ui/admin/kit';
import { AdminButton } from '@/components/ui/admin/kit';
import InterventionPlanModal from './InterventionPlanModal';
import type { TCAGraphResponse } from '@/services/langGraphApi';

interface CaseDetailModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: (caseId: string) => void;
  onAssign?: (caseId: string) => void;
}

const severityTone = (severity: string) =>
  severity === 'critical' ? 'red' : severity === 'high' ? 'orange' : severity === 'med' ? 'amber' : 'blue';

export default function CaseDetailModal({
  caseId,
  isOpen,
  onClose,
  onStatusUpdate,
  onAssign,
}: CaseDetailModalProps) {
  const [caseDetail, setCaseDetail] = useState<CaseDetailResponse | null>(null);
  const [fullConversation, setFullConversation] = useState<ConversationMessageSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFullConversation, setShowFullConversation] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'notes' | 'assignments' | 'triage' | 'conversation'>('overview');
  const [interventionPlanResult, setInterventionPlanResult] = useState<TCAGraphResponse | null>(null);
  const [showInterventionPlan, setShowInterventionPlan] = useState(false);

  useEffect(() => {
    if (!isOpen || !caseId) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getCaseDetail(caseId);
        setCaseDetail(data);
      } catch (err) {
        console.error('Failed to fetch case details:', err);
        setError(err instanceof Error ? err.message : 'Failed to load case details');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [caseId, isOpen]);

  const loadFullConversation = async () => {
    if (!caseDetail?.conversation_id) return;

    try {
      const data = await getCaseConversation(caseId, 200);
      setFullConversation(data.messages);
      setShowFullConversation(true);
    } catch (err) {
      console.error('Failed to fetch full conversation:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-[#001A4D] border border-white/15 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-white">Case Details</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
            aria-label="Close case details"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-white/20 border-t-[#FFCA40]" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </div>
          ) : caseDetail ? (
            <div className="space-y-6">
              {/* Case Overview */}
              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Case ID</p>
                    <p className="font-mono text-white/90">{caseDetail.id}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">User Hash</p>
                    <p className="font-mono text-white/90">{caseDetail.user_hash}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Status</p>
                    <StatusChip status={caseDetail.status} className="mt-0.5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Severity</p>
                    <StatusChip
                      tone={severityTone(caseDetail.severity) as 'red'}
                      label={caseDetail.severity}
                      className="mt-0.5"
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Assigned To</p>
                    <p className="text-white/90">
                      {caseDetail.assigned_to || <span className="italic text-white/40">Unassigned</span>}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">SLA Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                        caseDetail.sla_status === 'breached' ? 'bg-red-500' :
                        caseDetail.sla_status === 'critical' ? 'bg-red-400 animate-pulse' :
                        caseDetail.sla_status === 'warning' ? 'bg-amber-400' :
                        'bg-emerald-400'
                      }`} />
                      <span className="text-white/90">
                        {caseDetail.sla_status}
                        {caseDetail.minutes_until_breach !== null && ` (${caseDetail.minutes_until_breach}m)`}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Created</p>
                    <p className="text-white/90">
                      {formatDistanceToNow(new Date(caseDetail.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-white/50">Last Updated</p>
                    <p className="text-white/90">
                      {formatDistanceToNow(new Date(caseDetail.updated_at), { addSuffix: true })}
                    </p>
                  </div>
                  {caseDetail.summary_redacted && (
                    <div className="md:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Summary</p>
                      <p className="text-white/90">{caseDetail.summary_redacted}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 flex-wrap">
                <AdminButton variant="primary" onClick={() => onStatusUpdate?.(caseId)}>
                  Update Status
                </AdminButton>
                <AdminButton variant="secondary" onClick={() => onAssign?.(caseId)}>
                  Assign / Reassign
                </AdminButton>
                <AdminButton
                  variant="accent"
                  onClick={async () => {
                    if (!caseDetail) return;

                    try {
                      // Dynamic import to avoid circular dependencies
                      const { langGraphApi } = await import('@/services/langGraphApi');
                      const toast = (await import('react-hot-toast')).default;

                      // Prepare TCA request from case data
                      // Note: user_id not available in CaseDetailResponse, using placeholder
                      const tcaRequest = {
                        user_id: parseInt(caseDetail.user_hash.substring(0, 8), 16) % 10000, // Derive numeric ID from hash
                        session_id: caseDetail.session_id || caseDetail.conversation_id || `case_${caseDetail.id}`,
                        user_hash: caseDetail.user_hash,
                        severity: caseDetail.severity === 'med' ? 'moderate' : caseDetail.severity as 'critical' | 'high' | 'moderate' | 'low',
                        message: caseDetail.summary_redacted || 'Generate intervention plan for this case',
                        intent: 'intervention_plan_generation',
                        risk_level: caseDetail.severity === 'critical' ? 3 : caseDetail.severity === 'high' ? 2 : caseDetail.severity === 'med' ? 1 : 0,
                      };

                      toast.loading('Generating intervention plan with TCA...', { id: 'tca-gen' });
                      const result = await langGraphApi.executeTCA(tcaRequest);

                      if (result.success && result.intervention_plan) {
                        toast.success(
                          `✅ Intervention Plan Generated!`,
                          { id: 'tca-gen', duration: 2000 }
                        );

                        // Store result and show modal
                        setInterventionPlanResult(result);
                        setShowInterventionPlan(true);
                      } else {
                        toast.error(
                          result.errors?.join(', ') || 'Failed to generate intervention plan',
                          { id: 'tca-gen' }
                        );
                      }
                    } catch (err) {
                      const toast = (await import('react-hot-toast')).default;
                      toast.error(
                        `Error: ${err instanceof Error ? err.message : 'Unknown error'}`,
                        { id: 'tca-gen' }
                      );
                    }
                  }}
                >
                  Generate Intervention Plan (TCA)
                </AdminButton>
              </div>

              {/* Tabs */}
              <div className="border-b border-white/10">
                <nav className="flex gap-1">
                  {['overview', 'notes', 'assignments', 'triage', 'conversation'].map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab as typeof activeTab)}
                      className={`px-4 py-2 border-b-2 text-sm font-medium transition-colors ${
                        activeTab === tab
                          ? 'border-[#FFCA40] text-[#FFCA40]'
                          : 'border-transparent text-white/50 hover:text-white'
                      }`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {tab === 'notes' && ` (${caseDetail.notes.length})`}
                      {tab === 'assignments' && ` (${caseDetail.assignments.length})`}
                      {tab === 'triage' && ` (${caseDetail.triage_assessments.length})`}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {activeTab === 'notes' && (
                  <div className="space-y-3">
                    {caseDetail.notes.length === 0 ? (
                      <p className="italic text-white/40">No notes yet</p>
                    ) : (
                      caseDetail.notes.map((note) => (
                        <div key={note.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <p className="text-white/90">{note.note}</p>
                          <p className="mt-2 text-xs text-white/50">
                            {format(new Date(note.created_at), 'MMM dd, yyyy HH:mm')}
                            {note.author_id && ` • Author ID: ${note.author_id}`}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'assignments' && (
                  <div className="space-y-3">
                    {caseDetail.assignments.length === 0 ? (
                      <p className="italic text-white/40">No assignment history</p>
                    ) : (
                      caseDetail.assignments.map((assignment) => (
                        <div key={assignment.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <p className="font-medium text-white/90">
                            Assigned to: {assignment.assigned_to ?? 'Unassigned'}
                            {assignment.assignee_role && (
                              <span className="ml-2 text-sm text-white/50">
                                ({assignment.assignee_role})
                              </span>
                            )}
                          </p>
                          {assignment.previous_assignee && (
                            <p className="text-sm text-white/50">
                              Previous: {assignment.previous_assignee}
                            </p>
                          )}
                          {assignment.reassignment_reason && (
                            <p className="mt-1 text-sm text-white/70">
                              Reason: {assignment.reassignment_reason}
                            </p>
                          )}
                          <p className="mt-2 text-xs text-white/50">
                            {format(new Date(assignment.assigned_at), 'MMM dd, yyyy HH:mm')}
                            {assignment.assigned_by && ` • By: ${assignment.assigned_by}`}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'triage' && (
                  <div className="space-y-3">
                    {caseDetail.triage_assessments.length === 0 ? (
                      <p className="italic text-white/40">No triage assessments</p>
                    ) : (
                      caseDetail.triage_assessments.map((triage) => (
                        <div key={triage.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-xs uppercase tracking-wide text-white/50">Risk Score</p>
                              <p className="text-lg font-semibold text-white">
                                {(triage.risk_score * 100).toFixed(1)}%
                              </p>
                            </div>
                            <div>
                              <p className="text-xs uppercase tracking-wide text-white/50">Severity</p>
                              <StatusChip
                                tone={severityTone(triage.severity_level) as 'red'}
                                label={triage.severity_level}
                                className="mt-0.5"
                              />
                            </div>
                            {triage.confidence_score !== null && (
                              <div>
                                <p className="text-xs uppercase tracking-wide text-white/50">Confidence</p>
                                <p className="text-white/90">
                                  {(triage.confidence_score * 100).toFixed(1)}%
                                </p>
                              </div>
                            )}
                          </div>
                          {triage.risk_factors && triage.risk_factors.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs uppercase tracking-wide text-white/50 mb-1">Risk Factors</p>
                              <div className="flex flex-wrap gap-2">
                                {triage.risk_factors.map((factor, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded-full border border-red-500/20 bg-red-500/10 px-2 py-1 text-xs text-red-400"
                                  >
                                    {factor}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          <p className="mt-2 text-xs text-white/50">
                            {format(new Date(triage.created_at), 'MMM dd, yyyy HH:mm')}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'conversation' && (
                  <div className="space-y-3">
                    {!caseDetail.conversation_preview || caseDetail.conversation_preview.length === 0 ? (
                      <p className="italic text-white/40">No conversation linked</p>
                    ) : (
                      <>
                        {(showFullConversation ? fullConversation : caseDetail.conversation_preview)?.map((msg) => (
                          <div
                            key={msg.id}
                            className={`rounded-xl border p-4 ${
                              msg.role === 'user'
                                ? 'border-blue-500/20 bg-blue-500/5'
                                : 'border-white/10 bg-white/5'
                            }`}
                          >
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-white/50">
                              {msg.role === 'user' ? 'User' : 'Assistant'}
                            </p>
                            <p className="text-white/90">{msg.content}</p>
                            <p className="mt-2 text-xs text-white/40">
                              {format(new Date(msg.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                            </p>
                          </div>
                        ))}
                        {!showFullConversation && caseDetail.conversation_id && (
                          <AdminButton variant="secondary" onClick={loadFullConversation} className="w-full">
                            Load Full Conversation
                          </AdminButton>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <AdminButton variant="secondary" onClick={onClose}>
            Close
          </AdminButton>
        </div>
      </div>

      {/* Intervention Plan Modal */}
      <InterventionPlanModal
        isOpen={showInterventionPlan}
        onClose={() => setShowInterventionPlan(false)}
        plan={interventionPlanResult ? {
          intervention_type: interventionPlanResult.intervention_type,
          steps: interventionPlanResult.intervention_plan.plan_steps.map((step, idx) => ({
            step: step.title,
            description: step.description,
            order: idx + 1,
          })),
          resources: interventionPlanResult.intervention_plan.resource_cards.map(card => card.title),
          estimated_duration: interventionPlanResult.intervention_plan.next_check_in?.timeframe,
          follow_up_recommended: true,
        } : null}
        planId={interventionPlanResult?.intervention_plan_id?.toString()}
        executionTime={interventionPlanResult?.execution_time_ms}
      />
    </div>
  );
}
