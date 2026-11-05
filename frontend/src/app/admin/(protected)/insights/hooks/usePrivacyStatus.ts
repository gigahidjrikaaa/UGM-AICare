/**
 * usePrivacyStatus Hook
 *
 * Fetches real-time privacy compliance status from backend
 * Endpoint: GET /api/v1/clinical-analytics/privacy-audit
 *
 * All displayed values come from the backend (DP budget accountant +
 * settings); there is deliberately no mock fallback — if the API fails,
 * the panel shows an unavailable state instead of invented numbers.
 */

'use client';

import { useState, useEffect } from 'react';
import apiClient from '@/services/api';

export interface PrivacyStatus {
  /** Configured minimum group size enforced on every IA query (settings.k_anon). */
  k_anonymity: number;
  epsilon_used: number;
  epsilon_total: number;
  dp_enabled: boolean;
  budget_healthy: boolean;
}

export function usePrivacyStatus() {
  const [status, setStatus] = useState<PrivacyStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrivacyStatus = async () => {
      setLoading(true);

      try {
        const response = await apiClient.get('/clinical-analytics/privacy-audit');

        const payload = response.data.data;
        const budgetData = payload.budget_status;
        const indicators = payload.compliance_indicators ?? {};

        setStatus({
          k_anonymity: Number(indicators.k_anonymity ?? 0),
          epsilon_used: budgetData.used_budget,
          epsilon_total: budgetData.total_budget,
          dp_enabled: Boolean(indicators.dp_enabled),
          budget_healthy: Boolean(indicators.budget_healthy),
        });
        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch privacy status';
        console.error('Privacy status fetch error:', err);
        setError(errorMessage);
        setStatus(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPrivacyStatus();

    // Refresh every 30 seconds
    const interval = setInterval(() => {
      void fetchPrivacyStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return { status, loading, error };
}
