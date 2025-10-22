/**
 * Insights Dashboard
 * 
 * Purpose: Privacy-preserving analytics through Insights Agent (IA)
 * - 6 allow-listed queries with k-anonymity (k≥5)
 * - Differential privacy budget tracking (ε-δ)
 * - Consent validation
 * 
 * User Role: Admin only
 */

'use client';

import { PrivacySafeguardsStatus } from './components/PrivacySafeguardsStatus';
import { IAQuerySelector } from './components/IAQuerySelector';
import { IAQueryResults } from './components/IAQueryResults';
import { useIAExecution } from './hooks/useIAExecution';

export default function InsightsPage() {
  const { loading, result, executeQuery } = useIAExecution();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00153a] via-[#001a47] to-[#00153a] p-8">
      <div className="max-w-[1600px] mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Insights Dashboard</h1>
            <p className="text-white/60">
              Privacy-preserving analytics with k-anonymity and differential privacy
            </p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/20 backdrop-blur-sm border border-emerald-500/30 rounded-lg px-4 py-2">
            <svg className="h-5 w-5 text-emerald-400 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-sm font-medium text-emerald-300">Privacy: Compliant</span>
          </div>
        </div>

        {/* Privacy Safeguards Status */}
        <div>
          <PrivacySafeguardsStatus />
        </div>

        {/* Query Selector */}
        <div>
          <IAQuerySelector onExecute={executeQuery} loading={loading} />
        </div>

        {/* Query Results */}
        <div>
          <IAQueryResults result={result} loading={loading} />
        </div>

        {/* Privacy Information */}
        <div className="bg-purple-500/10 backdrop-blur-sm border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-lg font-semibold text-purple-300 mb-3">Privacy Guarantees</h3>
              <div className="text-sm text-purple-200/80">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span><strong className="text-purple-200">k-anonymity (k≥5):</strong> Every result group contains at least 5 users</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span><strong className="text-purple-200">Differential Privacy:</strong> ε-δ budget tracking prevents re-identification</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span><strong className="text-purple-200">Consent Validation:</strong> Only analyzes users who opted in to analytics</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-400 mt-0.5">•</span>
                    <span><strong className="text-purple-200">Allow-listed Queries:</strong> Only 6 pre-approved queries can be executed</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
