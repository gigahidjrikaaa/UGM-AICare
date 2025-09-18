"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  TriageAssessmentItem,
  TriageAssessmentListResponse,
  TriageOverview,
  TriageTestResponse,
} from "@/types/admin/triage";
import { apiCall } from "@/utils/adminApi";
import { TriageOverviewCards } from "@/components/admin/triage/TriageOverviewCards";
import { TriageHighRiskList } from "@/components/admin/triage/TriageHighRiskList";
import { TriageAssessmentsTable } from "@/components/admin/triage/TriageAssessmentsTable";
import { TriageTestPanel } from "@/components/admin/triage/TriageTestPanel";

const PAGE_SIZE = 25;

export default function TriagePanelPage() {
  const [overview, setOverview] = useState<TriageOverview | undefined>();
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [assessments, setAssessments] = useState<TriageAssessmentItem[]>([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(true);
  const [totalAssessments, setTotalAssessments] = useState(0);
  const [offset, setOffset] = useState(0);
  const [severityFilter, setSeverityFilter] = useState<string | null>(null);

  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<TriageTestResponse | null>(null);

  const loadOverview = useCallback(async () => {
    try {
      setOverviewLoading(true);
      const data = await apiCall<TriageOverview>("/api/v1/admin/triage/overview");
      setOverview(data);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to fetch triage overview");
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
          params.append("severity", severityFilter);
        }
        const data = await apiCall<TriageAssessmentListResponse>(`/api/v1/admin/triage/assessments?${params.toString()}`);
        setTotalAssessments(data.total);
        if (replace) {
          setAssessments(data.items);
        } else {
          setAssessments((prev) => [...prev, ...data.items]);
        }
        setOffset(startOffset + data.items.length);
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Failed to load triage assessments");
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
    options.add("all");
    (overview?.severity_breakdown ?? []).forEach((entry) => options.add(entry.severity));
    return Array.from(options);
  }, [overview?.severity_breakdown]);

  const canLoadMore = assessments.length < totalAssessments;

  const handleTestSubmit = useCallback(
    async (message: string) => {
      try {
        setTestLoading(true);
        const response = await apiCall<TriageTestResponse>("/api/v1/admin/triage/classify", {
          method: "POST",
          body: JSON.stringify({ message }),
        });
        setTestResult(response);
        toast.success("Triage classification completed");
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "Triage classification failed");
      } finally {
        setTestLoading(false);
      }
    },
    [],
  );

  return (
    <div className="space-y-6">
      <TriageOverviewCards overview={overview} loading={overviewLoading} onRefresh={handleRefreshAll} />

      <TriageHighRiskList items={overview?.recent_high_risk ?? []} />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs uppercase tracking-wide text-white/60">Filter severity</p>
          {severityOptions.map((option) => {
            const value = option === "all" ? null : option;
            const active = value === severityFilter || (option === "all" && severityFilter === null);
            return (
              <button
                key={option}
                onClick={() => handleSeverityChange(value)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? "bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/40"
                    : "bg-white/5 text-white/70 border border-white/15 hover:border-white/30"
                }`}
                type="button"
              >
                {option === "all" ? "All" : option}
              </button>
            );
          })}
        </div>
      </section>

      <TriageAssessmentsTable
        items={assessments}
        loading={assessmentsLoading}
        onLoadMore={canLoadMore ? handleLoadMore : undefined}
        canLoadMore={canLoadMore}
      />

      <TriageTestPanel loading={testLoading} result={testResult} onSubmit={handleTestSubmit} />
    </div>
  );
}
