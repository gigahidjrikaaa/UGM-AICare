import { useState, useMemo } from 'react';
import { ClockIcon, ExclamationTriangleIcon, UserIcon, MagnifyingGlassIcon, FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';

interface CaseRecord {
  case_id: string;
  severity: string;
  status: string;
  sla_breach_at: string;
  assigned_to?: number;
  created_at: string;
}

interface PriorityQueueProps {
  cases: CaseRecord[];
}

export function PriorityQueue({ cases }: PriorityQueueProps) {
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [assignedFilter, setAssignedFilter] = useState<string>('all');

  // Apply filters and search
  const filteredCases = useMemo(() => {
    let filtered = cases;

    // Search filter (case ID)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c => 
        c.case_id.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(c => c.status === statusFilter);
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(c => c.severity === severityFilter);
    }

    // Assigned filter
    if (assignedFilter === 'assigned') {
      filtered = filtered.filter(c => c.assigned_to !== undefined && c.assigned_to !== null);
    } else if (assignedFilter === 'unassigned') {
      filtered = filtered.filter(c => !c.assigned_to);
    }

    return filtered;
  }, [cases, searchQuery, statusFilter, severityFilter, assignedFilter]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setSeverityFilter('all');
    setAssignedFilter('all');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || severityFilter !== 'all' || assignedFilter !== 'all';

  if (cases.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-white/20"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          />
        </svg>
        <p className="mt-4 text-sm text-white/60">No cases in queue</p>
        <p className="text-xs text-white/40 mt-1">
          Create a case using the form above to see it here
        </p>
      </div>
    );
  }

  // Sort by SLA urgency
  const sortedCases = [...filteredCases].sort((a, b) => {
    if (!a.sla_breach_at || !b.sla_breach_at) return 0;
    return new Date(a.sla_breach_at).getTime() - new Date(b.sla_breach_at).getTime();
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 border-red-500/30 text-red-300';
      case 'high':
        return 'bg-orange-500/20 border-orange-500/30 text-orange-300';
      case 'moderate':
        return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300';
      case 'low':
        return 'bg-green-500/20 border-green-500/30 text-green-300';
      default:
        return 'bg-gray-500/20 border-gray-500/30 text-gray-300';
    }
  };

  const getTimeUntilBreach = (slaBreachAt: string) => {
    const hoursUntil = (new Date(slaBreachAt).getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 0) return { text: 'BREACHED', color: 'text-red-400', urgent: true };
    if (hoursUntil < 1) return { text: `${Math.floor(hoursUntil * 60)}m`, color: 'text-red-400', urgent: true };
    if (hoursUntil < 2) return { text: `${hoursUntil.toFixed(1)}h`, color: 'text-orange-400', urgent: true };
    return { text: `${hoursUntil.toFixed(1)}h`, color: 'text-white/60', urgent: false };
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-white/60" />
            <span className="text-sm font-medium text-white/80">Filters</span>
            {hasActiveFilters && (
              <span className="px-2 py-0.5 bg-[#FFCA40]/20 border border-[#FFCA40]/30 text-[#FFCA40] text-xs font-semibold rounded-full">
                Active
              </span>
            )}
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white/60 hover:text-white/90 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all duration-200"
            >
              <XMarkIcon className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search by Case ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 transition-all"
          >
            <option value="all" className="bg-[#001a47]">All Statuses</option>
            <option value="new" className="bg-[#001a47]">New</option>
            <option value="in_progress" className="bg-[#001a47]">In Progress</option>
            <option value="resolved" className="bg-[#001a47]">Resolved</option>
            <option value="closed" className="bg-[#001a47]">Closed</option>
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter by severity"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 transition-all"
          >
            <option value="all" className="bg-[#001a47]">All Severities</option>
            <option value="critical" className="bg-[#001a47]">Critical</option>
            <option value="high" className="bg-[#001a47]">High</option>
            <option value="moderate" className="bg-[#001a47]">Moderate</option>
            <option value="low" className="bg-[#001a47]">Low</option>
          </select>

          {/* Assigned Filter */}
          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            aria-label="Filter by assignment status"
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-[#FFCA40]/50 focus:border-[#FFCA40]/50 transition-all"
          >
            <option value="all" className="bg-[#001a47]">All Cases</option>
            <option value="assigned" className="bg-[#001a47]">Assigned</option>
            <option value="unassigned" className="bg-[#001a47]">Unassigned</option>
          </select>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between text-xs text-white/50 pt-2 border-t border-white/10">
          <span>
            Showing <span className="text-white/80 font-semibold">{sortedCases.length}</span> of <span className="text-white/80 font-semibold">{cases.length}</span> cases
          </span>
          {hasActiveFilters && sortedCases.length === 0 && (
            <span className="text-orange-400">No cases match the current filters</span>
          )}
        </div>
      </div>

      {/* Cases List */}
      {sortedCases.length === 0 ? (
        <div className="text-center py-12 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
          <svg
            className="mx-auto h-12 w-12 text-white/20"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="mt-4 text-sm text-white/60">
            {hasActiveFilters ? 'No cases match your filters' : 'No cases in queue'}
          </p>
          <p className="text-xs text-white/40 mt-1">
            {hasActiveFilters ? 'Try adjusting your filters' : 'Create a case using the form above to see it here'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedCases.map((caseItem, index) => {
        const slaInfo = caseItem.sla_breach_at ? getTimeUntilBreach(caseItem.sla_breach_at) : null;

        return (
          <div
            key={caseItem.case_id || index}
            className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all duration-200 ${
              slaInfo?.urgent ? 'ring-2 ring-red-500/30' : ''
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  {/* Case ID */}
                  <span className="text-sm font-mono text-white/80">
                    #{caseItem.case_id}
                  </span>

                  {/* Severity Badge */}
                  <span
                    className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-md border ${getSeverityColor(
                      caseItem.severity
                    )}`}
                  >
                    <ExclamationTriangleIcon className="w-3 h-3 mr-1" />
                    {caseItem.severity?.toUpperCase()}
                  </span>

                  {/* Status Badge */}
                  <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-md bg-blue-500/20 border border-blue-500/30 text-blue-300">
                    {caseItem.status?.replace('_', ' ').toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-white/50">
                  {/* Created Time */}
                  <div className="flex items-center gap-1">
                    <ClockIcon className="w-4 h-4" />
                    <span>
                      Created {formatDistanceToNow(new Date(caseItem.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Assigned To */}
                  {caseItem.assigned_to && (
                    <div className="flex items-center gap-1">
                      <UserIcon className="w-4 h-4" />
                      <span>Assigned to Counselor #{caseItem.assigned_to}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SLA Time */}
              {slaInfo && (
                <div
                  className={`flex flex-col items-end ${
                    slaInfo.urgent ? 'animate-pulse' : ''
                  }`}
                >
                  <span className="text-xs text-white/50">SLA Time</span>
                  <span className={`text-2xl font-bold ${slaInfo.color}`}>
                    {slaInfo.text}
                  </span>
                  {slaInfo.urgent && (
                    <span className="text-xs text-red-400 font-semibold mt-1">
                      URGENT
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
        </div>
      )}
    </div>
  );
}
