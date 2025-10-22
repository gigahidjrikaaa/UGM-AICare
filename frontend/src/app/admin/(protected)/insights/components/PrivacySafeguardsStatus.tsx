/**
 * PrivacySafeguardsStatus Component
 * 
 * Displays real-time privacy compliance status:
 * - k-anonymity value and threshold
 * - Differential privacy budget consumption
 * - Consent validation stats
 */

'use client';

import { usePrivacyStatus } from '../hooks/usePrivacyStatus';

export function PrivacySafeguardsStatus() {
  const { status, loading } = usePrivacyStatus();

  if (loading || !status) {
    return (
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Privacy Safeguards Status</h2>
          <p className="text-sm text-gray-600 mt-1">Real-time privacy compliance monitoring</p>
        </div>
        <div className="p-6">
          <div className="animate-pulse grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border border-gray-200 rounded-lg p-4">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const kAnonymityPercent = Math.min((status.k_value / (status.k_threshold * 2)) * 100, 100);
  const epsilonPercent = (status.epsilon_used / status.epsilon_total) * 100;
  const consentPercent = (status.consented_users / status.total_users) * 100;

  const getStatusIcon = (compliant: boolean) => {
    return compliant ? (
      <span className="text-green-600">✓</span>
    ) : (
      <span className="text-red-600">✗</span>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900">Privacy Safeguards Status</h2>
        <p className="text-sm text-gray-600 mt-1">Real-time privacy compliance monitoring</p>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* k-anonymity Status */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">k-anonymity</h3>
              {getStatusIcon(status.k_value >= status.k_threshold)}
            </div>
            <p className="text-2xl font-bold text-gray-900">k = {status.k_value}</p>
            <p className="text-sm text-gray-500 mt-1">Threshold: k ≥ {status.k_threshold}</p>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  status.k_value >= status.k_threshold ? 'bg-green-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(kAnonymityPercent, 100)}%` }}
              ></div>
            </div>
            {status.k_value < status.k_threshold && (
              <p className="text-xs text-red-600 mt-2">⚠️ Below threshold - queries blocked</p>
            )}
          </div>
          
          {/* Differential Privacy Budget */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Differential Privacy</h3>
              {getStatusIcon(status.epsilon_used < status.epsilon_total)}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              ε = {status.epsilon_used.toFixed(2)}/{status.epsilon_total.toFixed(1)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {((1 - epsilonPercent / 100) * 100).toFixed(0)}% remaining
            </p>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${
                  epsilonPercent < 80 ? 'bg-blue-500' : epsilonPercent < 95 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${epsilonPercent}%` }}
              ></div>
            </div>
            {epsilonPercent >= 95 && (
              <p className="text-xs text-red-600 mt-2">⚠️ Budget nearly exhausted</p>
            )}
          </div>
          
          {/* Consent Validation */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-700">Consent Validation</h3>
              {getStatusIcon(status.consented_users > 0)}
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {status.consented_users} / {status.total_users}
            </p>
            <p className="text-sm text-gray-500 mt-1">Users opted in</p>
            <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-500 transition-all duration-300"
                style={{ width: `${consentPercent}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              {consentPercent.toFixed(1)}% consent rate
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
