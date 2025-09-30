"use client";

import Link from 'next/link';
import { FiArrowRight, FiCheckCircle, FiPieChart } from '@/icons';
import { TriageOverview } from '@/types/admin/triage';

type Props = {
  overview?: TriageOverview;
  onFocusHighSeverity: () => void;
  onScrollToAssessments: () => void;
  interventionsHref: string;
  analyticsHref: string;
};

const ActionCard = ({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner">
    <h3 className="text-sm font-semibold text-white">{title}</h3>
    <p className="mt-1 text-xs text-white/60">{description}</p>
    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">{children}</div>
  </div>
);

export function TriageActionGuides({
  overview,
  onFocusHighSeverity,
  onScrollToAssessments,
  interventionsHref,
  analyticsHref,
}: Props) {
  const highSeverityCount = overview?.high_severity_count ?? 0;
  const totalAssessments = overview?.total_assessments ?? 0;
  const highSeverityShare = totalAssessments > 0 ? Math.round((highSeverityCount / totalAssessments) * 100) : null;
  const recentHighRisk = overview?.recent_high_risk?.length ?? 0;

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="mb-4 flex items-center gap-2">
        <FiCheckCircle className="h-5 w-5 text-emerald-300" />
        <div>
          <h2 className="text-lg font-semibold text-white">Suggested next steps</h2>
          <p className="text-xs text-white/60">Turn triage signals into follow-up actions.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ActionCard
          title="Prioritise high severity cases"
          description={`Focus on the ${highSeverityCount.toLocaleString()} recent high-severity assessments${highSeverityShare !== null ? ` (${highSeverityShare}% of this window)` : ''}.`}
        >
          <button
            type="button"
            onClick={onFocusHighSeverity}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-semibold text-white transition hover:border-white/40 hover:bg-white/15"
          >
            Filter high severity
            <FiArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onScrollToAssessments}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-white/70 transition hover:border-white/30 hover:text-white"
          >
            Jump to assessments
          </button>
        </ActionCard>

        <ActionCard
          title="Coordinate safety coaching"
          description="Move flagged students into a safety coaching sequence or manual follow-up."
        >
          <Link
            href={interventionsHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-semibold text-white transition hover:border-white/40 hover:bg-white/15"
          >
            Open safety coaching
            <FiArrowRight className="h-3.5 w-3.5" />
          </Link>
          {recentHighRisk > 0 && (
            <span className="text-xs text-white/50">{recentHighRisk} high-risk records need review</span>
          )}
        </ActionCard>

        <ActionCard
          title="Deep-dive insights"
          description="Spot cohort spikes, trend lines, and SLA performance in the insights workspace."
        >
          <Link
            href={analyticsHref}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 font-semibold text-white transition hover:border-white/40 hover:bg-white/15"
          >
            View insights
            <FiPieChart className="h-3.5 w-3.5" />
          </Link>
        </ActionCard>
      </div>
    </section>
  );
}
