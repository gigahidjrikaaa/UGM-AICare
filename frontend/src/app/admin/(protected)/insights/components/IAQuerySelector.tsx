/**
 * IAQuerySelector Component
 * 
 * Query selection form with 6 allow-listed queries and filters
 */

'use client';

import { useState } from 'react';
import { IAGraphRequest } from '@/services/langGraphApi';

const ALLOW_LISTED_QUERIES = [
  {
    value: 'high_risk_trends',
    label: '1. High-Risk Trend Analysis',
    description: 'Trend analysis of high-risk users over time',
  },
  {
    value: 'support_plan_effectiveness',
    label: '2. Support Plan Effectiveness',
    description: 'Intervention plan success rates and outcomes',
  },
  {
    value: 'case_distribution',
    label: '3. Case Distribution by Severity',
    description: 'Distribution of cases across severity levels',
  },
  {
    value: 'resolution_times',
    label: '4. Average Resolution Times',
    description: 'Average time to resolve cases by severity',
  },
  {
    value: 'peak_usage_patterns',
    label: '5. Peak Usage Patterns',
    description: 'Peak usage hours and days analysis',
  },
  {
    value: 'counselor_workload',
    label: '6. Counselor Workload Balance',
    description: 'Case load distribution across counselors',
  },
];

interface IAQuerySelectorProps {
  onExecute: (request: IAGraphRequest) => void;
  loading: boolean;
}

export function IAQuerySelector({ onExecute, loading }: IAQuerySelectorProps) {
  const [selectedQuery, setSelectedQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [severity, setSeverity] = useState('');

  const handleExecute = () => {
    if (!selectedQuery) {
      return;
    }

    const request: IAGraphRequest = {
      query_name: selectedQuery,
      filters: {
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
        ...(severity && { severity }),
      },
      requester_role: 'admin',
    };

    onExecute(request);
  };

  const selectedQueryInfo = ALLOW_LISTED_QUERIES.find((q) => q.value === selectedQuery);

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
      <div className="p-5 border-b border-white/10">
        <h2 className="text-lg font-semibold text-white">Run Allow-Listed Query</h2>
        <p className="text-xs text-white/60 mt-1">Execute privacy-preserving analytics queries</p>
      </div>
      
      <div className="p-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="query-select" className="block text-xs font-medium text-white/70 mb-2">
              Select Query
            </label>
            <select
              id="query-select"
              value={selectedQuery}
              onChange={(e) => setSelectedQuery(e.target.value)}
              className="block w-full rounded-lg bg-white/10 border border-white/20 text-white text-sm py-2.5 px-3 focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40] disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              <option value="" className="bg-[#001d58]">-- Select a query --</option>
              {ALLOW_LISTED_QUERIES.map((query) => (
                <option key={query.value} value={query.value} className="bg-[#001d58]">
                  {query.label}
                </option>
              ))}
            </select>
            {selectedQueryInfo && (
              <p className="mt-2 text-xs text-white/60">
                {selectedQueryInfo.description}
              </p>
            )}
            <p className="mt-2 text-xs text-emerald-400/80">
              ✓ All queries enforce k-anonymity (k≥5) and differential privacy
            </p>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-white/70 mb-2">
              Date Range (Optional)
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="start-date" className="sr-only">Start date</label>
                <input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="block w-full rounded-lg bg-white/10 border border-white/20 text-white text-sm py-2 px-3 focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40] disabled:opacity-50"
                  placeholder="Start date"
                  disabled={loading}
                />
              </div>
              <div>
                <label htmlFor="end-date" className="sr-only">End date</label>
                <input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="block w-full rounded-lg bg-white/10 border border-white/20 text-white text-sm py-2 px-3 focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40] disabled:opacity-50"
                  placeholder="End date"
                  disabled={loading}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label htmlFor="severity-filter" className="block text-xs font-medium text-white/70 mb-2">
              Severity Filter (Optional)
            </label>
            <select
              id="severity-filter"
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="block w-full rounded-lg bg-white/10 border border-white/20 text-white text-sm py-2.5 px-3 focus:border-[#FFCA40] focus:ring-1 focus:ring-[#FFCA40] disabled:opacity-50"
              disabled={loading}
            >
              <option value="" className="bg-[#001d58]">All Severities</option>
              <option value="low" className="bg-[#001d58]">Low</option>
              <option value="moderate" className="bg-[#001d58]">Moderate</option>
              <option value="high" className="bg-[#001d58]">High</option>
              <option value="critical" className="bg-[#001d58]">Critical</option>
            </select>
          </div>
        </div>
        
        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleExecute}
            disabled={!selectedQuery || loading}
            className="px-5 py-2.5 bg-[#FFCA40] text-white text-sm rounded-lg hover:bg-[#FFD55C] font-medium disabled:bg-white/10 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Executing via IA...
              </span>
            ) : (
              'Execute Query via IA'
            )}
          </button>
          
          {selectedQuery && (
            <button
              onClick={() => {
                setSelectedQuery('');
                setStartDate('');
                setEndDate('');
                setSeverity('');
              }}
              disabled={loading}
              className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-sm font-medium text-white/80 hover:bg-white/10 disabled:opacity-50 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
