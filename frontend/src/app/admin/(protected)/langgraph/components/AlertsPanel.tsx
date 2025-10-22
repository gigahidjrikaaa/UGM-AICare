/**
 * AlertsPanel Component
 * 
 * Displays active system alerts with:
 * - Severity badges (info/warning/error/critical)
 * - Alert descriptions
 * - Resolve functionality
 * - Auto-refresh
 */

'use client';

import { useEffect } from 'react';
import { useLangGraphAnalytics } from '../hooks/useLangGraphAnalytics';

export function AlertsPanel() {
  const { alerts, loadingAlerts, fetchAlerts, resolveAlert } = useLangGraphAnalytics();

  // Fetch alerts on mount and every 60 seconds
  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      void fetchAlerts();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleResolve = async (alertId: number) => {
    try {
      await resolveAlert(alertId);
    } catch {
      alert('Failed to resolve alert');
    }
  };

  const getSeverityBadge = (severity: string) => {
    const styles = {
      info: 'bg-blue-100 text-blue-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      critical: 'bg-red-600 text-white'
    }[severity] || 'bg-white/10 text-white/80';

    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles}`}>
        {severity.toUpperCase()}
      </span>
    );
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
      case 'error':
        return (
          <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="h-5 w-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (loadingAlerts) {
    return (
      <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
        <h2 className="text-xl font-bold text-white mb-4">Active Alerts</h2>
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white/20 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const activeAlerts = alerts?.data || [];

  return (
    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-white">Active Alerts</h2>
        <button
          onClick={fetchAlerts}
          className="px-3 py-1 bg-white/10 text-white/70 rounded-lg hover:bg-white/20 text-sm font-medium"
        >
          Refresh
        </button>
      </div>

      {activeAlerts.length === 0 ? (
        <div className="text-center py-8">
          <svg className="mx-auto h-12 w-12 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="mt-2 text-sm text-white/60">No active alerts</p>
          <p className="text-xs text-white/50">All systems operational</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              className="border border-white/10 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">{getSeverityIcon(alert.severity)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getSeverityBadge(alert.severity)}
                      <span className="text-xs text-white/50">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1">
                      {alert.alert_type}
                    </h3>
                    <p className="text-sm text-white/60">{alert.message}</p>
                    
                    {/* Alert Metadata */}
                    {alert.metadata && Object.keys(alert.metadata).length > 0 && (
                      <div className="mt-2 p-2 bg-white/5 rounded text-xs text-white/70">
                        <pre className="overflow-x-auto">
                          {JSON.stringify(alert.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resolve Button */}
                <button
                  onClick={() => handleResolve(alert.id)}
                  className="ml-4 px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-medium whitespace-nowrap"
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
