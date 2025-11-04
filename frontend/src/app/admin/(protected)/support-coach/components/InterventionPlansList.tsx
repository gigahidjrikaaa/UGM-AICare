/**
 * Intervention Plans List Component
 * Table view of all intervention plans with filtering and sorting
 */

'use client';

import { useState } from 'react';
import { useSCAData } from '../hooks/useSCAData';
import { InterventionPlanDetailModal } from './InterventionPlanDetailModal';

export function InterventionPlansList() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<string | undefined>();
  const [riskLevel, setRiskLevel] = useState<number | undefined>();
  const [search, setSearch] = useState('');
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  const { data, loading, error } = useSCAData.useInterventionPlans({
    page,
    page_size: 20,
    status,
    risk_level: riskLevel,
    search,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const getRiskBadge = (risk: number | null) => {
    if (risk === null) return <span className="px-2 py-1 text-xs rounded bg-gray-500/20 text-gray-300">Unknown</span>;
    const badges = [
      <span key="low" className="px-2 py-1 text-xs rounded bg-green-500/20 text-green-300">Low</span>,
      <span key="med" className="px-2 py-1 text-xs rounded bg-yellow-500/20 text-yellow-300">Medium</span>,
      <span key="high" className="px-2 py-1 text-xs rounded bg-orange-500/20 text-orange-300">High</span>,
      <span key="crit" className="px-2 py-1 text-xs rounded bg-red-500/20 text-red-300">Critical</span>,
    ];
    return badges[risk] || badges[0];
  };

  if (loading && !data) {
    return <div className="text-center text-white py-8">Loading plans...</div>;
  }

  if (error) {
    return <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-300">{error}</div>;
  }

  return (
    <>
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50"
          />
          <select
            value={status || ''}
            onChange={(e) => setStatus(e.target.value || undefined)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            title="Filter by status"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
          <select
            value={riskLevel !== undefined ? riskLevel : ''}
            onChange={(e) => setRiskLevel(e.target.value ? Number(e.target.value) : undefined)}
            className="px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white"
            title="Filter by risk level"
          >
            <option value="">All Risk Levels</option>
            <option value="0">Low</option>
            <option value="1">Medium</option>
            <option value="2">High</option>
            <option value="3">Critical</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10">
              <tr className="text-white/60">
                <th className="pb-3 px-2">Plan Title</th>
                <th className="pb-3 px-2">User</th>
                <th className="pb-3 px-2">Risk</th>
                <th className="pb-3 px-2">Status</th>
                <th className="pb-3 px-2">Progress</th>
                <th className="pb-3 px-2">Created</th>
                <th className="pb-3 px-2">Last Viewed</th>
                <th className="pb-3 px-2">Actions</th>
              </tr>
            </thead>
            <tbody className="text-white">
              {data?.plans.map((plan) => (
                <tr key={plan.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="py-3 px-2 font-medium">{plan.plan_title}</td>
                  <td className="py-3 px-2 text-white/60 font-mono text-xs">{plan.user_hash}</td>
                  <td className="py-3 px-2">{getRiskBadge(plan.risk_level)}</td>
                  <td className="py-3 px-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      plan.is_active ? 'bg-green-500/20 text-green-300' : 'bg-gray-500/20 text-gray-300'
                    }`}>
                      {plan.status}
                    </span>
                  </td>
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-white/10 rounded-full h-2 max-w-[100px]">
                        <div
                          className="bg-[#FFCA40] h-2 rounded-full"
                          style={{ width: `${Math.min(100, plan.completion_percentage)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-white/60">{plan.completed_steps}/{plan.total_steps}</span>
                    </div>
                  </td>
                  <td className="py-3 px-2 text-white/60 text-xs">
                    {plan.days_since_created}d ago
                  </td>
                  <td className="py-3 px-2 text-white/60 text-xs">
                    {plan.last_viewed_at ? `${plan.days_since_last_viewed}d ago` : 'Never'}
                  </td>
                  <td className="py-3 px-2">
                    <button
                      onClick={() => setSelectedPlanId(plan.id)}
                      className="px-3 py-1 bg-[#FFCA40]/20 text-[#FFCA40] rounded hover:bg-[#FFCA40]/30 text-xs"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-6">
          <div className="text-white/60 text-sm">
            Showing {data?.plans.length || 0} of {data?.total || 0} plans
          </div>
          <div className="flex gap-2">
            <button
              disabled={!data?.has_prev}
              onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-white">Page {page}</span>
            <button
              disabled={!data?.has_next}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 bg-white/10 text-white rounded hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedPlanId && (
        <InterventionPlanDetailModal
          planId={selectedPlanId}
          onClose={() => setSelectedPlanId(null)}
        />
      )}
    </>
  );
}
