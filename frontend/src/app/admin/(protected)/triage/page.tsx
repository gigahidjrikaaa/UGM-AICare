'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import {
  TriageAssessmentItem,
  TriageAssessmentListResponse,
  TriageCasePreview,
  TriageOverview,
  TriageTestResponse,
} from '@/types/admin/triage';
import { apiCall } from '@/utils/adminApi';
import { TriageOverviewCards } from '@/components/admin/triage/TriageOverviewCards';
import { TriageHighRiskList } from '@/components/admin/triage/TriageHighRiskList';
import { TriageAssessmentsTable } from '@/components/admin/triage/TriageAssessmentsTable';
import { TriageTestPanel } from '@/components/admin/triage/TriageTestPanel';
import { TriageActionGuides } from '@/components/admin/triage/TriageActionGuides';

const PAGE_SIZE = 25;

export default function TriagePanelPage() {
  const router = useRouter();

  const [overview, setOverview] = useState<TriageOverview | undefined>();
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [assessments, setAssessments] = useState<TriageAssessmentItem[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(true);
  const [totalAssessments, setTotalAssessments] = useState(0);
  const [offset, setOffset] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TriageTestResponse | null>(null);

  const assessmentsRef = useRef<HTMLDivElement | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
  const data = await apiCall<TriageOverview>('/api/v1/admin/safety-triage/overview');
      setOverview(data);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : 'Failed to fetch triage overview');
    } finally {
      setOverviewLoading(false);
    }
  }, []);

  const loadAssessments = useCallback(
    async (startOffset: number, replace: boolean) => {
      try {
        setAssessmentsLoading(true);
        const params = new URLSearchParams({
          limit: PAGE_SIZE.toString(),
          offset: startOffset.toString(),
        });
        if (severityFilter) {
          params.append('severity', severityFilter);
        }
  const data = await apiCall<TriageAssessmentListResponse>(`/api/v1/admin/safety-triage/assessments?${params.toString()}`);
        setTotalAssessments(data.total);
        if (replace) {
          setAssessments(data.items);
        } else {
          setAssessments((prev) => [...prev, ...data.items]);
        }
        setOffset(startOffset + data.items.length);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Failed to load triage assessments');
      } finally {
        setAssessmentsLoading(false);
      }
    },
    [severityFilter],
  );

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    void loadAssessments(0, true);
  }, [loadAssessments]);

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([loadOverview(), loadAssessments(0, true)]);
  }, [loadOverview, loadAssessments]);

  const handleLoadMore = useCallback(async () => {
    if (assessmentsLoading || assessments.length >= totalAssessments) {
      return;
    }
    await loadAssessments(offset, false);
  }, [assessmentsLoading, assessments.length, totalAssessments, loadAssessments, offset]);

  const handleSeverityChange = useCallback((value: string | null) => {
    setSeverityFilter(value);
    setOffset(0);
    setAssessments([]);
  }, []);

  const severityOptions = useMemo(() => {
    const options = new Set<string>();
    options.add('all');
    (overview?.severity_breakdown ?? []).forEach((entry) => options.add(entry.severity));
    return Array.from(options);
  }, [overview?.severity_breakdown]);

  const canLoadMore = assessments.length < totalAssessments;

  const handleTestSubmit = useCallback(
    async (message: string) => {
      try {
        setTestLoading(true);
  const response = await apiCall<TriageTestResponse>('/api/v1/admin/safety-triage/classify', {
          method: 'POST',
          body: JSON.stringify({ message }),
        });
        setTestResult(response);
        toast.success('Triage classification completed');
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : 'Triage classification failed');
      } finally {
        setTestLoading(false);
      }
    },
    [],
  );

  const handleScrollToAssessments = useCallback(() => {
    assessmentsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleFocusHighSeverity = useCallback(() => {
    handleSeverityChange('high');
    setTimeout(() => {
      handleScrollToAssessments();
    }, 150);
  }, [handleSeverityChange, handleScrollToAssessments]);

  const buildInterventionParams = useCallback(
    (payload: {
      user_id?: number | null;
      user_name?: string | null;
      email?: string | null;
      risk_score?: number | null;
      severity_level?: string | null;
      recommended_action?: string | null;
    }) => {
      const params = new URLSearchParams();
      if (payload.user_id) {
        params.set('prefillUserId', String(payload.user_id));
      }
      if (payload.user_name) {
        params.set('prefillUserName', payload.user_name);
      }
      if (payload.email) {
        params.set('prefillUserEmail', payload.email);
      }
      if (payload.risk_score != null) {
        params.set('prefillRisk', payload.risk_score.toString());
      }
      if (payload.severity_level) {
        params.set('prefillSeverity', payload.severity_level);
      }
      if (payload.recommended_action) {
        params.set('prefillAction', payload.recommended_action);
      }
      return params.toString();
    },
    [],
  );

  const openInterventionFor = useCallback(
    (payload: {
      user_id?: number | null;
      user_name?: string | null;
      email?: string | null;
      risk_score?: number | null;
      severity_level?: string | null;
      recommended_action?: string | null;
    }) => {
      const query = buildInterventionParams(payload);
  router.push(`/admin/safety-coaching${query ? `?${query}` : ''}`);
    },
    [buildInterventionParams, router],
  );

  const handleEscalatePreview = useCallback(
    (item: TriageCasePreview) => {
      openInterventionFor({
        user_id: item.user_id ?? undefined,
        user_name: item.user_name ?? undefined,
        email: item.email ?? undefined,
        risk_score: item.risk_score,
        severity_level: item.severity_level,
        recommended_action: item.recommended_action ?? undefined,
      });
    },
    [openInterventionFor],
  );

  const handleEscalateAssessment = useCallback(
    (item: TriageAssessmentItem) => {
      openInterventionFor({
        user_id: item.user_id ?? undefined,
        user_name: item.user_name ?? undefined,
        email: item.email ?? undefined,
        risk_score: item.risk_score,
        severity_level: item.severity_level,
        recommended_action: item.recommended_action ?? undefined,
      });
    },
    [openInterventionFor],
  );

  return (
    <div className="space-y-6">
      <TriageOverviewCards overview={overview} loading={overviewLoading} onRefresh={handleRefreshAll} />

      <TriageActionGuides
        overview={overview}
        onFocusHighSeverity={handleFocusHighSeverity}
        onScrollToAssessments={handleScrollToAssessments}
  interventionsHref="/admin/safety-coaching"
  analyticsHref="/admin/insights"
      />

      <TriageHighRiskList items={overview?.recent_high_risk ?? []} onEscalate={handleEscalatePreview} />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs uppercase tracking-wide text-white/60">Filter severity</p>
          {severityOptions.map((option) => {
            const value = option === 'all' ? null : option;
            const active = value === severityFilter || (option === 'all' && severityFilter === null);
            return (
              <button
                key={option}
                onClick={() => handleSeverityChange(value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40'
                    : 'bg-white/5 text-white/70 border border-white/15 hover:border-white/30'
                }`}
                type="button"
              >
                {option === 'all' ? 'All' : option}
              </button>
            );
          })}
        </div>
      </section>

      <div ref={assessmentsRef}>
        <TriageAssessmentsTable
          items={assessments}
          loading={assessmentsLoading}
          onLoadMore={canLoadMore ? handleLoadMore : undefined}
          canLoadMore={canLoadMore}
          onEscalate={handleEscalateAssessment}
        />
      </div>

      <TriageTestPanel loading={testLoading} result={testResult} onSubmit={handleTestSubmit} />
    </div>
  );
}
